import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { ProjectModel } from '../src/index.js';
import { createProjectScanner } from '../src/index.js';

const FIXTURES = fileURLToPath(new URL('fixtures', import.meta.url));
const scanner = createProjectScanner();

async function scanOk(path: string): Promise<ProjectModel> {
  const r = await scanner.scan(path);
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

/** Snapshot recursivo de (path relativo -> {mtimeMs, content}) para provar não-mutação. */
async function snapshotTree(dir: string, base = dir): Promise<Map<string, { mtimeMs: number; content: string }>> {
  const out = new Map<string, { mtimeMs: number; content: string }>();
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    const rel = abs.slice(base.length + 1);
    if (e.isDirectory()) {
      for (const [k, v] of await snapshotTree(abs, base)) out.set(k, v);
    } else if (e.isFile()) {
      const s = await stat(abs);
      out.set(rel, { mtimeMs: s.mtimeMs, content: await readFile(abs, 'utf8') });
    }
  }
  return out;
}

describe('ProjectScanner.scan — fixture react-vite-tailwind', () => {
  const fixture = join(FIXTURES, 'react-vite-tailwind');

  it('detecta react CONFIRMED com evidência de package.json', async () => {
    const model = await scanOk(fixture);
    const react = model.technologies.find((t) => t.technology === 'react');
    expect(react).toBeDefined();
    expect(react?.confidence).toBe('CONFIRMED');
    expect(react?.category).toBe('FRAMEWORK');
    expect(react?.evidence.some((e) => e.startsWith('package.json:dependencies.react@'))).toBe(true);
    expect(react?.version).toBe('^19.1.0');
    expect(react?.adapterId).toBe('react');
  });

  it('detecta tailwind CONFIRMED (dep + config, multi-sinal) e typescript', async () => {
    const model = await scanOk(fixture);
    const tailwind = model.technologies.find((t) => t.technology === 'tailwind');
    expect(tailwind).toBeDefined();
    expect(tailwind?.confidence).toBe('CONFIRMED');
    expect(tailwind?.evidence).toContain('file:tailwind.config.ts');
    const ts = model.technologies.find((t) => t.technology === 'typescript');
    expect(ts?.confidence).toBe('CONFIRMED');
    expect(ts?.evidence).toContain('file:tsconfig.json');
  });

  it('detecta css-modules e plain-css com evidência de arquivo', async () => {
    const model = await scanOk(fixture);
    const cssModules = model.technologies.find((t) => t.technology === 'css-modules');
    expect(cssModules?.evidence).toContain('file:src/App.module.css');
    const plainCss = model.technologies.find((t) => t.technology === 'plain-css');
    expect(plainCss?.evidence).toContain('file:src/styles.css');
  });

  it('detecta package manager pnpm CONFIRMED via lockfile + campo packageManager', async () => {
    const model = await scanOk(fixture);
    expect(model.packageManager.value).toEqual({ name: 'pnpm', version: '10.34.5' });
    expect(model.packageManager.confidence).toBe('CONFIRMED');
    expect(model.packageManager.evidence).toContain('lockfile:pnpm-lock.yaml');
    expect(model.packageManager.evidence).toContain('package.json:packageManager=pnpm@10.34.5');
  });

  it('expõe SOMENTE os scripts declarados (nunca assume dev/build)', async () => {
    const model = await scanOk(fixture);
    expect(model.scripts.confidence).toBe('CONFIRMED');
    expect(model.scripts.value).toEqual({
      dev: 'vite',
      build: 'tsc -b && vite build',
      preview: 'vite preview',
    });
    expect(model.scripts.value?.['start']).toBeUndefined();
    expect(model.scripts.value?.['test']).toBeUndefined();
  });

  it('root detection: não-monorepo; estrutura com entry/config/topLevelDirs', async () => {
    const model = await scanOk(fixture);
    expect(model.root.value).toEqual({ isMonorepo: false, packageRoots: ['.'] });
    expect(model.structure.entryFiles).toContain('index.html');
    expect(model.structure.entryFiles).toContain('src/main.tsx');
    expect(model.structure.configFiles).toContain('tsconfig.json');
    expect(model.structure.configFiles).toContain('vite.config.ts');
    expect(model.structure.configFiles).toContain('tailwind.config.ts');
    expect(model.structure.topLevelDirs).toEqual(['src']);
  });

  it('git: fixture sem .git -> isRepo false (sem falsificar git)', async () => {
    const model = await scanOk(fixture);
    expect(model.git.value).toEqual({ isRepo: false, branch: null });
  });

  it('agregados: support PARTIALLY_SUPPORTED (M1 read-only), confidence CONFIRMED', async () => {
    const model = await scanOk(fixture);
    expect(model.support).toBe('PARTIALLY_SUPPORTED');
    expect(model.confidence).toBe('CONFIRMED');
    expect(model.analysisVersion).toBe(1);
  });

  it('NUNCA muta o projeto: mtimes e conteúdos idênticos após scan', async () => {
    const before = await snapshotTree(fixture);
    await scanOk(fixture);
    await scanOk(fixture); // segundo scan para reforçar
    const after = await snapshotTree(fixture);
    expect(after.size).toBe(before.size);
    for (const [rel, b] of before) {
      const a = after.get(rel);
      expect(a, `arquivo sumiu: ${rel}`).toBeDefined();
      expect(a?.content, `conteúdo mudou: ${rel}`).toBe(b.content);
      expect(a?.mtimeMs, `mtime mudou: ${rel}`).toBe(b.mtimeMs);
    }
  });
});

