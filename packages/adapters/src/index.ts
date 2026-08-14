export type {
  Adapter,
  AdapterCapabilityLevel,
  AdapterCategory,
  AdapterDetectionValue,
  AdapterIdentity,
  DetectedTechnology,
  DetectionContext,
  DirEntry,
} from './types.js';
export { capabilityLevelToSupport } from './types.js';
export type { FindFilesOptions } from './fs-context.js';
export { createNodeDetectionContext, findFiles } from './fs-context.js';
export {
  createAstroAdapter,
  createBunAdapter,
  createCssModulesAdapter,
  createHtmlStaticAdapter,
  createM1Adapters,
  createNextjsAdapter,
  createNpmAdapter,
  createPlainCssAdapter,
  createPnpmAdapter,
  createReactAdapter,
  createStyledComponentsAdapter,
  createSvelteAdapter,
  createTailwindAdapter,
  createTypescriptAdapter,
  createVueAdapter,
  createYarnAdapter,
} from './m1-adapters.js';
export { AdapterRegistry, createDefaultAdapterRegistry } from './registry.js';

// --- write-path M3 (M3-CONTRACTS §2; D6 stack first-class; D8 AST via TS compiler) ---
export type {
  ElementSelector,
  TransformDiagnostic,
  TransformDiagnosticCode,
  TransformResult,
  UnsupportedInfo,
} from './transform/types.js';
export type {
  ComponentPropSpec,
  CreateComponentInput,
  InsertJsxChildInput,
  ReactTsxTransformer,
  RemoveJsxElementInput,
  SetJsxPropInput,
  UpdateJsxTextInput,
} from './transform/react-tsx-transformer.js';
export { createReactTsxTransformer } from './transform/react-tsx-transformer.js';
export type {
  DesignToken,
  DesignTokenKind,
  ReadTokensInput,
  SetUtilityClassInput,
  StylingAdapter,
  TokenRepresentation,
  UpdateTokenInput,
  UtilityClassResult,
} from './transform/styling.js';
export {
  classifyRepresentation,
  kindFromConfigGroup,
  kindFromCssVar,
} from './transform/styling.js';
export type { CssDeclaration } from './transform/css-source.js';
export { bracesBalanced, parseCssDeclarations } from './transform/css-source.js';
export type { TailwindStylingAdapter } from './transform/tailwind-styling-adapter.js';
export { createTailwindStylingAdapter } from './transform/tailwind-styling-adapter.js';
export type {
  PlainCssStylingAdapter,
  UpdateCssVariableInput,
} from './transform/plain-css-styling-adapter.js';
export { createPlainCssStylingAdapter } from './transform/plain-css-styling-adapter.js';
