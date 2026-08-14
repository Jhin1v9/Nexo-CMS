/**
 * Smoke render SSR dos componentes do Editor que NÃO dependem de providers
 * (QueryClient/Toast/Tooltip) nem de DOM — react-dom/server em node (sem
 * jsdom instalado; cobertura documentada no relatório). Valida estados
 * honestos: SaveState real (07§29), diff Added/Removed/Modified (07§42) e a
 * FileTree com desvio documentado (sem capability de listagem).
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EditorFileTree } from './EditorFileTree';
import { EditorChangeDiffView, EditorLineDiffView } from './EditorDiffView';
import { SaveStateBadge } from './SaveStateBadge';
import type { EditorOpenFile } from './editorStore';

describe('SaveStateBadge (SSR)', () => {
  it('todos os estados de save com rótulo textual (07§29)', () => {
    expect(renderToString(<SaveStateBadge state="Saved" />)).toContain('Saved');
    expect(renderToString(<SaveStateBadge state="Unsaved" />)).toContain('Unsaved');
    expect(renderToString(<SaveStateBadge state="Saving" />)).toContain('Saving');
    expect(renderToString(<SaveStateBadge state="SaveFailed" />)).toContain('Save Failed');
    expect(renderToString(<SaveStateBadge state="Conflict" />)).toContain('Conflict');
  });
});

describe('EditorLineDiffView (SSR)', () => {
  it('renderiza added/removed/modified com marcadores', () => {
    const html = renderToString(
      <EditorLineDiffView
        diff={{ status: 'Modified', added: ['nova'], removed: ['velha'], modified: [{ before: 'x', after: 'y' }] }}
      />,
    );
    expect(html).toContain('Modified');
    expect(html).toContain('nova');
    expect(html).toContain('velha');
    expect(html).toContain('x');
    expect(html).toContain('y');
  });

  it('sem diferenças -> mensagem honesta', () => {
    const html = renderToString(
      <EditorLineDiffView diff={{ status: 'Modified', added: [], removed: [], modified: [] }} />,
    );
    expect(html).toContain('Sem diferenças');
  });
});

describe('EditorChangeDiffView (SSR)', () => {
  it('diff do backend (editor.change.preview) com status e origem', () => {
    const html = renderToString(
      <EditorChangeDiffView
        diff={{
          origin: 'Code Editor',
          files: [
            { file: 'src/App.tsx', before: 'a', after: 'b', status: 'Modified', added: [], removed: [], modified: [{ before: 'a', after: 'b' }] },
            { file: 'src/New.tsx', before: null, after: 'novo', status: 'Added', added: ['novo'], removed: [], modified: [] },
          ],
        }}
      />,
    );
    expect(html).toContain('Code Editor');
    expect(html).toContain('src/App.tsx');
    expect(html).toContain('src/New.tsx');
    expect(html).toContain('Added');
  });
});

describe('EditorFileTree (SSR)', () => {
  const file: EditorOpenFile = {
    filePath: 'src/App.tsx',
    buffer: 'x',
    savedContent: 'x',
    hash: 'abc',
    language: 'tsx',
    readOnly: false,
    saveState: 'Unsaved',
    saveError: null,
  };

  it('lista arquivos abertos com SaveState e formulário de path acessível', () => {
    const html = renderToString(
      <EditorFileTree
        files={[file]}
        activePath="src/App.tsx"
        pathDraft=""
        opening={false}
        onPathDraftChange={() => undefined}
        onOpen={() => undefined}
        onSelect={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('src/App.tsx');
    expect(html).toContain('Unsaved');
    expect(html).toContain('Project Root');
    // desvio honesto: sem capability de listagem de arquivos
    expect(html).toContain('capability de listagem');
  });

  it('sem arquivos -> estado vazio honesto', () => {
    const html = renderToString(
      <EditorFileTree
        files={[]}
        activePath={null}
        pathDraft=""
        opening={false}
        onPathDraftChange={() => undefined}
        onOpen={() => undefined}
        onSelect={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('Nenhum arquivo aberto');
  });
});
