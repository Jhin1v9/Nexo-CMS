/**
 * Capabilities M1 do domínio `runtime` (SPEC.md §4/§8/§9).
 *
 * Todas exigem `projectId` no input e operam SCOPED ao rootPath do projeto
 * registrado (SCOPE_VIOLATION/NOT_FOUND estruturados — o guard anti-escape
 * vive em @nexo/runtime; aqui apenas instanciamos o scope por invoke).
 *
 * Política M1 de comandos (ver ../policy.ts):
 *  - SAFE -> executa (grant runtime.command.execute);
 *  - RESTRICTED/UNKNOWN -> REQUIRE_APPROVAL via política estática
 *    `runtime.command.execute_sensitive` do PolicyEngine (SPEC §3);
 *  - BLOCKED/DANGEROUS -> COMMAND_BLOCKED pelo executor (sem grant explícito).
 */

import type { CapabilityContract, ExecutionContext } from '@nexo/core';
import type { CommandResult, ScopedFilesystem } from '@nexo/runtime';
import { analyzeCommandArgPaths, classifyCommand, createCommandExecutor, createScopedFilesystem } from '@nexo/runtime';
import type { AuthorizationBoundary, AuditSink } from '@nexo/security';
import { authorizationErrorFor } from '@nexo/security';
import type { Result } from '@nexo/shared';
import { err, nexoError, ok } from '@nexo/shared';
import type { DirEntry } from '@nexo/runtime';
import type { ProjectRegistration, Storage } from '@nexo/storage';
import { z } from 'zod';

import { SENSITIVE_COMMAND_PERMISSION } from '../policy.js';

/** Cap de timeout M1 para command.execute (SPEC §9: sync com cap 120s). */
export const COMMAND_TIMEOUT_CAP_MS = 120_000;

export interface FsReadInput {
  projectId: string;
  path: string;
}

export interface FsReadOutput {
  path: string;
  content: string;
}

export interface FsListInput {
  projectId: string;
  path?: string;
}

export interface FsListOutput {
  path: string;
  entries: DirEntry[];
}

export interface CommandExecuteInput {
  projectId: string;
  command: string;
  args?: string[];
  timeoutMs?: number;
}

const fsReadInputSchema = z.object({
  projectId: z.string().min(1),
  path: z.string().min(1),
});

const fsListInputSchema = z.object({
  projectId: z.string().min(1),
  path: z.string().min(1).optional(),
});

const commandInputSchema = z.object({
  projectId: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  timeoutMs: z.number().int().positive().max(COMMAND_TIMEOUT_CAP_MS).optional(),
});

export interface RuntimeCapabilityDeps {
  storage: Storage;
  security: AuthorizationBoundary;
  audit: AuditSink;
}

function getProject(
  deps: RuntimeCapabilityDeps,
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

/** Scoped filesystem por invoke, a partir do rootPath registrado (SPEC §9). */
function scopeFilesystem(project: ProjectRegistration): ScopedFilesystem {
  return createScopedFilesystem(project.rootPath);
}

export function fsReadContract(): CapabilityContract {
  return {
    id: 'runtime.filesystem.read',
    version: 1,
    domain: 'runtime',
    description: 'Lê arquivo texto scoped ao Project Root (guard anti-escape: SCOPE_VIOLATION)',
    inputSchema: fsReadInputSchema,
    resultSchema: z.unknown(),
    requiredPermission: 'runtime.filesystem.read',
    risk: 'SAFE',
    sideEffects: false,
    async: 'sync',
    timeoutMs: 10_000,
  };
}

export function makeFsReadHandler(deps: RuntimeCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId, path } = fsReadInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    const read = await scopeFilesystem(found.value).readFile(path);
    if (!read.ok) return read;
    const output: FsReadOutput = { path, content: read.value };
    return ok(output);
  };
}

