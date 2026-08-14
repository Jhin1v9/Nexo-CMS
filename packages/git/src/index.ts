export type {
  GitRepoState,
  GitRemoteState,
  GitChangeKind,
  GitFileChange,
  GitStatusResult,
  GitNoRepoResult,
  GitStatusOutput,
  GitLogEntry,
  GitBranchInfo,
  GitRemoteInfo,
  GitDiffFileStat,
  GitDiffMode,
  GitDiffOptions,
  GitDiffResult,
  GitSwitchResult,
  GitPullResult,
  GitErrorKind,
} from './types.js';
export { redactUrl, redactText } from './redact.js';
export { classifyGitError, gitErrorToNexo } from './errors.js';
export {
  parseGitStatusPorcelainV2,
  parseGitLog,
  parseGitNumstat,
  parseGitBranchFormat,
  parseGitRemoteVerbose,
  GIT_LOG_FORMAT,
  GIT_BRANCH_FORMAT,
} from './parsers.js';
export type { GitRawStatus } from './parsers.js';
export type { GitClient, GitClientOptions, GitDetection, GitCommandOutput } from './client.js';
export { createGitClient, rejectFlagLike, validateRepoPath, GIT_WRITE_TIMEOUT_MS } from './client.js';
export { deriveRemoteState } from './service.js';
export type {
  GitService,
  GitServiceOptions,
  GitSwitchOutcome,
  GitCommitOutcome,
  GitPushOutcome,
  GitPullOutcome,
  GitFetchOutcome,
} from './service.js';
export { createGitService } from './service.js';
