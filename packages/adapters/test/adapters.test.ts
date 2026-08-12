import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Adapter, DetectionContext } from '../src/index.js';
import {
  AdapterRegistry,
  createBunAdapter,
  createCssModulesAdapter,
  createDefaultAdapterRegistry,
  createHtmlStaticAdapter,
  createNextjsAdapter,
  createNodeDetectionContext,
  createPnpmAdapter,
  createReactAdapter,
  createTailwindAdapter,
  createTypescriptAdapter,
  createVueAdapter,
} from '../src/index.js';

let tmp: string;
let ctx: DetectionContext;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'nexo-adapters-'));
  ctx = createNodeDetectionContext(tmp);
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function writePkg(pkg: Record<string, unknown>): Promise<void> {
  await writeFile(join(tmp, 'package.json'), JSON.stringify(pkg, null, 2));
}

async function detectValue(adapter: Adapter) {
  const d = await adapter.detect(ctx);
  return d;
}

describe('DetectionContext (fs real, read-only)', () => {
  it('readFile retorna null-on-missing e conteúdo quando existe', async () => {
    expect(await ctx.readFile('nada.txt')).toBeNull();
    await writeFile(join(tmp, 'a.txt'), 'hello');
    expect(await ctx.readFile('a.txt')).toBe('hello');
  });

  it('exists e listDir refletem o fs; listDir ausente -> []', async () => {
    expect(await ctx.exists('x')).toBe(false);
    await mkdir(join(tmp, 'src'));
    await writeFile(join(tmp, 'src', 'a.ts'), '');
    expect(await ctx.exists('src')).toBe(true);
    const entries = await ctx.listDir('src');
    expect(entries).toEqual([{ name: 'a.ts', kind: 'file' }]);
    expect(await ctx.listDir('inexistente')).toEqual([]);
  });
});

describe('framework adapters — regras de confidence documentadas', () => {
  it('react: dep declarada -> CONFIRMED com evidência package.json', async () => {
    await writePkg({ dependencies: { react: '^19.1.0' } });
    const d = await detectValue(createReactAdapter());
    expect(d.value).not.toBeNull();
    expect(d.confidence).toBe('CONFIRMED');
    expect(d.evidence).toContain('package.json:dependencies.react@^19.1.0');
  });

  it('nextjs: somente config (sem dep) -> HIGH', async () => {
    await writeFile(join(tmp, 'next.config.mjs'), 'export default {};\n');
    const d = await detectValue(createNextjsAdapter());
    expect(d.value).not.toBeNull();
    expect(d.confidence).toBe('HIGH');
    expect(d.evidence).toContain('file:next.config.mjs');
  });

  it('vue: somente convenção *.vue (sem dep/config) -> MEDIUM (sinal fraco)', async () => {
    await mkdir(join(tmp, 'src'));
    await writeFile(join(tmp, 'src', 'App.vue'), '<template />');
    const d = await detectValue(createVueAdapter());
    expect(d.value).not.toBeNull();
    expect(d.confidence).toBe('MEDIUM');
    expect(d.evidence).toContain('file:src/App.vue');
  });

  it('sem nenhum sinal -> value null (registry não emitirá detecção)', async () => {
    const d = await detectValue(createReactAdapter());
    expect(d.value).toBeNull();
  });
});

