/**
 * DesignService (M3-CONTRACTS §3.4 — dono: packages/design).
 * Operacoes por tras das capabilities design.read/update,
 * design.token.read/update, theme.read/update. O registro das capabilities
 * no Control Plane e Wave 3 — este package NAO registra nada.
 *
 * - projectId resolve para o Project Root via storage ProjectRepository;
 *   todo acesso a disco passa pelo scope guard de @nexo/runtime.
 * - Leituras SAFE; mutacoes DESTRUCTIVE (policy/approval e do Control Plane).
 * - Erros: NexoError estavel + details.designError + nextAction (padrao M3);
 *   ctx.operationId propagado em todos os erros (padrao doc 10 §64).
 * - Zero fake success: mutacao so retorna updated:true apos verificacao
 *   pos-escrita real (re-leitura do disco + do dominio — 07§41, M3 §8.4).
 */

import type { ExecutionContext } from '@nexo/core';
import type { ProjectScanner } from '@nexo/intelligence';
import { createProjectScanner } from '@nexo/intelligence';
import { err, nexoError, ok, type NexoError, type Result } from '@nexo/shared';
import type { Storage } from '@nexo/storage';

import { inspectCssFiles } from './inspect.js';
import { createProjectFs, type ProjectFs } from './paths.js';
import { readDesignModel } from './read.js';
import { readThemes, updateTheme, type ThemeReadResult, type ThemeUpdateInput, type ThemeUpdateResult } from './theme.js';
import { readTokens, updateToken, type TokenReadResult, type TokenUpdateInput, type TokenUpdateResult } from './token.js';
import { designUpdate, type DesignUpdateInput, type DesignUpdateResult } from './update.js';
import type { DesignModel } from './types.js';

/** Capability ids M3 (D9: permissao = capability id). NAO registrados aqui. */
export const DESIGN_CAPABILITIES = {
  read: 'design.read',
  update: 'design.update',
  tokenRead: 'design.token.read',
  tokenUpdate: 'design.token.update',
  themeRead: 'theme.read',
  themeUpdate: 'theme.update',
} as const;

export interface DesignService {
  read(ctx: ExecutionContext, input: { projectId: string }): Promise<Result<DesignModel>>;
  update(ctx: ExecutionContext, input: DesignUpdateInput): Promise<Result<DesignUpdateResult>>;
  tokenRead(
    ctx: ExecutionContext,
    input: { projectId: string; tokenRef?: string },
  ): Promise<Result<TokenReadResult>>;
  tokenUpdate(
    ctx: ExecutionContext,
    input: TokenUpdateInput & { projectId: string },
  ): Promise<Result<TokenUpdateResult>>;
  themeRead(ctx: ExecutionContext, input: { projectId: string }): Promise<Result<ThemeReadResult>>;
  themeUpdate(
    ctx: ExecutionContext,
    input: ThemeUpdateInput & { projectId: string },
  ): Promise<Result<ThemeUpdateResult>>;
}

export interface DesignServiceOptions {
  /** Storage M1: projects resolvem o Project Root. */
  storage: Storage;
  /** Scanner M1 (ProjectModel.technologies entra como evidencia). Default: createProjectScanner(). */
  scanner?: ProjectScanner;
}

function withOperationId(error: NexoError, ctx: ExecutionContext): NexoError {
  if (error.operationId !== undefined) return error;
  return { ...error, operationId: ctx.operationId };
}

export function createDesignService(opts: DesignServiceOptions): DesignService {
  const scanner = opts.scanner ?? createProjectScanner();

  /** Resolve projectId -> ProjectFs (root realpatheado) ou erro com operationId. */
  async function projectFs(
    ctx: ExecutionContext,
    projectId: string,
  ): Promise<Result<ProjectFs>> {
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

  return {
    async read(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      // ProjectModel.technologies como evidencia adicional; falha do scanner
      // NAO bloqueia design.read (sinais de arquivo sao suficientes).
      const scanned = await scanner.scan(fsCtx.value.rootAbs);
      const technologies = scanned.ok ? scanned.value.technologies : [];
      const model = await readDesignModel({
        projectId: input.projectId,
        rootAbs: fsCtx.value.rootAbs,
        technologies,
      });
      return ok(model);
    },

    async update(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const result = await designUpdate(fsCtx.value, input);
      if (!result.ok) return err(withOperationId(result.error, ctx));
      return result;
    },

    async tokenRead(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const result = await readTokens(fsCtx.value.rootAbs, input.tokenRef);
      if (!result.ok) return err(withOperationId(result.error, ctx));
      return result;
    },

    async tokenUpdate(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const result = await updateToken(fsCtx.value, {
        tokenRef: input.tokenRef,
        value: input.value,
      });
      if (!result.ok) return err(withOperationId(result.error, ctx));
      return result;
    },

    async themeRead(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const cssFiles = await inspectCssFiles(fsCtx.value.rootAbs);
      return ok(readThemes(cssFiles));
    },

    async themeUpdate(ctx, input) {
      const fsCtx = await projectFs(ctx, input.projectId);
      if (!fsCtx.ok) return fsCtx;
      const cssFiles = await inspectCssFiles(fsCtx.value.rootAbs);
      const result = await updateTheme(fsCtx.value, cssFiles, {
        theme: input.theme,
        ...(input.mechanism !== undefined ? { mechanism: input.mechanism } : {}),
        patch: input.patch,
      });
      if (!result.ok) return err(withOperationId(result.error, ctx));
      return result;
    },
  };
}
