/**
 * Media Replacement (doc 08§48):
 *   Resolve Asset → Find References → Select Replacement → Validate
 *   Compatibility → Update References → Persist → Re-analyze → Verify
 *
 * A substituição atualiza referências REAIS no source (nunca apenas URL de
 * preview). Atualização = reescrita textual de ocorrências de import/src/href/
 * url() com o path antigo (permitido; NÃO é transformação AST). Referências
 * PARTIAL (basename) são reportadas como ambíguas e NUNCA reescritas.
 *
 * Compatibilidade: o tipo do asset é preservado (Image continua Image; SVG
 * continua SVG). Mudança de formato dentro do tipo (png → webp) é permitida
 * e troca a extensão canônica real — referências são atualizadas (08§54).
 * Assets remotos (ExternalURL/CDN): replace retorna UNSUPPORTED (08§55 — o
 * Nexo gerencia a referência, não o recurso remoto).
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, ok, type Result } from '@nexo/shared';

import { mediaError } from './errors.js';
import { readImageDimensions } from './mime.js';
import { guardPath, type ProjectFs } from './paths.js';
import { rewriteAssetReferences, scanAssetReferences, type ReferenceRewrite } from './references.js';
import type { MediaRegistry } from './registry.js';
import { DEFAULT_MAX_UPLOAD_BYTES, usageFromScan, validateUploadPayload } from './upload.js';
import type { AssetIdentity, AssetReference } from './types.js';

export interface ReplaceInput {
  assetId: string;
  fileName: string;
  contentBase64: string;
}

export interface ReplaceOutcome {
  asset: AssetIdentity;
  previousPath: string;
  newPath: string;
  /** Arquivos do source com referências reescritas + verificação pós-escrita. */
  filesChanged: ReferenceRewrite[];
  /** Referências PARTIAL (basename) reportadas, NUNCA reescritas. */
  ambiguousReferences: AssetReference[];
  verified: boolean;
}

