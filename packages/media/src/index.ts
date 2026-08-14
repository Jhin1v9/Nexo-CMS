/**
 * @nexo/media — Media Engine M3 (doc 08 §41-§58/§67/§82; M3-CONTRACTS §3.3).
 * Wave 2a: tipos, MIME sniffing (magic bytes), upload/validate, replace com
 * atualização real de referências, delete com inspeção de referências,
 * registry via @nexo/storage (D10) e MediaService. Registro de capabilities
 * no Control Plane: Wave 3.
 */

export type {
  AssetDimensions,
  AssetIdentity,
  AssetMetadata,
  AssetMetadataPatch,
  AssetOrigin,
  AssetReference,
  AssetScope,
  AssetType,
  AssetUsage,
  ReferenceConfidence,
  ReferenceKind,
  UsageState,
} from './types.js';
export { LOCAL_ORIGINS, REMOTE_ORIGINS } from './types.js';

export type { MediaErrorKind, MediaErrorOptions } from './errors.js';
export { mediaError } from './errors.js';

export type { SniffResult, SvgSafetyIssue } from './mime.js';
export {
  extensionMatchesMime,
  inspectSvgActiveContent,
  readImageDimensions,
  sniffMime,
} from './mime.js';

export type { ProjectFs } from './paths.js';
export { ASSET_DIR_CANDIDATES, createProjectFs, detectAssetDirectories } from './paths.js';

export type { ReferenceRewrite, ReferenceScan } from './references.js';
export { referenceNeedles, rewriteAssetReferences, scanAssetReferences } from './references.js';

export type { MediaRegistry } from './registry.js';
export { createMediaRegistry } from './registry.js';

export type { UploadInput, UploadOutcome } from './upload.js';
export { DEFAULT_MAX_UPLOAD_BYTES, uploadAsset, validateUploadPayload } from './upload.js';

export type { ReplaceInput, ReplaceOutcome } from './replace.js';
export { replaceAsset } from './replace.js';

export type { DeleteInput, DeleteOutcome } from './delete.js';
export { deleteAsset } from './delete.js';

export type {
  MediaListFilter,
  MediaReadResult,
  MediaSearchMatch,
  MediaService,
  MediaServiceOptions,
} from './service.js';
export { createMediaService } from './service.js';
