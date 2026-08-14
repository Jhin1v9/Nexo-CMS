/**
 * ChangeManager (07§30-32): create/preview/apply/reject/list com before REAL
 * capturado do disco, diff sem persistir (07§42) e apply via pipeline (07§36).
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createScopedFilesystem } from '@nexo/runtime';

import { runSavePipeline, sha256Hex, type ChangeInput } from '../src/index.js';

import { cleanup, makeFixture, PROJECT_ID, readDisk, type Fixture } from './helpers.js';

const fixtures: Fixture[] = [];
afterEach(() => {
  for (const f of fixtures.splice(0)) {
    f.storage.close();
    cleanup(f.dir, f.dataDir);
  }
});

function setup(extra?: Parameters<typeof makeFixture>[0]): Fixture {
  const f = makeFixture(extra);
  fixtures.push(f);
  return f;
}

function visualEdit(after: string): ChangeInput {
  return {
    files: ['src/App.tsx'],
    operation: 'modify',
    source: 'visual',
    origin: 'Visual Editor',
    after: { 'src/App.tsx': after },
  };
}

const APP_V2 = readDiskAppV2();
function readDiskAppV2(): string {
  return `import React from 'react';

export function App(): React.ReactElement {
  return (
    <main className="app">
      <h1>Changed by Visual Editor</h1>
    </main>
  );
}
`;
}

describe('editor.change.create/preview/list (07§30-31, §42)', () => {
  it('create captura before REAL do disco; estado PENDING; SaveState Unsaved', async () => {
    const f = setup();
    const created = await f.service.createChange(PROJECT_ID, visualEdit(APP_V2));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const change = created.value;
    expect(change.state).toBe('PENDING');
    expect(change.before['src/App.tsx']).toBe(readDisk(f.dir, 'src/App.tsx'));
    expect(change.after['src/App.tsx']).toBe(APP_V2);
    expect(change.origin).toBe('Visual Editor');
    expect(change.appliedAt).toBeNull();
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Unsaved');
    expect(f.service.listChanges(PROJECT_ID).map((c) => c.id)).toEqual([change.id]);
    // create NUNCA toca o disco.
    expect(readDisk(f.dir, 'src/App.tsx')).not.toBe(APP_V2);
  });

  it('preview retorna Diff (07§42) SEM persistir nada', async () => {
    const f = setup();
    const created = await f.service.createChange(PROJECT_ID, visualEdit(APP_V2));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const before = readDisk(f.dir, 'src/App.tsx');

    const preview = f.service.previewChange(PROJECT_ID, created.value.id);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    const fileDiff = preview.value.files[0];
    expect(fileDiff?.file).toBe('src/App.tsx');
    expect(fileDiff?.status).toBe('Modified');
    expect(fileDiff?.before).toBe(before);
    expect(fileDiff?.after).toBe(APP_V2);
    expect(preview.value.origin).toBe('Visual Editor');
    expect(fileDiff?.modified).toEqual([{ before: '      <h1>Hello Nexo</h1>', after: '      <h1>Changed by Visual Editor</h1>' }]);
    // Preview nao persistiu.
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(before);
    expect(created.value.state).toBe('PENDING');
  });

  it('reject descarta pendente e NUNCA toca o source', async () => {
    const f = setup();
    const before = readDisk(f.dir, 'src/App.tsx');
    const created = await f.service.createChange(PROJECT_ID, visualEdit(APP_V2));
    if (!created.ok) throw new Error('setup');
    const rejected = f.service.rejectChange(PROJECT_ID, created.value.id);
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.value.state).toBe('REJECTED');
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(before);
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Saved');
    // Rejeitado nao pode ser aplicado.
    const applied = await f.service.applyChange(PROJECT_ID, created.value.id);
    expect(applied.ok).toBe(false);
  });

  it('modify com before/after identicos -> INVALID_INPUT (sem mudanca inventada)', async () => {
    const f = setup();
    const same = readDisk(f.dir, 'src/App.tsx');
    const r = await f.service.createChange(PROJECT_ID, visualEdit(same));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });
});

describe('editor.change.apply (07§36/§79)', () => {
  it('apply feliz: APPLIED somente apos persistencia confirmada', async () => {
    const f = setup();
    const created = await f.service.createChange(PROJECT_ID, visualEdit(APP_V2));
    if (!created.ok) throw new Error('setup');
    const applied = await f.service.applyChange(PROJECT_ID, created.value.id);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.value.saved).toBe(true);
    expect(applied.value.verified).toBe(true);
    expect(applied.value.change.state).toBe('APPLIED');
    expect(applied.value.change.appliedAt).not.toBeNull();
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(APP_V2);
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Saved');
    expect(f.service.canUndo(PROJECT_ID)).toBe(true);
    // Aplicado sai do draft store (nao e mais pendencia recuperavel).
    const drafts = f.service.recoverDrafts(PROJECT_ID);
    expect(drafts.ok && drafts.value.length === 0).toBe(true);
  });

  it('falha de persistencia (alvo invalido) -> FAILED + pending recuperavel (07§37)', async () => {
    const f = setup();
    const input: ChangeInput = {
      files: ['missing-dir/new.tsx'],
      operation: 'create',
      source: 'code',
      origin: 'Human',
      after: { 'missing-dir/new.tsx': 'export const x = 1;\n' },
    };
    const created = await f.service.createChange(PROJECT_ID, input);
    if (!created.ok) throw new Error('setup');
    const applied = await f.service.applyChange(PROJECT_ID, created.value.id);
    expect(applied.ok).toBe(false);
    if (applied.ok) return;
    expect(applied.error.code).toBe('NOT_FOUND');
    // FAILED, nunca Saved; draft permanece para recovery (07§37/§65).
    expect(created.value.state).toBe('FAILED');
    expect(f.service.getSaveState(PROJECT_ID, 'missing-dir/new.tsx')).toBe('SaveFailed');
    const drafts = f.service.recoverDrafts(PROJECT_ID);
    expect(drafts.ok).toBe(true);
    if (!drafts.ok) return;
    expect(drafts.value.some((d) => d.id === created.value.id)).toBe(true);
  });

  it("delete -> UNSUPPORTED honesto (runtime M1 sem remocao)", async () => {
    const f = setup();
    const created = await f.service.createChange(PROJECT_ID, {
      files: ['src/styles.css'],
      operation: 'delete',
      source: 'code',
      origin: 'Human',
      after: { 'src/styles.css': null },
    });
    if (!created.ok) throw new Error('setup');
    const applied = await f.service.applyChange(PROJECT_ID, created.value.id);
    expect(applied.ok).toBe(false);
    if (applied.ok) return;
    expect(applied.error.code).toBe('UNSUPPORTED');
    // Arquivo continua intacto.
    expect(readDisk(f.dir, 'src/styles.css')).toContain('--bg');
  });

  it('mudanca recuperada (draft) pode ser restaurada e aplicada (07§65)', async () => {
    const f = setup();
    const input: ChangeInput = {
      files: ['missing-dir/new.tsx'],
      operation: 'create',
      source: 'code',
      origin: 'Human',
      after: { 'missing-dir/new.tsx': 'export const x = 1;\n' },
    };
    const created = await f.service.createChange(PROJECT_ID, input);
    if (!created.ok) throw new Error('setup');
    await f.service.applyChange(PROJECT_ID, created.value.id); // falha -> FAILED

    // Recuperacao: draft -> restore -> PENDING (cross-instance em recovery.test.ts).
    const restored = await f.service.restoreDraft(PROJECT_ID, created.value.id);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.state).toBe('PENDING');

    // Corrige o ambiente (cria o dir) e reaplica de verdade.
    mkdirSync(path.join(f.dir, 'missing-dir'), { recursive: true });
    const applied = await f.service.applyChange(PROJECT_ID, created.value.id);
    expect(applied.ok).toBe(true);
    expect(readDisk(f.dir, 'missing-dir/new.tsx')).toBe('export const x = 1;\n');
  });
});

describe('Adapter Transformation (M3-CONTRACTS §2, 07§36)', () => {
  it('transformRequest + adapter injetado: conteudo transformado e persistido', async () => {
    const f = setup();
    const fs = createScopedFilesystem(f.dir);
    const current = readDisk(f.dir, 'src/App.tsx');
    const r = await runSavePipeline(
      {
        fs,
        adapter: {
          transform: async (req) => ({
            status: 'OK',
            files: { 'src/App.tsx': req.files['src/App.tsx']?.replace('Hello Nexo', 'Hello Adapter') ?? '' },
          }),
        },
      },
      {
        after: { 'src/App.tsx': current },
        baselineHashes: { 'src/App.tsx': sha256Hex(current) },
        beforeContents: { 'src/App.tsx': current },
        transformRequest: { files: { 'src/App.tsx': current }, instruction: 'rename heading' },
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.diagnostics.join('\n')).toContain('adapter-transformation: applied');
    expect(readDisk(f.dir, 'src/App.tsx')).toContain('Hello Adapter');
  });

  it('transformRequest SEM adapter -> UNSUPPORTED (nunca skip silencioso)', async () => {
    const f = setup();
    const fs = createScopedFilesystem(f.dir);
    const current = readDisk(f.dir, 'src/App.tsx');
    const r = await runSavePipeline(
      { fs },
      {
        after: { 'src/App.tsx': current },
        baselineHashes: { 'src/App.tsx': sha256Hex(current) },
        transformRequest: { files: { 'src/App.tsx': current }, instruction: 'rename heading' },
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('UNSUPPORTED');
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(current);
  });

  it('adapter retorna UNSUPPORTED -> propagado, nada escrito', async () => {
    const f = setup();
    const fs = createScopedFilesystem(f.dir);
    const current = readDisk(f.dir, 'src/App.tsx');
    const r = await runSavePipeline(
      { fs, adapter: { transform: async () => ({ status: 'UNSUPPORTED' as const, reason: 'stack nao suportada' }) } },
      {
        after: { 'src/App.tsx': current },
        baselineHashes: { 'src/App.tsx': sha256Hex(current) },
        transformRequest: { files: { 'src/App.tsx': current }, instruction: 'x' },
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('UNSUPPORTED');
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(current);
  });
});
