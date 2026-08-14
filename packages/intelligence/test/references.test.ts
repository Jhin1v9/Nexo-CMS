/**
 * findAssetReferences — busca de referencias de asset M3 (doc 08§48/§51).
 * Fixture REAL em tempdir (test/helpers.ts) com import, src=, texto solto,
 * e arquivos em diretorios ignorados (node_modules/.git/dist).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findAssetReferences } from '../src/index.js';

import { assetFixture, createTempProject, type TempProject } from './helpers.js';

let project: TempProject;

beforeEach(async () => {
  project = await createTempProject(assetFixture());
});
afterEach(async () => {
  await project.cleanup();
});

describe('confidence por tipo de referencia (deterministico)', () => {
  it('import statement -> EXACT; src JSX -> HIGH_CONFIDENCE; ocorrencia generica -> PARTIAL', async () => {
    const r = await findAssetReferences({ rootPath: project.root, assetFileName: 'logo.svg' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const refs = r.value.references;

    const exact = refs.filter((x) => x.confidence === 'EXACT');
    expect(exact).toHaveLength(1);
    expect(exact[0]?.file).toBe('src/App.tsx');
    expect(exact[0]?.line).toBe(1);
    expect(exact[0]?.context).toContain("import logoUrl from '../public/logo.svg'");

    const high = refs.filter((x) => x.confidence === 'HIGH_CONFIDENCE');
    // src JSX em Card.tsx + href em index.html
    expect(high.map((x) => x.file).sort()).toEqual(['index.html', 'src/Card.tsx']);
    const card = high.find((x) => x.file === 'src/Card.tsx');
    expect(card?.line).toBe(2);
    expect(card?.context).toContain('src="/assets/logo.svg"');

    const partial = refs.filter((x) => x.confidence === 'PARTIAL');
    // string generica em note.ts + mencao em README.md
    expect(partial.map((x) => x.file).sort()).toEqual(['README.md', 'src/note.ts']);
    for (const p of partial) {
      expect(p.context).toContain('logo.svg');
    }
  });

  it('ignora node_modules/.git/dist (cobertura declarada no resultado)', async () => {
    const r = await findAssetReferences({ rootPath: project.root, assetFileName: 'logo.svg' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const files = r.value.references.map((x) => x.file);
    expect(files.some((f) => f.startsWith('node_modules/'))).toBe(false);
    expect(files.some((f) => f.startsWith('dist/'))).toBe(false);
    expect(files.some((f) => f.startsWith('.git/'))).toBe(false);
    expect(r.value.ignoredDirs).toEqual(['node_modules', '.git', 'dist']);
    expect(r.value.scannedFiles).toBeGreaterThan(0);
  });

  it('asset sem referencias -> lista vazia (NAO e Unused: decisao e do consumidor)', async () => {
    const r = await findAssetReferences({ rootPath: project.root, assetFileName: 'missing.png' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.references).toEqual([]);
  });

  it('resultados ordenados por arquivo e linha (deterministico)', async () => {
    const r = await findAssetReferences({ rootPath: project.root, assetFileName: 'logo.svg' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const keys = r.value.references.map((x) => `${x.file}:${String(x.line).padStart(5, '0')}`);
    expect([...keys].sort()).toEqual(keys);
  });
});

describe('validacao de input', () => {
  it('assetFileName vazio -> err(INVALID_INPUT)', async () => {
    const r = await findAssetReferences({ rootPath: project.root, assetFileName: '  ' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('rootPath inexistente -> err(NOT_FOUND)', async () => {
    const r = await findAssetReferences({
      rootPath: `${project.root}/nao-existe`,
      assetFileName: 'logo.svg',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
  });

  it('nome com caracteres de regex nao quebra a busca (escape)', async () => {
    await project.write('src/Weird.tsx', `export const p = '/assets/icon.v2+final.png';\n`);
    const r = await findAssetReferences({ rootPath: project.root, assetFileName: 'icon.v2+final.png' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.references.some((x) => x.file === 'src/Weird.tsx')).toBe(true);
  });
});
