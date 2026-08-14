export type { ProjectModel } from './model.js';
export type { ProjectScanner, ProjectScannerOptions } from './scanner.js';
export { createProjectScanner } from './scanner.js';
export { computeFingerprint, FINGERPRINT_INPUTS, STATIC_FINGERPRINT_INPUTS } from './fingerprint.js';

// --- M3: source mapping + referencias de assets (M3-CONTRACTS §2/§5) ---
export type { MappingConfidence, SourceMapping, SourceMappingRequest } from './mapping.js';
export { mapComponentSource } from './mapping.js';
export type {
  AssetReference,
  AssetReferencesResult,
  FindAssetReferencesRequest,
  ReferenceConfidence,
} from './references.js';
export { findAssetReferences } from './references.js';