describe('ProjectScanner.scan — fixture html-static', () => {
  const fixture = join(FIXTURES, 'html-static');

  it('detecta html-static como DETECTED_BUT_UNSUPPORTED (regra: capability UNSUPPORTED M1)', async () => {
    const model = await scanOk(fixture);
    const html = model.technologies.find((t) => t.technology === 'html-static');
    expect(html).toBeDefined();
    expect(html?.support).toBe('DETECTED_BUT_UNSUPPORTED');
    expect(html?.evidence).toContain('file:index.html');
    expect(html?.evidence).toContain('absent:package.json');
  });

  it('agregado ≤ PARTIALLY_SUPPORTED quando há DETECTED_BUT_UNSUPPORTED', async () => {
    const model = await scanOk(fixture);
    expect(model.support).toBe('PARTIALLY_SUPPORTED');
    expect(model.structure.entryFiles).toContain('index.html');
  });
});

describe('ProjectScanner.scan — fixture empty-dir (desconhecido nunca é inventado)', () => {
  it('sem sinais -> technologies vazio, support/confidence UNKNOWN, detections null', async () => {
    const model = await scanOk(join(FIXTURES, 'empty-dir'));
    expect(model.technologies).toEqual([]);
    expect(model.support).toBe('UNKNOWN');
    expect(model.confidence).toBe('UNKNOWN');
    expect(model.packageManager.value).toBeNull();
    expect(model.packageManager.confidence).toBe('UNKNOWN');
    expect(model.scripts.value).toBeNull();
    expect(model.root.value).toBeNull();
    expect(model.root.confidence).toBe('UNKNOWN');
  });
});

describe('ProjectScanner.scan — erros estruturados', () => {
  it('path inexistente -> NOT_FOUND', async () => {
    const r = await scanner.scan(join(FIXTURES, 'nao-existe'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('NOT_FOUND');
      expect(r.error.retryable).toBe(false);
    }
  });

  it('path que é arquivo -> INVALID_INPUT', async () => {
    const r = await scanner.scan(join(FIXTURES, 'react-vite-tailwind', 'package.json'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('string vazia -> INVALID_INPUT', async () => {
    const r = await scanner.scan('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_INPUT');
  });
});
