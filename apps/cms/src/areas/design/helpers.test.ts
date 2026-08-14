/** Helpers puros de /design (node, sem DOM). */

import { describe, expect, it } from 'vitest';

import type { DesignTokenGroups } from '../../api/hooks';
import {
  isColorPreviewable,
  isPlausibleTokenRef,
  nonEmptyTokenGroups,
  parseThemePatch,
  propertySourceLabel,
} from './helpers';

describe('parseThemePatch', () => {
  it('linhas "--var: valor" viram patch; inválidas reportadas (nunca descartadas em silêncio)', () => {
    const { patch, invalidLines } = parseThemePatch('--color-bg: #0b0f19\n--space-1: 4px\nnão é variavel\n\n--x: 1px ;');
    expect(patch).toEqual({ '--color-bg': '#0b0f19', '--space-1': '4px', '--x': '1px ;' });
    expect(invalidLines).toEqual(['não é variavel']);
  });
  it('texto vazio -> patch vazio sem inválidas', () => {
    expect(parseThemePatch('  \n ')).toEqual({ patch: {}, invalidLines: [] });
  });
});

describe('isColorPreviewable (09§10 — swatch é só preview; texto sempre verbatim)', () => {
  it('hex/rgb/oklch/var() previewáveis; literais arbitrários não', () => {
    expect(isColorPreviewable('#fff')).toBe(true);
    expect(isColorPreviewable('#0b0f19cc')).toBe(true);
    expect(isColorPreviewable('oklch(0.6 0.1 150)')).toBe(true);
    expect(isColorPreviewable('var(--color-primary)')).toBe(true);
    expect(isColorPreviewable('4px')).toBe(false);
    expect(isColorPreviewable('bold 16px Inter')).toBe(false);
  });
});

describe('nonEmptyTokenGroups', () => {
  it('ordem estável + grupos vazios omitidos (Other nunca reclassificado)', () => {
    const tokens: DesignTokenGroups = {
      color: [],
      spacing: [
        {
          tokenRef: '--space-1',
          type: 'Spacing',
          value: '4px',
          representation: 'length',
          mechanism: 'plain-css-variables',
          source: { file: 'src/app.css', line: 2 },
        },
      ],
      typography: [],
      radius: [],
      shadow: [],
      breakpoint: [],
      containerWidth: [],
      other: [
        {
          tokenRef: '--z-modal',
          type: 'Other',
          value: '40',
          representation: 'number',
          mechanism: 'plain-css-variables',
          source: { file: 'src/app.css', line: 9 },
        },
      ],
    };
    expect(nonEmptyTokenGroups(tokens)).toEqual(['spacing', 'other']);
  });
});

describe('isPlausibleTokenRef / propertySourceLabel', () => {
  it('aceita --var e dotted config v3', () => {
    expect(isPlausibleTokenRef('--color-primary')).toBe(true);
    expect(isPlausibleTokenRef('colors.primary.500')).toBe(true);
    expect(isPlausibleTokenRef('')).toBe(false);
    expect(isPlausibleTokenRef('com espaço')).toBe(false);
  });
  it('Unknown é rotulado, nunca escondido', () => {
    expect(propertySourceLabel('Unknown')).toBe('Desconhecido');
  });
});
