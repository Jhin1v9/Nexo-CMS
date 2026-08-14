/**
 * Helpers de teste do @nexo/editor: projeto fixture REAL (React+TSX minimo,
 * escrito de verdade em tmpdir) + storage SQLite real em tmpdir separado.
 * O codigo sob teste usa SEMPRE o ScopedFilesystem real do @nexo/runtime
 * (scope guard ativo); helpers de teste usam node:fs direto apenas para
 * SETUP/verificacao e para simular mudanca externa (07§38).
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createStorage, type Storage } from '@nexo/storage';

import { createEditorService, type EditorService, type EditorServiceDeps } from '../src/index.js';

export const PROJECT_ID = 'fixture-project';

export interface Fixture {
  dir: string;
  storage: Storage;
  dataDir: string;
  service: EditorService;
  /** Arquivos para os quais o parser TSX de teste foi chamado. */
  parseCalls: string[];
  intelligenceCalls: string[][];
  previewCalls: string[][];
}

/**
 * Parser TSX de TESTE (funcao injetada real, 07§41 "Parser Succeeds"):
 * verifica balanceamento de chaves/parens/colchetes e rejeita o marcador
 * 'SYNTAX_ERROR' — suficiente para exercitar o caminho de verificacao com
 * sucesso e falha reais. NAO e um parser de framework (essa responsabilidade
 * e de intelligence/adapters, 07§74).
 */
export function testParseTsx(content: string): boolean {
  if (content.includes('SYNTAX_ERROR')) return false;
  const pairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };
  const stack: string[] = [];
  for (const ch of content) {
    if (ch === '{' || ch === '(' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ')' || ch === ']') {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}

const APP_TSX = `import React from 'react';

export function App(): React.ReactElement {
  return (
    <main className="app">
      <h1>Hello Nexo</h1>
    </main>
  );
}
`;

const MAIN_TSX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
`;

const STYLES_CSS = `:root {
  --bg: #ffffff;
}

.app {
  background: var(--bg);
}
`;

const PKG_JSON = `{
  "name": "nexo-editor-fixture",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
`;

/** Fixture project REAL: React+TSX minimo escrito de verdade em tmpdir. */
export function createFixtureProject(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-editor-project-'));
  mkdirSync(path.join(dir, 'src'), { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), PKG_JSON);
  writeFileSync(path.join(dir, 'src', 'App.tsx'), APP_TSX);
  writeFileSync(path.join(dir, 'src', 'main.tsx'), MAIN_TSX);
  writeFileSync(path.join(dir, 'src', 'styles.css'), STYLES_CSS);
  return dir;
}

export function makeFixture(extraDeps?: Partial<EditorServiceDeps>): Fixture {
  const dir = createFixtureProject();
  const dataDir = mkdtempSync(path.join(tmpdir(), 'nexo-editor-data-'));
  const storageRes = createStorage(dataDir);
  if (!storageRes.ok) throw new Error(`storage setup failed: ${storageRes.error.message}`);
  const parseCalls: string[] = [];
  const intelligenceCalls: string[][] = [];
  const previewCalls: string[][] = [];
  const service = createEditorService({
    resolveProjectRoot: () => dir,
    storage: storageRes.value,
    parseTsx: (content, filePath) => {
      parseCalls.push(filePath);
      return testParseTsx(content);
    },
    updateIntelligence: (_projectId, files) => {
      intelligenceCalls.push(files);
    },
    updatePreview: (_projectId, files) => {
      previewCalls.push(files);
    },
    ...extraDeps,
  });
  return { dir, storage: storageRes.value, dataDir, service, parseCalls, intelligenceCalls, previewCalls };
}

/** Simula mudanca EXTERNA (07§38): escreve fora do editor, via node:fs. */
export function externalWrite(dir: string, rel: string, content: string): void {
  writeFileSync(path.join(dir, rel), content);
}

export function readDisk(dir: string, rel: string): string {
  return readFileSync(path.join(dir, rel), 'utf8');
}

export function cleanup(...dirs: string[]): void {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
