/**
 * CommandExecutor (SPEC.md §4): execução real via child_process.spawn SEM shell
 * (shell: false, args estruturados — Invariante 30: sem simulação).
 * - cwd validado DENTRO de um root permitido (realpath, anti symlink escape).
 * - BLOCKED/DANGEROUS -> COMMAND_BLOCKED, salvo grant explícito via função de
 *   autorização injetada.
 * - Timeout real com kill; captura stdout/stderr; durationMs; timedOut.
 * - Toda execução (allow E deny/block) emite AuditEvent via AuditSink injetado.
 * - Processos iniciados são registrados no ProcessRegistry (process.list).
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, nexoError, newOperationId, ok, type Result } from '@nexo/shared';
import type { Actor, ExecutionContext } from '@nexo/core';
import type { AuditEvent, AuditSink } from '@nexo/security';

import { analyzeCommandArgPaths } from './arg-paths.js';
import { classifyCommand, type CommandClass } from './classification.js';
import { createProcessRegistry, type ProcessRegistry } from './process-registry.js';
import { resolveWithinRoot } from './scope-guard.js';

export interface CommandRequest {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  classification: CommandClass;
  timedOut: boolean;
}

export interface CommandExecutor {
  classify(req: CommandRequest): CommandClass;
  /** spawn SEM shell; BLOCKED/DANGEROUS -> COMMAND_BLOCKED salvo grant explícito. */
  execute(req: CommandRequest): Promise<Result<CommandResult>>;
}

/**
 * Grant explícito para classes que exigem aprovação (BLOCKED/DANGEROUS).
 * Retorna true apenas quando há policy/grant explícito para ESTE comando.
 */
export type CommandAuthorizeFn = (req: CommandRequest, classification: CommandClass) => boolean;

export interface CommandExecutorOptions {
  /** cwd de toda execução deve resolver (realpath) DENTRO deste root. */
  allowedRoot: string;
  /** Timeout default quando req.timeoutMs ausente. */
  defaultTimeoutMs?: number;
  /** Ator registrado em auditoria (default: SYSTEM/runtime). */
  actor?: Actor;
  /** Sink de auditoria (SPEC §0: allow E deny registrados). */
  audit?: AuditSink;
  /** Grant explícito para BLOCKED/DANGEROUS (SPEC §4). */
  authorize?: CommandAuthorizeFn;
  /** Registry injetável (default: interno, exposto via `processes`). */
  processRegistry?: ProcessRegistry;
}

export interface RuntimeCommandExecutor extends CommandExecutor {
  readonly processes: ProcessRegistry;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const GATED_CLASSES: ReadonlySet<CommandClass> = new Set(['BLOCKED', 'DANGEROUS']);

class NodeCommandExecutor implements RuntimeCommandExecutor {
  readonly processes: ProcessRegistry;

  private readonly allowedRootAbs: string;
  private readonly defaultTimeoutMs: number;
  private readonly actor: Actor;
  private readonly audit?: AuditSink;
  private readonly authorize?: CommandAuthorizeFn;
  private allowedRootRealPromise: Promise<string> | null = null;

  constructor(opts: CommandExecutorOptions) {
    this.allowedRootAbs = path.resolve(opts.allowedRoot);
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.actor = opts.actor ?? { kind: 'SYSTEM', id: 'runtime' };
    this.audit = opts.audit;
    this.authorize = opts.authorize;
    this.processes = opts.processRegistry ?? createProcessRegistry();
  }

  classify(req: CommandRequest): CommandClass {
    return classifyCommand(req.command, req.args);
  }

  private allowedRootReal(): Promise<string> {
    this.allowedRootRealPromise ??= fs.realpath(this.allowedRootAbs);
    return this.allowedRootRealPromise;
  }

