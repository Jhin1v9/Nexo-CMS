/**
 * GitClient: wrapper de baixo nível sobre o CommandExecutor do @nexo/runtime
 * (doc 10 §51: GitService cuida de semântica/interpretação/autorização;
 * o Runtime cuida da execução de processo — spawn SEM shell, scope guard,
 * timeout real, audit de todo processo).
 *
 * Regras congeladas:
 * - O executor é SEMPRE injetado pelo consumidor (allowedRoot = Project Root,
 *   audit, actor). Este package NUNCA cria executor sem allowedRoot.
 * - Todo comando é `git` com args estruturados (sem shell, Inv. 30).
 * - Formatos machine-readable oficiais (D2): status --porcelain=v2 --branch,
 *   log --format com separadores 0x1f/0x1e, diff --numstat, branch --format.
 * - Anti flag-injection: arg de usuário iniciado por '-' onde não é flag
 *   esperada -> INVALID_INPUT.
 * - Paths de arquivo: rejeitados absolutos e '..' (defesa em profundidade; o
 *   scope real é garantido pelo executor/allowedRoot) + `--` antes de pathspecs.
 * - O client NÃO autoriza: autorização é do service/control plane (doc 10 §3/§51).
 * - O client NÃO emite flags destrutivas: push JAMAIS --force (doc 10 §25).
 */

import path from 'node:path';

import { err, nexoError, ok, type NexoError, type Result } from '@nexo/shared';
import type { CommandResult, RuntimeCommandExecutor } from '@nexo/runtime';

import { classifyGitError, gitErrorToNexo } from './errors.js';
import {
  GIT_BRANCH_FORMAT,
  GIT_LOG_FORMAT,
  parseGitBranchFormat,
  parseGitLog,
  parseGitNumstat,
  parseGitRemoteVerbose,
  parseGitStatusPorcelainV2,
  type GitRawStatus,
} from './parsers.js';
import { redactUrl } from './redact.js';
import type {
  GitBranchInfo,
  GitDiffMode,
  GitDiffOptions,
  GitDiffResult,
  GitLogEntry,
  GitRemoteInfo,
} from './types.js';

/** Timeout de mutações git (doc 10 §65: operações podem ser longas) — reads usam o default do executor (30s). */
export const GIT_WRITE_TIMEOUT_MS = 120_000;

export interface GitDetection {
  isRepo: boolean;
  /** Toplevel real do repositório (git rev-parse --show-toplevel). */
  repoRoot?: string;
  /** git-dir absoluto (git rev-parse --absolute-git-dir). */
  gitDir?: string;
  branch?: string | null;
  head?: string | null;
  detached?: boolean;
}

export interface GitCommandOutput {
  stdout: string;
  stderr: string;
}

/** Anti flag-injection: valor de usuário não pode começar com '-' (doc 10 §47/§77). */
export function rejectFlagLike(value: string, label: string): NexoError | null {
  if (typeof value !== 'string' || value.length === 0) {
    return nexoError('INVALID_INPUT', `${label} must be a non-empty string`);
  }
  if (value.startsWith('-')) {
    return nexoError('INVALID_INPUT', `${label} must not start with '-' (flag injection rejected)`, {
      resource: value,
    });
  }
  return null;
}

/**
 * Valida path relativo de arquivo dentro do repo (defesa em profundidade —
 * a contenção real é do executor/allowedRoot; aqui rejeitamos cedo absolutos,
 * '..' e null bytes, e todo pathspec é passado após `--`).
 */
export function validateRepoPath(p: string): NexoError | null {
  const base = rejectFlagLike(p, 'file path');
  if (base) return base;
  if (p.includes('\0')) {
    return nexoError('INVALID_INPUT', 'file path must not contain null bytes', { resource: '[null-byte]' });
  }
  if (path.isAbsolute(p) || /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('~')) {
    return nexoError('INVALID_INPUT', `file path must be relative to the repository: '${p}'`, { resource: p });
  }
  const segments = p.split(/[\\/]/);
  if (segments.includes('..')) {
    return nexoError('INVALID_INPUT', `file path must not escape the repository ('..'): '${p}'`, { resource: p });
  }
  return null;
}

