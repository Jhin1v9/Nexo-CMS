/**
 * MediaService (M3-CONTRACTS §3.3 — dono: packages/media).
 * Operações por trás das capabilities media.list/read/search/upload/update/
 * replace/delete. O registro das capabilities no Control Plane é Wave 3 —
 * este package NÃO registra nada.
 *
 * - projectId resolve para o Project Root via storage ProjectRepository
 *   (SPEC §5); todo acesso a disco passa pelo scope guard de @nexo/runtime.
 * - media.read: binário SOMENTE com includeContent:true (base64) e apenas
 *   para assets locais; metadata NUNCA contém secrets (08§82).
 * - media.update: patch de metadata (altText, caption, name — 08§82). `name`
 *   é o nome de EXIBIÇÃO/metadata: renomear o arquivo em disco quebraria
 *   referências e é operação de replace/move, não de metadata (decisão M3).
 * - Toda mutação verifica o resultado real (No Fake Success, M3 §8.4).
 * - ctx.operationId é propagado em todos os erros (padrão doc 10 §64).
 */

import { promises as fs } from 'node:fs';

import type { ExecutionContext } from '@nexo/core';
import { err, nexoError, ok, type NexoError, type Result } from '@nexo/shared';
import type { Storage } from '@nexo/storage';

import { deleteAsset, type DeleteInput, type DeleteOutcome } from './delete.js';
import { mediaError } from './errors.js';
import { createProjectFs, guardPath, type ProjectFs } from './paths.js';
import { createMediaRegistry, type MediaRegistry } from './registry.js';
import { replaceAsset, type ReplaceInput, type ReplaceOutcome } from './replace.js';
import { DEFAULT_MAX_UPLOAD_BYTES, uploadAsset, type UploadInput, type UploadOutcome } from './upload.js';
import type {
  AssetIdentity,
  AssetMetadataPatch,
  AssetScope,
  AssetType,
  UsageState,
} from './types.js';

export interface MediaListFilter {
  type?: AssetType;
  usageState?: UsageState;
  scope?: AssetScope;
}

export interface MediaReadResult {
  asset: AssetIdentity;
  /** Somente quando includeContent:true E o asset é local (08§57). */
  contentBase64?: string;
}

export interface MediaSearchMatch {
  asset: AssetIdentity;
  matchedOn: Array<{ field: 'name' | 'type' | 'reference'; value: string }>;
}

export interface MediaService {
  list(
    ctx: ExecutionContext,
    input: { projectId: string; filter?: MediaListFilter },
  ): Promise<Result<AssetIdentity[]>>;
  read(
    ctx: ExecutionContext,
    input: { projectId: string; assetId: string; includeContent?: boolean },
  ): Promise<Result<MediaReadResult>>;
  search(
    ctx: ExecutionContext,
    input: { projectId: string; query: string },
  ): Promise<Result<MediaSearchMatch[]>>;
  upload(
    ctx: ExecutionContext,
    input: UploadInput & { projectId: string },
  ): Promise<Result<UploadOutcome>>;
  update(
    ctx: ExecutionContext,
    input: { projectId: string; assetId: string; patch: AssetMetadataPatch },
  ): Promise<Result<AssetIdentity>>;
  replace(
    ctx: ExecutionContext,
    input: ReplaceInput & { projectId: string },
  ): Promise<Result<ReplaceOutcome>>;
  delete(
    ctx: ExecutionContext,
    input: DeleteInput & { projectId: string },
  ): Promise<Result<DeleteOutcome>>;
}

export interface MediaServiceOptions {
  /** Storage M1 (D10): projects resolvem o Project Root; mediaAssets é o registry. */
  storage: Storage;
  /** Limite de upload em bytes (08§45 Size). Default: 25MB. */
  maxUploadBytes?: number;
}

function withOperationId(error: NexoError, ctx: ExecutionContext): NexoError {
  if (error.operationId !== undefined) return error;
  return { ...error, operationId: ctx.operationId };
}

