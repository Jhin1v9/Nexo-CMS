/**
 * GitService (doc 10 §3/§51): pré-checagens de segurança (§16/§26/§47),
 * GitClient sobre o Runtime, verificação pós-operação (§58/§59/§60) e
 * derivação de estados (§8/§45) — tudo contra o git REAL (Inv. 14, §83).
 *
 * - O consumidor injeta `executorFactory(ctx)` (apps/runtime cria o executor
 *   com allowedRoot = rootPath do projeto, actor e audit). Este package NUNCA
 *   cria executor sem allowedRoot.
 * - Autorização/capability NÃO é decidida aqui: o control plane faz o gate de
 *   permissão antes de invocar (doc 10 §3: GitService -> Authorization -> Runtime).
 * - Audit: o executor já audita CADA processo git (allow E deny); o service
 *   não duplica eventos de comando — apenas propaga `ctx.operationId` (doc 10 §64)
 *   em todos os erros para correlação AI Request -> git.* -> Runtime -> Audit.
 * - Toda mutação re-lê o estado relevante imediatamente antes (doc 10 §66) e
 *   verifica o resultado depois (No Fake Success / Inv. 26).
 */

import { existsSync, readdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, nexoError, ok, type NexoError, type Result } from '@nexo/shared';
import type { ExecutionContext } from '@nexo/core';
import type { AuditSink } from '@nexo/security';
import type { RuntimeCommandExecutor } from '@nexo/runtime';

import { createGitClient, rejectFlagLike, type GitClient } from './client.js';
import { classifyGitError, gitErrorToNexo } from './errors.js';
import { redactText } from './redact.js';
import type {
  GitBranchInfo,
  GitDiffOptions,
  GitDiffResult,
  GitFileChange,
  GitLogEntry,
  GitPullResult,
  GitRemoteState,
  GitRepoState,
  GitStatusOutput,
  GitStatusResult,
  GitSwitchResult,
} from './types.js';

export interface GitSwitchOutcome {
  result: GitSwitchResult;
  branch?: string;
  /** Status real capturado no momento da decisão (doc 10 §16). */
  status?: GitStatusOutput;
  message?: string;
}

export interface GitCommitOutcome {
  commit: {
    hash: string;
    message: string;
    /** `Nome <email>` lido do commit real (git log -1). */
    author: string;
    dateISO: string;
  };
  /** doc 10 §58: HEAD re-lido após o commit confirma hash novo != anterior. */
  verified: boolean;
}

export interface GitPushOutcome {
  pushed: true;
  remote: string;
  branch: string | null;
  /** doc 10 §59: verificação best-effort do ref remoto; nunca fingida (verified:false + verifyReason). */
  verified: boolean;
  verifyReason?: string;
}

export interface GitPullOutcome {
  result: GitPullResult;
  head: string | null;
  conflicts?: GitFileChange[];
  /** doc 10 §49: após pull com mudanças, Project Intelligence deve ser revalidada. */
  piRefreshRecommended: boolean;
}

export interface GitFetchOutcome {
  fetched: true;
  remote: string;
  refs?: string[];
}

export interface GitService {
  status(ctx: ExecutionContext): Promise<Result<GitStatusOutput>>;
  diff(ctx: ExecutionContext, opts: GitDiffOptions): Promise<Result<GitDiffResult>>;
  history(ctx: ExecutionContext, opts?: { limit?: number; ref?: string }): Promise<Result<GitLogEntry[]>>;
  branchList(ctx: ExecutionContext): Promise<Result<GitBranchInfo[]>>;
  branchCreate(
    ctx: ExecutionContext,
    opts: { name: string; startPoint?: string; checkout?: boolean },
  ): Promise<Result<{ created: true; name: string; checkedOut: boolean }>>;
  branchSwitch(ctx: ExecutionContext, opts: { name: string }): Promise<Result<GitSwitchOutcome>>;
  branchDelete(ctx: ExecutionContext, opts: { name: string; force?: boolean }): Promise<Result<{ deleted: true; name: string }>>;
  commit(
    ctx: ExecutionContext,
    opts: { message: string; files?: string[]; all?: boolean; expectedHead?: string },
  ): Promise<Result<GitCommitOutcome>>;
  push(ctx: ExecutionContext, opts?: { remote?: string; branch?: string }): Promise<Result<GitPushOutcome>>;
  pull(ctx: ExecutionContext, opts?: { remote?: string; branch?: string }): Promise<Result<GitPullOutcome>>;
  fetch(ctx: ExecutionContext, opts?: { remote?: string }): Promise<Result<GitFetchOutcome>>;
}

