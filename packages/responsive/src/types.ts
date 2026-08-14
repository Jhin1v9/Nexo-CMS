/**
 * Tipos públicos de @nexo/responsive (M3-CONTRACTS §3.5; doc 09 §24-§47).
 *
 * Regras duras honradas aqui:
 * - Viewports arbitrários são obrigatórios (09§26); presets são CONFIGURÁVEIS
 *   e nunca verdade universal (09§25/§62).
 * - Diagnostics distinguem comportamento observado (fato geométrico medido) de
 *   causa inferida (hipótese) — 09§36/§58/§59. Falso positivo NUNCA vira fato.
 * - Snapshots NÃO são o Source Project (09§44).
 * - Erros: NexoError estável (M3 §3) + details + nextAction. Os códigos
 *   específicos do Responsive Lab que não existem no ErrorCode congelado de
 *   @nexo/shared viajam em `details.reason` (ver ResponsiveReasonCode).
 */

import type { Detection } from '@nexo/shared';

// ---------------------------------------------------------------------------
// Viewport (doc 09§24-§28)
// ---------------------------------------------------------------------------

export type ViewportOrientation = 'Portrait' | 'Landscape';

export interface Viewport {
  id: string; // uuid estável gerado no create
  name?: string;
  width: number; // px CSS, inteiro > 0
  height: number; // px CSS, inteiro > 0
  dpr?: number; // device pixel ratio, quando suportado (09§24)
  orientation: ViewportOrientation;
  /** true quando originado de preset configurável (09§25) — não confere autoridade. */
  isPreset?: boolean;
  createdAt?: string; // ISO 8601, presente em viewports persistidos
}

/** Preset = condição de viewport definida pelo Nexo, não reprodução de hardware (09§62). */
export interface ViewportPreset {
  name: string;
  width: number;
  height: number;
  dpr?: number;
  orientation: ViewportOrientation;
}

export interface ViewportCreateInput {
  name?: string;
  width: number;
  height: number;
  dpr?: number;
  orientation?: ViewportOrientation;
}

/**
 * Breakpoints detectados no PROJETO (09§22): somente valores presentes em
 * media queries / config de styling do projeto. Nunca assume 640/768/1024/1280.
 */
export interface ProjectBreakpoints {
  breakpoints: Detection<number[]>;
  /** Arquivos onde os valores foram observados (evidência). */
  scannedFiles: string[];
}

// ---------------------------------------------------------------------------
// Diagnostics (doc 09§29-§36, §58-§59)
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** 09§36: incerteza representada; falso positivo nunca reportado como fato. */
export type DiagnosticCertainty = 'ConfirmedIssue' | 'PotentialIssue' | 'Unknown';

export type DiagnosticKind =
  | 'HORIZONTAL_OVERFLOW'
  | 'VERTICAL_OVERFLOW'
  | 'CONTENT_CLIPPING'
  | 'TEXT_OVERFLOW'
  | 'UNWANTED_WRAPPING'
  | 'BROKEN_GRID'
  | 'BROKEN_FLEX'
  | 'FIXED_ELEMENT_OVERFLOW'
  | 'IMAGE_INTRINSIC_OVERFLOW'
  | 'ABSOLUTE_OVERFLOW'
  | 'UNBREAKABLE_TEXT';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Referência a um elemento do DOM renderizado. DOM ≠ Source (09§49). */
export interface ElementRef {
  /** Seletor CSS único gerado em runtime (cadeia tag/id/classes/nth-of-type). */
  selector: string;
  tagName: string;
  id?: string;
  classList: string[];
  /** Trecho do texto visível (truncado), quando existir. */
  textPreview?: string;
}

/**
 * Source Mapping (09§37/§50; M3 §5). Só presente quando um mapper confiável
 * foi injetado E resolveu o elemento; ausência NUNCA é adivinhada.
 */
export interface SourceMapping {
  filePath: string;
  line?: number;
  column?: number;
  confidence: 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN';
}

/**
 * Evidência mensurável (09§34/§38): números reais em px CSS medidos no
 * browser, mais os computed styles relevantes. `measurements` usa chaves
 * explícitas (ex.: overflowXPx, lineCount, viewportWidthPx).
 */
export interface DiagnosticEvidence {
  measurements: Record<string, number>;
  computedStyles?: Record<string, string>;
  /** Texto livre com o que foi observado de fato (não a causa). */
  observed: string;
}

export interface DiagnosticIssue {
  id: string;
  kind: DiagnosticKind;
  severity: DiagnosticSeverity;
  certainty: DiagnosticCertainty;
  viewport: { width: number; height: number };
  element: ElementRef;
  sourceMapping?: SourceMapping;
  description: string;
  evidence: DiagnosticEvidence;
  /** Hipóteses de causa/inspeção (09§59) — NUNCA apresentadas como verificadas. */
  suggestedFixes?: string[];
}

// ---------------------------------------------------------------------------
// Preview (doc 09§27)
// ---------------------------------------------------------------------------

export type PreviewState = 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED';

export interface PreviewInfo {
  projectId: string;
  previewUrl: string;
  state: PreviewState;
  /** true quando um preview já existente foi reutilizado (09§27 Start/Reuse). */
  reused: boolean;
  viewport: Viewport;
  route: string;
  /** Script do package.json efetivamente usado (evidência; nunca assumido). */
  scriptName: string;
  pid?: number;
}

// ---------------------------------------------------------------------------
// Stress Testing (doc 09§32-§33; D14: perfis FIXOS documentados)
// ---------------------------------------------------------------------------

