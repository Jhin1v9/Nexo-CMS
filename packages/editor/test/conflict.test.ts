/**
 * Conflitos (07§38-40, D12): deteccao por baseline sha256+mtime, todas as
 * resolucoes suportadas, Merge -> UNSUPPORTED, e NUNCA sobrescrever
 * silenciosamente nenhum lado.
 */

import { afterEach, describe, expect, it } from 'vitest';

import type { ChangeInput } from '../src/index.js';

import { cleanup, externalWrite, makeFixture, PROJECT_ID, readDisk, type Fixture } from './helpers.js';

const fixtures: Fixture[] = [];
afterEach(() => {
  for (const f of fixtures.splice(0)) {
    f.storage.close();
    cleanup(f.dir, f.dataDir);
  }
});

function setup(): Fixture {
  const f = makeFixture();
  fixtures.push(f);
  return f;
}

const EXTERNAL = `import React from 'react';

export function App(): React.ReactElement {
  return (
    <main className="app">
      <h1>External Change</h1>
    </main>
  );
}
`;

const LOCAL = `import React from 'react';

export function App(): React.ReactElement {
  return (
    <main className="app">
      <h1>Local Change</h1>
    </main>
  );
}
`;

function localEdit(): ChangeInput {
  return {
    files: ['src/App.tsx'],
    operation: 'modify',
    source: 'visual',
    origin: 'Visual Editor',
    after: { 'src/App.tsx': LOCAL },
  };
}

/** Cenario 07§38: baseline registrada + pendencia local + mudanca externa. */
async function conflictScenario(f: Fixture): Promise<string> {
  await f.service.openSource(PROJECT_ID, 'src/App.tsx');
  const created = await f.service.createChange(PROJECT_ID, localEdit());
  if (!created.ok) throw new Error('setup');
  externalWrite(f.dir, 'src/App.tsx', EXTERNAL);
  return created.value.id;
}

describe('deteccao de conflito (07§38/§40)', () => {
  it('mudanca externa COM pendencia local -> CONFLICT com hashes e resolucoes', async () => {
    const f = setup();
    await conflictScenario(f);
    const d = await f.service.detectConflict(PROJECT_ID, 'src/App.tsx');
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.value.kind).toBe('CONFLICT');
    if (d.value.kind !== 'CONFLICT') return;
    expect(d.value.conflict.hasLocalChanges).toBe(true);
    expect(d.value.conflict.baselineHash).not.toBe(d.value.conflict.currentHash);
    expect(d.value.conflict.resolutions).toEqual(['KeepLocal', 'KeepExternal', 'Compare', 'Reload', 'Cancel']);
    expect(d.value.conflict.resolutions).not.toContain('Merge');
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Conflict');
    // Nada foi sobrescrito (07§38).
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(EXTERNAL);
  });

  it('mudanca externa SEM edits locais -> refresh automatico (07§40), sem conflito', async () => {
    const f = setup();
    await f.service.openSource(PROJECT_ID, 'src/App.tsx');
    externalWrite(f.dir, 'src/App.tsx', EXTERNAL);
    const d = await f.service.detectConflict(PROJECT_ID, 'src/App.tsx');
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.value.kind).toBe('EXTERNAL_REFRESHED');
    // 07§40: Update Preview acionado.
    expect(f.previewCalls).toEqual([['src/App.tsx']]);
    // Baseline atualizado: segunda deteccao -> UNCHANGED.
    const again = await f.service.detectConflict(PROJECT_ID, 'src/App.tsx');
    expect(again.ok && again.value.kind === 'UNCHANGED').toBe(true);
  });

  it('saveSource com baseline divergente -> CONFLICT, disco externo preservado', async () => {
    const f = setup();
    await f.service.openSource(PROJECT_ID, 'src/App.tsx');
    externalWrite(f.dir, 'src/App.tsx', EXTERNAL);
    const r = await f.service.saveSource(PROJECT_ID, 'src/App.tsx', LOCAL);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('CONFLICT');
    expect(r.error.details?.['nextAction']).toBe('resolve-conflict');
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(EXTERNAL); // nunca sobrescreve externo
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Conflict');
  });
});

