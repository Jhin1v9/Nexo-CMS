/**
 * Capabilities M2 do domínio `git` (doc 10 — GIT AND VERSIONING; decisões
 * D3/D4/D5 em .nexo-knowledge/OPEN-QUESTIONS.md).
 *
 * - 11 capabilities sobre o GitService da Wave 1 (@nexo/git), que opera contra
 *   o git CLI REAL via CommandExecutor (D2). Este módulo NUNCA executa git
 *   diretamente: apenas resolve o projeto, instancia o executor scoped
 *   (allowedRoot = rootPath registrado, actor do ctx, audit) e delega.
 * - Autorização NÃO é decidida aqui: o Control Plane faz o gate de permissão
 *   ANTES do handler (SPEC §8 short-circuit). As 7 mutações são DESTRUCTIVE
 *   -> REQUIRE_APPROVAL via risks do PolicyEngine (ver ../policy.ts).
 * - Permissões reservadas SEM capability em M2 (D3): git.forcePush,
 *   git.resetHard, git.branch.deleteForce -> DEFAULT DENY permanente; force
 *   em delete retorna UNSUPPORTED apontando a reservada (regra no service).
 * - Commit scope (D5): default = somente staged; files[] = staging explícito;
 *   all:true = opt-in. files+all juntos -> INVALID_INPUT no schema (o gate de
 *   validação zod do Control Plane rejeita antes mesmo da autorização).
 * - piRefreshRecommended (doc 10 §49): pull já retorna do service; em switch
 *   com result SWITCHED o handler adiciona o campo (mudança de branch deixa a
 *   Project Intelligence potencialmente stale).
 */

import type { CapabilityContract, ExecutionContext } from '@nexo/core';
import { createGitService, type GitService } from '@nexo/git';
import { createCommandExecutor } from '@nexo/runtime';
import type { AuthorizationBoundary, AuditSink } from '@nexo/security';
import type { Result } from '@nexo/shared';
import { err, nexoError, ok } from '@nexo/shared';
import type { ProjectRegistration, Storage } from '@nexo/storage';
import { z } from 'zod';

/** Timeout das leituras git (doc 10: operações locais rápidas). */
export const GIT_READ_TIMEOUT_MS = 30_000;
/** Timeout das mutações git (rede/hooks podem demorar — cap M2). */
export const GIT_WRITE_TIMEOUT_MS = 125_000;

const projectIdField = { projectId: z.string().min(1) } as const;

const statusInputSchema = z.object(projectIdField);

const diffInputSchema = z.object({
  ...projectIdField,
  mode: z.enum(['WORKTREE_VS_HEAD', 'STAGED_VS_HEAD', 'COMMIT_VS_PARENT', 'COMMITS', 'BRANCHES']).optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
});

const historyInputSchema = z.object({
  ...projectIdField,
  limit: z.number().int().min(1).max(100).optional(),
  ref: z.string().min(1).optional(),
});

const branchNameInputSchema = z.object({
  ...projectIdField,
  name: z.string().min(1),
});

const branchCreateInputSchema = z.object({
  ...projectIdField,
  name: z.string().min(1),
  startPoint: z.string().min(1).optional(),
  checkout: z.boolean().optional(),
});

// D5: files[] (paths não-vazios) e all:true são mutuamente exclusivos — a
// refine faz o gate zod do Control Plane rejeitar com INVALID_INPUT antes da
// autorização (o service também revalida, defesa em profundidade).
const commitInputSchema = z
  .object({
    ...projectIdField,
    message: z.string().min(1),
    files: z.array(z.string().min(1)).min(1).optional(),
    all: z.boolean().optional(),
    expectedHead: z.string().min(1).optional(),
  })
  .refine((v) => !(v.files !== undefined && v.all === true), {
    message: "commit scope: 'files' and 'all' are mutually exclusive (decision D5)",
  });

const remoteBranchInputSchema = z.object({
  ...projectIdField,
  remote: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
});