export interface GitServiceOptions {
  /** Factory injetada pelo consumidor: cria o executor com allowedRoot = Project Root, actor, audit. */
  executorFactory: (ctx: ExecutionContext) => RuntimeCommandExecutor;
  /**
   * Reservado para eventos de nível de serviço futuros. O executor já audita
   * cada processo git; o service NÃO duplica eventos de comando (doc 10 §64).
   */
  audit?: AuditSink;
}

/** Propaga ctx.operationId em todo erro que saia do service (doc 10 §64). */
function withOperationId(error: NexoError, ctx: ExecutionContext): NexoError {
  if (error.operationId !== undefined) return error;
  return { ...error, operationId: ctx.operationId };
}

function fail(error: NexoError, ctx: ExecutionContext): Result<never> {
  return err(withOperationId(error, ctx));
}

/**
 * Derivação de remoteState (doc 10 §45) — escolha documentada:
 * tracking ausente -> LOCAL; ahead>0 && behind>0 -> DIVERGED; ahead>0 -> AHEAD;
 * behind>0 -> BEHIND; 0/0 COM tracking -> REMOTE (sincronizado com o remoto);
 * qualquer falha na leitura -> UNKNOWN (nunca afirmar sincronia sem prova, §45).
 */
export function deriveRemoteState(tracking: string | null, ahead: number, behind: number): GitRemoteState {
  if (tracking === null) return 'LOCAL';
  if (ahead > 0 && behind > 0) return 'DIVERGED';
  if (ahead > 0) return 'AHEAD';
  if (behind > 0) return 'BEHIND';
  return 'REMOTE';
}

class NexoGitService implements GitService {
  private readonly executorFactory: (ctx: ExecutionContext) => RuntimeCommandExecutor;

  constructor(opts: GitServiceOptions) {
    this.executorFactory = opts.executorFactory;
    // opts.audit intencionalmente não usado: ver header (executor audita processos).
  }

  private client(ctx: ExecutionContext): GitClient {
    return createGitClient({ executor: this.executorFactory(ctx) });
  }

  /** Exige repo real (doc 10 §4: nunca fingir version control inexistente). */
  private async requireRepo(client: GitClient, ctx: ExecutionContext) {
    const det = await client.detect('.');
    if (!det.ok) return fail(det.error, ctx);
    if (!det.value.isRepo) {
      return fail(gitErrorToNexo('RepositoryNotFound', { message: 'Not a git repository' }), ctx);
    }
    return ok(det.value);
  }

  /**
   * Detecção de operações em progresso via arquivos reais do git-dir (doc 10 §8):
   * MERGE_HEAD, rebase-merge/rebase-apply, CHERRY_PICK_HEAD, REVERT_HEAD.
   * Só inspeciona se o git-dir real resolver DENTRO do repoRoot real (repos
   * normais); worktrees com git-dir externo são puladas (sem invenção).
   */
  private async operationStates(gitDir: string | undefined, repoRoot: string): Promise<GitRepoState[]> {
    if (gitDir === undefined) return [];
    try {
      const rootReal = await fs.realpath(repoRoot);
      const dirReal = await fs.realpath(gitDir);
      if (dirReal !== rootReal && !dirReal.startsWith(rootReal + path.sep)) return [];
      const states: GitRepoState[] = [];
      if (existsSync(path.join(dirReal, 'MERGE_HEAD'))) states.push('MERGE_IN_PROGRESS');
      if (existsSync(path.join(dirReal, 'rebase-merge')) || existsSync(path.join(dirReal, 'rebase-apply'))) {
        states.push('REBASE_IN_PROGRESS');
      }
      if (existsSync(path.join(dirReal, 'CHERRY_PICK_HEAD'))) states.push('CHERRY_PICK_IN_PROGRESS');
      if (existsSync(path.join(dirReal, 'REVERT_HEAD'))) states.push('REVERT_IN_PROGRESS');
      return states;
    } catch {
      return []; // falha de FS não inventa estado: segue sem op-states
    }
  }