export interface GitClient {
  /** `git --version`; ENOENT -> UNSUPPORTED "Git CLI not available" (doc 10 §82 passo 5). */
  gitVersion(): Promise<Result<string>>;
  /** Detecção real do repositório (doc 10 §7). Nunca finge repo (§4). */
  detect(cwd?: string): Promise<Result<GitDetection>>;
  /** `git status --porcelain=v2 --branch` parseado. */
  status(cwd?: string): Promise<Result<GitRawStatus>>;
  /** Diff real (doc 10 §11) — patch + numstat. Nunca diff aproximado (§12). */
  diff(cwd: string | undefined, opts: GitDiffOptions): Promise<Result<GitDiffResult>>;
  /** History real (doc 10 §41): hash, autor, committer, mensagem, data, parents, refs. */
  log(cwd: string | undefined, opts: { limit?: number; ref?: string }): Promise<Result<GitLogEntry[]>>;
  branchList(cwd?: string): Promise<Result<GitBranchInfo[]>>;
  /** Remotes com URLs SEMPRE redigidas (doc 10 §28/§61). */
  remotes(cwd?: string): Promise<Result<GitRemoteInfo[]>>;
  /** `git rev-parse --verify <ref>` -> hash. Falha -> InvalidReference. */
  revParse(cwd: string | undefined, ref: string): Promise<Result<string>>;
  /** `git check-ref-format --branch <name>` (doc 10 §15/§77). */
  checkBranchName(cwd: string | undefined, name: string): Promise<Result<void>>;
  branchCreate(cwd: string | undefined, name: string, opts?: { startPoint?: string; checkout?: boolean }): Promise<Result<void>>;
  branchSwitch(cwd: string | undefined, name: string): Promise<Result<void>>;
  branchDelete(cwd: string | undefined, name: string, opts: { force: boolean }): Promise<Result<void>>;
  stage(cwd: string | undefined, files: string[]): Promise<Result<void>>;
  stageAll(cwd: string | undefined): Promise<Result<void>>;
  /**
   * `git commit` real. ATENÇÃO (doc 10 §54/§55/§57): pode executar hooks do
   * projeto — código controlado pelo projeto. O Nexo contabiliza: falha de hook
   * é classificada HookFailed e o stderr redigido é surfacado em details.
   */
  commit(cwd: string | undefined, message: string): Promise<Result<void>>;
  /** Push real (doc 10 §24): JAMAIS --force (§25/§70). */
  push(cwd: string | undefined, opts?: { remote?: string; branch?: string }): Promise<Result<GitCommandOutput>>;
  pull(cwd: string | undefined, opts?: { remote?: string; branch?: string }): Promise<Result<GitCommandOutput>>;
  fetch(cwd: string | undefined, opts?: { remote?: string }): Promise<Result<GitCommandOutput>>;
}

export interface GitClientOptions {
  /** Executor injetado pelo consumidor (allowedRoot = Project Root). */
  executor: RuntimeCommandExecutor;
}

class ExecutorGitClient implements GitClient {
  private readonly executor: RuntimeCommandExecutor;

  constructor(opts: GitClientOptions) {
    this.executor = opts.executor;
  }

