/**
 * Recovery (07§65) cross-instance + Selection Model (07§11-15).
 * Drafts recuperados sao SEMPRE distinguiveis do source persistido.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createStorage } from '@nexo/storage';

import { createEditorService, type ChangeInput } from '../src/index.js';

import { cleanup, createFixtureProject, externalWrite, PROJECT_ID, readDisk } from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

function mk(): { dir: string; dataDir: string } {
  const dir = createFixtureProject();
  const dataDir = mkdtempSync(path.join(tmpdir(), 'nexo-editor-data-'));
  dirs.push(dir, dataDir);
  return { dir, dataDir };
}

const EDIT: ChangeInput = {
  files: ['src/App.tsx'],
  operation: 'modify',
  source: 'ai',
  origin: 'AI',
  after: {
    'src/App.tsx': `import React from 'react';

export function App(): React.ReactElement {
  return (
    <main className="app">
      <h1>AI Proposal</h1>
    </main>
  );
}
`,
  },
};

describe('recovery cross-instance (07§65)', () => {
  it('crash/reload: pending change sobrevive no storage e volta distinguivel', async () => {
    const { dir, dataDir } = mk();
    const storage1 = createStorage(dataDir);
    if (!storage1.ok) throw new Error('setup');
    const service1 = createEditorService({ resolveProjectRoot: () => dir, storage: storage1.value });
    const created = await service1.createChange(PROJECT_ID, EDIT);
    if (!created.ok) throw new Error('setup');
    storage1.value.close(); // "crash"

    // Nova instancia (reload) sobre o MESMO storage e projeto.
    const storage2 = createStorage(dataDir);
    if (!storage2.ok) throw new Error('setup');
    const service2 = createEditorService({ resolveProjectRoot: () => dir, storage: storage2.value });
    const recovered = service2.recoverDrafts(PROJECT_ID);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.value).toHaveLength(1);
    const draft = recovered.value[0];
    expect(draft?.id).toBe(created.value.id);
    expect(draft?.isDraft).toBe(true); // NUNCA confundido com source persistido
    expect(draft?.source).toBe('recovery-store');
    expect(draft?.change?.origin).toBe('AI');

    const restored = await service2.restoreDraft(PROJECT_ID, created.value.id);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.state).toBe('PENDING');
    expect(service2.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Unsaved');

    const applied = await service2.applyChange(PROJECT_ID, created.value.id);
    expect(applied.ok).toBe(true);
    expect(readDisk(dir, 'src/App.tsx')).toContain('AI Proposal');
    storage2.value.close();
  });

  it('draft stale (source mudou desde a captura) -> restore CONFLICT (07§59)', async () => {
    const { dir, dataDir } = mk();
    const storage1 = createStorage(dataDir);
    if (!storage1.ok) throw new Error('setup');
    const service1 = createEditorService({ resolveProjectRoot: () => dir, storage: storage1.value });
    const created = await service1.createChange(PROJECT_ID, EDIT);
    if (!created.ok) throw new Error('setup');
    storage1.value.close();

    externalWrite(dir, 'src/App.tsx', readDisk(dir, 'src/App.tsx').replace('Hello Nexo', 'External'));

    const storage2 = createStorage(dataDir);
    if (!storage2.ok) throw new Error('setup');
    const service2 = createEditorService({ resolveProjectRoot: () => dir, storage: storage2.value });
    const restored = await service2.restoreDraft(PROJECT_ID, created.value.id);
    expect(restored.ok).toBe(false);
    if (restored.ok) return;
    expect(restored.error.code).toBe('CONFLICT');
    expect(restored.error.details?.['staleFiles']).toEqual(['src/App.tsx']);
    storage2.value.close();
  });

  it('sem storage injetado -> recoverDrafts UNSUPPORTED (nunca finge recovery)', async () => {
    const { dir } = mk();
    const service = createEditorService({ resolveProjectRoot: () => dir });
    const r = service.recoverDrafts(PROJECT_ID);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('UNSUPPORTED');
  });
});

describe('editor.selection.read (07§11-15)', () => {
  it('sem source mapper -> UNKNOWN + alternativas seguras (nunca adivinha)', async () => {
    const { dir } = mk();
    const service = createEditorService({ resolveProjectRoot: () => dir });
    const r = await service.readSelection(PROJECT_ID, '/', 'node-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('UNKNOWN');
    expect(r.value.sourceFile).toBeUndefined();
    expect(r.value.alternatives).toContain('use Code View');
  });

  it('com source mapper injetado -> delega (mapping vem de intelligence, 07§74)', async () => {
    const { dir } = mk();
    const service = createEditorService({
      resolveProjectRoot: () => dir,
      sourceMapper: {
        map: (input) => ({
          ok: true as const,
          value: {
            projectId: input.projectId,
            route: input.route ?? '/',
            sourceFile: 'src/App.tsx',
            sourceLocation: { line: 6, column: 7 },
            confidence: 'EXACT' as const,
          },
        }),
      },
    });
    const r = await service.readSelection(PROJECT_ID, '/', 'node-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.confidence).toBe('EXACT');
    expect(r.value.sourceFile).toBe('src/App.tsx');
  });
});
