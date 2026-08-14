/**
 * Testes das funções de invoke do Editor (api/hooks.ts — apêndice Wave 5b)
 * com CLIENT STUB (sem fetch/rede/jsdom). Cobrem: ids de capability corretos,
 * shapes de input (M3-CONTRACTS §3.1), envelope de aprovação D17 (approval
 * mesclado via withApproval) e propagação de erro tipado (CONFLICT).
 * Os hooks react-query são wrappers finos sobre estas funções.
 */

import { describe, expect, it, vi } from 'vitest';

import { ControlPlaneError, type ControlPlaneClient } from '../../api/client';
import {
  editorApplyChange,
  editorCreateChange,
  editorListChanges,
  editorOpenSource,
  editorPreviewChange,
  editorReadSelection,
  editorRedo,
  editorRejectChange,
  editorSaveSource,
  editorUndo,
  responsivePreview,
  responsiveViewportCreate,
} from '../../api/hooks';

function stubClient(result: unknown): ControlPlaneClient & { invoke: ReturnType<typeof vi.fn> } {
  return {
    health: vi.fn(),
    discoverCapabilities: vi.fn(),
    getJob: vi.fn(),
    invoke: vi.fn().mockResolvedValue(result),
  };
}

function failingClient(shape: ConstructorParameters<typeof ControlPlaneError>[0]): ControlPlaneClient {
  return {
    health: vi.fn(),
    discoverCapabilities: vi.fn(),
    getJob: vi.fn(),
    invoke: vi.fn().mockRejectedValue(new ControlPlaneError(shape)),
  };
}

describe('editor invoke functions (client stub)', () => {
  it('editorOpenSource -> editor.source.open com {projectId, filePath}', async () => {
    const client = stubClient({ content: 'x', encoding: 'utf8', hash: 'h', language: 'tsx', readOnly: false });
    const out = await editorOpenSource(client, { projectId: 'p1', filePath: 'src/App.tsx' });
    expect(client.invoke).toHaveBeenCalledWith('editor.source.open', {
      projectId: 'p1',
      filePath: 'src/App.tsx',
    });
    expect(out.hash).toBe('h');
  });

  it('editorSaveSource: expectedHash + approval D17 mesclada no envelope', async () => {
    const client = stubClient({ saved: true, hash: 'h2', verified: true, diagnostics: [] });
    await editorSaveSource(
      client,
      { projectId: 'p1', filePath: 'src/App.tsx', content: 'novo', expectedHash: 'h1' },
      { approver: 'cli:local', justification: 'edição manual' },
    );
    expect(client.invoke).toHaveBeenCalledWith('editor.source.save', {
      projectId: 'p1',
      filePath: 'src/App.tsx',
      content: 'novo',
      expectedHash: 'h1',
      approval: { approver: 'cli:local', justification: 'edição manual' },
    });
  });

  it('editorSaveSource sem approval: envelope sem a chave approval', async () => {
    const client = stubClient({ saved: true, hash: 'h2', verified: true, diagnostics: [] });
    await editorSaveSource(client, { projectId: 'p1', filePath: 'a.ts', content: 'x' });
    const [, body] = vi.mocked(client.invoke).mock.calls[0] as [string, Record<string, unknown>];
    expect('approval' in body).toBe(false);
  });

  it('CONFLICT do backend propaga como ControlPlaneError tipado (07§38)', async () => {
    const client = failingClient({
      code: 'CONFLICT',
      message: 'changed externally',
      retryable: false,
      details: { nextAction: 'resolve via Keep Local / Keep External / Compare / Reload / Cancel' },
    });
    const call = editorSaveSource(client, { projectId: 'p1', filePath: 'a.ts', content: 'x' });
    await expect(call).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(call).rejects.toBeInstanceOf(ControlPlaneError);
  });

  it('editorReadSelection -> editor.selection.read (route/nodeRef opcionais)', async () => {
    const client = stubClient({ projectId: 'p1', confidence: 'UNKNOWN', alternatives: ['use Code View'] });
    const out = await editorReadSelection(client, { projectId: 'p1', nodeRef: 'Hero' });
    expect(client.invoke).toHaveBeenCalledWith('editor.selection.read', { projectId: 'p1', nodeRef: 'Hero' });
    expect(out.confidence).toBe('UNKNOWN');
  });

  it('editorCreateChange: ChangeInput sem before (D7 — backend lê o disco)', async () => {
    const client = stubClient({ id: 'c1', state: 'PENDING' });
    await editorCreateChange(client, {
      projectId: 'p1',
      change: {
        files: ['src/App.tsx'],
        operation: 'modify',
        source: 'code',
        origin: 'Code Editor',
        after: { 'src/App.tsx': 'novo' },
      },
    });
    const [, body] = vi.mocked(client.invoke).mock.calls[0] as [string, { change: Record<string, unknown> }];
    expect('before' in body.change).toBe(false);
    expect(body.change.operation).toBe('modify');
  });

  it('editorListChanges/editorPreviewChange/editorRejectChange: ids e inputs corretos', async () => {
    const client = stubClient([]);
    await editorListChanges(client, 'p1');
    expect(client.invoke).toHaveBeenCalledWith('editor.change.list', { projectId: 'p1' });
    await editorPreviewChange(client, { projectId: 'p1', changeId: 'c1' });
    expect(client.invoke).toHaveBeenCalledWith('editor.change.preview', { projectId: 'p1', changeId: 'c1' });
    // Reject é SAFE: sem approval no envelope.
    await editorRejectChange(client, { projectId: 'p1', changeId: 'c1' });
    const [, body] = vi.mocked(client.invoke).mock.calls[2] as [string, Record<string, unknown>];
    expect('approval' in body).toBe(false);
  });

  it('editorApplyChange/undo/redo: DESTRUCTIVE com approval D17', async () => {
    const client = stubClient({});
    await editorApplyChange(client, { projectId: 'p1', changeId: 'c1' }, { approver: 'cli:local' });
    expect(client.invoke).toHaveBeenCalledWith('editor.change.apply', {
      projectId: 'p1',
      changeId: 'c1',
      approval: { approver: 'cli:local' },
    });
    await editorUndo(client, 'p1', { approver: 'cli:local' });
    expect(client.invoke).toHaveBeenCalledWith('editor.change.undo', {
      projectId: 'p1',
      approval: { approver: 'cli:local' },
    });
    await editorRedo(client, 'p1');
    const [, redoBody] = vi.mocked(client.invoke).mock.calls[2] as [string, Record<string, unknown>];
    expect('approval' in redoBody).toBe(false);
  });

  it('responsive.preview/viewport.create: shapes do contrato §3.5', async () => {
    const client = stubClient({ id: 'vp1' });
    await responsiveViewportCreate(client, { projectId: 'p1', name: 'Mobile', width: 375, height: 812 });
    expect(client.invoke).toHaveBeenCalledWith('responsive.viewport.create', {
      projectId: 'p1',
      name: 'Mobile',
      width: 375,
      height: 812,
    });
    await responsivePreview(client, { projectId: 'p1', viewportId: 'vp1', route: '/' });
    expect(client.invoke).toHaveBeenCalledWith('responsive.preview', {
      projectId: 'p1',
      viewportId: 'vp1',
      route: '/',
    });
  });
});