  async status(ctx: ExecutionContext): Promise<Result<GitStatusOutput>> {
    const client = this.client(ctx);
    const det = await client.detect('.');
    if (!det.ok) return fail(det.error, ctx);
    if (!det.value.isRepo) {
      // Representação explícita de não-repo (doc 10 §4): nunca fingir.
      return ok({ isRepo: false, states: ['NO_REPOSITORY'] });
    }
    const raw = await client.status('.');
    if (!raw.ok) return fail(raw.error, ctx);
    const opStates = await this.operationStates(det.value.gitDir, det.value.repoRoot ?? '.');

    const states: GitRepoState[] = [...opStates];
    if (raw.value.conflicts.length > 0) states.push('CONFLICTED');
    if (raw.value.staged.length > 0) states.push('STAGED');
    if (raw.value.unstaged.length > 0) states.push('MODIFIED');
    if (raw.value.untracked.length > 0) states.push('UNTRACKED');
    if (raw.value.detached) states.push('DETACHED_HEAD');
    if (
      raw.value.staged.length === 0 &&
      raw.value.unstaged.length === 0 &&
      raw.value.untracked.length === 0 &&
      raw.value.conflicts.length === 0
    ) {
      states.push('CLEAN');
    }

    const result: GitStatusResult = {
      isRepo: true,
      repoRoot: det.value.repoRoot ?? '',
      branch: raw.value.branch,
      head: raw.value.head,
      detached: raw.value.detached,
      tracking: raw.value.tracking,
      ahead: raw.value.ahead,
      behind: raw.value.behind,
      staged: raw.value.staged,
      unstaged: raw.value.unstaged,
      untracked: raw.value.untracked,
      conflicts: raw.value.conflicts,
      states,
      remoteState: deriveRemoteState(raw.value.tracking, raw.value.ahead, raw.value.behind),
    };
    return ok(result);
  }

