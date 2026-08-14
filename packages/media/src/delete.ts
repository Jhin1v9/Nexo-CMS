/**
 * Media Deletion (doc 08§51 + 08§55 + 08§50):
 * - Referências conhecidas: bloqueado por default (CONFLICT +
 *   requiresApproval); com `confirm:true` deleta e REPORTA as referências
 *   quebradas (nunca quebrar silenciosamente).
 * - Uso `Unknown` (scan incompleto): bloqueado COM explicação — Unknown nunca
 *   é tratado como Unused (08§50, M3 §8.8). Nem confirm:true destrava: o
 *   caller precisa restaurar a cobertura do scan.
 * - Recurso remoto (ExternalURL/CDN): NUNCA deletado como se fosse local
 *   (08§55) — apenas a referência (registro) é removida, explicitamente.
 * - Verify: após deletar, o arquivo é re-chegado no disco (No Fake Success).
 */

import { promises as fs } from 'node:fs';

import { err, ok, type Result } from '@nexo/shared';

import { mediaError } from './errors.js';
import { guardPath, type ProjectFs } from './paths.js';
import { scanAssetReferences } from './references.js';
import type { MediaRegistry } from './registry.js';
import { REMOTE_ORIGINS, type AssetReference } from './types.js';

export interface DeleteInput {
  assetId: string;
  /** Confirmação explícita exigida quando há referências conhecidas (08§51). */
  confirm?: boolean;
}

export interface DeleteOutcome {
  assetId: string;
  /** Arquivo local removido do disco (false para asset remoto — 08§55). */
  deletedLocalFile: boolean;
  /** Registro removido do registry. */
  removedFromRegistry: boolean;
  /** Referências que ficaram apontando para um arquivo inexistente. */
  brokenReferences: AssetReference[];
  verified: boolean;
}

export interface DeleteDeps {
  fsCtx: ProjectFs;
  registry: MediaRegistry;
  projectId: string;
}

export async function deleteAsset(deps: DeleteDeps, input: DeleteInput): Promise<Result<DeleteOutcome>> {
  const asset = deps.registry.getById(deps.projectId, input.assetId);
  if (asset === null) {
    return err(
      mediaError('AssetNotFound', `Asset não encontrado: '${input.assetId}'`, {
        resource: input.assetId,
      }),
    );
  }

  // 08§55: remoto — gerencia a referência, NUNCA o recurso
  if (REMOTE_ORIGINS.includes(asset.source.origin)) {
    deps.registry.remove(asset.id);
    return ok({
      assetId: asset.id,
      deletedLocalFile: false,
      removedFromRegistry: true,
      brokenReferences: asset.references,
      verified: true,
    });
  }

  const relPath = asset.source.path;
  if (relPath === undefined) {
    return err(
      mediaError(
        'DeleteBlockedUsageUnknown',
        `Asset '${asset.id}' não tem path local nem origem remota conhecida — delete bloqueado`,
        { resource: asset.id },
      ),
    );
  }

  // Inspeção FRESCA de referências antes de deletar (08§51; registry pode
  // estar desatualizado — nunca confiar em estado envelhecido para destruir).
  const scan = await scanAssetReferences(deps.fsCtx, relPath);
  if (!scan.ok) return scan;
  if (!scan.value.complete) {
    return err(
      mediaError(
        'DeleteBlockedUsageUnknown',
        `Delete bloqueado: o scan de referências não cobriu todo o projeto (${scan.value.skippedFiles} arquivo(s) ilegível(is)/grande(s)); uso do asset é Unknown e Unknown nunca é tratado como Unused (08§50)`,
        {
          resource: relPath,
          details: {
            scannedFiles: scan.value.scannedFiles,
            skippedFiles: scan.value.skippedFiles,
          },
        },
      ),
    );
  }

  const references = scan.value.references;
  if (references.length > 0 && input.confirm !== true) {
    return err(
      mediaError(
        'DeleteBlockedByReferences',
        `Delete bloqueado: ${references.length} referência(s) conhecida(s) a '${relPath}'. Reenvie com confirm:true para deletar e receber o relatório de referências quebradas.`,
        {
          resource: relPath,
          details: {
            referenceCount: references.length,
            references: references.map((r) => ({ filePath: r.filePath, line: r.line, kind: r.kind })),
          },
        },
      ),
    );
  }

  const guarded = await guardPath(deps.fsCtx, relPath);
  if (!guarded.ok) return guarded;
  try {
    await fs.unlink(guarded.value);
  } catch (e) {
    const cause = e as NodeJS.ErrnoException;
    if (cause.code !== 'ENOENT') {
      return err(
        mediaError('VerificationFailed', `Falha ao deletar '${relPath}': ${cause.message}`, {
          resource: relPath,
        }),
      );
    }
  }

  // Verify: o arquivo não pode mais existir no disco
  const stillThere = await fs.stat(guarded.value).then(() => true, () => false);
  if (stillThere) {
    return err(
      mediaError('VerificationFailed', `Verificação pós-delete falhou: '${relPath}' ainda existe`, {
        resource: relPath,
      }),
    );
  }
  const removedFromRegistry = deps.registry.remove(asset.id);

  return ok({
    assetId: asset.id,
    deletedLocalFile: true,
    removedFromRegistry,
    brokenReferences: references,
    verified: true,
  });
}
