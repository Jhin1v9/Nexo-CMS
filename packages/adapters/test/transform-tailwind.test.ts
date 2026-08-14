/**
 * TailwindStylingAdapter — write-path M3 (v4 @theme + v3 config).
 * Fixture REAL em tempdir (test/helpers.ts). updateToken NUNCA escreve em
 * disco — o teste confere que o arquivo original permanece intacto.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TailwindStylingAdapter } from '../src/index.js';
import {
  createNodeDetectionContext,
  createTailwindStylingAdapter,
  parseCssDeclarations,
} from '../src/index.js';

import {
  INDEX_CSS_TAILWIND_V4,
  TAILWIND_CONFIG_JS,
  createTempProject,
  reactTailwindFixture,
  type TempProject,
} from './helpers.js';

let project: TempProject;
let adapter: TailwindStylingAdapter;

beforeEach(async () => {
  project = await createTempProject(reactTailwindFixture());
  adapter = createTailwindStylingAdapter();
});
afterEach(async () => {
  await project.cleanup();
});

describe('detect (read-only, evidence-based)', () => {
  it('detecta v4 (@theme) + config v3 com evidencias', async () => {
    const d = await adapter.detect(createNodeDetectionContext(project.root));
    expect(d.value).not.toBeNull();
    expect(d.confidence).toBe('CONFIRMED');
    expect(d.evidence.some((e) => e.includes('src/index.css'))).toBe(true);
    expect(d.evidence.some((e) => e.includes('tailwind.config.js'))).toBe(true);
  });

  it('projeto sem tailwind -> value null (ausencia nao e UNKNOWN inventado)', async () => {
    const empty = await createTempProject({ 'package.json': '{"name":"x"}' });
    try {
      const d = await adapter.detect(createNodeDetectionContext(empty.root));
      expect(d.value).toBeNull();
      expect(d.evidence).toEqual([]);
    } finally {
      await empty.cleanup();
    }
  });
});

describe('readTokens (origem exata arquivo:linha; representacao preservada)', () => {
  it('le tokens do @theme v4 com kind e representation corretos', async () => {
    const tokens = await adapter.readTokens({ root: project.root });
    const primary = tokens.find((t) => t.tokenRef === '--color-primary');
    expect(primary).toBeDefined();
    expect(primary?.value).toBe('hsl(222 47% 11%)');
    expect(primary?.kind).toBe('color');
    expect(primary?.representation).toBe('hsl'); // NUNCA convertido para hex
    expect(primary?.source.file).toBe('src/index.css');
    expect(primary?.source.line).toBe(4);

    const spacing = tokens.find((t) => t.tokenRef === '--spacing-md');
    expect(spacing?.kind).toBe('spacing');
    expect(spacing?.representation).toBe('length');

    const radius = tokens.find((t) => t.tokenRef === '--radius-lg');
    expect(radius?.kind).toBe('radius');
  });

  it('le tokens do config v3 (extend.colors nested -> dotted; numeric keys)', async () => {
    const tokens = await adapter.readTokens({ root: project.root });
    const light = tokens.find((t) => t.tokenRef === 'extend.colors.brand.light');
    expect(light?.value).toBe('#eeeeee');
    expect(light?.representation).toBe('hex');
    expect(light?.source.file).toBe('tailwind.config.js');

    const spacing = tokens.find((t) => t.tokenRef === 'extend.spacing.18');
    expect(spacing?.value).toBe('4.5rem');
    const radius = tokens.find((t) => t.tokenRef === 'extend.borderRadius.xl');
    expect(radius?.value).toBe('1rem');
  });
});

describe('updateToken (edita a FONTE; representacao VERBATIM; disco intocado)', () => {
  it('v4: substitui so o valor no @theme, preservando o resto byte a byte', async () => {
    const r = await adapter.updateToken({
      root: project.root,
      tokenRef: '--color-accent',
      value: '#00ff00',
    });
    expect(r.ok).toBe(true);
    expect(r.file).toBe('src/index.css');
    const expected = INDEX_CSS_TAILWIND_V4.replace('--color-accent: #ff0066;', '--color-accent: #00ff00;');
    expect(r.newContent).toBe(expected);
    // re-parse: declaracao presente com novo valor
    const decl = parseCssDeclarations(r.newContent ?? '').find((d) => d.property === '--color-accent');
    expect(decl?.value).toBe('#00ff00');
    // disco intocado
    expect(await readFile(join(project.root, 'src/index.css'), 'utf8')).toBe(INDEX_CSS_TAILWIND_V4);
  });

  it('v4: tokenRef sem prefixo -- e normalizado', async () => {
    const r = await adapter.updateToken({
      root: project.root,
      tokenRef: 'spacing-md',
      value: '1.25rem',
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('--spacing-md: 1.25rem;');
  });

  it('v4: valor HSL permanece HSL verbatim (09§10 — nunca converter)', async () => {
    const r = await adapter.updateToken({
      root: project.root,
      tokenRef: '--color-primary',
      value: 'hsl(200 50% 50%)',
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('--color-primary: hsl(200 50% 50%);');
  });

  it('v3 config: tokenRef colors.brand.light cai no extend (fallback documentado)', async () => {
    const r = await adapter.updateToken({
      root: project.root,
      tokenRef: 'colors.brand.light',
      value: '#fafafa',
    });
    expect(r.ok).toBe(true);
    expect(r.file).toBe('tailwind.config.js');
    const expected = TAILWIND_CONFIG_JS.replace("light: '#eeeeee',", "light: '#fafafa',");
    expect(r.newContent).toBe(expected); // aspas simples preservadas
    expect(await readFile(join(project.root, 'tailwind.config.js'), 'utf8')).toBe(TAILWIND_CONFIG_JS);
  });

  it('token inexistente (--x) -> TARGET_NOT_FOUND', async () => {
    const r = await adapter.updateToken({
      root: project.root,
      tokenRef: '--color-nope',
      value: '#000000',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('TARGET_NOT_FOUND');
  });

  it('token de config inexistente -> TARGET_NOT_FOUND', async () => {
    const r = await adapter.updateToken({
      root: project.root,
      tokenRef: 'colors.nope',
      value: '#000000',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('TARGET_NOT_FOUND');
  });

  it('token definido em DOIS @theme -> AMBIGUOUS_TARGET (nunca adivinha)', async () => {
    await project.write(
      'src/admin.css',
      '@import "tailwindcss";\n\n@theme {\n  --color-accent: #123123;\n}\n',
    );
    const r = await adapter.updateToken({
      root: project.root,
      tokenRef: '--color-accent',
      value: '#00ff00',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('AMBIGUOUS_TARGET');
    expect(r.diagnostics.length).toBe(2);
  });

  it('projeto sem mecanismo suportado -> UNSUPPORTED honesto', async () => {
    const bare = await createTempProject({
      'package.json': '{"name":"x"}',
      'src/index.css': '.a { color: red; }\n',
    });
    try {
      const r = await adapter.updateToken({ root: bare.root, tokenRef: 'colors.primary', value: '#fff' });
      expect(r.ok).toBe(false);
      expect(r.diagnostics[0]?.code).toBe('UNSUPPORTED');
      expect(r.unsupported).toBeDefined();
    } finally {
      await bare.cleanup();
    }
  });
});

describe('setUtilityClass (sobre classList; quem aplica no JSX e o transformer)', () => {
  it('token simples -> classe prefixo-valor, removendo classe do mesmo prefixo', () => {
    const r = adapter.setUtilityClass({
      classList: 'rounded-md bg-blue-500 p-4',
      property: 'background-color',
      value: 'primary',
    });
    expect(r.ok).toBe(true);
    expect(r.ok && r.newClassList).toBe('rounded-md p-4 bg-primary');
  });

  it('valor arbitrario -> sintaxe [valor]', () => {
    const r = adapter.setUtilityClass({
      classList: 'p-4',
      property: 'background-color',
      value: '#ff0066',
    });
    expect(r.ok).toBe(true);
    expect(r.ok && r.newClassList).toBe('p-4 bg-[#ff0066]');
  });

  it('var()/unidade tambem viram arbitrary value', () => {
    const r = adapter.setUtilityClass({
      classList: 'm-2',
      property: 'padding',
      value: '1.5rem',
    });
    expect(r.ok && r.newClassList).toBe('m-2 p-[1.5rem]');
  });

  it('propriedade fora da tabela -> UNSUPPORTED honesto', () => {
    const r = adapter.setUtilityClass({ classList: '', property: 'backdrop-filter', value: 'blur' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.diagnostics[0]?.code).toBe('UNSUPPORTED');
      expect(r.unsupported).toBeDefined();
    }
  });

  it('valor com espacos -> INVALID_INPUT (arbitrary nao admite espacos)', () => {
    const r = adapter.setUtilityClass({ classList: '', property: 'color', value: '1px solid red' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.diagnostics[0]?.code).toBe('INVALID_INPUT');
  });
});
