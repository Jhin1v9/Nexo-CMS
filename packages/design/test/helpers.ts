/**
 * Helpers de teste do @nexo/design: projetos REAIS em tmpdir (Tailwind v4,
 * Plain CSS com [data-theme], e projeto sem mecanismo conhecido) + storage
 * real (SQLite em tmpdir) com o projeto registrado.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { Actor, ExecutionContext } from '@nexo/core';
import { newOperationId } from '@nexo/shared';
import { createStorage, type Storage } from '@nexo/storage';

import { createDesignService, type DesignService } from '../src/index.js';

export const TEST_ACTOR: Actor = { kind: 'SYSTEM', id: 'design-test' };

export function makeCtx(projectId?: string): ExecutionContext {
  return {
    operationId: newOperationId(),
    initiatedBy: TEST_ACTOR,
    executedBy: TEST_ACTOR,
    ...(projectId !== undefined ? { projectId } : {}),
  };
}

export interface Fixture {
  dir: string;
  storage: Storage;
  projectId: string;
  service: DesignService;
}

export function writeFixtureFile(dir: string, rel: string, content: string): void {
  const abs = path.join(dir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function registerProject(dir: string, name: string): { storage: Storage; projectId: string } {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'nexo-design-db-'));
  const result = createStorage(dataDir);
  if (!result.ok) throw new Error('storage indisponivel no fixture');
  const storage = result.value;
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();
  storage.repos.projects.insert({
    id: projectId,
    name,
    rootPath: dir,
    fingerprint: 'fp-fixture',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
  return { storage, projectId };
}

/**
 * Fixture (a): Tailwind v4 (@import "tailwindcss" + @theme) + componentes TSX.
 * --color-primary usado via var() em 3 arquivos (Card.css, legacy.css, Home.tsx).
 */
export function createTailwindV4Fixture(): Fixture {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-design-tw4-'));
  writeFixtureFile(
    dir,
    'package.json',
    JSON.stringify({
      name: 'tw4-app',
      type: 'module',
      dependencies: { react: '^19.0.0', tailwindcss: '^4.0.0' },
    }),
  );
  writeFixtureFile(
    dir,
    'src/index.css',
    [
      '@import "tailwindcss";',
      '',
      '@theme {',
      '  --color-primary: oklch(0.7 0.15 250);',
      '  --color-surface: #ffffff;',
      '  --spacing-card: 1.5rem;',
      '  --radius-box: 0.5rem;',
      '}',
      '',
    ].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/App.tsx',
    [
      'export function App() {',
      '  return <div className="bg-primary text-white">Hello</div>;',
      '}',
      '',
    ].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/components/Card.tsx',
    [
      'export function Card() {',
      '  return <div className="bg-primary rounded-box">Card</div>;',
      '}',
      '',
    ].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/components/Card.css',
    ['.card {', '  background: var(--color-primary);', '}', ''].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/components/Button.tsx',
    ['export function Button() {', '  return <button type="button">Go</button>;', '}', ''].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/styles/legacy.css',
    ['.legacy-title {', '  color: var(--color-primary);', '}', ''].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/pages/Home.tsx',
    [
      "export function Home() {",
      "  return <section style={{ color: 'var(--color-primary)' }}>Home</section>;",
      '}',
      '',
    ].join('\n'),
  );
  const { storage, projectId } = registerProject(dir, 'tw4-app');
  return { dir, storage, projectId, service: createDesignService({ storage }) };
}

/**
 * Fixture (b): Plain CSS com :root vars + [data-theme="dark"].
 * --brand-primary usado via var() em 3 arquivos (a.css, b.css, Badge.tsx).
 */
export function createPlainCssFixture(): Fixture {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-design-plain-'));
  writeFixtureFile(
    dir,
    'package.json',
    JSON.stringify({ name: 'plain-app', type: 'module' }),
  );
  writeFixtureFile(
    dir,
    'src/styles.css',
    [
      ':root {',
      "  --brand-primary: #3366ff;",
      '  --space-md: 1rem;',
      '  --radius-sm: 4px;',
      "  --font-body: 'Inter', sans-serif;",
      '  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.2);',
      '}',
      '',
      '[data-theme="dark"] {',
      '  --brand-primary: #99bbff;',
      '  --surface: #111111;',
      '}',
      '',
    ].join('\n'),
  );
  writeFixtureFile(dir, 'src/a.css', ['.a {', '  color: var(--brand-primary);', '}', ''].join('\n'));
  writeFixtureFile(
    dir,
    'src/b.css',
    ['.b {', '  border-color: var(--brand-primary);', '}', ''].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/components/Badge.tsx',
    [
      'export function Badge() {',
      "  return <span style={{ color: 'var(--brand-primary)' }}>Badge</span>;",
      '}',
      '',
    ].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/components/Panel.tsx',
    [
      'export function Panel() {',
      '  return <div className="panel">Panel</div>;',
      '}',
      '',
    ].join('\n'),
  );
  const { storage, projectId } = registerProject(dir, 'plain-app');
  return { dir, storage, projectId, service: createDesignService({ storage }) };
}

/** Fixture (c): projeto sem nenhum mecanismo de styling conhecido. */
export function createUnknownFixture(): Fixture {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-design-unknown-'));
  writeFixtureFile(dir, 'package.json', JSON.stringify({ name: 'unknown-app', type: 'module' }));
  writeFixtureFile(
    dir,
    'src/App.tsx',
    ['export function App() {', '  return <main>Plain</main>;', '}', ''].join('\n'),
  );
  const { storage, projectId } = registerProject(dir, 'unknown-app');
  return { dir, storage, projectId, service: createDesignService({ storage }) };
}

export function cleanupFixture(fixture: { dir: string; storage: Storage }): void {
  fixture.storage.close();
  rmSync(fixture.dir, { recursive: true, force: true });
}