export type StressProfileId =
  | 'longHeading'
  | 'longButtonText'
  | 'manyItems'
  | 'missingImage'
  | 'extremeViewport';

export interface StressProfile {
  id: StressProfileId;
  description: string;
  /** Parâmetros fixos do perfil (D14) — documentados e auditáveis. */
  params: Record<string, number | string>;
}

/**
 * Prova de isolamento (09§33): hash do conteúdo do Source Project antes e
 * depois do stress. mutated=true seria bug grave — o resultado sempre reporta.
 */
export interface SourceIntegrityProof {
  beforeHash: string;
  afterHash: string;
  mutated: boolean;
  /** Escopo do hash (o que entra e o que é excluído) — auditável. */
  scope: { hashedFiles: number; excludedDirs: string[] };
}

export interface StressTestResult {
  profile: StressProfileId;
  viewport: Viewport;
  route: string;
  /** Descreve o que foi injetado no DOM temporário (runtime only). */
  appliedMutation: string;
  issues: DiagnosticIssue[];
  sourceIntegrity: SourceIntegrityProof;
}

// ---------------------------------------------------------------------------
// Compare (doc 09§43/§45) e Snapshot (doc 09§44)
// ---------------------------------------------------------------------------

export interface ViewportCapture {
  viewport: Viewport;
  imagePath: string;
  issues: DiagnosticIssue[];
}

/**
 * Par comparado com pixelmatch (D14). Quando as dimensões diferem, a
 * comparação cobre apenas a REGIÃO DE INTERSEÇÃO top-left (documentado em
 * comparedRegion) — nunca um resize aproximado apresentado como verdade.
 */
export interface ViewportPairDiff {
  viewportA: string; // id
  viewportB: string; // id
  diffPixels: number;
  diffPercentage: number; // 0..100 sobre a região comparada
  comparedRegion: { width: number; height: number };
  fullDimensionsCompared: boolean; // false = apenas interseção comparada
  diffImagePath?: string;
  /** Algoritmo + threshold usados (09§45 — escolha documentada). */
  algorithm: { name: 'pixelmatch'; threshold: number; includeAA: boolean };
}

export interface CompareResult {
  projectId: string;
  route: string;
  captures: ViewportCapture[];
  diffs: ViewportPairDiff[];
}

/**
 * Snapshot visual (09§44). NÃO é o Source Project: imagePath é uma captura de
 * render e sourceState é apenas uma referência observada.
 */
export interface Snapshot {
  id: string;
  project: string; // projectId
  viewport: Viewport;
  route: string;
  sourceState: string;
  timestamp: string; // ISO 8601
  previewRef: string;
  imagePath: string;
  diagnostics: DiagnosticIssue[];
}

// ---------------------------------------------------------------------------
// Browser (doc 09§46-§47)
// ---------------------------------------------------------------------------

/** Capacidades detectadas por PROBES reais — nunca assumidas (09§47). */
export interface BrowserCapabilities {
  viewportResize: boolean;
  screenshots: boolean;
  domInspection: boolean;
  boundingBoxes: boolean;
  computedStyles: boolean;
  consoleLogs: boolean;
  network: boolean;
  engine: string; // ex.: 'chromium'
  engineVersion: string; // ex.: browser.version()
}

/**
 * Razões específicas do Responsive Lab. O ErrorCode de @nexo/shared é
 * congelado (SPEC §0); estas razões viajam em NexoError.details.reason com
 * details.nextAction — contrato M3 §3 ("Erros: NexoError estável + details +
 * nextAction") sem fork do enum compartilhado.
 */
export type ResponsiveReasonCode =
  | 'BROWSER_UNAVAILABLE'
  | 'PREVIEW_SCRIPT_UNKNOWN'
  | 'PREVIEW_START_FAILED'
  | 'PREVIEW_NOT_RESPONDING'
  | 'PREVIEW_NOT_RUNNING'
  | 'VIEWPORT_NOT_FOUND'
  | 'PROJECT_NOT_FOUND'
  | 'STRESS_MUTATION_DETECTED';

export const REASON = {
  browserUnavailable: 'BROWSER_UNAVAILABLE',
  previewScriptUnknown: 'PREVIEW_SCRIPT_UNKNOWN',
  previewStartFailed: 'PREVIEW_START_FAILED',
  previewNotResponding: 'PREVIEW_NOT_RESPONDING',
  previewNotRunning: 'PREVIEW_NOT_RUNNING',
  viewportNotFound: 'VIEWPORT_NOT_FOUND',
  projectNotFound: 'PROJECT_NOT_FOUND',
  stressMutationDetected: 'STRESS_MUTATION_DETECTED',
} as const satisfies Record<string, ResponsiveReasonCode>;

/**
 * Scanner de scripts do projeto — espelho ESTRUTURAL do ProjectScanner de
 * @nexo/intelligence (injetável; evita dependência cruzada de runtime).
 * Qualquer implementação cujo scan() retorne { scripts: Detection<...> } é
 * aceita (structural typing), incluindo createProjectScanner() real.
 */
export interface ProjectScriptsScanner {
  scan(rootAbsPath: string): Promise<
    import('@nexo/shared').Result<{ scripts: Detection<Record<string, string>> }>
  >;
}

/** Mapper opcional DOM→source (09§37/§50). Ausente = sourceMapping omitido. */
export type SourceMapperFn = (element: ElementRef) => SourceMapping | null;
