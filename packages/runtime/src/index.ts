export type { DirEntry, ScopedFilesystem } from './filesystem.js';
export { createScopedFilesystem } from './filesystem.js';
export type { CommandClass } from './classification.js';
export { classifyCommand } from './classification.js';
export type { ArgPathAnalysis } from './arg-paths.js';
export { analyzeCommandArgPaths } from './arg-paths.js';
export type { ScopeResolution } from './scope-guard.js';
export { resolveWithinRoot } from './scope-guard.js';
export type {
  CommandRequest,
  CommandResult,
  CommandExecutor,
  CommandAuthorizeFn,
  CommandExecutorOptions,
  RuntimeCommandExecutor,
} from './executor.js';
export { createCommandExecutor } from './executor.js';
export type { ProcessInfo, ProcessRegistry, ProcessStatus } from './process-registry.js';
export { createProcessRegistry } from './process-registry.js';
