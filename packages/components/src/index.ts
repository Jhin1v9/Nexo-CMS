/**
 * @nexo/components — Component Engine M3 (doc 08; M3-CONTRACTS §3.2/§7).
 * Wave 2b: Component Schema (contrato congelado §7), deteccao de Native
 * Project Components via AST, registry via @nexo/storage (D10), fluxos
 * create (08§20+§21) / update (08§22) / delete (08§23) / publish
 * (08§25+§74+§26+§63) e ComponentService. Registro de capabilities no
 * Control Plane: Wave 3 — este package NAO registra nada.
 */

// Tipos (M3-CONTRACTS §7 + 08§8/§16/§26/§63/§74)
export type {
  CompatibilityResult,
  ComponentDependency,
  ComponentDiff,
  ComponentFileDiff,
  ComponentFileDiffStatus,
  ComponentIdentity,
  ComponentProp,
  ComponentSchema,
  ComponentScope,
  ComponentSlot,
  ComponentSource,
  ComponentVariant,
  ComponentVersion,
  Portability,
  PropertySource,
  PropType,
  PublishCheck,
  PublishValidation,
  ResolvedPropType,
} from './types.js';
export { allPublishChecksPass } from './types.js';

// Erros (details.componentError + nextAction)
export type { ComponentErrorKind, ComponentErrorOptions } from './errors.js';
export { componentError } from './errors.js';

// Deteccao (08§5.1 — AST, nunca scanner paralelo com regex)
export type {
  ComponentDetection,
  DetectedComponent,
  PropsConfidence,
} from './detect.js';
export {
  analyzeComponentFile,
  COMPONENT_DIR_CANDIDATES,
  detectComponentDirs,
  detectNativeComponents,
} from './detect.js';

// Convencoes (08§21)
export type { ProjectConventions } from './conventions.js';
export { DEFAULT_COMPONENT_DIR, inspectConventions } from './conventions.js';

// Registry (D10 — Repository Pattern via @nexo/storage)
export type { ComponentRegistry, RegisteredComponent } from './registry.js';
export { createComponentRegistry } from './registry.js';

// Diff local (08§22)
export { diffFile, diffFiles } from './diff.js';

// Fluxos
export type {
  CreateComponentInput,
  CreateComponentOutcome,
  CreateDeps,
  CreatePropInput,
} from './create.js';
export { createComponent } from './create.js';

export type {
  ComponentPatch,
  SourceEdit,
  UpdateComponentInput,
  UpdateComponentOutcome,
  UpdateDeps,
} from './update.js';
export { updateComponent } from './update.js';

export type {
  ComponentImpact,
  DeleteComponentInput,
  DeleteComponentOutcome,
  DeleteDeps,
  ImpactReference,
} from './delete.js';
export { analyzeComponentImpact, deleteComponent } from './delete.js';

export type { PublishDeps, PublishInput, PublishOutcome } from './publish.js';
export { publishComponent, SECRET_PATTERNS } from './publish.js';

// Service (M3-CONTRACTS §3.2 — 6 capabilities; registro no CP e Wave 3)
export type { ComponentService, ComponentServiceOptions } from './service.js';
export { createComponentService } from './service.js';

// FS helpers (scope guard de @nexo/runtime)
export type { ProjectFs } from './project-fs.js';
export { createProjectFs, guardPath, toRelative } from './project-fs.js';
