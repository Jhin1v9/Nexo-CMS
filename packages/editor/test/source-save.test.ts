/**
 * editor.source.open/save + save pipeline feliz (07§36/§41/§79) contra
 * fixture REAL React+TSX. Estados nunca reportam Saved antes de persistir
 * (07§29/§64).
 */

import { afterEach, describe, expect, it } from 'vitest';

import { sha256Hex } from '../src/index.js';

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

const APP_V2 = `import React from 'react';

export function App(): React.ReactElement {
  return (
    <main className="app">
      <h1>Hello Wave 2a</h1>
    </main>
  );
}
`;

describe('editor.source.open (M3-CONTRACTS §3.1)', () => {
  it('le conteudo real, hash sha256, language e readOnly; registra baseline', async () => {
    const f = setup();
    const r = await f.service.openSource(PROJECT_ID, 'src/App.tsx');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.content).toBe(readDisk(f.dir, 'src/App.tsx'));
    expect(r.value.encoding).toBe('utf8');
    expect(r.value.hash).toBe(sha256Hex(readDisk(f.dir, 'src/App.tsx')));
    expect(r.value.language).toBe('tsx');
    expect(r.value.readOnly).toBe(false);
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Saved');
  });

  it('arquivo fora do Project Root -> SCOPE_VIOLATION (guard do runtime)', async () => {
    const f = setup();
    const rel = await f.service.openSource(PROJECT_ID, '../outside.txt');
    expect(rel.ok).toBe(false);
    if (rel.ok) return;
    expect(rel.error.code).toBe('SCOPE_VIOLATION');

    const abs = await f.service.openSource(PROJECT_ID, '/etc/hostname');
    expect(abs.ok).toBe(false);
    if (abs.ok) return;
    expect(abs.error.code).toBe('SCOPE_VIOLATION');
  });

  it('arquivo inexistente -> NOT_FOUND', async () => {
    const f = setup();
    const r = await f.service.openSource(PROJECT_ID, 'src/Nope.tsx');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
  });
});

describe('editor.source.save — pipeline canonico 07§36 com verificacao real', () => {
  it('save feliz: persiste de verdade, verifica, marca Saved SOMENTE no fim', async () => {
    const f = setup();
    await f.service.openSource(PROJECT_ID, 'src/App.tsx');
    const r = await f.service.saveSource(PROJECT_ID, 'src/App.tsx', APP_V2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.saved).toBe(true);
    expect(r.value.verified).toBe(true);
    expect(r.value.hash).toBe(sha256Hex(APP_V2));
    // Disco real conferido fora do service (zero fake success).
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(APP_V2);
    // Pipeline executou as etapas na ordem 07§36; mark-saved e o ULTIMO passo.
    expect(r.value.diagnostics[0]).toContain('validate: ok');
    expect(r.value.diagnostics.at(-1)).toBe('mark-saved: persistence confirmed');
    expect(r.value.diagnostics.join('\n')).toContain('check-conflict: ok');
    expect(r.value.diagnostics.join('\n')).toContain('adapter-transformation: skipped');
    // 07§41 Parser Succeeds: parser injetado foi chamado de verdade.
    expect(f.parseCalls).toContain('src/App.tsx');
    // 07§36: hooks de PI e Preview executados apos persistencia.
    expect(f.intelligenceCalls).toEqual([['src/App.tsx']]);
    expect(f.previewCalls).toEqual([['src/App.tsx']]);
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('Saved');
  });

  it('sem hooks injetados: skips documentados, saved continua verdadeiro', async () => {
    const f = setup({ parseTsx: undefined, updateIntelligence: undefined, updatePreview: undefined });
    const r = await f.service.saveSource(PROJECT_ID, 'src/styles.css', ':root { --bg: #000; }\n');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.saved).toBe(true);
    expect(r.value.diagnostics.join('\n')).toContain('update-project-intelligence: skipped');
    expect(r.value.diagnostics.join('\n')).toContain('update-preview: skipped');
    expect(readDisk(f.dir, 'src/styles.css')).toBe(':root { --bg: #000; }\n');
  });

  it('conteudo .tsx que nao parseia -> falha de verificacao + rollback (07§41)', async () => {
    const f = setup();
    const original = readDisk(f.dir, 'src/App.tsx');
    const broken = `import React from 'react';\n// SYNTAX_ERROR\nexport function App( {\n`;
    const r = await f.service.saveSource(PROJECT_ID, 'src/App.tsx', broken);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
    expect(String(r.error.details?.['stage'])).toBe('verify');
    // Rollback real: o disco voltou ao conteudo original (nunca fake success).
    expect(readDisk(f.dir, 'src/App.tsx')).toBe(original);
    expect(f.service.getSaveState(PROJECT_ID, 'src/App.tsx')).toBe('SaveFailed');
  });

  it('expectedHash correto -> salva; divergente -> CONFLICT (M3-CONTRACTS §3.1)', async () => {
    const f = setup();
    const opened = await f.service.openSource(PROJECT_ID, 'src/styles.css');
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    const bad = await f.service.saveSource(PROJECT_ID, 'src/styles.css', 'x{}\n', 'deadbeef');
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.error.code).toBe('CONFLICT');
    expect(f.service.getSaveState(PROJECT_ID, 'src/styles.css')).toBe('Conflict');

    const good = await f.service.saveSource(PROJECT_ID, 'src/styles.css', 'x{}\n', opened.value.hash);
    expect(good.ok).toBe(true);
  });

  it('save fora do root -> SCOPE_VIOLATION (nunca escreve fora do projeto)', async () => {
    const f = setup();
    const r = await f.service.saveSource(PROJECT_ID, '../escape.css', 'x{}\n');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('SCOPE_VIOLATION');
  });
});

describe('falha de persistencia (07§37)', () => {
  it('alvo invalido -> SaveFailed + buffer recuperavel, NUNCA Saved', async () => {
    const f = setup();
    const r = await f.service.saveSource(PROJECT_ID, 'no-such-dir/file.css', 'x{}\n');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
    expect(f.service.getSaveState(PROJECT_ID, 'no-such-dir/file.css')).toBe('SaveFailed');

    const drafts = f.service.recoverDrafts(PROJECT_ID);
    expect(drafts.ok).toBe(true);
    if (!drafts.ok) return;
    const buffer = drafts.value.find((d) => d.kind === 'unsaved-buffer');
    expect(buffer).toBeDefined();
    expect(buffer?.isDraft).toBe(true); // distinguivel do source persistido (07§65)
    expect(buffer?.source).toBe('recovery-store');
    expect(buffer?.buffer?.content).toBe('x{}\n');
  });
});