export interface ReplaceDeps {
  fsCtx: ProjectFs;
  registry: MediaRegistry;
  projectId: string;
  maxUploadBytes?: number;
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export async function replaceAsset(deps: ReplaceDeps, input: ReplaceInput): Promise<Result<ReplaceOutcome>> {
  // 1. Resolve Asset
  const asset = deps.registry.getById(deps.projectId, input.assetId);
  if (asset === null) {
    return err(
      mediaError('AssetNotFound', `Asset não encontrado: '${input.assetId}'`, {
        resource: input.assetId,
      }),
    );
  }
  const oldRelPath = asset.source.path;
  if (oldRelPath === undefined) {
    return err(
      mediaError(
        'ExternalAssetMutation',
        'Replace de asset remoto não é suportado (08§55): o Nexo gerencia a referência, não o recurso remoto',
        { resource: asset.source.url ?? input.assetId },
      ),
    );
  }

  // 2. Find References (scan fresco — registry pode estar desatualizado)
  const scan = await scanAssetReferences(deps.fsCtx, oldRelPath);
  if (!scan.ok) return scan;

  // 3+4. Select Replacement + Validate Compatibility (08§45 reutilizada)
  const validated = validateUploadPayload(
    { fileName: input.fileName, contentBase64: input.contentBase64 },
    deps.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES,
  );
  if (!validated.ok) return validated;
  const { buf, sniffed } = validated.value;
  if (sniffed.type !== asset.type) {
    return err(
      mediaError(
        'IncompatibleReplacement',
        `Replacement incompatível: asset é '${asset.type}' e o novo conteúdo é '${sniffed.type}'`,
        {
          resource: input.assetId,
          details: { expectedType: asset.type, detectedType: sniffed.type, detectedMime: sniffed.mime },
        },
      ),
    );
  }

  // Novo path: mesmo diretório; extensão canônica do MIME real detectado.
  const dir = path.posix.dirname(oldRelPath);
  const stem = path.posix.basename(oldRelPath, path.posix.extname(oldRelPath));
  const newRelPath = `${dir === '.' ? '' : dir + '/'}${stem}.${sniffed.canonicalExtension}`;
  const pathChanged = newRelPath !== oldRelPath;

  const newGuard = await guardPath(deps.fsCtx, newRelPath);
  if (!newGuard.ok) return newGuard;
  const newExists = await fs.stat(newGuard.value).then(() => true, () => false);
  if (pathChanged && newExists) {
    return err(
      mediaError('IncompatibleReplacement', `Destino do replacement já existe: '${newRelPath}'`, {
        resource: newRelPath,
      }),
    );
  }

  // Persist (novo conteúdo) — overwrite só no MESMO path (replace é explícito)
  try {
    await fs.writeFile(newGuard.value, buf);
  } catch (e) {
    return err(
      mediaError('VerificationFailed', `Falha ao gravar replacement em '${newRelPath}'`, {
        resource: newRelPath,
        details: { cause: (e as Error).message },
      }),
    );
  }
  // Verify (conteúdo)
  const reread = await fs.readFile(newGuard.value);
  if (sha256(reread) !== sha256(buf)) {
    return err(
      mediaError('VerificationFailed', `Verificação pós-escrita falhou para '${newRelPath}'`, {
        resource: newRelPath,
      }),
    );
  }

  // 5. Update References (somente se o path mudou) — reescrita textual real
  let filesChanged: ReferenceRewrite[] = [];
  let ambiguousReferences: AssetReference[] = [];
  if (pathChanged) {
    const rewrite = await rewriteAssetReferences(deps.fsCtx, oldRelPath, newRelPath, scan.value.references);
    if (!rewrite.ok) return rewrite;
    filesChanged = rewrite.value.rewritten;
    ambiguousReferences = rewrite.value.ambiguous;
    // arquivo antigo removido APÓS referências atualizadas e verificadas
    const oldGuard = await guardPath(deps.fsCtx, oldRelPath);
    if (!oldGuard.ok) return oldGuard;
    try {
      await fs.unlink(oldGuard.value);
    } catch (e) {
      const cause = e as NodeJS.ErrnoException;
      if (cause.code !== 'ENOENT') {
        return err(
          mediaError('VerificationFailed', `Falha ao remover arquivo antigo '${oldRelPath}'`, {
            resource: oldRelPath,
            details: { cause: cause.message },
          }),
        );
      }
    }
  } else {
    ambiguousReferences = scan.value.references.filter((r) => r.confidence !== 'HIGH_CONFIDENCE');
  }

  // 6/7. Re-analyze (scan fresco no novo path) + Persist registry
  const rescan = await scanAssetReferences(deps.fsCtx, newRelPath);
  if (!rescan.ok) return rescan;
  const now = new Date().toISOString();
  const dimensions = readImageDimensions(buf, sniffed.mime);
  const source = { origin: asset.source.origin, path: newRelPath };
  const updated: AssetIdentity = {
    ...asset,
    type: sniffed.type,
    source,
    metadata: {
      ...asset.metadata,
      name: path.posix.basename(newRelPath),
      type: sniffed.type,
      mime: sniffed.mime,
      size: buf.length,
      source,
      updatedAt: now,
      references: rescan.value.references,
      ...(dimensions !== undefined ? { dimensions } : {}),
    },
    references: rescan.value.references,
    usage: usageFromScan(rescan.value, 'local'),
    ...(dimensions !== undefined ? { dimensions } : {}),
  };
  deps.registry.upsert(deps.projectId, updated);

  // 8. Verify final: registry relê a identidade persistida
  const persisted = deps.registry.getById(deps.projectId, input.assetId);
  if (persisted === null || persisted.source.path !== newRelPath) {
    return err(
      mediaError('VerificationFailed', 'Verificação do registry falhou após replace', {
        resource: input.assetId,
      }),
    );
  }

  return ok({
    asset: updated,
    previousPath: oldRelPath,
    newPath: newRelPath,
    filesChanged,
    ambiguousReferences,
    verified: true,
  });
}
