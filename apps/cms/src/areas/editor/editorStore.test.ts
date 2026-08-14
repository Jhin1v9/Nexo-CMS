/**
 * Testes do store local do Editor (zustand vanilla — node, sem jsdom).
 * Cobrem as transições de SaveState (07§29): Unsaved/Saving/Saved/SaveFailed/
 * Conflict, preservação de pending (07§37) e resoluções de conflito (07§39).
 */

import { describe, expect, it } from 'vitest';

import type { ControlPlaneErrorShape } from '../../api/client';
import { createEditorStore } from './editorStore';

const OPENED = {
  filePath: 'src/App.tsx',
  content: 'original',
  hash: 'hash-v1',
  language: 'tsx',
  readOnly: false,
};

const SAVE_ERROR: ControlPlaneErrorShape = {
  code: 'INTERNAL',
  message: 'disk full',
  retryable: true,
};

const CONFLICT_ERROR: ControlPlaneErrorShape = {
  code: 'CONFLICT',
  message: "file 'src/App.tsx' changed externally (baseline != current)",
  retryable: false,
};

describe('editorStore — ciclo de save (07§29/§36)', () => {
  it('open -> Saved; edit -> Unsaved; save ok -> Saved com novo hash', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    expect(store.getState().files['src/App.tsx']?.saveState).toBe('Saved');
    expect(store.getState().activePath).toBe('src/App.tsx');

    store.getState().editBuffer('src/App.tsx', 'editado');
    expect(store.getState().files['src/App.tsx']?.saveState).toBe('Unsaved');

    store.getState().markSaving('src/App.tsx');
    expect(store.getState().files['src/App.tsx']?.saveState).toBe('Saving');

    store.getState().saveSucceeded('src/App.tsx', 'hash-v2');
    const file = store.getState().files['src/App.tsx'];
    expect(file?.saveState).toBe('Saved');
    expect(file?.savedContent).toBe('editado');
    expect(file?.hash).toBe('hash-v2');
  });

  it('Save Failed preserva o buffer (pending recuperável, 07§37) e NUNCA vira Saved', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    store.getState().editBuffer('src/App.tsx', 'editado');
    store.getState().markSaving('src/App.tsx');
    store.getState().saveFailed('src/App.tsx', SAVE_ERROR);

    const file = store.getState().files['src/App.tsx'];
    expect(file?.saveState).toBe('SaveFailed');
    expect(file?.buffer).toBe('editado');
    expect(file?.saveError?.code).toBe('INTERNAL');
  });

  it('edição de volta ao conteúdo salvo -> Saved', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    store.getState().editBuffer('src/App.tsx', 'x');
    store.getState().editBuffer('src/App.tsx', 'original');
    expect(store.getState().files['src/App.tsx']?.saveState).toBe('Saved');
  });
});

describe('editorStore — conflito (07§38-40, D12)', () => {
  it('conflictDetected preserva ambos os lados', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    store.getState().editBuffer('src/App.tsx', 'local');
    store.getState().conflictDetected('src/App.tsx', CONFLICT_ERROR);

    const conflict = store.getState().conflict;
    expect(conflict?.filePath).toBe('src/App.tsx');
    expect(conflict?.localContent).toBe('local');
    expect(conflict?.baselineContent).toBe('original');
    expect(conflict?.externalContent).toBeNull();
    expect(store.getState().files['src/App.tsx']?.saveState).toBe('Conflict');
  });

  it('Keep External: adota o disco e descarta o buffer local', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    store.getState().editBuffer('src/App.tsx', 'local');
    store.getState().conflictDetected('src/App.tsx', CONFLICT_ERROR);
    store.getState().adoptExternal('src/App.tsx', 'externo', 'hash-v2');

    const file = store.getState().files['src/App.tsx'];
    expect(file?.buffer).toBe('externo');
    expect(file?.saveState).toBe('Saved');
    expect(store.getState().conflict).toBeNull();
  });

  it('Keep Local (rebase): nova baseline, buffer local preservado como Unsaved', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    store.getState().editBuffer('src/App.tsx', 'local');
    store.getState().conflictDetected('src/App.tsx', CONFLICT_ERROR);
    store.getState().rebaseKeepingLocal('src/App.tsx', 'externo', 'hash-v2');

    const file = store.getState().files['src/App.tsx'];
    expect(file?.buffer).toBe('local');
    expect(file?.savedContent).toBe('externo');
    expect(file?.hash).toBe('hash-v2');
    expect(file?.saveState).toBe('Unsaved');
    expect(store.getState().conflict).toBeNull();
  });

  it('re-open sem edições locais adota o disco (07§40); com edições, preserva buffer', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    store.getState().openLoaded({ ...OPENED, content: 'externo', hash: 'hash-v2' });
    expect(store.getState().files['src/App.tsx']?.buffer).toBe('externo');

    store.getState().editBuffer('src/App.tsx', 'local');
    store.getState().openLoaded({ ...OPENED, content: 'externo-2', hash: 'hash-v3' });
    const file = store.getState().files['src/App.tsx'];
    expect(file?.buffer).toBe('local');
    expect(file?.savedContent).toBe('externo-2');
    expect(file?.saveState).toBe('Unsaved');
  });
});

describe('editorStore — arquivos e projeto', () => {
  it('closeFile ajusta activePath e descarta conflito do arquivo', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    store.getState().openLoaded({ ...OPENED, filePath: 'src/main.tsx' });
    store.getState().editBuffer('src/main.tsx', 'x');
    store.getState().conflictDetected('src/main.tsx', null);
    store.getState().closeFile('src/main.tsx');

    expect(store.getState().openPaths).toEqual(['src/App.tsx']);
    expect(store.getState().activePath).toBe('src/App.tsx');
    expect(store.getState().conflict).toBeNull();
  });

  it('resetForProject descarta todo estado local temporário (07§28)', () => {
    const store = createEditorStore('p1');
    store.getState().openLoaded(OPENED);
    store.getState().setView('split');
    store.getState().addSessionViewport({ id: 'vp1', width: 375, height: 812 });
    store.getState().resetForProject('p2');

    const s = store.getState();
    expect(s.projectId).toBe('p2');
    expect(s.openPaths).toEqual([]);
    expect(s.activePath).toBeNull();
    expect(s.view).toBe('code');
    expect(s.sessionViewports).toEqual([]);
  });
});
