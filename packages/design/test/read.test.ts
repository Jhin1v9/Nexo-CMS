/**
 * design.read (M3-CONTRACTS §3.4): DesignModel real — tokens com file:line,
 * mecanismo detectado por sinais, temas, property sources, design system.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupFixture,
  createPlainCssFixture,
  createTailwindV4Fixture,
  createUnknownFixture,
  makeCtx,
  type Fixture,
} from './helpers.js';

let fixtures: Fixture[] = [];
afterEach(() => {
  for (const f of fixtures) cleanupFixture(f);
  fixtures = [];
});

function lineContent(dir: string, rel: string, line: number): string {
  const content = readFileSync(path.join(dir, rel), 'utf8');
  return content.split('\n')[line - 1] ?? '';
}

describe('design.read — Tailwind v4', () => {
  it('retorna tokens com origem arquivo:linha reais e mecanismo tailwind-v4', async () => {
    const fx = createTailwindV4Fixture();
    fixtures.push(fx);
    const result = await fx.service.read(makeCtx(fx.projectId), { projectId: fx.projectId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.value;

    expect(model.stylingMechanism.value?.primary).toBe('tailwind-v4');
    expect(model.stylingMechanism.confidence).toBe('CONFIRMED');

    const primary = model.tokens.color.find((t) => t.tokenRef === '--color-primary');
    expect(primary).toBeDefined();
    expect(primary?.value).toBe('oklch(0.7 0.15 250)');
    expect(primary?.source.file).toBe('src/index.css');
    // origem EXATA: a linha reportada contem a declaracao real
    expect(lineContent(fx.dir, 'src/index.css', primary?.source.line ?? -1)).toContain(
      '--color-primary: oklch(0.7 0.15 250)',
    );

    expect(model.tokens.spacing.map((t) => t.tokenRef)).toContain('--spacing-card');
    expect(model.tokens.radius.map((t) => t.tokenRef)).toContain('--radius-box');
    expect(model.tokensTotal).toBe(4);

    expect(model.propertySources).toContain('TailwindUtility');
    expect(model.propertySources).toContain('DesignToken');
    expect(model.propertySources).toContain('InlineStyle'); // Home.tsx tem style={{...}}

    expect(model.designSystem.value?.detected).toBe(true);
    expect(model.designSystem.value?.signals.tokens).toBe(true);
    expect(model.designSystem.value?.signals.sharedComponents).toBe(true);
  });
});

describe('design.read — Plain CSS', () => {
  it('detecta mecanismo plain-css-variables, tokens :root e tema dark via data-theme', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.read(makeCtx(fx.projectId), { projectId: fx.projectId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.value;

    expect(model.stylingMechanism.value?.primary).toBe('plain-css-variables');
    expect(model.stylingMechanism.value?.all).toEqual(['plain-css-variables']);

    const brand = model.tokens.color.find((t) => t.tokenRef === '--brand-primary');
    expect(brand).toBeDefined();
    expect(brand?.value).toBe('#3366ff'); // :root, nao o override do tema
    expect(brand?.source.file).toBe('src/styles.css');
    expect(lineContent(fx.dir, 'src/styles.css', brand?.source.line ?? -1)).toContain(
      '--brand-primary: #3366ff',
    );

    expect(model.tokens.spacing.map((t) => t.tokenRef)).toContain('--space-md');
    expect(model.tokens.typography.map((t) => t.tokenRef)).toContain('--font-body');
    expect(model.tokens.shadow.map((t) => t.tokenRef)).toContain('--shadow-card');

    const dark = model.themes.find((t) => t.name === 'dark');
    expect(dark).toBeDefined();
    expect(dark?.mechanism).toBe('Attributes');
    expect(dark?.activation).toBe('[data-theme="dark"]');
    expect(dark?.variables).toContain('--brand-primary');
    expect(dark?.kind).toBe('Dark');

    expect(model.propertySources).toContain('CssVariable');
    expect(model.propertySources).toContain('ThemeConfiguration');
    expect(model.designSystem.value?.detected).toBe(true);
    expect(model.designSystem.value?.signals.theme).toBe(true);
  });
});

describe('design.read — mecanismo desconhecido', () => {
  it('sem sinais: listas vazias + confidence UNKNOWN (nada inventado)', async () => {
    const fx = createUnknownFixture();
    fixtures.push(fx);
    const result = await fx.service.read(makeCtx(fx.projectId), { projectId: fx.projectId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.value;

    expect(model.stylingMechanism.value).toBeNull();
    expect(model.stylingMechanism.confidence).toBe('UNKNOWN');
    expect(model.tokensTotal).toBe(0);
    expect(model.themes).toEqual([]);
    expect(model.propertySources).toEqual(['Unknown']);
    expect(model.designSystem.value?.detected).toBe(false);
  });

  it('projectId inexistente -> NOT_FOUND com operationId', async () => {
    const fx = createUnknownFixture();
    fixtures.push(fx);
    const ctx = makeCtx();
    const result = await fx.service.read(ctx, { projectId: 'nao-existe' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.operationId).toBe(ctx.operationId);
  });
});