describe('resolucoes de conflito (D12)', () => {
  it("Merge -> UNSUPPORTED explicito, sempre", async () => {
    const f = setup();
    await conflictScenario(f);
    const r = await f.service.resolveConflict(PROJECT_ID, 'src/App.tsx', 'Merge');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('UNSUPPORTED');
    expect(r.error.details?.['supported']).toEqual(['KeepLocal', 'KeepExternal', 'Compare', 'Reload', 'Cancel']);
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(EXTERNAL);
  });

  it('Compare -> diff 3-way informativo; nada muda no disco nem nas pendencias', async () => {
    const f = setup();
    const changeId = await conflictScenario(f);
    const r = await f.service.resolveConflict(PROJECT_ID, 'src/App.tsx', 'Compare');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resolution).toBe('Compare');
    if (r.value.resolution !== 'Compare') return;
    expect(r.value.threeWay.baseline).toContain('Hello Nexo');
    expect(r.value.threeWay.local).toBe(LOCAL);
    expect(r.value.threeWay.external).toBe(EXTERNAL);
    expect(r.value.threeWay.localVsExternal.modified).toEqual([
      { before: '      <h1>Local Change</h1>', after: '      <h1>External Change</h1>' },
    ]);
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(EXTERNAL);
    expect(f.service.listChanges(PROJECT_ID).find((c) => c.id === changeId)?.state).toBe('PENDING');
  });

  it('KeepLocal -> escreve local com verificacao real; baseline atualizada; change APPLIED', async () => {
    const f = setup();
    const changeId = await conflictScenario(f);
    const r = await f.service.resolveConflict(PROJECT_ID, 'src/App.tsx', 'KeepLocal');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resolution).toBe('KeepLocal');
    if (r.value.resolution !== 'KeepLocal') return;
    expect(r.value.saved).toBe(true);
    expect(r.value.verified).toBe(true);
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(LOCAL);
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Saved');
    expect(f.service.listChanges(PROJECT_ID).find((c) => c.id === changeId)?.state).toBe('APPLIED');
    // Undo cobre o KeepLocal (mudanca Editor-managed).
    expect(f.service.canUndo(PROJECT_ID)).toBe(true);
    // Baseline atualizada: detect -> UNCHANGED.
    const d = await f.service.detectConflict(PROJECT_ID, 'src/App.tsx');
    expect(d.ok && d.value.kind === 'UNCHANGED').toBe(true);
  });

  it('KeepExternal -> descarta pendencias locais, recarrega externo, baseline atualizada', async () => {
    const f = setup();
    const changeId = await conflictScenario(f);
    const r = await f.service.resolveConflict(PROJECT_ID, 'src/App.tsx', 'KeepExternal');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resolution).toBe('KeepExternal');
    if (r.value.resolution !== 'KeepExternal') return;
    expect(r.value.content).toBe(EXTERNAL);
    expect(r.value.discardedChangeIds).toEqual([changeId]);
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(EXTERNAL);
    expect(f.service.listChanges(PROJECT_ID).find((c) => c.id === changeId)?.state).toBe('REJECTED');
    const d = await f.service.detectConflict(PROJECT_ID, 'src/App.tsx');
    expect(d.ok && d.value.kind === 'UNCHANGED').toBe(true);
  });

  it('Reload -> re-le disco e atualiza baseline sem descartar pendencias', async () => {
    const f = setup();
    const changeId = await conflictScenario(f);
    const r = await f.service.resolveConflict(PROJECT_ID, 'src/App.tsx', 'Reload');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resolution).toBe('Reload');
    if (r.value.resolution !== 'Reload') return;
    expect(r.value.content).toBe(EXTERNAL);
    // Pendencia local NAO descartada silenciosamente (07§38).
    expect(f.service.listChanges(PROJECT_ID).find((c) => c.id === changeId)?.state).toBe('PENDING');
  });

  it('Cancel -> no-op explicito: ambos os lados preservados', async () => {
    const f = setup();
    const changeId = await conflictScenario(f);
    const r = await f.service.resolveConflict(PROJECT_ID, 'src/App.tsx', 'Cancel');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resolution).toBe('Cancel');
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(EXTERNAL);
    expect(f.service.listChanges(PROJECT_ID).find((c) => c.id === changeId)?.state).toBe('PENDING');
  });
});
