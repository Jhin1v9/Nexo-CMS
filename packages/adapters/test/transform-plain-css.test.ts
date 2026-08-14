/**
 * PlainCssStylingAdapter — write-path M3 (CSS variables em .css).
 * Fixture REAL em tempdir (test/helpers.ts). updateCssVariable NUNCA escreve
 * em disco; shorthand/longhand e representacao sao preservados (09§10/§18).
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PlainCssStylingAdapter } from '../src/index.js';
import {
  createNodeDetectionContext,
  createPlainCssStylingAdapter,
  parseCssDeclarations,
} from '../src/index.js';

import { TOKENS_CSS, createTempProject, plainCssFixture, type TempProject } from './helpers.js';

let project: TempProject;
let adapter: PlainCssStylingAdapter;

beforeEach(async () => {
  project = await createTempProject(plainCssFixture());
  adapter = createPlainCssStylingAdapter();
});
afterEach(async () => {
  await project.cleanup();
});

const tokensFile = (): string => join(project.root, 'styles/tokens.css');

describe('detect (read-only)', () => {
  it('detecta custom properties com evidencias de arquivo', async () => {
    const d = await adapter.detect(createNodeDetectionContext(project.root));
    expect(d.value).not.toBeNull();
    expect(d.confidence).toBe('HIGH');
    expect(d.evidence.some((e) => e.includes('styles/tokens.css'))).toBe(true);
  });

  it('projeto sem variaveis -> value null', async () => {
    const bare = await createTempProject({ 'a.css': '.a { color: red; }\n' });
    try {
      const d = await adapter.detect(createNodeDetectionContext(bare.root));
      expect(d.value).toBeNull();
    } finally {
      await bare.cleanup();
    }
  });
});

describe('readTokens (somente :root; variavel local NAO e design token)', () => {
  it('retorna vars de :root com arquivo:linha e representation', async () => {
    const tokens = await adapter.readTokens({ root: project.root });
    expect(tokens.map((t) => t.tokenRef).sort()).toEqual(['--brand-color', '--gap']);
    const brand = tokens.find((t) => t.tokenRef === '--brand-color');
    expect(brand?.value).toBe('hsl(222 47% 11%)');
    expect(brand?.representation).toBe('hsl');
    expect(brand?.source).toEqual({ file: 'styles/tokens.css', line: 3 });
    // --local esta em .card (escopo local) -> nao e token
    expect(tokens.find((t) => t.tokenRef === '--local')).toBeUndefined();
  });
});

describe('updateCssVariable (so o range do valor; disco intocado)', () => {
  it('substitui valor de var unica preservando o resto byte a byte', async () => {
    const r = await adapter.updateCssVariable({
      file: tokensFile(),
      name: '--gap',
      value: '1.5rem',
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toBe(TOKENS_CSS.replace('--gap: 1rem;', '--gap: 1.5rem;'));
    expect(await readFile(tokensFile(), 'utf8')).toBe(TOKENS_CSS);
  });

  it('representacao verbatim: HSL nao vira HEX (09§10)', async () => {
    const r = await adapter.updateCssVariable({
      file: tokensFile(),
      name: '--brand-color',
      value: 'hsl(120 40% 30%)',
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('--brand-color: hsl(120 40% 30%);');
  });

  it('nome sem prefixo -- e normalizado', async () => {
    const r = await adapter.updateCssVariable({ file: tokensFile(), name: 'gap', value: '2rem' });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('--gap: 2rem;');
  });

  it('var definida 2x fora de :root -> AMBIGUOUS_TARGET', async () => {
    const f = await project.write(
      'styles/dup.css',
      '.a { --x: 1px; }\n.b { --x: 2px; }\n',
    );
    const r = await adapter.updateCssVariable({ file: f, name: '--x', value: '3px' });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('AMBIGUOUS_TARGET');
    expect(r.diagnostics.length).toBe(2);
  });

  it('duplicada mas com UMA em :root -> edita a de :root (regra documentada)', async () => {
    const f = await project.write(
      'styles/mixed.css',
      ':root { --x: 1px; }\n.a { --x: 2px; }\n',
    );
    const r = await adapter.updateCssVariable({ file: f, name: '--x', value: '9px' });
    expect(r.ok).toBe(true);
    expect(r.newContent).toBe(':root { --x: 9px; }\n.a { --x: 2px; }\n');
  });

  it('shorthand/longhand ao redor preservados (09§18)', async () => {
    const css = `:root {\n  --pad: 4px;\n}\n.card {\n  padding: var(--pad) calc(var(--pad) * 2);\n  padding-left: 8px;\n}\n`;
    const f = await project.write('styles/sh.css', css);
    const r = await adapter.updateCssVariable({ file: f, name: '--pad', value: '6px' });
    expect(r.ok).toBe(true);
    expect(r.newContent).toBe(css.replace('--pad: 4px;', '--pad: 6px;'));
    // nada no shorthand/longhand foi tocado
    expect(r.newContent).toContain('padding: var(--pad) calc(var(--pad) * 2);');
    expect(r.newContent).toContain('padding-left: 8px;');
  });

  it('TARGET_NOT_FOUND / INVALID_INPUT / UNSUPPORTED honestos', async () => {
    const notFound = await adapter.updateCssVariable({
      file: tokensFile(),
      name: '--nope',
      value: '1px',
    });
    expect(notFound.ok).toBe(false);
    expect(notFound.diagnostics[0]?.code).toBe('TARGET_NOT_FOUND');

    const badName = await adapter.updateCssVariable({
      file: tokensFile(),
      name: '--bad name;',
      value: '1px',
    });
    expect(badName.ok).toBe(false);
    expect(badName.diagnostics[0]?.code).toBe('INVALID_INPUT');

    const scss = await project.write('styles/x.scss', '$v: 1px;\n');
    const r = await adapter.updateCssVariable({ file: scss, name: '--x', value: '1px' });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('UNSUPPORTED');
    expect(r.unsupported).toBeDefined();
  });

  it('resultado re-parseia (declaracao alvo presente com novo valor)', async () => {
    const r = await adapter.updateCssVariable({
      file: tokensFile(),
      name: '--gap',
      value: 'calc(1rem + 2px)',
    });
    expect(r.ok).toBe(true);
    const decl = parseCssDeclarations(r.newContent ?? '').find((d) => d.property === '--gap');
    expect(decl?.value).toBe('calc(1rem + 2px)');
  });
});
