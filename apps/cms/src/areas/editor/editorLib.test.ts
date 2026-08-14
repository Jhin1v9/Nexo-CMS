/**
 * Testes dos helpers puros do Editor (ambiente node — sem jsdom):
 * linguagem por extensão, montagem do input de save (expectedHash flow,
 * 07§38), SaveState derivado (07§29) e diff de linhas local (07§42).
 */

import { describe, expect, it } from 'vitest';

import {
  buildSaveInput,
  changeFileStatus,
  deriveSaveState,
  diffLines,
  fileNameOf,
  hasLineChanges,
  languageIdFromPath,
  parentDirOf,
} from './editorLib';

describe('languageIdFromPath', () => {
  it('mapeia extensões conhecidas (mesma tabela do backend)', () => {
    expect(languageIdFromPath('src/App.tsx')).toBe('tsx');
    expect(languageIdFromPath('src/main.ts')).toBe('typescript');
    expect(languageIdFromPath('src/App.jsx')).toBe('jsx');
    expect(languageIdFromPath('styles/site.CSS')).toBe('css');
    expect(languageIdFromPath('index.html')).toBe('html');
    expect(languageIdFromPath('package.json')).toBe('json');
    expect(languageIdFromPath('README.md')).toBe('markdown');
  });

  it('desconhecida/sem extensão -> unknown (nunca adivinhado)', () => {
    expect(languageIdFromPath('Makefile')).toBe('unknown');
    expect(languageIdFromPath('src/data.yaml')).toBe('unknown');
    expect(languageIdFromPath('.gitignore')).toBe('unknown');
  });
});

describe('buildSaveInput (concorrência otimista, 07§38)', () => {
  it('inclui expectedHash quando há baseline real', () => {
    expect(buildSaveInput('p1', 'src/a.ts', 'conteudo', 'abc123')).toEqual({
      projectId: 'p1',
      filePath: 'src/a.ts',
      content: 'conteudo',
      expectedHash: 'abc123',
    });
  });

  it('omite expectedHash sem baseline (nunca fabricado)', () => {
    const input = buildSaveInput('p1', 'src/a.ts', 'conteudo', null);
    expect(input).toEqual({ projectId: 'p1', filePath: 'src/a.ts', content: 'conteudo' });
    expect('expectedHash' in input).toBe(false);
  });
});

describe('deriveSaveState (07§29)', () => {
  it('buffer == salvo -> Saved; divergente -> Unsaved', () => {
    expect(deriveSaveState('a', 'a')).toBe('Saved');
    expect(deriveSaveState('a\nb', 'a')).toBe('Unsaved');
    expect(deriveSaveState('', '')).toBe('Saved');
  });
});

describe('diffLines (apresentação local, 07§42)', () => {
  it('idênticos -> Modified sem mudanças', () => {
    const d = diffLines('a\nb', 'a\nb');
    expect(d.status).toBe('Modified');
    expect(hasLineChanges(d)).toBe(false);
  });

  it('linhas adicionadas no fim', () => {
    const d = diffLines('a', 'a\nb\nc');
    expect(d.added).toEqual(['b', 'c']);
    expect(d.removed).toEqual([]);
    expect(d.modified).toEqual([]);
  });

  it('linhas removidas', () => {
    const d = diffLines('a\nb\nc', 'a');
    expect(d.removed).toEqual(['b', 'c']);
    expect(d.added).toEqual([]);
  });

  it('linhas substituídas -> pares posicionais modified', () => {
    const d = diffLines('a\nx\nc', 'a\ny\nc');
    expect(d.modified).toEqual([{ before: 'x', after: 'y' }]);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it('before vazio -> Added; after vazio -> Removed', () => {
    expect(diffLines('', 'novo').status).toBe('Added');
    expect(diffLines('velho', '').status).toBe('Removed');
  });
});

describe('changeFileStatus', () => {
  it('before null -> Added; after null -> Removed; ambos -> Modified', () => {
    expect(changeFileStatus(null, 'x')).toBe('Added');
    expect(changeFileStatus('x', null)).toBe('Removed');
    expect(changeFileStatus('x', 'y')).toBe('Modified');
  });
});

describe('paths', () => {
  it('fileNameOf/parentDirOf', () => {
    expect(fileNameOf('src/components/Hero.tsx')).toBe('Hero.tsx');
    expect(parentDirOf('src/components/Hero.tsx')).toBe('src/components');
    expect(parentDirOf('index.html')).toBe('');
  });
});
