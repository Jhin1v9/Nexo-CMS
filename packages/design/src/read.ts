/**
 * design.read (M3-CONTRACTS §3.4; doc 09§51-56): monta o DesignModel REAL do
 * projeto. Nada e inventado: sem sinais => listas vazias + confidence UNKNOWN
 * (Inv. 6/25). Read-only (discovery nunca muta).
 *
 * Fontes de evidencia:
 *  - Styling Adapters (Wave 2a) para tokens com origem exata;
 *  - varredura CSS (parser compartilhado de @nexo/adapters) para temas (09§52);
 *  - ProjectModel.technologies (scanner M1) como evidencia ADICIONAL de
 *    mecanismo (nunca como unico sinal);
 *  - sinais 09§54 para design system existente (tokens, theme, shared
 *    components, typography system, spacing scale, color palette).
 */

import { createNodeDetectionContext, findFiles } from '@nexo/adapters';
import type { DetectedTechnology } from '@nexo/adapters';
import type { Detection } from '@nexo/shared';

import { CSS_SCAN_OPTS, detectStylingMechanism, inspectCssFiles, readAllTokens } from './inspect.js';
import { readThemes } from './theme.js';
import type {
  DesignModel,
  DesignSystemInfo,
  DesignTokenGroups,
  PropertySource,
  TokenInfo,
} from './types.js';

const TYPE_TO_GROUP: Record<TokenInfo['type'], keyof DesignTokenGroups> = {
  Color: 'color',
  Spacing: 'spacing',
  Typography: 'typography',
  Radius: 'radius',
  Shadow: 'shadow',
  Breakpoint: 'breakpoint',
  ContainerWidth: 'containerWidth',
  Other: 'other',
};

function groupTokens(tokens: TokenInfo[]): DesignTokenGroups {
  const groups: DesignTokenGroups = {
    color: [],
    spacing: [],
    typography: [],
    radius: [],
    shadow: [],
    breakpoint: [],
    containerWidth: [],
    other: [],
  };
  for (const t of tokens) groups[TYPE_TO_GROUP[t.type]].push(t);
  return groups;
}

/**
 * Property sources com evidencia real (09§7). Subconjunto honesto: so
 * reportamos o que tem sinal concreto no source; vazio => ['Unknown'].
 */
async function detectPropertySources(
  rootAbs: string,
  mechanismAll: readonly string[],
  tokens: TokenInfo[],
  themesCount: number,
): Promise<PropertySource[]> {
  const found = new Set<PropertySource>();
  if (mechanismAll.includes('tailwind-v4') || mechanismAll.includes('tailwind-v3')) {
    found.add('TailwindUtility');
  }
  if (tokens.length > 0) found.add('DesignToken');
  if (mechanismAll.includes('plain-css-variables')) found.add('CssVariable');
  if (themesCount > 0) found.add('ThemeConfiguration');

  // InlineStyle: style={...} em JSX/TSX (sinal textual direto)
  const ctx = createNodeDetectionContext(rootAbs);
  const jsxFiles = await findFiles(
    ctx,
    (rel) => /\.(tsx|jsx)$/.test(rel),
    { ...CSS_SCAN_OPTS, maxResults: 500 },
  );
  for (const rel of jsxFiles) {
    const content = await ctx.readFile(rel);
    if (content !== null && /\bstyle\s*=\s*[{"]/.test(content)) {
      found.add('InlineStyle');
      break;
    }
  }
  return found.size > 0 ? [...found].sort() : ['Unknown'];
}

/** Deteccao de design system existente (09§54) — para PRESERVAR (09§55). */
async function detectDesignSystem(
  rootAbs: string,
  tokens: TokenInfo[],
  themesCount: number,
): Promise<Detection<DesignSystemInfo>> {
  const evidence: string[] = [];

  const hasTokens = tokens.length > 0;
  if (hasTokens) evidence.push(`tokens:${tokens.length}`);

  const hasTheme = themesCount > 0;
  if (hasTheme) evidence.push(`themes:${themesCount}`);

  const colorCount = tokens.filter((t) => t.type === 'Color').length;
  const colorPalette = colorCount >= 3;
  if (colorPalette) evidence.push(`color-palette:${colorCount} color tokens`);

  const spacingCount = tokens.filter((t) => t.type === 'Spacing').length;
  const spacingScale = spacingCount >= 3;
  if (spacingScale) evidence.push(`spacing-scale:${spacingCount} spacing tokens`);

  const typographyCount = tokens.filter((t) => t.type === 'Typography').length;
  const typographySystem = typographyCount >= 2;
  if (typographySystem) evidence.push(`typography-system:${typographyCount} typography tokens`);

  // shared components: diretorio(s) components/ com >= 2 arquivos JSX/TSX
  const ctx = createNodeDetectionContext(rootAbs);
  const componentFiles = await findFiles(
    ctx,
    (rel) => /(^|\/)components\//.test(rel) && /\.(tsx|jsx)$/.test(rel),
    { ...CSS_SCAN_OPTS, maxResults: 500 },
  );
  const sharedComponents = componentFiles.length >= 2;
  if (sharedComponents) evidence.push(`shared-components:${componentFiles.length} files under components/`);

  const signals = {
    tokens: hasTokens,
    theme: hasTheme,
    sharedComponents,
    typographySystem,
    spacingScale,
    colorPalette,
  };
  const trueCount = Object.values(signals).filter(Boolean).length;
  const detected = trueCount >= 2;
  return {
    value: { detected, signals, evidence },
    confidence: detected ? 'HIGH' : trueCount > 0 ? 'MEDIUM' : 'UNKNOWN',
    evidence,
  };
}

export interface ReadDesignModelInput {
  projectId: string;
  rootAbs: string;
  /** ProjectModel.technologies (scanner M1), quando disponivel. */
  technologies?: DetectedTechnology[];
}

export async function readDesignModel(input: ReadDesignModelInput): Promise<DesignModel> {
  const cssFiles = await inspectCssFiles(input.rootAbs);
  const tokens = await readAllTokens(input.rootAbs);

  const techEvidence = (input.technologies ?? [])
    .filter((t) => t.category === 'STYLING')
    .map((t) => `technology:${t.technology} (${t.confidence}, adapter ${t.adapterId})`);

  const stylingMechanism = await detectStylingMechanism(input.rootAbs, cssFiles, techEvidence);
  const { themes } = readThemes(cssFiles);
  const propertySources = await detectPropertySources(
    input.rootAbs,
    stylingMechanism.value?.all ?? [],
    tokens,
    themes.length,
  );
  const designSystem = await detectDesignSystem(input.rootAbs, tokens, themes.length);

  return {
    projectId: input.projectId,
    analyzedAt: new Date().toISOString(),
    stylingMechanism,
    tokens: groupTokens(tokens),
    tokensTotal: tokens.length,
    themes,
    propertySources,
    designSystem,
  };
}