  /** Execução crua via executor injetado (spawn sem shell; cwd validado no root). */
  private async run(args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<Result<CommandResult>> {
    const r = await this.executor.execute({
      command: 'git',
      args,
      cwd: opts.cwd ?? '.',
      ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
    });
    if (r.ok) return r;
    // git CLI ausente no ambiente: NOT_FOUND do spawn vira UNSUPPORTED explícito
    // (doc 10 §82 passo 5: inspecionar a versão real do git; ausência não é NOT_FOUND de repo).
    if (r.error.code === 'NOT_FOUND') {
      return err(nexoError('UNSUPPORTED', 'Git CLI not available in this environment', { resource: 'git' }));
    }
    return r;
  }

  /** Execução com checagem de exit code: != 0 -> erro git classificado (doc 10 §62/§63). */
  private async runChecked(
    args: string[],
    opts: { cwd?: string; timeoutMs?: number; resource?: string } = {},
  ): Promise<Result<CommandResult>> {
    const r = await this.run(args, opts);
    if (!r.ok) return r;
    if (r.value.exitCode !== 0) {
      // Diagnóstico usa stderr E stdout: o git emite padrões de erro em ambos
      // (ex.: conflito de merge do pull vai para stdout; "From ..." para stderr).
      const text = [r.value.stderr, r.value.stdout].filter((s) => s.length > 0).join('\n');
      return err(gitErrorToNexo(classifyGitError(text), { stderr: text, resource: opts.resource }));
    }
    return r;
  }

  async gitVersion(): Promise<Result<string>> {
    const r = await this.run(['--version']);
    if (!r.ok) return r;
    if (r.value.exitCode !== 0) {
      return err(nexoError('UNSUPPORTED', 'Git CLI not available in this environment', { resource: 'git' }));
    }
    return ok(r.value.stdout.trim());
  }

  async detect(cwd = '.'): Promise<Result<GitDetection>> {
    const inside = await this.run(['rev-parse', '--is-inside-work-tree'], { cwd });
    if (!inside.ok) return inside;
    if (inside.value.exitCode !== 0 || inside.value.stdout.trim() !== 'true') {
      // NÃO é repo: representação explícita, nunca fingir (doc 10 §4).
      return ok({ isRepo: false });
    }
    const meta = await this.runChecked(['rev-parse', '--show-toplevel', '--absolute-git-dir', '--abbrev-ref', 'HEAD'], { cwd });
    if (!meta.ok) return meta;
    const lines = meta.value.stdout.split('\n').map((l) => l.trim());
    const repoRoot = lines[0] ?? '';
    const gitDir = lines[1] ?? '';
    const branchRaw = lines[2] ?? 'HEAD';
    // rev-parse HEAD falha em repo sem commits (unborn) -> head null, não erro.
    const headR = await this.run(['rev-parse', 'HEAD'], { cwd });
    const head = headR.ok && headR.value.exitCode === 0 ? headR.value.stdout.trim() : null;
    const detached = branchRaw === 'HEAD';
    return ok({
      isRepo: true,
      repoRoot,
      gitDir,
      branch: detached ? null : branchRaw,
      head,
      detached,
    });
  }

  async status(cwd = '.'): Promise<Result<GitRawStatus>> {
    // -uall: untracked listados arquivo a arquivo (não colapsado por diretório).
    const r = await this.runChecked(['status', '--porcelain=v2', '--branch', '-uall'], { cwd, resource: cwd });
    if (!r.ok) return r;
    return ok(parseGitStatusPorcelainV2(r.value.stdout));
  }

  async diff(cwd = '.', opts: GitDiffOptions): Promise<Result<GitDiffResult>> {
    const mode: GitDiffMode = opts.mode ?? 'WORKTREE_VS_HEAD';
    const rangeArgs: string[] = [];
    switch (mode) {
      case 'WORKTREE_VS_HEAD':
        rangeArgs.push('HEAD');
        break;
      case 'STAGED_VS_HEAD':
        rangeArgs.push('--staged', 'HEAD');
        break;
      case 'COMMIT_VS_PARENT': {
        if (!opts.from) return err(nexoError('INVALID_INPUT', "diff mode COMMIT_VS_PARENT requires 'from'"));
        const bad = rejectFlagLike(opts.from, 'from');
        if (bad) return err(bad);
        rangeArgs.push(`${opts.from}^!`);
        break;
      }
      case 'COMMITS':
      case 'BRANCHES': {
        if (!opts.from || !opts.to) {
          return err(nexoError('INVALID_INPUT', `diff mode ${mode} requires 'from' and 'to'`));
        }
        const badFrom = rejectFlagLike(opts.from, 'from');
        if (badFrom) return err(badFrom);
        const badTo = rejectFlagLike(opts.to, 'to');
        if (badTo) return err(badTo);
        rangeArgs.push(opts.from, opts.to);
        break;
      }
    }
    const pathArgs: string[] = [];
    if (opts.path !== undefined) {
      const bad = validateRepoPath(opts.path);
      if (bad) return err(bad);
      pathArgs.push('--', opts.path);
    }

    const runDiff = async (base: string[], extra: string[]): Promise<Result<CommandResult>> =>
      this.runChecked(['diff', ...base, ...extra, ...pathArgs], { cwd });

    // Repo sem commits: HEAD não resolve — base real passa a ser o index
    // (worktree vs index / staged vs index), nunca um diff inventado.
    let base = rangeArgs;
    if (mode === 'WORKTREE_VS_HEAD' || mode === 'STAGED_VS_HEAD') {
      if (await this.hasNoHead(cwd)) {
        base = mode === 'STAGED_VS_HEAD' ? ['--staged'] : [];
      }
    }

    // Numstat e patch são duas execuções reais do mesmo diff (sem inventar números).
    const stat = await runDiff(base, ['--numstat']);
    if (!stat.ok) return stat;
    const patch = await runDiff(base, []);
    if (!patch.ok) return patch;

    return ok({ mode, diff: patch.value.stdout, files: parseGitNumstat(stat.value.stdout) });
  }

  private async hasNoHead(cwd: string): Promise<boolean> {
    const r = await this.run(['rev-parse', '--verify', 'HEAD'], { cwd });
    return !r.ok || r.value.exitCode !== 0;
  }

  async log(cwd = '.', opts: { limit?: number; ref?: string }): Promise<Result<GitLogEntry[]>> {
    const limit = opts.limit ?? 20;
    const args = ['log', `--format=${GIT_LOG_FORMAT}`, '-n', String(limit)];
    if (opts.ref !== undefined) {
      const bad = rejectFlagLike(opts.ref, 'ref');
      if (bad) return err(bad);
      args.push(opts.ref);
    }
    const r = await this.runChecked(args, { cwd });
    if (!r.ok) {
      // Repo sem commits ainda: history vazia real (não erro — doc 10 §41).
      const msg = r.error.details?.['stderr'];
      if (typeof msg === 'string' && /does not have any commits yet|bad default revision/i.test(msg)) {
        return ok([]);
      }
      return r;
    }
    return ok(parseGitLog(r.value.stdout));
  }

  async branchList(cwd = '.'): Promise<Result<GitBranchInfo[]>> {
    const r = await this.runChecked(['branch', '--list', `--format=${GIT_BRANCH_FORMAT}`], { cwd });
    if (!r.ok) return r;
    return ok(parseGitBranchFormat(r.value.stdout));
  }

  async remotes(cwd = '.'): Promise<Result<GitRemoteInfo[]>> {
    const r = await this.runChecked(['remote', '-v'], { cwd });
    if (!r.ok) return r;
    const parsed = parseGitRemoteVerbose(r.value.stdout);
    const byName = new Map<string, GitRemoteInfo>();
    for (const p of parsed) {
      const current = byName.get(p.name) ?? { name: p.name, fetchUrl: '', pushUrl: '' };
      // URLs SEMPRE redigidas na fronteira do package (doc 10 §61).
      if (p.kind === 'fetch') current.fetchUrl = redactUrl(p.url);
      else current.pushUrl = redactUrl(p.url);
      byName.set(p.name, current);
    }
    return ok([...byName.values()]);
  }

  async revParse(cwd = '.', ref: string): Promise<Result<string>> {
    const bad = rejectFlagLike(ref, 'ref');
    if (bad) return err(bad);
    const r = await this.runChecked(['rev-parse', '--verify', ref], { cwd, resource: ref });
    if (!r.ok) return r;
    return ok(r.value.stdout.trim());
  }

  async checkBranchName(cwd = '.', name: string): Promise<Result<void>> {
    const bad = rejectFlagLike(name, 'branch name');
    if (bad) return err(bad);
    const r = await this.run(['check-ref-format', '--branch', name], { cwd });
    if (!r.ok) return r;
    if (r.value.exitCode !== 0) {
      return err(
        gitErrorToNexo('InvalidReference', {
          stderr: r.value.stderr,
          resource: name,
          message: `Invalid branch name: '${name}'`,
        }),
      );
    }
    return ok(undefined);
  }

  async branchCreate(cwd = '.', name: string, opts: { startPoint?: string; checkout?: boolean } = {}): Promise<Result<void>> {
    // Validação do nome pelas regras REAIS do git ANTES de criar (doc 10 §15/§77).
    const valid = await this.checkBranchName(cwd, name);
    if (!valid.ok) return valid;
    const args = ['branch', name];
    if (opts.startPoint !== undefined) {
      const bad = rejectFlagLike(opts.startPoint, 'startPoint');
      if (bad) return err(bad);
      args.push(opts.startPoint);
    }
    const r = await this.runChecked(args, { cwd, resource: name });
    if (!r.ok) return r;
    if (opts.checkout === true) {
      return this.branchSwitch(cwd, name);
    }
    return ok(undefined);
  }

  async branchSwitch(cwd = '.', name: string): Promise<Result<void>> {
    const bad = rejectFlagLike(name, 'branch name');
    if (bad) return err(bad);
    const r = await this.runChecked(['switch', name], { cwd, resource: name });
    if (!r.ok) return r;
    return ok(undefined);
  }

  async branchDelete(cwd = '.', name: string, opts: { force: boolean }): Promise<Result<void>> {
    const bad = rejectFlagLike(name, 'branch name');
    if (bad) return err(bad);
    const r = await this.runChecked(['branch', opts.force ? '-D' : '-d', name], { cwd, resource: name });
    if (!r.ok) return r;
    return ok(undefined);
  }

  async stage(cwd = '.', files: string[]): Promise<Result<void>> {
    if (!Array.isArray(files) || files.length === 0) {
      return err(nexoError('INVALID_INPUT', 'files must be a non-empty array of repository-relative paths'));
    }
    for (const f of files) {
      const bad = validateRepoPath(f);
      if (bad) return err(bad);
    }
    // `--` antes dos pathspecs: nenhum path é interpretado como flag (defesa em profundidade).
    const r = await this.runChecked(['add', '--', ...files], { cwd, timeoutMs: GIT_WRITE_TIMEOUT_MS });
    if (!r.ok) return r;
    return ok(undefined);
  }

  async stageAll(cwd = '.'): Promise<Result<void>> {
    const r = await this.runChecked(['add', '-A'], { cwd, timeoutMs: GIT_WRITE_TIMEOUT_MS });
    if (!r.ok) return r;
    return ok(undefined);
  }

  async commit(cwd = '.', message: string): Promise<Result<void>> {
    if (typeof message !== 'string' || message.trim().length === 0) {
      return err(nexoError('INVALID_INPUT', 'commit message must be explicit and non-empty (doc 10 §21)'));
    }
    const r = await this.runChecked(['commit', '-m', message], { cwd, timeoutMs: GIT_WRITE_TIMEOUT_MS });
    if (!r.ok) return r;
    return ok(undefined);
  }

  async push(cwd = '.', opts: { remote?: string; branch?: string } = {}): Promise<Result<GitCommandOutput>> {
    const args = ['push'];
    if (opts.remote !== undefined) {
      const bad = rejectFlagLike(opts.remote, 'remote');
      if (bad) return err(bad);
    }
    if (opts.branch !== undefined) {
      const bad = rejectFlagLike(opts.branch, 'branch');
      if (bad) return err(bad);
      // Branch explícito: vincula upstream (-u) para que o push funcione sem
      // tracking prévio (doc 10 §63: próxima ação determinística).
      args.push('-u', opts.remote ?? 'origin', opts.branch);
    } else if (opts.remote !== undefined) {
      args.push(opts.remote);
    }
    // JAMAIS --force/-f/--force-with-lease (doc 10 §25/§70: force é capability separada).
    const r = await this.runChecked(args, { cwd, timeoutMs: GIT_WRITE_TIMEOUT_MS, resource: opts.remote ?? 'origin' });
    if (!r.ok) return r;
    return ok({ stdout: r.value.stdout, stderr: r.value.stderr });
  }

  async pull(cwd = '.', opts: { remote?: string; branch?: string } = {}): Promise<Result<GitCommandOutput>> {
    const args = ['pull', '--no-rebase'];
    if (opts.remote !== undefined) {
      const bad = rejectFlagLike(opts.remote, 'remote');
      if (bad) return err(bad);
      args.push(opts.remote);
    }
    if (opts.branch !== undefined) {
      const bad = rejectFlagLike(opts.branch, 'branch');
      if (bad) return err(bad);
      args.push(opts.branch);
    }
    const r = await this.runChecked(args, { cwd, timeoutMs: GIT_WRITE_TIMEOUT_MS, resource: opts.remote ?? 'origin' });
    if (!r.ok) return r;
    return ok({ stdout: r.value.stdout, stderr: r.value.stderr });
  }

  async fetch(cwd = '.', opts: { remote?: string } = {}): Promise<Result<GitCommandOutput>> {
    const args = ['fetch'];
    if (opts.remote !== undefined) {
      const bad = rejectFlagLike(opts.remote, 'remote');
      if (bad) return err(bad);
      args.push(opts.remote);
    }
    const r = await this.runChecked(args, { cwd, timeoutMs: GIT_WRITE_TIMEOUT_MS, resource: opts.remote ?? 'origin' });
    if (!r.ok) return r;
    return ok({ stdout: r.value.stdout, stderr: r.value.stderr });
  }
}

export function createGitClient(opts: GitClientOptions): GitClient {
  return new ExecutorGitClient(opts);
}