export function fsListContract(): CapabilityContract {
  return {
    id: 'runtime.filesystem.list',
    version: 1,
    domain: 'runtime',
    description: 'Lista diretório scoped ao Project Root (guard anti-escape: SCOPE_VIOLATION)',
    inputSchema: fsListInputSchema,
    resultSchema: z.unknown(),
    requiredPermission: 'runtime.filesystem.list',
    risk: 'SAFE',
    sideEffects: false,
    async: 'sync',
    timeoutMs: 10_000,
  };
}

export function makeFsListHandler(deps: RuntimeCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId, path } = fsListInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    const listed = await scopeFilesystem(found.value).listDir(path ?? '.');
    if (!listed.ok) return listed;
    const output: FsListOutput = { path: path ?? '.', entries: listed.value };
    return ok(output);
  };
}

export function commandExecuteContract(): CapabilityContract {
  return {
    id: 'runtime.command.execute',
    version: 1,
    domain: 'runtime',
    description:
      'Executa comando real (spawn sem shell) scoped ao Project Root; SAFE executa, não-SAFE exige aprovação, BLOCKED/DANGEROUS bloqueados',
    inputSchema: commandInputSchema,
    resultSchema: z.unknown(),
    requiredPermission: 'runtime.command.execute',
    risk: 'MODIFYING',
    sideEffects: true,
    async: 'sync', // M1: sync com cap de timeout 120s (async:'job' é opção futura, SPEC §9)
    timeoutMs: COMMAND_TIMEOUT_CAP_MS + 5_000,
  };
}

export function makeCommandExecuteHandler(deps: RuntimeCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const parsed = commandInputSchema.parse(input);
    const found = getProject(deps, parsed.projectId, ctx);
    if (!found.ok) return found;
    const project = found.value;

    const command = { command: parsed.command, args: parsed.args ?? [], cwd: '.' };
    let classification = classifyCommand(command.command, command.args);

    // Wave 5 (FIX 1): comando SAFE cujo arg-path não pode ser analisado com
    // segurança (ex.: '~', null byte — regra em @nexo/runtime/arg-paths.ts) é
    // REBAIXADO para RESTRICTED AQUI, antes da autorização, para cair no
    // approval gate da política em vez de executar. Arg-paths analisáveis que
    // violam o escopo viram SCOPE_VIOLATION no executor (ator-independente).
    if (classification === 'SAFE' && analyzeCommandArgPaths(command.args).unanalyzable.length > 0) {
      classification = 'RESTRICTED';
    }

    // Política M1 (../policy.ts): ALLOW apenas para SAFE. RESTRICTED/UNKNOWN
    // exigem aprovação explícita — a regra estática '*.execute_sensitive' do
    // PolicyEngine retorna REQUIRE_APPROVAL mesmo com grant (SPEC §3).
    if (classification === 'RESTRICTED' || classification === 'UNKNOWN') {
      const decision = deps.security.authorize({
        actor: ctx.executedBy,
        permission: SENSITIVE_COMMAND_PERMISSION,
        scope: { projectId: project.id, workspaceId: ctx.workspaceId, environment: ctx.environment },
        context: { operationId: ctx.operationId, classification, command: command.command },
      });
      if (decision !== 'ALLOW') {
        const error = authorizationErrorFor(
          {
            actor: ctx.executedBy,
            permission: SENSITIVE_COMMAND_PERMISSION,
            scope: { projectId: project.id },
          },
          decision,
        );
        error.operationId = ctx.operationId;
        error.details = { ...error.details, classification, command: command.command };
        return err(error);
      }
    }

    // Executor com allowedRoot = rootPath registrado; BLOCKED/DANGEROUS ->
    // COMMAND_BLOCKED pelo próprio executor (audit interno de allow/deny).
    const executor = createCommandExecutor({
      allowedRoot: project.rootPath,
      audit: deps.audit,
      actor: ctx.executedBy,
    });
    const result: Result<CommandResult> = await executor.execute({
      command: command.command,
      args: command.args,
      cwd: command.cwd,
      timeoutMs: parsed.timeoutMs,
    });
    return result;
  };
}