  /** cwd deve existir e resolver DENTRO do root permitido (anti symlink escape). */
  private async guardCwd(cwd: string): Promise<Result<string>> {
    if (typeof cwd !== 'string' || cwd.length === 0) {
      return err(nexoError('INVALID_INPUT', 'cwd must be a non-empty string', { resource: String(cwd) }));
    }
    const abs = path.resolve(this.allowedRootAbs, cwd);
    if (abs !== this.allowedRootAbs && !abs.startsWith(this.allowedRootAbs + path.sep)) {
      return err(
        nexoError('SCOPE_VIOLATION', `cwd escapes allowed root: '${cwd}'`, {
          resource: cwd,
          details: { allowedRoot: this.allowedRootAbs },
        }),
      );
    }
    let rootReal: string;
    try {
      rootReal = await this.allowedRootReal();
    } catch (e) {
      return err(
        nexoError('NOT_FOUND', `allowed root unavailable: ${(e as NodeJS.ErrnoException).message}`, {
          resource: this.allowedRootAbs,
        }),
      );
    }
    try {
      const real = await fs.realpath(abs);
      if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
        return err(
          nexoError('SCOPE_VIOLATION', `cwd escapes allowed root via symlink: '${cwd}'`, {
            resource: cwd,
            details: { allowedRoot: this.allowedRootAbs, resolved: real },
          }),
        );
      }
      return ok(real);
    } catch (e) {
      return err(
        nexoError('NOT_FOUND', `cwd not found: '${cwd}'`, {
          resource: cwd,
          details: { errno: (e as NodeJS.ErrnoException).code },
        }),
      );
    }
  }

  private emit(req: CommandRequest, classification: CommandClass, decision: 'ALLOW' | 'DENY', result: AuditEvent['result'], details?: Record<string, unknown>): void {
    if (!this.audit) return;
    const context: ExecutionContext = {
      operationId: newOperationId(),
      initiatedBy: this.actor,
      executedBy: this.actor,
    };
    this.audit.record({
      id: newOperationId(),
      who: this.actor,
      what: 'runtime.command.execute',
      resource: `${req.command} ${req.args.join(' ')}`.trim(),
      context,
      decision,
      result,
      at: new Date().toISOString(),
      details: { classification, cwd: req.cwd, ...details },
    });
  }

  /**
   * Wave 5 (FIX 1 — HIGH): valida CADA argumento-path de um comando SAFE
   * contra o root permitido, resolvendo contra o cwd REAL já validado.
   * Mesma lógica do ScopedFilesystem (scope-guard.ts): contenção lexical +
   * realpath do ancestral existente -> absolute escape, '../' e symlink para
   * fora do root viram SCOPE_VIOLATION e NADA é executado.
   */
  private async guardArgPaths(paths: readonly string[], cwdReal: string): Promise<Result<void>> {
    let rootReal: string;
    try {
      rootReal = await this.allowedRootReal();
    } catch (e) {
      return err(
        nexoError('NOT_FOUND', `allowed root unavailable: ${(e as NodeJS.ErrnoException).message}`, {
          resource: this.allowedRootAbs,
        }),
      );
    }
    for (const candidate of paths) {
      const resolved = await resolveWithinRoot(this.allowedRootAbs, rootReal, candidate, cwdReal);
      if (resolved.ok) continue;
      if (resolved.reason === 'ESCAPE') {
        return err(
          nexoError('SCOPE_VIOLATION', `command argument escapes allowed root: '${candidate}'`, {
            resource: candidate,
            details: { allowedRoot: this.allowedRootAbs, cwd: cwdReal },
          }),
        );
      }
      const cause = resolved.cause;
      return err(
        nexoError(
          cause.code === 'EACCES' || cause.code === 'EPERM' ? 'FORBIDDEN' : 'INTERNAL',
          `cannot validate command argument '${candidate}': ${cause.message}`,
          { resource: candidate, retryable: cause.code !== 'EACCES' && cause.code !== 'EPERM' },
        ),
      );
    }
    return ok(undefined);
  }

