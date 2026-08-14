/**
 * @nexo/responsive — Responsive Lab (M3 Wave 2a; M3-CONTRACTS §3.5, doc 09).
 * Viewport registry, preview (runtime real), diagnose/stressTest/compare/
 * snapshot via browser real (Playwright — D14: SOMENTE para diagnósticos).
 * Capabilities NÃO são registradas aqui (Wave 3 / Control Plane).
 */

export type {
  BoundingBox,
  BrowserCapabilities,
  CompareResult,
  DiagnosticCertainty,
  DiagnosticEvidence,
  DiagnosticIssue,
  DiagnosticKind,
  DiagnosticSeverity,
  ElementRef,
  PreviewInfo,
  PreviewState,
  ProjectBreakpoints,
  ProjectScriptsScanner,
  ResponsiveReasonCode,
  Snapshot,
  SourceIntegrityProof,
  SourceMapperFn,
  StressProfile,
  StressProfileId,
  StressTestResult,
  Viewport,
  ViewportCapture,
  ViewportCreateInput,
  ViewportOrientation,
  ViewportPairDiff,
  ViewportPreset,
} from './types.js';
export { REASON } from './types.js';

export { responsiveError } from './errors.js';

export {
  createViewportRegistry,
  detectProjectBreakpoints,
  DEFAULT_VIEWPORT_PRESETS,
  type ViewportRegistry,
  type ViewportRegistryOptions,
} from './viewports.js';

export {
  createBrowserManager,
  DEFAULT_BROWSER_LAUNCH_TIMEOUT_MS,
  DEFAULT_NAVIGATION_TIMEOUT_MS,
  type BrowserManager,
  type BrowserManagerOptions,
  type BrowserSession,
} from './browser.js';

export {
  createPreviewManager,
  parseScriptCommand,
  DEFAULT_PREVIEW_STARTUP_TIMEOUT_MS,
  type PreviewManager,
  type PreviewManagerOptions,
  type PreviewStartInput,
} from './preview.js';

export {
  collectDiagnosticIssues,
  severityForOverflow,
  DEFAULT_EPSILON_PX,
  DEFAULT_MAX_ISSUES_PER_KIND,
  type CollectIssuesOptions,
} from './diagnose.js';

export { STRESS_PROFILES, runStressProfileOnPage, type RunStressInput } from './stress.js';

export {
  compareViewports,
  diffPngBuffers,
  PIXELMATCH_INCLUDE_AA,
  PIXELMATCH_THRESHOLD,
  type CompareInput,
  type DiffImagesResult,
} from './compare.js';

export { captureSnapshot, type SnapshotInput } from './snapshot.js';

export { captureRenderedPage, type CaptureOptions, type RenderedCapture } from './capture.js';

export { hashSourceTree, SOURCE_HASH_EXCLUDED_DIRS, type SourceHashResult } from './source-hash.js';

export {
  createResponsiveService,
  type DiagnoseResult,
  type ResponsiveService,
  type ResponsiveServiceOptions,
} from './service.js';
