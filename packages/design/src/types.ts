/**
 * Tipos publicos do @nexo/design (doc 09 — DESIGN AND RESPONSIVE LAB;
 * M3-CONTRACTS §3.4).
 *
 * Regras duras refletidas nos tipos:
 *  - Todo token carrega origem EXATA {file, line} (09§51; M3 §3.4
 *    design.token.read) — nada e inventado; sem sinais => listas vazias +
 *    confidence UNKNOWN.
 *  - PropertySource e o enum congelado de 09§7 (9 valores).
 *  - ImpactReport (09§79) reporta usos REAIS varridos no source; heuristicas
 *    sao declaradas em `notes` (nunca apresentadas como fato — 09§36).
 */

import type { TokenRepresentation } from '@nexo/adapters';
import type { Confidence, Detection } from '@nexo/shared';

// ---------------------------------------------------------------------------
// Tokens (09§51)
// ---------------------------------------------------------------------------

/** Tipos de token de 09§51 + 'Other' (tokens reais que nao casam nenhum tipo
 *  NUNCA sao descartados nem reclassificados por chute — ficam em 'Other'). */
export type DesignTokenType =
  | 'Color'
  | 'Spacing'
  | 'Typography'
  | 'Radius'
  | 'Shadow'
  | 'Breakpoint'
  | 'ContainerWidth'
  | 'Other';

/** Mecanismo de styling detectado no projeto (sinais de arquivo reais). */
export type StylingMechanism =
  | 'tailwind-v4'
  | 'tailwind-v3'
  | 'plain-css-variables'
  | 'unknown';

/** Token de design com origem exata (arquivo:linha 1-based). */
export interface TokenInfo {
  /** Referencia canonica: '--color-primary' (CSS var/v4) ou 'colors.primary' (config v3). */
  tokenRef: string;
  type: DesignTokenType;
  /** Valor EXATAMENTE como escrito no source (nunca convertido — 09§10). */
  value: string;
  /** Classificacao da representacao como escrita. */
  representation: TokenRepresentation;
  /** Mecanismo que detem a FONTE do token. */
  mechanism: Exclude<StylingMechanism, 'unknown'>;
  source: { file: string; line: number };
}

/** Chaves de agrupamento de tokens no DesignModel (camelCase dos tipos). */
export type TokenGroupKey =
  | 'color'
  | 'spacing'
  | 'typography'
  | 'radius'
  | 'shadow'
  | 'breakpoint'
  | 'containerWidth'
  | 'other';

export type DesignTokenGroups = Record<TokenGroupKey, TokenInfo[]>;

// ---------------------------------------------------------------------------
// Themes (09§52-53)
// ---------------------------------------------------------------------------

/** Mecanismo de ativacao do tema (09§52). */
export type ThemeMechanism =
  | 'CssVariables'
  | 'Classes'
  | 'Attributes'
  | 'Configuration'
  | 'ComponentState';

export type ThemeKind = 'Light' | 'Dark' | 'Brand' | 'Custom';

export interface ThemeInfo {
  /** Nome como escrito no projeto (ex.: 'dark', 'high-contrast'). */
  name: string;
  kind: ThemeKind;
  mechanism: ThemeMechanism;
  /**
   * Como o tema e ativado, como escrito no source:
   * '[data-theme="dark"]' | '.dark' | '@media (prefers-color-scheme: dark)'.
   */
  activation: string;
  /** Seletores CSS que carregam as variaveis do tema (ex.: ['[data-theme="dark"]']). */
  selectors: string[];
  /** Variaveis CSS redefinidas por este tema (nomes '--*', como escritas). */
  variables: string[];
  source: { file: string; line: number };
  confidence: Confidence;
}

// ---------------------------------------------------------------------------
// Property Source (09§7 — enum congelado)
// ---------------------------------------------------------------------------

export type PropertySource =
  | 'DirectValue'
  | 'CssVariable'
  | 'DesignToken'
  | 'TailwindUtility'
  | 'ThemeConfiguration'
  | 'ComponentProp'
  | 'StyledComponentRule'
  | 'InlineStyle'
  | 'Unknown';

// ---------------------------------------------------------------------------
// Design System existente (09§54-55)
// ---------------------------------------------------------------------------

export interface DesignSystemSignals {
  tokens: boolean;
  theme: boolean;
  sharedComponents: boolean;
  typographySystem: boolean;
  spacingScale: boolean;
  colorPalette: boolean;
}

export interface DesignSystemInfo {
  /** true somente com >= 2 sinais fortes (tokens, theme, palette, scale...). */
  detected: boolean;
  signals: DesignSystemSignals;
  evidence: string[];
}

// ---------------------------------------------------------------------------
// Impact Analysis (09§78-79)
// ---------------------------------------------------------------------------

export interface ImpactEntry {
  /** Arquivo relativo ao Project Root. */
  file: string;
  /** Linha 1-based. */
  line: number;
  /** Linha de origem (trim, truncada em 200 chars). */
  context: string;
  kind: 'css-var-usage' | 'css-var-definition' | 'literal-reference';
}

/**
 * ImpactReport (09§79). Contagens derivadas SOMENTE das entradas varridas;
 * limitacoes heuristicas declaradas em `notes` (ex.: classes utilitarias
 * derivadas de tokens Tailwind nao sao contadas estaticamente).
 */
export interface ImpactReport {
  /** Alvo analisado (tokenRef, variavel CSS ou descricao do elemento). */
  target: string;
  usagesCount: number;
  /** Arquivos de texto efetivamente varridos (evidencia de cobertura). */
  scannedFiles: number;
  affectedFiles: string[];
  /** Arquivos .tsx/.jsx com usos (fora de dirs de pagina). */
  affectedComponents: string[];
  /** Arquivos sob pages/ routes/ app/ com usos. */
  affectedPages: string[];
  /** Outros tokens/variaveis cuja DEFINICAO referencia o alvo (var(--alvo)). */
  affectedTokens: string[];
  /** Ocorrencias em arquivos de componente/pagina (aproximacao documentada). */
  affectedInstances: number;
  entries: ImpactEntry[];
  /** Notas de cascade awareness (09§76-77) e limitacoes da varredura. */
  notes: string[];
}

// ---------------------------------------------------------------------------
// DesignModel (M3-CONTRACTS §3.4 design.read)
// ---------------------------------------------------------------------------

export interface DesignModel {
  projectId: string;
  analyzedAt: string;
  /**
   * Mecanismo de styling detectado. `primary` e o mecanismo preferido para
   * mutacoes (ordem documentada: tailwind-v4 > tailwind-v3 > plain-css-variables);
   * `all` lista TODOS os mecanismos com sinais reais. Sem sinais => value null,
   * confidence UNKNOWN (nunca inventado).
   */
  stylingMechanism: Detection<{ primary: StylingMechanism; all: StylingMechanism[] }>;
  tokens: DesignTokenGroups;
  tokensTotal: number;
  themes: ThemeInfo[];
  /** Property sources com evidencia real no projeto (09§7); vazio => ['Unknown']. */
  propertySources: PropertySource[];
  /** Deteccao de design system existente (09§54) — para PRESERVAR, nunca substituir. */
  designSystem: Detection<DesignSystemInfo>;
}