const remoteInputSchema = z.object({
  ...projectIdField,
  remote: z.string().min(1).optional(),
});

export interface GitCapabilityDeps {
  storage: Storage;
  security: AuthorizationBoundary; // simetria com RuntimeCapabilityDeps; gate é do Control Plane
  audit: AuditSink;
}

function getProject(
  deps: GitCapabilityDeps,
  projectId: string,
  ctx: ExecutionContext,
): Result<ProjectRegistration> {
  const project = deps.storage.repos.projects.getById(projectId);
  if (project === null) {
    return err(
      nexoError('NOT_FOUND', `Project not registered: '${projectId}'`, {
        operationId: ctx.operationId,
        resource: projectId,
      }),
    );
  }
  return ok(project);
}

/**
 * GitService por invoke: executor REAL com allowedRoot = rootPath registrado,
 * actor do ctx e audit (cada processo git é auditado pelo executor — o
 * service não duplica eventos de comando, doc 10 §64). A factory recebe ctx,
 * mas o executor já carrega o actor correto do invoke corrente.
 */
function makeService(deps: GitCapabilityDeps, project: ProjectRegistration, ctx: ExecutionContext): GitService {
  const executor = createCommandExecutor({
    allowedRoot: project.rootPath,
    audit: deps.audit,
    actor: ctx.executedBy,
  });
  return createGitService({ executorFactory: () => executor });
}

function gitContract(
  id: string,
  description: string,
  inputSchema: z.ZodType<unknown>,
  risk: CapabilityContract['risk'],
  timeoutMs: number,
): CapabilityContract {
  return {
    id,
    version: 1,
    domain: 'git',
    description,
    inputSchema,
    resultSchema: z.unknown(),
    requiredPermission: id, // padrão M1/D3: requiredPermission === capability id
    risk,
    sideEffects: risk !== 'SAFE',
    async: 'sync',
    timeoutMs,
  };
}

// ---- contratos -------------------------------------------------------------

export function gitStatusContract(): CapabilityContract {
  return gitContract(
    'git.status',
    'Estado real do repositório (branch, HEAD, tracking, mudanças, op-states) — nunca fingido (doc 10 §4/§8/§10)',
    statusInputSchema,
    'SAFE',
    GIT_READ_TIMEOUT_MS,
  );
}

export function gitDiffContract(): CapabilityContract {
  return gitContract(
    'git.diff',
    'Diff real (patch + numstat) entre worktree/HEAD, staged, commits ou branches (doc 10 §11/§12)',
    diffInputSchema,
    'SAFE',
    GIT_READ_TIMEOUT_MS,
  );
}

export function gitHistoryContract(): CapabilityContract {
  return gitContract(
    'git.history',
    'Histórico real de commits (hash, autor, mensagem, data, parents, refs; limit 1..100) (doc 10 §41/§43)',
    historyInputSchema,
    'SAFE',
    GIT_READ_TIMEOUT_MS,
  );
}

export function gitBranchListContract(): CapabilityContract {
  return gitContract(
    'git.branch.list',
    'Lista branches reais do repositório (atual, tracking, HEAD) (doc 10 §14)',
    statusInputSchema,
    'SAFE',
    GIT_READ_TIMEOUT_MS,
  );
}

export function gitBranchCreateContract(): CapabilityContract {
  return gitContract(
    'git.branch.create',
    'Cria branch real (check-ref-format do git; opcional startPoint/checkout) — DESTRUCTIVE: requer aprovação',
    branchCreateInputSchema,
    'DESTRUCTIVE',
    GIT_READ_TIMEOUT_MS,
  );
}

export function gitBranchSwitchContract(): CapabilityContract {
  return gitContract(
    'git.branch.switch',
    'Troca de branch com pré-checagens reais (conflitos, op em progresso, working tree suja) — DESTRUCTIVE: requer aprovação (doc 10 §16/§47)',
    branchNameInputSchema,
    'DESTRUCTIVE',
    GIT_READ_TIMEOUT_MS,
  );
}