describe('package manager adapters — lockfile + campo packageManager', () => {
  it('pnpm: lockfile isolado -> HIGH', async () => {
    await writeFile(join(tmp, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
    const d = await detectValue(createPnpmAdapter());
    expect(d.confidence).toBe('HIGH');
    expect(d.evidence).toContain('lockfile:pnpm-lock.yaml');
  });

  it('pnpm: campo packageManager -> CONFIRMED com versão exata', async () => {
    await writePkg({ packageManager: 'pnpm@10.34.5' });
    await writeFile(join(tmp, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
    const d = await detectValue(createPnpmAdapter());
    expect(d.confidence).toBe('CONFIRMED');
    expect(d.evidence).toContain('package.json:packageManager=pnpm@10.34.5');
    expect((d.value as { version: string | null }).version).toBe('10.34.5');
  });

  it('bun: bun.lockb detectado', async () => {
    await writeFile(join(tmp, 'bun.lockb'), 'binary');
    const d = await detectValue(createBunAdapter());
    expect(d.confidence).toBe('HIGH');
    expect(d.evidence).toContain('lockfile:bun.lockb');
  });
});

describe('styling/build adapters', () => {
  it('typescript: tsconfig + dep -> CONFIRMED; tsconfig só -> HIGH', async () => {
    await writeFile(join(tmp, 'tsconfig.json'), '{}');
    let d = await detectValue(createTypescriptAdapter());
    expect(d.confidence).toBe('HIGH');
    await writePkg({ devDependencies: { typescript: '^5.7.2' } });
    d = await detectValue(createTypescriptAdapter());
    expect(d.confidence).toBe('CONFIRMED');
    expect(d.evidence).toEqual(['file:tsconfig.json', 'package.json:devDependencies.typescript@^5.7.2']);
  });

  it('tailwind: dep + config -> CONFIRMED; config isolado -> MEDIUM (leftover)', async () => {
    await writeFile(join(tmp, 'tailwind.config.ts'), 'export default {};');
    let d = await detectValue(createTailwindAdapter());
    expect(d.confidence).toBe('MEDIUM');
    await writePkg({ devDependencies: { tailwindcss: '^3.4.17' } });
    d = await detectValue(createTailwindAdapter());
    expect(d.confidence).toBe('CONFIRMED');
  });

  it('css-modules: busca rasa max depth 3, ignora node_modules', async () => {
    const adapter = createCssModulesAdapter();
    // profundidade 2 -> detecta
    await mkdir(join(tmp, 'src'), { recursive: true });
    await writeFile(join(tmp, 'src', 'a.module.css'), '.x{}');
    let d = await detectValue(adapter);
    expect(d.value).not.toBeNull();
    expect(d.confidence).toBe('HIGH');

    // limpa e coloca apenas em profundidade 4 e dentro de node_modules -> NÃO detecta
    await rm(join(tmp, 'src'), { recursive: true });
    await mkdir(join(tmp, 'd1', 'd2', 'd3', 'd4'), { recursive: true });
    await writeFile(join(tmp, 'd1', 'd2', 'd3', 'd4', 'deep.module.css'), '.x{}');
    await mkdir(join(tmp, 'node_modules', 'lib'), { recursive: true });
    await writeFile(join(tmp, 'node_modules', 'lib', 'vendor.module.css'), '.x{}');
    d = await detectValue(adapter);
    expect(d.value).toBeNull();
  });
});

describe('html-static adapter', () => {
  it('index.html sem package.json -> detectado (DETECTED_BUT_UNSUPPORTED via capability UNSUPPORTED)', async () => {
    await writeFile(join(tmp, 'index.html'), '<html></html>');
    const adapter = createHtmlStaticAdapter();
    const d = await detectValue(adapter);
    expect(d.value).not.toBeNull();
    expect(d.confidence).toBe('HIGH');
    expect(adapter.getCapabilities()).toBe('UNSUPPORTED');
  });

  it('index.html COM package.json -> sem detecção (projeto JS não é html estático)', async () => {
    await writeFile(join(tmp, 'index.html'), '<html></html>');
    await writePkg({ name: 'app' });
    const d = await detectValue(createHtmlStaticAdapter());
    expect(d.value).toBeNull();
  });
});

describe('AdapterRegistry', () => {
  it('rejeita id duplicado', () => {
    const registry = new AdapterRegistry();
    registry.register(createReactAdapter());
    expect(() => registry.register(createReactAdapter())).toThrow(/duplicado/);
  });

  it('detectAll emite DetectedTechnology normalizada e omite value null', async () => {
    await writePkg({ dependencies: { react: '^19.1.0' }, packageManager: 'pnpm@10.0.0' });
    const registry = new AdapterRegistry();
    registry.register(createReactAdapter());
    registry.register(createPnpmAdapter());
    const techs = await registry.detectAll(ctx);
    expect(techs).toHaveLength(2);
    const react = techs.find((t) => t.technology === 'react');
    expect(react).toMatchObject({
      category: 'FRAMEWORK',
      confidence: 'CONFIRMED',
      support: 'PARTIALLY_SUPPORTED', // READ_ONLY -> PARTIALLY_SUPPORTED (regra documentada)
      version: '^19.1.0',
      adapterId: 'react',
    });
    expect(react?.adapterVersion).toBeTruthy();
    expect(react?.evidence.length).toBeGreaterThan(0);
  });

  it('registry padrão M1 registra todos os 15 adapters em ordem estável', () => {
    const ids = createDefaultAdapterRegistry()
      .list()
      .map((i) => i.id);
    expect(ids).toEqual([
      'react',
      'nextjs',
      'vue',
      'svelte',
      'astro',
      'html-static',
      'typescript',
      'tailwind',
      'css-modules',
      'styled-components',
      'plain-css',
      'npm',
      'pnpm',
      'yarn',
      'bun',
    ]);
  });

  it('diretório vazio -> detectAll retorna [] (nunca inventa UNKNOWN)', async () => {
    const techs = await createDefaultAdapterRegistry().detectAll(ctx);
    expect(techs).toEqual([]);
  });
});
