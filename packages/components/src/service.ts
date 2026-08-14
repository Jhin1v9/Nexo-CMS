/**
 * ComponentService (M3-CONTRACTS §3.2 — dono: packages/components).
 * Operacoes por tras das capabilities component.list/read/create/update/
 * delete/publish. O registro das capabilities no Control Plane e Wave 3 —
 * este package NAO registra nada.
 *
 * - projectId resolve para o Project Root via storage ProjectRepository
 *   (SPEC §5); todo acesso a disco passa pelo scope guard de @nexo/runtime.
 * - component.list: reconciliacao explicita — deteccao FRESCA via AST
 *   (detect.ts) sincronizada com o registry (ids estaveis por escopo, 08§6);
 *   watcher nao e verdade (M3 §8.6).
 * - Toda mutacao verifica o resultado real (No Fake Success, M3 §8.4).
 * - ctx.operationId propagado em todos os erros (padrao @nexo/media).
 */

import { readFile } from 'node:fs/promises';

import type { DetectedTechnology } from '@nexo/adapters';
import { createReactTsxTransformer, type ReactTsxTransformer } from '@nexo/adapters';
import type { ExecutionContext } from '@nexo/core';
import { createProjectScanner } from '@nexo/intelligence';
import { err, nexoError, ok, type NexoError, type Result } from '@nexo/shared';
import type { Storage } from '@nexo/storage';

import { createComponent, type CreateComponentInput, type CreateComponentOutcome } from './create.js';
import { deleteComponent, type DeleteComponentInput, type DeleteComponentOutcome } from './delete.js';
import { analyzeComponentFile, detectNativeComponents } from './detect.js';
import { componentError } from './errors.js';
import { createProjectFs, guardPath, type ProjectFs } from './project-fs.js';
import { createComponentRegistry, type ComponentRegistry } from './registry.js';
import { publishComponent, type PublishInput, type PublishOutcome } from './publish.js';
import { updateComponent, type UpdateComponentInput, type UpdateComponentOutcome } from './update.js';
import type { ComponentIdentity, ComponentSchema, ComponentScope } from './types.js';

export interface ComponentService {
  list(
    ctx: ExecutionContext,
    input: { projectId: string; scope?: ComponentScope },
  ): Promise<Result<ComponentIdentity[]>>;
  read(
    ctx: ExecutionContext,
    input: { projectId: string; componentId: string },
  ): Promise<Result<ComponentSchema>>;
  create(
    ctx: ExecutionContext,
    input: CreateComponentInput & { projectId: string },
  ): Promise<Result<CreateComponentOutcome>>;
  update(
    ctx: ExecutionContext,
    input: UpdateComponentInput & { projectId: string },
  ): Promise<Result<UpdateComponentOutcome>>;
  delete(
    ctx: ExecutionContext,
    input: DeleteComponentInput & { projectId: string },
  ): Promise<Result<DeleteComponentOutcome>>;
  publish(
    ctx: ExecutionContext,
    input: PublishInput & { projectId: string },
  ): Promise<Result<PublishOutcome>>;
}

export interface ComponentServiceOptions {
  /** Storage M1 (D10): projects resolve o Project Root; components e o registry. */
  storage: Storage;
  /** Injetavel p/ testes; default: createReactTsxTransformer(). */
  transformer?: ReactTsxTransformer;
}

function withOperationId(error: NexoError, ctx: ExecutionContext): NexoError {
  if (error.operationId !== undefined) return error;
  return { ...error, operationId: ctx.operationId };
}