export function gitBranchDeleteContract(): CapabilityContract {
  return gitContract(
    'git.branch.delete',
    "Remove branch real (nunca a atual; force é capability RESERVADA 'git.branch.deleteForce', D3) — DESTRUCTIVE: requer aprovação",
    branchNameInputSchema,
    'DESTRUCTIVE',
    GIT_READ_TIMEOUT_MS,
  );
}

export function gitCommitContract(): CapabilityContract {
  return gitContract(
    'git.commit',
    'Commit real com mensagem explícita; escopo D5 (staged default, files[] ou all opt-in), expectedHead otimista (doc 10 §20/§21/§66/§67) — DESTRUCTIVE: requer aprovação',
    commitInputSchema,
    'DESTRUCTIVE',
    GIT_WRITE_TIMEOUT_MS,
  );
}

export function gitPushContract(): CapabilityContract {
  return gitContract(
    'git.push',
    "Push real para o remoto (JAMAIS force — 'git.forcePush' é reservada, D3) com verificação pós-push best-effort (doc 10 §24/§25/§59) — DESTRUCTIVE: requer aprovação",
    remoteBranchInputSchema,
    'DESTRUCTIVE',
    GIT_WRITE_TIMEOUT_MS,
  );
}

export function gitPullContract(): CapabilityContract {
  return gitContract(
    'git.pull',
    'Pull real com pré-checagem de working tree suja e verificação pós-pull (doc 10 §26/§60) — DESTRUCTIVE: requer aprovação',
    remoteBranchInputSchema,
    'DESTRUCTIVE',
    GIT_WRITE_TIMEOUT_MS,
  );
}

export function gitFetchContract(): CapabilityContract {
  return gitContract(
    'git.fetch',
    'Fetch real de refs do remoto (doc 10 §27) — DESTRUCTIVE: requer aprovação',
    remoteInputSchema,
    'DESTRUCTIVE',
    GIT_WRITE_TIMEOUT_MS,
  );
}

// ---- handlers --------------------------------------------------------------

export function makeGitStatusHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId } = statusInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    return makeService(deps, found.value, ctx).status(ctx);
  };
}

export function makeGitDiffHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const parsed = diffInputSchema.parse(input);
    const found = getProject(deps, parsed.projectId, ctx);
    if (!found.ok) return found;
    return makeService(deps, found.value, ctx).diff(ctx, {
      ...(parsed.mode !== undefined ? { mode: parsed.mode } : {}),
      ...(parsed.from !== undefined ? { from: parsed.from } : {}),
      ...(parsed.to !== undefined ? { to: parsed.to } : {}),
      ...(parsed.path !== undefined ? { path: parsed.path } : {}),
    });
  };
}

export function makeGitHistoryHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const parsed = historyInputSchema.parse(input);
    const found = getProject(deps, parsed.projectId, ctx);
    if (!found.ok) return found;
    return makeService(deps, found.value, ctx).history(ctx, {
      ...(parsed.limit !== undefined ? { limit: parsed.limit } : {}),
      ...(parsed.ref !== undefined ? { ref: parsed.ref } : {}),
    });
  };
}

export function makeGitBranchListHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId } = statusInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    return makeService(deps, found.value, ctx).branchList(ctx);
  };
}

export function makeGitBranchCreateHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const parsed = branchCreateInputSchema.parse(input);
    const found = getProject(deps, parsed.projectId, ctx);
    if (!found.ok) return found;
    return makeService(deps, found.value, ctx).branchCreate(ctx, {
      name: parsed.name,
      ...(parsed.startPoint !== undefined ? { startPoint: parsed.startPoint } : {}),
      ...(parsed.checkout !== undefined ? { checkout: parsed.checkout } : {}),
    });
  };
}

