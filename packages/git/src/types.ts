/**
 * Tipos públicos do @nexo/git (doc 10 — GIT AND VERSIONING).
 * Contrato congelado do M2: estados (§8/§45), mudanças (§9), status (§10),
 * diff (§11), history (§41), branches (§14), erros (§62).
 */

export type GitRepoState =
  | 'CLEAN'
  | 'MODIFIED'
  | 'UNTRACKED'
  | 'STAGED'
  | 'CONFLICTED'
  | 'DETACHED_HEAD'
  | 'REBASE_IN_PROGRESS'
  | 'MERGE_IN_PROGRESS'
  | 'CHERRY_PICK_IN_PROGRESS'
  | 'REVERT_IN_PROGRESS'
  | 'NO_REPOSITORY'
  | 'UNKNOWN';

export type GitRemoteState = 'LOCAL' | 'REMOTE' | 'AHEAD' | 'BEHIND' | 'DIVERGED' | 'UNKNOWN';

export type GitChangeKind =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'typechange'
  | 'unmerged'
  | 'unknown';

export interface GitFileChange {
  path: string;
  origPath?: string;
  kind: GitChangeKind;
}

export interface GitStatusResult {
  isRepo: true;
  repoRoot: string;
  branch: string | null;
  head: string | null;
  detached: boolean;
  tracking: string | null;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  conflicts: GitFileChange[];
  states: GitRepoState[];
  remoteState: GitRemoteState;
}

export interface GitNoRepoResult {
  isRepo: false;
  states: ['NO_REPOSITORY'];
}

export type GitStatusOutput = GitStatusResult | GitNoRepoResult;

export interface GitLogEntry {
  hash: string;
  authorName: string;
  authorEmail: string;
  committerName: string;
  committerEmail: string;
  message: string;
  dateISO: string;
  parents: string[];
  refs: string[];
}

export interface GitBranchInfo {
  name: string;
  current: boolean;
  tracking: string | null;
  head: string | null;
}

export interface GitRemoteInfo {
  name: string;
  /** SEMPRE redigida (doc 10 §61): credenciais nunca expostas. */
  fetchUrl: string;
  /** SEMPRE redigida (doc 10 §61). */
  pushUrl: string;
}

export interface GitDiffFileStat {
  path: string;
  additions: number;
  deletions: number;
}

export type GitDiffMode = 'WORKTREE_VS_HEAD' | 'STAGED_VS_HEAD' | 'COMMIT_VS_PARENT' | 'COMMITS' | 'BRANCHES';

export interface GitDiffOptions {
  /** Default: WORKTREE_VS_HEAD. */
  mode?: GitDiffMode;
  from?: string;
  to?: string;
  /** Filtro opcional de path (usado com `--` antes do pathspec). */
  path?: string;
}

export interface GitDiffResult {
  mode: GitDiffMode;
  diff: string;
  files: GitDiffFileStat[];
}

export type GitSwitchResult = 'SWITCHED' | 'BLOCKED' | 'CONFLICT' | 'REQUIRES_STASH' | 'REQUIRES_COMMIT';

export type GitPullResult = 'UPDATED' | 'ALREADY_UP_TO_DATE' | 'CONFLICT' | 'FAILED';

export type GitErrorKind =
  | 'RepositoryNotFound'
  | 'BranchNotFound'
  | 'RemoteNotFound'
  | 'AuthenticationFailed'
  | 'PermissionDenied'
  | 'MergeConflict'
  | 'WorkingTreeDirty'
  | 'NoTrackingBranch'
  | 'NonFastForward'
  | 'HookFailed'
  | 'InvalidReference'
  /** git sem user.name/user.email configurados (msg "Author identity unknown").
   *  Adicionado em M3 (verificação e2e): erro acionável, não INTERNAL genérico. */
  | 'IdentityNotConfigured'
  | 'UnknownGitError';