  async diff(ctx: ExecutionContext, opts: GitDiffOptions): Promise<Result<GitDiffResult>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;
    const r = await client.diff('.', opts);
    if (!r.ok) return fail(r.error, ctx);
    return r;
  }

  async history(ctx: ExecutionContext, opts: { limit?: number; ref?: string } = {}): Promise<Result<GitLogEntry[]>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;
    // doc 10 §43: histórico mínimo relevante — limit clamp [1, 100].
    const limit = Math.min(100, Math.max(1, Math.trunc(opts.limit ?? 20)));
    const r = await client.log('.', { limit, ...(opts.ref !== undefined ? { ref: opts.ref } : {}) });
    if (!r.ok) return fail(r.error, ctx);
    return r;
  }

  async branchList(ctx: ExecutionContext): Promise<Result<GitBranchInfo[]>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;
    const r = await client.branchList('.');
    if (!r.ok) return fail(r.error, ctx);
    return r;
  }

  async branchCreate(
    ctx: ExecutionContext,
    opts: { name: string; startPoint?: string; checkout?: boolean },
  ): Promise<Result<{ created: true; name: string; checkedOut: boolean }>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;
    // check-ref-format real acontece no client ANTES de criar (doc 10 §15/§77).
    const r = await client.branchCreate('.', opts.name, {
      ...(opts.startPoint !== undefined ? { startPoint: opts.startPoint } : {}),
      checkout: opts.checkout === true,
    });
    if (!r.ok) return fail(r.error, ctx);
    return ok({ created: true, name: opts.name, checkedOut: opts.checkout === true });
  }

  async branchSwitch(ctx: ExecutionContext, opts: { name: string }): Promise<Result<GitSwitchOutcome>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;

    const bad = rejectFlagLike(opts.name, 'branch name');
    if (bad) return fail(bad, ctx);

    // Pré-checagem (doc 10 §16/§47): nunca executar às cegas.
    const branches = await client.branchList('.');
    if (!branches.ok) return fail(branches.error, ctx);
    const target = branches.value.find((b) => b.name === opts.name);
    if (!target) {
      return fail(
        gitErrorToNexo('BranchNotFound', { resource: opts.name, message: `Branch not found: '${opts.name}'` }),
        ctx,
      );
    }

    const st = await this.status(ctx);
    if (!st.ok) return st;
    if (st.value.isRepo && st.value.branch === opts.name) {
      return ok({ result: 'SWITCHED', branch: opts.name }); // já na branch: idempotente
    }
    if (st.value.isRepo && st.value.conflicts.length > 0) {
      return ok({ result: 'BLOCKED', status: st.value, message: 'Unresolved merge conflicts present' });
    }
    if (
      st.value.isRepo &&
      st.value.states.some((s) =>
        ['MERGE_IN_PROGRESS', 'REBASE_IN_PROGRESS', 'CHERRY_PICK_IN_PROGRESS', 'REVERT_IN_PROGRESS'].includes(s),
      )
    ) {
      return ok({ result: 'BLOCKED', status: st.value, message: 'Git operation in progress' });
    }
    // Heurística conservadora documentada (doc 10 §16/§47): working tree com
    // mudanças staged/unstaged -> NÃO executar o switch; o usuário decide entre
    // commitar (REQUIRES_COMMIT) ou fazer stash fora deste fluxo. Untracked não
    // bloqueia aqui: se o git recusar por overwrite, mapeamos abaixo.
    if (st.value.isRepo && (st.value.staged.length > 0 || st.value.unstaged.length > 0)) {
      return ok({
        result: 'REQUIRES_COMMIT',
        status: st.value,
        message: 'Working tree has staged/unstaged changes; commit or stash before switching',
      });
    }

    const r = await client.branchSwitch('.', opts.name);
    if (!r.ok) {
      const kind = classifyGitError(String(r.error.details?.['stderr'] ?? ''));
      if (kind === 'WorkingTreeDirty') {
        const after = await this.status(ctx);
        return ok({
          result: 'BLOCKED',
          ...(after.ok ? { status: after.value } : {}),
          message: r.error.message,
        });
      }
      if (kind === 'MergeConflict') {
        const after = await this.status(ctx);
        return ok({
          result: 'CONFLICT',
          ...(after.ok ? { status: after.value } : {}),
          message: r.error.message,
        });
      }
      return fail(r.error, ctx);
    }
    return ok({ result: 'SWITCHED', branch: opts.name });
  }

  async branchDelete(
    ctx: ExecutionContext,
    opts: { name: string; force?: boolean },
  ): Promise<Result<{ deleted: true; name: string }>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;

    const bad = rejectFlagLike(opts.name, 'branch name');
    if (bad) return fail(bad, ctx);

    // doc 10 §17/§70 + decisão D3: force delete é capability RESERVADA
    // (git.branch.deleteForce) — sem grant no M2: DEFAULT DENY -> UNSUPPORTED.
    if (opts.force === true) {
      return fail(
        nexoError(
          'UNSUPPORTED',
          "Force branch deletion requires the reserved high-risk capability 'git.branch.deleteForce' (doc 10 §17/§70, decision D3)",
          { resource: opts.name, requiredCapability: 'git.branch.deleteForce', details: { reservedCapability: 'git.branch.deleteForce' } },
        ),
        ctx,
      );
    }

    const det = repo.value;
    if (det.branch === opts.name) {
      return fail(nexoError('INVALID_INPUT', `Cannot delete the current branch: '${opts.name}'`, { resource: opts.name }), ctx);
    }
    const branches = await client.branchList('.');
    if (!branches.ok) return fail(branches.error, ctx);
    if (!branches.value.some((b) => b.name === opts.name)) {
      return fail(
        gitErrorToNexo('BranchNotFound', { resource: opts.name, message: `Branch not found: '${opts.name}'` }),
        ctx,
      );
    }
    // Branch não mergeada: o próprio git recusa (`not fully merged`) -> CONFLICT.
    const r = await client.branchDelete('.', opts.name, { force: false });
    if (!r.ok) return fail(r.error, ctx);
    return ok({ deleted: true, name: opts.name });
  }

  async commit(
    ctx: ExecutionContext,
    opts: { message: string; files?: string[]; all?: boolean; expectedHead?: string },
  ): Promise<Result<GitCommitOutcome>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;

    if (typeof opts.message !== 'string' || opts.message.trim().length === 0) {
      return fail(nexoError('INVALID_INPUT', 'commit message must be explicit and non-empty (doc 10 §21)'), ctx);
    }
    if (opts.files !== undefined && opts.all === true) {
      return fail(nexoError('INVALID_INPUT', "commit scope: 'files' and 'all' are mutually exclusive (decision D5)"), ctx);
    }

    // Re-leitura imediata do estado antes da mutação (doc 10 §66).
    const headBefore = await client.revParse('.', 'HEAD');
    const headBeforeHash = headBefore.ok ? headBefore.value : null;

    // Concorrência otimista (doc 10 §67): expectedHead divergente -> CONFLICT,
    // nunca agir sobre repositório que mudou por fora.
    if (opts.expectedHead !== undefined) {
      if (!/^[0-9a-f]{7,40}$/i.test(opts.expectedHead)) {
        return fail(
          gitErrorToNexo('InvalidReference', {
            resource: opts.expectedHead,
            message: `expectedHead is not a valid commit hash: '${redactText(opts.expectedHead).slice(0, 64)}'`,
          }),
          ctx,
        );
      }
      if (headBeforeHash === null || headBeforeHash !== opts.expectedHead) {
        return fail(
          nexoError('CONFLICT', 'Expected HEAD mismatch (doc 10 §66/§67): repository changed since last read', {
            resource: 'HEAD',
            details: { expectedHead: opts.expectedHead, actualHead: headBeforeHash, nextAction: 're-read-status' },
          }),
          ctx,
        );
      }
    }

    // Escopo do commit (doc 10 §20, decisão D5): default = somente o que já
    // está staged; files[] = staging explícito de paths validados; all=true =
    // opt-in explícito. Selected hunks NÃO suportados (§20 "where supported").
    if (opts.files !== undefined) {
      const staged = await client.stage('.', opts.files);
      if (!staged.ok) return fail(staged.error, ctx);
    } else if (opts.all === true) {
      const staged = await client.stageAll('.');
      if (!staged.ok) return fail(staged.error, ctx);
    }

    const committed = await client.commit('.', opts.message);
    if (!committed.ok) {
      const stderr = String(committed.error.details?.['stderr'] ?? '');
      if (/nothing to commit|no changes added to commit/i.test(stderr)) {
        return fail(
          nexoError('INVALID_INPUT', 'nothing to commit (no staged changes in scope)', {
            details: { stderr: redactText(stderr).slice(0, 500) },
          }),
          ctx,
        );
      }
      // doc 10 §54/§57: hooks executam de verdade; falha de hook é HookFailed.
      if (committed.error.details?.['gitError'] === 'UnknownGitError') {
        const hooksDir = repo.value.gitDir !== undefined ? path.join(repo.value.gitDir, 'hooks') : null;
        if (hooksDir !== null && this.hasActiveHooks(hooksDir)) {
          return fail(
            gitErrorToNexo('HookFailed', { stderr, message: 'git commit rejected (project hook active, see stderr)' }),
            ctx,
          );
        }
      }
      return fail(committed.error, ctx);
    }

    // Verificação pós-commit (doc 10 §58): HEAD novo, diferente do anterior,
    // lido do git real — nunca confiar só no exit code (No Fake Success).
    const headAfter = await client.revParse('.', 'HEAD');
    if (!headAfter.ok) return fail(headAfter.error, ctx);
    if (headAfter.value === headBeforeHash) {
      return fail(
        nexoError('INTERNAL', 'commit verification failed: HEAD did not advance after commit', {
          details: { headBefore: headBeforeHash, headAfter: headAfter.value },
        }),
        ctx,
      );
    }
    const last = await client.log('.', { limit: 1 });
    const entry = last.ok ? last.value[0] : undefined;
    return ok({
      commit: {
        hash: headAfter.value,
        message: entry?.message ?? opts.message,
        author: entry !== undefined ? `${entry.authorName} <${entry.authorEmail}>` : 'unknown',
        dateISO: entry?.dateISO ?? new Date().toISOString(),
      },
      verified: true,
    });
  }

  /** Hook ativo = arquivo não-sample em .git/hooks (doc 10 §54). */
  private hasActiveHooks(hooksDir: string): boolean {
    try {
      if (!existsSync(hooksDir)) return false;
      return readdirSync(hooksDir).some((f) => !f.endsWith('.sample'));
    } catch {
      return false;
    }
  }

  async push(ctx: ExecutionContext, opts: { remote?: string; branch?: string } = {}): Promise<Result<GitPushOutcome>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;
    const remote = opts.remote ?? 'origin';

    // Push é operação SEPARADA de commit (doc 10 §24). JAMAIS force (§25).
    const r = await client.push('.', { remote, ...(opts.branch !== undefined ? { branch: opts.branch } : {}) });
    if (!r.ok) return fail(r.error, ctx);

    // Verificação pós-push best-effort (doc 10 §59): compara HEAD com o
    // upstream real. Se não for verificável (sem upstream), verified:false com
    // razão — nunca fingir verificação (Inv. 26).
    const head = await client.revParse('.', 'HEAD');
    const upstream = await client.revParse('.', '@{u}');
    const branch = opts.branch ?? repo.value.branch ?? null;
    if (head.ok && upstream.ok) {
      if (upstream.value === head.value) {
        return ok({ pushed: true, remote, branch, verified: true });
      }
      return ok({
        pushed: true,
        remote,
        branch,
        verified: false,
        verifyReason: `upstream '${upstream.value}' differs from HEAD '${head.value}' after push`,
      });
    }
    return ok({
      pushed: true,
      remote,
      branch,
      verified: false,
      verifyReason: 'no upstream reference available to verify push result',
    });
  }

  async pull(ctx: ExecutionContext, opts: { remote?: string; branch?: string } = {}): Promise<Result<GitPullOutcome>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;

    // Pré-checagem (doc 10 §26/§47): working tree com mudanças staged/unstaged
    // -> recusar ANTES de executar (nunca sobrescrever mudanças locais).
    const st = await this.status(ctx);
    if (!st.ok) return st;
    if (st.value.isRepo && (st.value.staged.length > 0 || st.value.unstaged.length > 0)) {
      return fail(
        gitErrorToNexo('WorkingTreeDirty', {
          message: 'pull would risk overwriting local changes (doc 10 §26)',
          details: { staged: st.value.staged.length, unstaged: st.value.unstaged.length },
        }),
        ctx,
      );
    }

    const r = await client.pull('.', {
      ...(opts.remote !== undefined ? { remote: opts.remote } : {}),
      ...(opts.branch !== undefined ? { branch: opts.branch } : {}),
    });
    if (!r.ok) {
      // Conflito de merge real (doc 10 §35): estado explícito + arquivos conflitados.
      if (r.error.details?.['gitError'] === 'MergeConflict') {
        const after = await this.status(ctx);
        const conflicts = after.ok && after.value.isRepo ? after.value.conflicts : [];
        return fail(
          gitErrorToNexo('MergeConflict', {
            stderr: String(r.error.details?.['stderr'] ?? ''),
            message: 'pull resulted in merge conflict (doc 10 §35)',
            details: { conflicts: conflicts.map((c) => c.path) },
          }),
          ctx,
        );
      }
      return fail(r.error, ctx);
    }

    // Verificação pós-pull (doc 10 §60): HEAD re-lido do git real.
    const headAfter = await client.revParse('.', 'HEAD');
    const head = headAfter.ok ? headAfter.value : null;
    const alreadyUpToDate = /already up[ -]to[ -]date/i.test(r.value.stdout);
    const result: GitPullResult = alreadyUpToDate ? 'ALREADY_UP_TO_DATE' : 'UPDATED';
    return ok({
      result,
      head,
      // doc 10 §49: mudanças de pull deixam Project Intelligence potencialmente stale.
      piRefreshRecommended: result === 'UPDATED',
    });
  }

  async fetch(ctx: ExecutionContext, opts: { remote?: string } = {}): Promise<Result<GitFetchOutcome>> {
    const client = this.client(ctx);
    const repo = await this.requireRepo(client, ctx);
    if (!repo.ok) return repo;
    const remote = opts.remote ?? 'origin';
    const r = await client.fetch('.', { remote });
    if (!r.ok) return fail(r.error, ctx);
    // refs atualizados não são enumerados: o git reporta em stderr em formato
    // não-estável; fetch apenas atualiza refs remotos (doc 10 §27) — resultado
    // mínimo verdadeiro, sem invenção.
    return ok({ fetched: true, remote });
  }
}

export function createGitService(opts: GitServiceOptions): GitService {
  return new NexoGitService(opts);
}