export function createComponentService(opts: ComponentServiceOptions): ComponentService {
  const registry: ComponentRegistry = createComponentRegistry(opts.storage.repos.components);
  const transformer = opts.transformer ?? createReactTsxTransformer();
  const scanner = createProjectScanner();

  async function projectFs(ctx: ExecutionContext, projectId: string): Promise<Result<ProjectFs>> {
    const project = opts.storage.repos.projects.getById(projectId);
    if (project === null) {
      return err(
        withOperationId(
          nexoError('NOT_FOUND', `Projeto nao registrado: '${projectId}'`, { resource: projectId }),
          ctx,
        ),
      );
    }
    const fsCtx = await createProjectFs(project.rootPath);
    if (!fsCtx.ok) return err(withOperationId(fsCtx.error, ctx));
    return fsCtx;
  }

  /** Stack detection via Project Intelligence (scanner M1 — PI e a verdade). */
  async function scanTechnologies(rootAbs: string): Promise<readonly DetectedTechnology[]> {
    const scanned = await scanner.scan(rootAbs);
    return scanned.ok ? scanned.value.technologies : [];
  }

  /**
   * Reconciliacao (M3 §8.6): deteccao fresca -> registry com ids ESTAVEIS
   * (casa por source path, depois por nome; nunca recomputa id — 08§6).
   */
  async function syncDetected(projectId: string, rootAbs: string): Promise<ComponentSchema[]> {
    const detection = await detectNativeComponents(rootAbs);
    if (!detection.ok) return [];
    const now = new Date().toISOString();
    const synced: ComponentSchema[] = [];
    for (const detected of detection.value.components) {
      const existing =
        registry.findBySourcePath(projectId, detected.file) ??
        registry.findByName(projectId, 'Project', detected.name);
      const id = existing?.schema.identity.id ?? crypto.randomUUID();
      const schema: ComponentSchema = {
        identity: {
          id,
          name: detected.name,
          scope: 'Project',
          // preserva o source registrado (ex.: GeneratedSource de component.create)
          source: existing?.schema.identity.source ?? { kind: 'ProjectFile', path: detected.file },
          version: existing?.schema.identity.version ?? null,
        },
        props: detected.props,
        variants: existing?.schema.variants ?? [],
        slots: detected.slots,
        events: detected.events,
        assets: detected.assets,
        styles: existing?.schema.styles ?? [],
        responsiveRules: existing?.schema.responsiveRules ?? [],
        metadata: {
          ...existing?.schema.metadata,
          class: existing?.schema.metadata['class'] ?? 'NativeProjectComponent',
          exportKind: detected.exportKind,
          propsConfidence: detected.propsConfidence,
          propsDeclKind: detected.propsDeclKind,
          detectedAt: now,
          updatedAt: now,
        },
      };
      registry.upsert(projectId, schema);
      synced.push(schema);
    }
    return synced;
  }

  return {
    async list(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return err(fsCtx.error);
      const scope = input.scope;
      if (scope === 'Library') {
        return ok(registry.listLibrary().map((r) => r.schema.identity));
      }
      if (scope === 'Workspace') {
        // Nenhum componente de escopo Workspace existe em M3 (registry reservado)
        return ok([]);
      }
      // Project (default): reconciliacao explicita com o disco
      const synced = await syncDetected(input.projectId, fsCtx.value.rootAbs);
      // componentes registrados cujo arquivo sumiu do disco ficam fora da
      // listagem fresca (a deteccao e a verdade); ids nunca sao reutilizados
      const syncedIds = new Set(synced.map((s) => s.identity.id));
      const stale = registry
        .list(input.projectId, 'Project')
        .filter((r) => !syncedIds.has(r.schema.identity.id));
      for (const s of stale) {
        // source GeneratedSource de component.create tambem e arquivo: se o
        // arquivo existe mas nao foi re-detectado (ex.: dir fora dos dirs de
        // componentes), mantemos o registro — identidade estavel (08§6)
        const src = s.schema.identity.source;
        const path = src.kind === 'ProjectFile' || src.kind === 'GeneratedSource' ? src.path : null;
        if (path !== null) {
          const guarded = await guardPath(fsCtx.value, path);
          if (guarded.ok) synced.push(s.schema);
        }
      }
      return ok(synced.map((s) => s.identity));
    },

    async read(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return err(fsCtx.error);
      const registered = registry.getById(input.componentId);
      if (
        registered === null ||
        (registered.projectId !== null && registered.projectId !== input.projectId)
      ) {
        return err(
          withOperationId(
            componentError('ComponentNotFound', `Componente nao encontrado: '${input.componentId}'`, {
              resource: input.componentId,
            }),
            ctx,
          ),
        );
      }
      // refresh da FONTE (reconciliacao explicita — 08§20 Re-analyze)
      const schema = structuredClone(registered.schema);
      const src = schema.identity.source;
      const rel = src.kind === 'ProjectFile' || src.kind === 'GeneratedSource' ? src.path : null;
      if (rel !== null && schema.identity.scope === 'Project') {
        const guarded = await guardPath(fsCtx.value, rel);
        if (guarded.ok) {
          try {
            const content = await readFile(guarded.value, 'utf8');
            const analyzed = analyzeComponentFile(rel, content);
            const fresh = analyzed.components.find((c) => c.name === schema.identity.name);
            if (analyzed.parseOk && fresh !== undefined) {
              schema.props = fresh.props;
              schema.events = fresh.events;
              schema.slots = fresh.slots;
              schema.assets = fresh.assets;
              schema.metadata['propsConfidence'] = fresh.propsConfidence;
              registry.upsert(registered.projectId, schema);
            } else {
              schema.metadata['staleReason'] = `re-parse de '${rel}' falhou; schema do registry retornado como estava`;
            }
          } catch {
            schema.metadata['staleReason'] = `arquivo '${rel}' ilegivel; schema do registry retornado como estava`;
          }
        }
      }
      return ok(schema);
    },

    async create(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return err(fsCtx.error);
      const technologies = await scanTechnologies(fsCtx.value.rootAbs);
      const outcome = await createComponent(
        { fsCtx: fsCtx.value, registry, projectId: input.projectId, technologies, transformer },
        input,
      );
      if (!outcome.ok) return err(withOperationId(outcome.error, ctx));
      return outcome;
    },

    async update(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return err(fsCtx.error);
      const outcome = await updateComponent(
        { fsCtx: fsCtx.value, registry, projectId: input.projectId, transformer },
        input,
      );
      if (!outcome.ok) return err(withOperationId(outcome.error, ctx));
      return outcome;
    },

    async delete(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return err(fsCtx.error);
      const outcome = await deleteComponent(
        { fsCtx: fsCtx.value, registry, projectId: input.projectId },
        input,
      );
      if (!outcome.ok) return err(withOperationId(outcome.error, ctx));
      return outcome;
    },

    async publish(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return err(fsCtx.error);
      const technologies = await scanTechnologies(fsCtx.value.rootAbs);
      const outcome = await publishComponent(
        { fsCtx: fsCtx.value, registry, projectId: input.projectId, technologies },
        input,
      );
      if (!outcome.ok) return err(withOperationId(outcome.error, ctx));
      return outcome;
    },
  };
}