export function makeGitBranchSwitchHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId, name } = branchNameInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    const result = await makeService(deps, found.value, ctx).branchSwitch(ctx, { name });
    // doc 10 §49: troca de branch efetiva deixa a Project Intelligence stale.
    if (result.ok && result.value.result === 'SWITCHED') {
      return ok({ ...result.value, piRefreshRecommended: true });
    }
    return result;
  };
}

export function makeGitBranchDeleteHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId, name } = branchNameInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    // D3: force NUNCA por aqui — a capability reservada git.branch.deleteForce
    // não existe em M2; o service converte force:true em UNSUPPORTED.
    return makeService(deps, found.value, ctx).branchDelete(ctx, { name, force: false });
  };
}

export function makeGitCommitHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const parsed = commitInputSchema.parse(input);
    const found = getProject(deps, parsed.projectId, ctx);
    if (!found.ok) return found;
    return makeService(deps, found.value, ctx).commit(ctx, {
      message: parsed.message,
      ...(parsed.files !== undefined ? { files: parsed.files } : {}),
      ...(parsed.all !== undefined ? { all: parsed.all } : {}),
      ...(parsed.expectedHead !== undefined ? { expectedHead: parsed.expectedHead } : {}),
    });
  };
}

export function makeGitPushHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const parsed = remoteBranchInputSchema.parse(input);
    const found = getProject(deps, parsed.projectId, ctx);
    if (!found.ok) return found;
    return makeService(deps, found.value, ctx).push(ctx, {
      ...(parsed.remote !== undefined ? { remote: parsed.remote } : {}),
      ...(parsed.branch !== undefined ? { branch: parsed.branch } : {}),
    });
  };
}

export function makeGitPullHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const parsed = remoteBranchInputSchema.parse(input);
    const found = getProject(deps, parsed.projectId, ctx);
    if (!found.ok) return found;
    // piRefreshRecommended já vem do service (doc 10 §49) — propagação direta.
    return makeService(deps, found.value, ctx).pull(ctx, {
      ...(parsed.remote !== undefined ? { remote: parsed.remote } : {}),
      ...(parsed.branch !== undefined ? { branch: parsed.branch } : {}),
    });
  };
}

export function makeGitFetchHandler(deps: GitCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const parsed = remoteInputSchema.parse(input);
    const found = getProject(deps, parsed.projectId, ctx);
    if (!found.ok) return found;
    return makeService(deps, found.value, ctx).fetch(
      ctx,
      parsed.remote !== undefined ? { remote: parsed.remote } : {},
    );
  };
}

/**
 * Registro das 11 capabilities git (bootstrap). Mantido como tabela para o
 * composition root registrar sem duplicar a lista (fonte única de verdade).
 */
export function gitCapabilityRegistrations(
  deps: GitCapabilityDeps,
): { contract: CapabilityContract; handler: (input: unknown, ctx: ExecutionContext) => Promise<Result<unknown>> }[] {
  return [
    { contract: gitStatusContract(), handler: makeGitStatusHandler(deps) },
    { contract: gitDiffContract(), handler: makeGitDiffHandler(deps) },
    { contract: gitHistoryContract(), handler: makeGitHistoryHandler(deps) },
    { contract: gitBranchListContract(), handler: makeGitBranchListHandler(deps) },
    { contract: gitBranchCreateContract(), handler: makeGitBranchCreateHandler(deps) },
    { contract: gitBranchSwitchContract(), handler: makeGitBranchSwitchHandler(deps) },
    { contract: gitBranchDeleteContract(), handler: makeGitBranchDeleteHandler(deps) },
    { contract: gitCommitContract(), handler: makeGitCommitHandler(deps) },
    { contract: gitPushContract(), handler: makeGitPushHandler(deps) },
    { contract: gitPullContract(), handler: makeGitPullHandler(deps) },
    { contract: gitFetchContract(), handler: makeGitFetchHandler(deps) },
  ];
}
