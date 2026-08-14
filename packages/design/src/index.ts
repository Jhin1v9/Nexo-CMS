/**
 * @nexo/design — Design Engine M3 (doc 09; M3-CONTRACTS §3.4).
 * Tokens, themes, property source e impact analysis sobre o source REAL do
 * projeto, via Styling Adapters (Wave 2a). Nunca cria design system paralela
 * (09§54-55); nunca converte representacao de cor (09§10).
 */

export type {
  DesignModel,
  DesignSystemInfo,
  DesignSystemSignals,
  DesignTokenGroups,
  DesignTokenType,
  ImpactEntry,
  ImpactReport,
  PropertySource,
  StylingMechanism,
  ThemeInfo,
  ThemeKind,
  ThemeMechanism,
  TokenGroupKey,
  TokenInfo,
} from './types.js';

export type { DesignErrorKind, DesignErrorOptions } from './errors.js';
export { designError } from './errors.js';

export type { ProjectFs } from './paths.js';
export { createProjectFs, guardPath, toRelative, writeFileVerified } from './paths.js';

export { classifyTokenType, detectStylingMechanism, inspectCssFiles, readAllTokens } from './inspect.js';
export type { CssFileInspected } from './inspect.js';

export { buildClassImpactReport, buildTokenImpactReport } from './impact.js';

export type { ReadDesignModelInput } from './read.js';
export { readDesignModel } from './read.js';

export type { TokenReadResult, TokenUpdateInput, TokenUpdateResult } from './token.js';
export { readTokens, updateToken } from './token.js';

export type { ThemeReadResult, ThemeUpdateInput, ThemeUpdateResult, ThemeVariableUpdate } from './theme.js';
export { detectThemes, readThemes, updateTheme } from './theme.js';

export type {
  DesignUpdateElementTarget,
  DesignUpdateInput,
  DesignUpdateResult,
  DesignUpdateTarget,
  DesignUpdateTokenTarget,
} from './update.js';
export { designUpdate } from './update.js';

export type { DesignService, DesignServiceOptions } from './service.js';
export { createDesignService, DESIGN_CAPABILITIES } from './service.js';
