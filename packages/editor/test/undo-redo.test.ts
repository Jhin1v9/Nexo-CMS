/**
 * Undo/Redo (07§33-35): reverte/reaplica mudanca Editor-managed APLICADA com
 * verificacao real; mudanca externa invalida redo inseguro (07§34); undo nunca
 * toca mudanca externa nao relacionada (07§33); undo nunca cria commit (07§35 —
 * nao ha NENHUMA dependencia de git neste pacote).
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

const APP_V2 = `import React from 'react';

export function App(): React.ReactElement {
  return (
    <main className="app">
      <h1>Version 2</h1>
    </main>
  );
}
`;

const APP_EXTERNAL = APP_V2.replace('Version 2', 'External Edit');

function editV2(): ChangeInput {
  return {
    files: ['src/App.tsx'],
    operation: 'modify',
    source: 'code',
    origin: 'Code Editor',
    after: { 'src/App.tsx': APP_V2 },
  };
}

async function appliedChange(f: Fixture): Promise<string> {
  const created = await f.service.createChange(PROJECT_ID, editV2());
  if (!created.ok) throw new Error('setup');
  const applied = await f.service.applyChange(PROJECT_ID, created.value.id);
  if (!applied.ok) throw new Error('setup');
  return created.value.id;
}

describe('undo (07§33/§35)', () => {
  it('undo reverte a ultima mudanca aplicada restaurando o before REAL', async () => {
    const f = setup();
    const original = readDisk(f.dir, 'src/App.tsx');
    const changeId = await appliedChange(f);
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(APP_V2);

    const undone = await f.service.undo(PROJECT_ID);
    expect(undone.ok).toBe(true);
    if (!undone.ok) return;
    expect(undone.value.id).toBe(changeId);
    expect(undone.value.state).toBe('REVERTED');
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(original);
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Saved');
    expect(f.service.canUndo(PROJECT_ID)).toBe(false);
    expect(f.service.canRedo(PROJECT_ID)).toBe(true);
  });

  it('undo com nada aplicado -> NOT_FOUND', async () => {
    const f = setup();
    const r = await f.service.undo(PROJECT_ID);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
  });

  it('mudanca externa no alvo -> undo CONFLICT e NADA e escrito (07§33)', async () => {
    const f = setup();
    await appliedChange(f);
    externalWrite(f.dir, 'src/App.tsx', APP_EXTERNAL);
    const undone = await f.service.undo(PROJECT_ID);
    expect(undone.ok).toBe(false);
    if (undone.ok) return;
    expect(undone.error.code).toBe('CONFLICT');
    // O conteudo externo permanece intocado — nunca sobrescrever (07§33/§38).
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(APP_EXTERNAL);
  });

  it('mudanca externa em arquivo NAO relacionado nao bloqueia undo (07§33)', async () => {
    const f = setup();
    await appliedChange(f);
    externalWrite(f.dir, 'src/styles.css', ':root { --bg: #123456; }\n');
    const undone = await f.service.undo(PROJECT_ID);
    expect(undone.ok).toBe(true);
    expect(readDisk(f.dir, 'src/styles.css')).toBe(':root { --bg: #123456; }\n');
  });
});

describe('redo (07§34)', () => {
  it('redo reaplica quando o estado e compativel', async () => {
    const f = setup();
    await appliedChange(f);
    await f.service.undo(PROJECT_ID);
    const redone = await f.service.redo(PROJECT_ID);
    expect(redone.ok).toBe(true);
    if (!redone.ok) return;
    expect(redone.value.state).toBe('APPLIED');
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(APP_V2);
    expect(f.service.canUndo(PROJECT_ID)).toBe(true);
  });

  it('mudanca externa apos undo -> redo UNSUPPORTED (inseguro invalidado)', async () => {
    const f = setup();
    await appliedChange(f);
    await f.service.undo(PROJECT_ID);
    externalWrite(f.dir, 'src/App.tsx', APP_EXTERNAL);
    const redone = await f.service.redo(PROJECT_ID);
    expect(redone.ok).toBe(false);
    if (redone.ok) return;
    expect(redone.error.code).toBe('UNSUPPORTED');
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(APP_EXTERNAL);
    // Redo invalidado sai da pilha.
    expect(f.service.canRedo(PROJECT_ID)).toBe(false);
  });

  it('novo apply invalida redo pendente (historico linear)', async () => {
    const f = setup();
    await appliedChange(f);
    await f.service.undo(PROJECT_ID);
    expect(f.service.canRedo(PROJECT_ID)).toBe(true);
    await appliedChange(f); // novo apply
    expect(f.service.canRedo(PROJECT_ID)).toBe(false);
  });

  it("undo de operacao 'create' -> UNSUPPORTED honesto (runtime sem delete)", async () => {
    const f = setup();
    const created = await f.service.createChange(PROJECT_ID, {
      files: ['src/created.tsx'],
      operation: 'create',
      source: 'code',
      origin: 'Human',
      after: { 'src/created.tsx': 'export const c = 1;\n' },
    });
    if (!created.ok) throw new Error('setup');
    const applied = await f.service.applyChange(PROJECT_ID, created.value.id);
    expect(applied.ok).toBe(true);
    const undone = await f.service.undo(PROJECT_ID);
    expect(undone.ok).toBe(false);
    if (undone.ok) return;
    expect(undone.error.code).toBe('UNSUPPORTED');
    // Arquivo criado permanece (undo nao fingiu remover).
    expect(readDisk(f.dir, 'src/created.tsx')).toBe('export const c = 1;\n');
  });
});
