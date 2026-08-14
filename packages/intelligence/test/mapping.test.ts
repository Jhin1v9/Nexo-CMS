/**
 * mapComponentSource — source mapping M3 (07§13-15): confidence
 * EXACT|HIGH_CONFIDENCE|PARTIAL|UNKNOWN, nunca inventado.
 * Fixture React+TSX REAL em tempdir (test/helpers.ts).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mapComponentSource } from '../src/index.js';

import { createTempProject, mappingFixture, type TempProject } from './helpers.js';

let project: TempProject;

beforeEach(async () => {
  project = await createTempProject(mappingFixture());
});
afterEach(async () => {
  await project.cleanup();
});

describe('EXACT — export nomeado unico encontrado via AST', () => {
  it('Button -> src/components/Button.tsx com line/column do identificador', async () => {
    const r = await mapComponentSource({ rootPath: project.root, componentName: 'Button' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('EXACT');
    expect(r.value.file).toBe('src/components/Button.tsx');
    expect(r.value.exportName).toBe('Button');
    // `export function Button` esta na linha 5; 'Button' comeca na coluna 17
    expect(r.value.line).toBe(5);
    expect(r.value.column).toBe(17);
    expect(r.value.evidence.some((e) => e.includes('export:Button'))).toBe(true);
  });

  it('componentName + filePath restringe o escopo ao arquivo', async () => {
    const r = await mapComponentSource({
      rootPath: project.root,
      componentName: 'Dupe',
      filePath: 'src/other/Dupe.tsx',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('EXACT');
    expect(r.value.file).toBe('src/other/Dupe.tsx');
  });
});

describe('HIGH_CONFIDENCE — uso JSX sem export correspondente', () => {
  it('Ghost usado mas nao definido -> localizacao do uso, marcado como uso', async () => {
    const r = await mapComponentSource({ rootPath: project.root, componentName: 'Ghost' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('HIGH_CONFIDENCE');
    expect(r.value.file).toBe('src/App.tsx');
    expect(r.value.line).toBe(7); // <Ghost /> na linha 7
    expect(r.value.exportName).toBeNull();
    expect(r.value.evidence.some((e) => e.includes('USO JSX'))).toBe(true);
  });
});

describe('PARTIAL — ambiguidade ou heuristico marcado (nunca EXACT falso)', () => {
  it('Dupe exportado em 2 arquivos -> PARTIAL com todos os candidatos em evidence', async () => {
    const r = await mapComponentSource({ rootPath: project.root, componentName: 'Dupe' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('PARTIAL');
    expect(r.value.file).toBe('src/Dupe.tsx'); // primeiro em ordem alfabetica
    const joined = r.value.evidence.join('\n');
    expect(joined).toContain('src/Dupe.tsx');
    expect(joined).toContain('src/other/Dupe.tsx');
  });

  it('Widget: basename casa mas sem export AST -> PARTIAL heuristico em 1:1', async () => {
    const r = await mapComponentSource({ rootPath: project.root, componentName: 'Widget' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('PARTIAL');
    expect(r.value.file).toBe('src/Widget.tsx');
    expect(r.value.line).toBe(1);
    expect(r.value.evidence.some((e) => e.includes('heuristico'))).toBe(true);
  });
});

describe('UNKNOWN — nenhum sinal, nunca inventado', () => {
  it('componente inexistente -> UNKNOWN com nulls', async () => {
    const r = await mapComponentSource({ rootPath: project.root, componentName: 'Nonexistent' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('UNKNOWN');
    expect(r.value.file).toBeNull();
    expect(r.value.line).toBeNull();
    expect(r.value.column).toBeNull();
    expect(r.value.exportName).toBeNull();
  });
});

describe('modo filePath (sem componentName)', () => {
  it('arquivo com export default -> EXACT, exportName default', async () => {
    const r = await mapComponentSource({ rootPath: project.root, filePath: 'src/pages/About.tsx' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('EXACT');
    expect(r.value.exportName).toBe('default');
    expect(r.value.file).toBe('src/pages/About.tsx');
    expect(r.value.line).toBe(1);
  });

  it('arquivo sem componente exportado -> PARTIAL em 1:1', async () => {
    const r = await mapComponentSource({ rootPath: project.root, filePath: 'src/Widget.tsx' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('PARTIAL');
    expect(r.value.file).toBe('src/Widget.tsx');
  });

  it('arquivo inexistente -> err(NOT_FOUND)', async () => {
    const r = await mapComponentSource({ rootPath: project.root, filePath: 'src/Nope.tsx' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
  });
});

describe('validacao de input', () => {
  it('sem componentName nem filePath -> err(INVALID_INPUT)', async () => {
    const r = await mapComponentSource({ rootPath: project.root });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('rootPath inexistente -> err(NOT_FOUND)', async () => {
    const r = await mapComponentSource({
      rootPath: `${project.root}/nao-existe`,
      componentName: 'Button',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
  });
});
