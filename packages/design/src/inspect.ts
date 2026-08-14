/**
 * Inspecao interna do projeto (read-only — discovery NUNCA muta, INVARIANTS).
 * Compartilhada por read/token/theme/update: varredura de arquivos CSS,
 * leitura de tokens via Styling Adapters (Wave 2a) e deteccao de mecanismo.
 *
 * Classificacao de tipo de token (09§51): NOME primeiro (convencoes Tailwind
 * v4 `--color-*`/`--spacing*`/..., config v3 `colors.`/`spacing.`/... e
 * nomes CSS comuns); fallback por VALOR somente para cores (hex/rgb/hsl/
 * oklch/... — 09§9); nada mais e adivinhado: resto => 'Other'.
 */

import { createNodeDetectionContext, createPlainCssStylingAdapter, createTailwindStylingAdapter, findFiles, parseCssDeclarations } from '@nexo/adapters';
import type { CssDeclaration, DesignToken } from '@nexo/adapters';
import type { Detection } from '@nexo/shared';

import type { DesignTokenType, StylingMechanism, TokenInfo } from './types.js';

export const CSS_SCAN_OPTS = {
  maxDepth: 6,
  ignoreDirs: ['node_modules', '.git', 'dist'],
  maxResults: 100,
} as const;

export interface CssFileInspected {
  rel: string;
  content: string;
  decls: CssDeclaration[];
}