export function createMediaService(opts: MediaServiceOptions): MediaService {
  const registry: MediaRegistry = createMediaRegistry(opts.storage.repos.mediaAssets);
  const maxUploadBytes = opts.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;

  /** Resolve projectId -> ProjectFs (root realpatheado) ou erro com operationId. */
  async function projectFs(
    ctx: ExecutionContext,
    projectId: string,
  ): Promise<Result<ProjectFs>> {
    const project = opts.storage.repos.projects.getById(projectId);
    if (project === null) {
      return err(
        withOperationId(
          nexoError('NOT_FOUND', `Projeto não registrado: '${projectId}'`, { resource: projectId }),
          ctx,
        ),
      );
    }
    const fsCtx = await createProjectFs(project.rootPath);
    if (!fsCtx.ok) return err(withOperationId(fsCtx.error, ctx));
    return fsCtx;
  }

  return {
    async list(ctx, input) {
      const assets = registry.list(input.projectId);
      const filter = input.filter;
      const filtered =
        filter === undefined
          ? assets
          : assets.filter(
              (a) =>
                (filter.type === undefined || a.type === filter.type) &&
                (filter.usageState === undefined || a.usage.state === filter.usageState) &&
                (filter.scope === undefined || a.scope === filter.scope),
            );
      void ctx;
      return ok(filtered);
    },

    async read(ctx, input) {
      const asset = registry.getById(input.projectId, input.assetId);
      if (asset === null) {
        return err(
          withOperationId(
            mediaError('AssetNotFound', `Asset não encontrado: '${input.assetId}'`, {
              resource: input.assetId,
            }),
            ctx,
          ),
        );
      }
      if (input.includeContent !== true) return ok({ asset });
      // binário só se local e só quando pedido explicitamente (08§57)
      if (asset.source.path === undefined) {
        return err(
          withOperationId(
            mediaError(
              'ExternalAssetMutation',
              'Asset remoto: conteúdo binário não é fornecido pelo Nexo (08§55 — gerencia-se a referência)',
              { resource: asset.source.url ?? input.assetId },
            ),
            ctx,
          ),
        );
      }
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const guarded = await guardPath(fsCtx.value, asset.source.path);
      if (!guarded.ok) return err(withOperationId(guarded.error, ctx));
      try {
        const buf = await fs.readFile(guarded.value);
        return ok({ asset, contentBase64: buf.toString('base64') });
      } catch (e) {
        const cause = e as NodeJS.ErrnoException;
        return err(
          withOperationId(
            nexoError(
              cause.code === 'ENOENT' ? 'NOT_FOUND' : 'INTERNAL',
              `Falha ao ler conteúdo de '${asset.source.path}': ${cause.message}`,
              { resource: asset.source.path },
            ),
            ctx,
          ),
        );
      }
    },

    async search(ctx, input) {
      const query = input.query.trim().toLowerCase();
      if (query === '') {
        return err(
          withOperationId(
            nexoError('INVALID_INPUT', 'query de busca vazia', { resource: input.projectId }),
            ctx,
          ),
        );
      }
      const matches: MediaSearchMatch[] = [];
      for (const asset of registry.list(input.projectId)) {
        const matchedOn: MediaSearchMatch['matchedOn'] = [];
        if (asset.metadata.name.toLowerCase().includes(query)) {
          matchedOn.push({ field: 'name', value: asset.metadata.name });
        }
        if (asset.type.toLowerCase().includes(query)) {
          matchedOn.push({ field: 'type', value: asset.type });
        }
        for (const ref of asset.references) {
          if (ref.filePath.toLowerCase().includes(query)) {
            matchedOn.push({ field: 'reference', value: `${ref.filePath}:${ref.line}` });
          }
        }
        if (matchedOn.length > 0) matches.push({ asset, matchedOn });
      }
      void ctx;
      return ok(matches);
    },

    async upload(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const outcome = await uploadAsset(
        { fsCtx: fsCtx.value, registry, projectId: input.projectId, maxUploadBytes },
        input,
      );
      if (!outcome.ok) return err(withOperationId(outcome.error, ctx));
      return outcome;
    },

    async update(ctx, input) {
      const asset = registry.getById(input.projectId, input.assetId);
      if (asset === null) {
        return err(
          withOperationId(
            mediaError('AssetNotFound', `Asset não encontrado: '${input.assetId}'`, {
              resource: input.assetId,
            }),
            ctx,
          ),
        );
      }
      const patch = input.patch;
      if (
        patch.name !== undefined &&
        (typeof patch.name !== 'string' || patch.name.trim() === '')
      ) {
        return err(
          withOperationId(
            mediaError('InvalidFileName', 'patch.name inválido (vazio)', { resource: input.assetId }),
            ctx,
          ),
        );
      }
      const now = new Date().toISOString();
      const updated: AssetIdentity = {
        ...asset,
        metadata: {
          ...asset.metadata,
          ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
          ...(patch.altText !== undefined ? { altText: patch.altText } : {}),
          ...(patch.caption !== undefined ? { caption: patch.caption } : {}),
          updatedAt: now,
        },
      };
      registry.upsert(input.projectId, updated);
      // Verify: reler do registry (No Fake Success)
      const persisted = registry.getById(input.projectId, input.assetId);
      if (persisted === null || persisted.metadata.updatedAt !== now) {
        return err(
          withOperationId(
            mediaError('VerificationFailed', 'Verificação do registry falhou após update', {
              resource: input.assetId,
            }),
            ctx,
          ),
        );
      }
      return ok(persisted);
    },

    async replace(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const outcome = await replaceAsset(
        { fsCtx: fsCtx.value, registry, projectId: input.projectId, maxUploadBytes },
        input,
      );
      if (!outcome.ok) return err(withOperationId(outcome.error, ctx));
      return outcome;
    },

    async delete(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const outcome = await deleteAsset(
        { fsCtx: fsCtx.value, registry, projectId: input.projectId },
        input,
      );
      if (!outcome.ok) return err(withOperationId(outcome.error, ctx));
      return outcome;
    },
  };
}
