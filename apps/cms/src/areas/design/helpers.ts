/**
 * Helpers PUROS da área /design (sem React — testáveis em node).
 * 09§10: valores de token são exibidos VERBATIM (nunca convertidos).
 */

import type { BadgeTone } from '../../components/ui';
import type {
  DesignPropertySource,
  DesignTokenGroupKey,
  DesignTokenInfo,
  StylingMechanism,
  ThemeMechanism,
} from '../../api/hooks';

/** Metadados de grupo de tokens (09§51) — rótulo + descrição honesta. */
export const TOKEN_GROUP_META: Record<DesignTokenGroupKey, { label: string; description: string }> = {
  color: { label: 'Color', description: 'Tokens de cor detectados (swatch usa o valor verbatim como preview).' },
  spacing: { label: 'Spacing', description: 'Tokens de espaçamento.' },
  typography: { label: 'Typography', description: 'Tokens de tipografia.' },
  radius: { label: 'Radius', description: 'Tokens de raio de borda.' },
  shadow: { label: 'Shadow', description: 'Tokens de sombra.' },
  breakpoint: { label: 'Breakpoint', description: 'Breakpoints presentes no source (nunca assumidos — 09§22).' },
  containerWidth: { label: 'Container Width', description: 'Larguras de container.' },
  other: { label: 'Other', description: 'Tokens reais que não casam nenhum tipo conhecido — nunca descartados nem reclassificados por chute.' },
};

/** Ordem estável de exibição dos grupos. */
export const TOKEN_GROUP_ORDER: readonly DesignTokenGroupKey[] = [
  'color',
  'spacing',
  'typography',
  'radius',
  'shadow',
  'breakpoint',
  'containerWidth',
  'other',
];

/** Grupos não-vazios na ordem estável. */
export function nonEmptyTokenGroups(tokens: Record<DesignTokenGroupKey, DesignTokenInfo[]>): DesignTokenGroupKey[] {
  return TOKEN_GROUP_ORDER.filter((k) => tokens[k].length > 0);
}

/**
 * O valor verbatim é utilizável como cor CSS de preview? Heurística de
 * RENDERING apenas (o texto exibido é sempre o valor verbatim — 09§10);
 * quando não reconhecido, o swatch fica neutro e o valor continua visível.
 */
export function isColorPreviewable(value: string): boolean {
  const v = value.trim();
  return (
    /^#(?:[0-9a-fA-F]{3,8})$/.test(v) ||
    /^(?:rgb|hsl|oklch|oklab|lab|lch|color)\(/i.test(v) ||
    /^var\(--[A-Za-z0-9_-]+\)$/.test(v)
  );
}

export function mechanismTone(mechanism: StylingMechanism): BadgeTone {
  return mechanism === 'unknown' ? 'warning' : 'primary';
}

export function mechanismLabel(mechanism: StylingMechanism): string {
  switch (mechanism) {
    case 'tailwind-v4':
      return 'Tailwind v4';
    case 'tailwind-v3':
      return 'Tailwind v3';
    case 'plain-css-variables':
      return 'CSS Variables';
    case 'unknown':
      return 'Desconhecido';
  }
}

export function themeMechanismLabel(mechanism: ThemeMechanism): string {
  switch (mechanism) {
    case 'CssVariables':
      return 'CSS Variables';
    case 'Classes':
      return 'Classes';
    case 'Attributes':
      return 'Atributos (data-*)';
    case 'Configuration':
      return 'Configuração';
    case 'ComponentState':
      return 'Estado de componente';
  }
}

/** PropertySource (09§7) -> rótulo; Unknown com orientação, nunca escondido. */
export function propertySourceLabel(source: DesignPropertySource): string {
  switch (source) {
    case 'DirectValue':
      return 'Valor direto';
    case 'CssVariable':
      return 'CSS Variable';
    case 'DesignToken':
      return 'Design Token';
    case 'TailwindUtility':
      return 'Tailwind Utility';
    case 'ThemeConfiguration':
      return 'Theme Configuration';
    case 'ComponentProp':
      return 'Component Prop';
    case 'StyledComponentRule':
      return 'Styled Component Rule';
    case 'InlineStyle':
      return 'Inline Style';
    case 'Unknown':
      return 'Desconhecido';
  }
}

export function propertySourceTone(source: DesignPropertySource): BadgeTone {
  return source === 'Unknown' ? 'warning' : 'neutral';
}

/** Opções do select de PropertySource no design.update (enum congelado 09§7). */
export const PROPERTY_SOURCE_OPTIONS: readonly DesignPropertySource[] = [
  'DirectValue',
  'CssVariable',
  'DesignToken',
  'TailwindUtility',
  'ThemeConfiguration',
  'ComponentProp',
  'StyledComponentRule',
  'InlineStyle',
  'Unknown',
];

/** Validação local de tokenRef (o backend valida de verdade; isto é UX). */
export function isPlausibleTokenRef(ref: string): boolean {
  return /^(--[A-Za-z0-9_-]+|[A-Za-z][A-Za-z0-9_.-]*)$/.test(ref.trim());
}

/** Patch de tema: linhas "--var: valor" -> Record; linhas inválidas reportadas. */
export function parseThemePatch(text: string): { patch: Record<string, string>; invalidLines: string[] } {
  const patch: Record<string, string> = {};
  const invalidLines: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) continue;
    const match = /^(--[A-Za-z0-9_-]+)\s*:\s*(.+)$/.exec(line);
    if (match === null) {
      invalidLines.push(line);
      continue;
    }
    patch[match[1] as string] = (match[2] as string).trim();
  }
  return { patch, invalidLines };
}