  async execute(req: CommandRequest): Promise<Result<CommandResult>> {
    if (typeof req.command !== 'string' || req.command.trim().length === 0 || !Array.isArray(req.args)) {
      return err(nexoError('INVALID_INPUT', 'command must be non-empty and args must be an array'));
    }
    const classification = this.classify(req);

    // Wave 5 (FIX 1): análise de arg-paths de comandos SAFE. Regra
    // documentada (arg-paths.ts): SAFE cujo arg-path NÃO pode ser analisado
    // com segurança (ex.: '~', null byte) é REBAIXADO para RESTRICTED — vai a
    // REQUIRE_APPROVAL em vez de executar. O executor não consulta política
    // (quem decide aprovação é o Control Plane, que aplica o mesmo
    // rebaixamento antes de autorizar); aqui, fail-closed: REQUIRE_APPROVAL.
    let argPaths: readonly string[] = [];
    if (classification === 'SAFE') {
      const analysis = analyzeCommandArgPaths(req.args);
      if (analysis.unanalyzable.length > 0) {
        this.emit(req, classification, 'DENY', 'FAILED', {
          reason: 'UNANALYZABLE_PATH_ARGS',
          unanalyzable: analysis.unanalyzable,
        });
        return err(
          nexoError(
            'REQUIRE_APPROVAL',
            `SAFE command with unanalyzable path argument is downgraded to RESTRICTED: '${req.command}'`,
            {
              resource: req.command,
              requiresApproval: true,
              requiredCapability: 'runtime.command.execute',
              details: {
                classification: 'RESTRICTED',
                downgradedFrom: 'SAFE',
                unanalyzable: analysis.unanalyzable,
              },
            },
          ),
        );
      }
      argPaths = analysis.pathCandidates;
    }

    if (GATED_CLASSES.has(classification)) {
      const granted = this.authorize?.(req, classification) === true;
      if (!granted) {
        this.emit(req, classification, 'DENY', 'FAILED');
        return err(
          nexoError('COMMAND_BLOCKED', `Command ${classification.toLowerCase()} and not granted: '${req.command}'`, {
            resource: req.command,
            requiresApproval: true,
            requiredCapability: 'runtime.command.execute',
            details: { classification, command: req.command, args: req.args },
          }),
        );
      }
    }

    const cwd = await this.guardCwd(req.cwd);
    if (!cwd.ok) {
      this.emit(req, classification, 'DENY', 'FAILED', { reason: cwd.error.code });
      return cwd;
    }

    // Wave 5 (FIX 1): após classificação SAFE e ANTES do spawn, cada
    // argumento-path DEVE permanecer dentro do root permitido. Violação ->
    // SCOPE_VIOLATION, nada executa (eliminada a classe "scope escape via
    // args de comandos SAFE", ex.: `cat /etc/passwd`, `cat ../../segredo`).
    if (argPaths.length > 0) {
      const guarded = await this.guardArgPaths(argPaths, cwd.value);
      if (!guarded.ok) {
        this.emit(req, classification, 'DENY', 'FAILED', { reason: guarded.error.code });
        return err(guarded.error);
      }
    }

    return this.spawnAndCollect(req, cwd.value, classification);
  }

  private spawnAndCollect(req: CommandRequest, cwdReal: string, classification: CommandClass): Promise<Result<CommandResult>> {
    return new Promise((resolve) => {
      const startedAt = new Date().toISOString();
      const start = performance.now();
      const timeoutMs = req.timeoutMs ?? this.defaultTimeoutMs;

      const child = spawn(req.command, req.args, {
        shell: false, // SEM shell: args são literais, ';'/'&&'/'|' não encadeiam (SPEC §4).
        cwd: cwdReal,
        env: req.env ? { ...process.env, ...req.env } : process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const pid = child.pid;
      if (pid !== undefined) {
        this.processes.registerStart({ pid, command: req.command, args: [...req.args], startedAt });
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL'); // timeout real com kill (SPEC §4)
      }, timeoutMs);

      const finish = (result: Result<CommandResult>, status: 'EXITED' | 'TIMED_OUT' | 'FAILED', exitCode: number | null): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (pid !== undefined) {
          this.processes.registerEnd(pid, startedAt, {
            status,
            endedAt: new Date().toISOString(),
            exitCode,
            timedOut,
          });
        }
        resolve(result);
      };

      child.on('error', (e: NodeJS.ErrnoException) => {
        const error =
          e.code === 'ENOENT'
            ? nexoError('NOT_FOUND', `Command not found: '${req.command}'`, { resource: req.command })
            : nexoError('INTERNAL', `spawn failed: ${e.message}`, { resource: req.command, retryable: true });
        this.emit(req, classification, 'ALLOW', 'FAILED', { phase: 'spawn', errno: e.code });
        finish(err(error), 'FAILED', null);
      });

      child.on('close', (code) => {
        const result: CommandResult = {
          exitCode: code,
          stdout,
          stderr,
          durationMs: Math.round(performance.now() - start),
          classification,
          timedOut,
        };
        this.emit(req, classification, 'ALLOW', timedOut ? 'FAILED' : 'SUCCESS', {
          phase: 'close',
          exitCode: code,
          timedOut,
        });
        finish(ok(result), timedOut ? 'TIMED_OUT' : 'EXITED', code);
      });
    });
  }
}

export function createCommandExecutor(opts: CommandExecutorOptions): RuntimeCommandExecutor {
  return new NodeCommandExecutor(opts);
}
