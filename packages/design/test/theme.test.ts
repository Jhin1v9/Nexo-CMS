/**
 * theme.read / theme.update (09§52-53): modifica o theme system EXISTENTE;
 * proibido introduzir tema paralelo (NoThemeSystem).
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

describe('theme.read', () => {
  it('detecta tema dark via data-theme com mecanismo Attributes e variaveis reais', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.themeRead(makeCtx(fx.projectId), { projectId: fx.projectId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.confidence).toBe('CONFIRMED');
    expect(result.value.themes).toHaveLength(1);
    const dark = result.value.themes[0];
    expect(dark?.name).toBe('dark');
    expect(dark?.kind).toBe('Dark');
    expect(dark?.mechanism).toBe('Attributes');
    expect(dark?.activation).toBe('[data-theme="dark"]');
    expect(dark?.source.file).toBe('src/styles.css');
    expect(dark?.variables.sort()).toEqual(['--brand-primary', '--surface']);
  });

  it('projeto sem tema: lista vazia + UNKNOWN (sem invencao)', async () => {
    const fx = createTailwindV4Fixture();
    fixtures.push(fx);
    const result = await fx.service.themeRead(makeCtx(fx.projectId), { projectId: fx.projectId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.themes).toEqual([]);
    expect(result.value.confidence).toBe('UNKNOWN');
  });
});

describe('theme.update', () => {
  it('modifica variaveis do tema EXISTENTE ([data-theme="dark"]) sem tocar o :root', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.themeUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      theme: 'dark',
      patch: { '--brand-primary': '#aaccff', '--surface': '#000000' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.verified).toBe(true);
    expect(result.value.filesChanged).toEqual(['src/styles.css']);
    expect(result.value.theme.name).toBe('dark');
    expect(result.value.updatedVariables).toHaveLength(2);
    const brand = result.value.updatedVariables.find((v) => v.variable === '--brand-primary');
    expect(brand?.previousValue).toBe('#99bbff');
    expect(brand?.value).toBe('#aaccff');
    // impact report por variavel, computado antes de mutar
    expect(
      brand?.impact.entries.some((e) => e.kind === 'css-var-usage' && e.file === 'src/a.css'),
    ).toBe(true);

    const css = readFileSync(path.join(fx.dir, 'src/styles.css'), 'utf8');
    // tema modificado
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('--brand-primary: #aaccff;');
    expect(css).toContain('--surface: #000000;');
    // :root preservado (base nao e tema; escopo respeitado — 09§74)
    expect(css).toContain('--brand-primary: #3366ff;');
    expect(css).not.toContain('#99bbff');
    expect(css).not.toContain('#111111');

    // theme.read reflete o novo valor (verificacao de dominio)
    const reread = await fx.service.themeRead(makeCtx(fx.projectId), { projectId: fx.projectId });
    expect(reread.ok).toBe(true);
  });

  it('projeto SEM theme system -> NoThemeSystem com nextAction (09§53: proibido tema paralelo)', async () => {
    const fx = createUnknownFixture();
    fixtures.push(fx);
    const result = await fx.service.themeUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      theme: 'dark',
      patch: { '--brand-primary': '#000000' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details?.designError).toBe('NoThemeSystem');
    expect(result.error.details?.nextAction).toBe('explicitly-request-new-theme-architecture');
  });

  it('tema inexistente em projeto COM theme system -> ThemeNotFound', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.themeUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      theme: 'sepia',
      patch: { '--brand-primary': '#000000' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details?.designError).toBe('ThemeNotFound');
    expect(result.error.details?.nextAction).toBe('list-themes-via-theme.read');
  });

  it('variavel nao declarada no tema -> ThemeVariableNotFound (update-only)', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.themeUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      theme: 'dark',
      patch: { '--space-md': '2rem' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details?.designError).toBe('ThemeVariableNotFound');
    // arquivo intocado
    const css = readFileSync(path.join(fx.dir, 'src/styles.css'), 'utf8');
    expect(css).toContain('--space-md: 1rem;');
  });
});