/** Lista arquivos .css do projeto com declaracoes parseadas (offsets exatos). */
export async function inspectCssFiles(rootAbs: string): Promise<CssFileInspected[]> {
  const ctx = createNodeDetectionContext(rootAbs);
  const files = await findFiles(ctx, (rel) => rel.endsWith('.css'), CSS_SCAN_OPTS);
  const out: CssFileInspected[] = [];
  for (const rel of files) {
    const content = await ctx.readFile(rel);
    if (content === null) continue;
    out.push({ rel, content, decls: parseCssDeclarations(content) });
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

const COLOR_VALUE = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|lch\(|lab\(|color\()/i;

/** Classifica o tipo do token (09§51). Nome primeiro; cor por valor como
 *  fallback; qualquer outra coisa => 'Other' (honesto, nunca perdido). */
export function classifyTokenType(tokenRef: string, value: string): DesignTokenType {
  const n = tokenRef.toLowerCase();
  if (n.startsWith('--color-') || /(^|\.)colors?\./.test(n) || /(^|--|-)colou?r/.test(n)) {
    return 'Color';
  }
  if (n.startsWith('--spacing') || n.startsWith('--space-') || /(^|\.)spacing\./.test(n)) {
    return 'Spacing';
  }
  if (
    n.startsWith('--font-') ||
    n.startsWith('--text-') ||
    n.startsWith('--leading-') ||
    n.startsWith('--tracking-') ||
    /(^|\.)(fontfamily|fontsize|fontweight|lineheight|letterspacing)\./.test(n) ||
    n.includes('font')
  ) {
    return 'Typography';
  }
  if (n.startsWith('--radius') || n.startsWith('--rounded') || /(^|\.)borderradius\./.test(n) || n.includes('radius')) {
    return 'Radius';
  }
  if (n.startsWith('--shadow') || /(^|\.)(boxshadow|shadow)\./.test(n) || n.includes('shadow')) {
    return 'Shadow';
  }
  if (n.startsWith('--breakpoint-') || /(^|\.)screens\./.test(n) || n.includes('breakpoint')) {
    return 'Breakpoint';
  }
  if (n.startsWith('--container-') || n.includes('container')) {
    return 'ContainerWidth';
  }
  if (COLOR_VALUE.test(value.trim())) return 'Color';
  return 'Other';
}

function mechanismOfToken(t: DesignToken): Exclude<StylingMechanism, 'unknown'> {
  // Tailwind v4 emite refs '--...' vindas do @theme; v3 emite refs dotted do config.
  if (t.tokenRef.startsWith('--')) return 'tailwind-v4';
  return 'tailwind-v3';
}

/**
 * Le TODOS os tokens do projeto via os dois Styling Adapters (fonte de
 * verdade para origem exata) e mescla com classificacao 09§51.
 * Dedupe por (tokenRef, file, line).
 */
export async function readAllTokens(rootAbs: string): Promise<TokenInfo[]> {
  const tailwind = createTailwindStylingAdapter();
  const plainCss = createPlainCssStylingAdapter();
  const [twTokens, cssTokens] = await Promise.all([
    tailwind.readTokens({ root: rootAbs }),
    plainCss.readTokens({ root: rootAbs }),
  ]);
  const out: TokenInfo[] = [];
  const seen = new Set<string>();
  const push = (t: DesignToken, mechanism: TokenInfo['mechanism']): void => {
    const key = `${t.tokenRef}|${t.source.file}|${t.source.line}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      tokenRef: t.tokenRef,
      type: classifyTokenType(t.tokenRef, t.value),
      value: t.value,
      representation: t.representation,
      mechanism,
      source: { file: t.source.file, line: t.source.line },
    });
  };
  for (const t of twTokens) push(t, mechanismOfToken(t));
  for (const t of cssTokens) push(t, 'plain-css-variables');
  return out;
}

const TAILWIND_CONFIGS = [
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
] as const;

const TAILWIND_V4_IMPORT = /@import\s+["']tailwindcss["']/;

/**
 * Detecta o(s) mecanismo(s) de styling por SINAIS DE ARQUIVO reais:
 *  - tailwind-v4: CSS com `@import "tailwindcss"` ou bloco `@theme` com vars;
 *  - tailwind-v3: tailwind.config.* presente;
 *  - plain-css-variables: variaveis custom properties em :root fora de @theme.
 * `techEvidence` (ProjectModel.technologies) entra como evidencia adicional,
 * nunca como unico sinal de mecanismo.
 */
export async function detectStylingMechanism(
  rootAbs: string,
  cssFiles: CssFileInspected[],
  techEvidence: string[] = [],
): Promise<Detection<{ primary: StylingMechanism; all: StylingMechanism[] }>> {
  const ctx = createNodeDetectionContext(rootAbs);
  const evidence: string[] = [];
  const all: StylingMechanism[] = [];

  const v4Files = cssFiles.filter(
    (f) =>
      TAILWIND_V4_IMPORT.test(f.content) ||
      f.decls.some((d) => d.atRule === 'theme' && d.property.startsWith('--')),
  );
  if (v4Files.length > 0) {
    all.push('tailwind-v4');
    for (const f of v4Files) evidence.push(`file:${f.rel} (tailwind v4 @theme)`);
  }

  const configs: string[] = [];
  for (const rel of TAILWIND_CONFIGS) {
    if (await ctx.exists(rel)) configs.push(rel);
  }
  if (configs.length > 0) {
    all.push('tailwind-v3');
    for (const c of configs) evidence.push(`file:${c} (tailwind v3 config)`);
  }

  const plainVarFiles = cssFiles.filter((f) =>
    f.decls.some((d) => d.property.startsWith('--') && d.selector === ':root' && d.atRule === null),
  );
  if (plainVarFiles.length > 0) {
    all.push('plain-css-variables');
    for (const f of plainVarFiles) evidence.push(`file:${f.rel} (:root custom properties)`);
  }

  evidence.push(...techEvidence);

  if (all.length === 0) {
    return { value: null, confidence: 'UNKNOWN', evidence: [] };
  }
  // Precedencia documentada: v4 > v3 > plain (o mecanismo mais especifico vence).
  const primary: StylingMechanism = all.includes('tailwind-v4')
    ? 'tailwind-v4'
    : all.includes('tailwind-v3')
      ? 'tailwind-v3'
      : 'plain-css-variables';
  const confidence = v4Files.length > 0 || configs.length > 0 ? 'CONFIRMED' : 'HIGH';
  return { value: { primary, all }, confidence, evidence };
}
