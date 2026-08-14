/**
 * @nexo/editor — Editor core M3 (doc 07; M3-CONTRACTS.md §3.1/§4/§5/§6).
 *
 * Change Object + ChangeManager, save pipeline canonico (07§36), undo/redo
 * (07§33-35), source open/save, conflitos (07§38-40, D12), recovery (07§65).
 * NAO registra capabilities no Control Plane (Wave 3) — apenas expoe o service.
 */

// Tipos (M3-CONTRACTS §6 + 07§11/§29/§39/§42)
export {
  SUPPORTED_CONFLICT_RESOLUTIONS,
  nowIso,
  sha256Hex,
} from './types.js';
export type {
  ChangeInput,
  ChangeObject,
  ChangeOperation,
  ChangeOrigin,
  ChangeSource,
  ChangeState,
  ConflictResolution,
  ConflictResolutionRequest,
  Diff,
  FileDiff,
  FileDiffStatus,
  MappingConfidence,
  SaveState,
  SelectionModel,
  SourceLocation,
} from './types.js';

// Save pipeline (07§36)
export { persistFileVerified, runSavePipeline } from './save-pipeline.js';
export type {
  SavePipelineDeps,
  SaveRequest,
  SaveSuccess,
  SourceTransformAdapter,
  TransformRequest,
  TransformResult,
} from './save-pipeline.js';

// ChangeManager (07§30-32) + diff engine (07§42)
export { ChangeManager, diffFile, diffOfChange, hashesOf, threeWayDiff } from './change-manager.js';
export type { ApplyExecutor, ApplyOutcome, ChangeManagerDeps, ThreeWayDiff } from './change-manager.js';

// Conflitos (07§38-40, D12)
export { ConflictManager } from './conflict.js';
export type {
  ConflictDetection,
  ConflictInfo,
  ConflictManagerDeps,
  ConflictResolutionOutcome,
  FileBaseline,
} from './conflict.js';

// Undo/redo (07§33-35)
export { UndoManager } from './undo.js';
export type { UndoManagerDeps } from './undo.js';

// Source open/save (M3-CONTRACTS §3.1)
export { languageFromPath, SourceManager } from './source.js';
export type { OpenSourceResult, PipelineRunner, SourceManagerDeps, SourceSaveResult } from './source.js';

// Recovery (07§65)
export { createSqliteDraftStore, findStaleFiles, toRecoveredDraft } from './recovery.js';
export type {
  DraftKind,
  DraftStore,
  EditorDraft,
  RecoveredDraft,
  SqliteDb,
  UnsavedBuffer,
} from './recovery.js';

// Service (consumido pelas capabilities editor.* na Wave 3)
export { createEditorService } from './service.js';
export type {
  ApplyChangeResult,
  EditorService,
  EditorServiceDeps,
  SourceMapper,
} from './service.js';
