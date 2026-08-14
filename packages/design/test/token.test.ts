/**
 * design.token.read / design.token.update: edicao da FONTE do token com
 * representacao VERBATIM (09§10), impact report real (09§79) e verificacao
 * pos-escrita (zero fake success).
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

describe('design.token.read', () => {
  it('retorna todos os tokens quando tokenRef ausente', async () => {
    const fx = createTailwindV4Fixture();
    fixtures.push(fx);
    const result = await fx.service.tokenRead(makeCtx(fx.projectId), { projectId: fx.projectId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tokens.length).toBe(4);
  });

  it('filtra por tokenRef com origem exata; inexistente -> TokenNotFound', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const found = await fx.service.tokenRead(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      tokenRef: '--space-md',
    });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.tokens).toHaveLength(1);
    expect(found.value.tokens[0]?.source.file).toBe('src/styles.css');

    const missing = await fx.service.tokenRead(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      tokenRef: '--nao-existe',
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error.code).toBe('NOT_FOUND');
    expect(missing.error.details?.designError).toBe('TokenNotFound');
    expect(missing.error.details?.nextAction).toBe('list-tokens-via-design.token.read');
  });
});

describe('design.token.update — Tailwind v4', () => {
  it('edita a FONTE no @theme preservando o formato (oklch continua oklch)', async () => {
    const fx = createTailwindV4Fixture();
    fixtures.push(fx);
    const result = await fx.service.tokenUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      tokenRef: '--color-primary',
      value: 'oklch(0.6 0.2 260)',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.previousValue).toBe('oklch(0.7 0.15 250)');
    expect(result.value.value).toBe('oklch(0.6 0.2 260)');
    expect(result.value.file).toBe('src/index.css');
    expect(result.value.filesChanged).toEqual(['src/index.css']);
    expect(result.value.verified).toBe(true);

    // disco: valor novo verbatim, antigo ausente, NADA convertido para hex
    const css = readFileSync(path.join(fx.dir, 'src/index.css'), 'utf8');
    expect(css).toContain('--color-primary: oklch(0.6 0.2 260);');
    expect(css).not.toContain('oklch(0.7 0.15 250)');

    // re-leitura de dominio confere (token.read apos update)
    const reread = await fx.service.tokenRead(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      tokenRef: '--color-primary',
    });
    expect(reread.ok).toBe(true);
    if (!reread.ok) return;
    expect(reread.value.tokens[0]?.value).toBe('oklch(0.6 0.2 260)');
  });

  it('impact report conta usos REAIS de var(--color-primary) em 3 arquivos, ANTES de mutar', async () => {
    const fx = createTailwindV4Fixture();
    fixtures.push(fx);
    const result = await fx.service.tokenUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      tokenRef: '--color-primary',
      value: '#112233',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const impact = result.value.impact;
    const varUsages = impact.entries.filter((e) => e.kind === 'css-var-usage');
    const usageFiles = [...new Set(varUsages.map((e) => e.file))].sort();
    expect(usageFiles).toEqual([
      'src/components/Card.css',
      'src/pages/Home.tsx',
      'src/styles/legacy.css',
    ]);
    expect(impact.usagesCount).toBeGreaterThanOrEqual(3);
    expect(impact.scannedFiles).toBeGreaterThan(0);
    expect(impact.affectedPages).toContain('src/pages/Home.tsx');
    expect(impact.notes.length).toBeGreaterThan(0); // limitacoes declaradas
  });
});

describe('design.token.update — Plain CSS', () => {
  it('edita o :root (fonte) sem tocar o override do tema (09§8/§74)', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.tokenUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      tokenRef: '--brand-primary',
      value: '#0044cc',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.previousValue).toBe('#3366ff');
    expect(result.value.file).toBe('src/styles.css');

    const css = readFileSync(path.join(fx.dir, 'src/styles.css'), 'utf8');
    expect(css).toContain('--brand-primary: #0044cc;');
    // override do tema NAO foi tocado (fonte != tema; escopo respeitado)
    expect(css).toContain('--brand-primary: #99bbff;');
    expect(css).not.toContain('#3366ff');

    // impact: var(--brand-primary) usado em a.css, b.css, Badge.tsx
    const usageFiles = [
      ...new Set(
        result.value.impact.entries.filter((e) => e.kind === 'css-var-usage').map((e) => e.file),
      ),
    ].sort();
    expect(usageFiles).toEqual(['src/a.css', 'src/b.css', 'src/components/Badge.tsx']);
  });

  it('preserva representacao verbatim: valor var() nao e convertido', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.tokenUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      tokenRef: '--brand-primary',
      value: 'var(--cor-primaria)',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.representation).toBe('var');
    const css = readFileSync(path.join(fx.dir, 'src/styles.css'), 'utf8');
    expect(css).toContain('--brand-primary: var(--cor-primaria);');
  });
});

describe('design.token.update — mecanismo desconhecido', () => {
  it('retorna UNSUPPORTED honesto (nunca inventa fonte)', async () => {
    const fx = createUnknownFixture();
    fixtures.push(fx);
    const result = await fx.service.tokenUpdate(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      tokenRef: '--color-primary',
      value: '#ff0000',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNSUPPORTED');
    expect(result.error.details?.designError).toBe('UnsupportedMechanism');
    expect(result.error.details?.nextAction).toBe(
      'edit-source-directly-or-extend-styling-adapter',
    );
  });
});
