/**
 * EditorCodeView — Code View (07§8): acesso direto ao source REAL do projeto
 * via CodeMirror (@uiw/react-codemirror, deps já declaradas no package.json).
 *
 * - Highlight por extensão REAL do arquivo (editorLib.languageIdFromPath —
 *   mesma tabela do backend). Só html/css/js/ts/tsx/jsx têm pacote de
 *   linguagem instalado; demais -> sem highlight (nunca adivinhado).
 * - O buffer é o estado LOCAL (07§28); salvar persiste via editor.source.save
 *   (barra de estado da página). `readOnly` real do backend bloqueia edição.
 * - Sem shadow copy autoritativa: a fonte de verdade é o disco (07§8).
 */

import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { FileCode } from 'lucide-react';
import { useMemo } from 'react';

import { EmptyState } from '../../components/ui';
import { languageIdFromPath } from './editorLib';
import type { EditorOpenFile } from './editorStore';

function extensionsFor(filePath: string) {
  switch (languageIdFromPath(filePath)) {
    case 'html':
      return [html()];
    case 'css':
      return [css()];
    case 'javascript':
    case 'jsx':
      return [javascript({ jsx: true })];
    case 'typescript':
      return [javascript({ typescript: true })];
    case 'tsx':
      return [javascript({ jsx: true, typescript: true })];
    default:
      // json/markdown/unknown: sem pacote de linguagem instalado — texto puro.
      return [];
  }
}

export interface EditorCodeViewProps {
  file: EditorOpenFile | null;
  onEdit: (filePath: string, content: string) => void;
  height?: string;
}

export function EditorCodeView({ file, onEdit, height = '100%' }: EditorCodeViewProps) {
  const extensions = useMemo(
    () => (file === null ? [] : extensionsFor(file.filePath)),
    [file?.filePath], // eslint-disable-line react-hooks/exhaustive-deps -- recria só ao trocar de arquivo
  );

  if (file === null) {
    return (
      <EmptyState
        icon={FileCode}
        title="Nenhum arquivo aberto"
        description="Abra um arquivo pelo caminho no painel lateral para editar o source real do projeto."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-label={`Editor de código: ${file.filePath}`}>
      {file.readOnly ? (
        <p role="status" className="mb-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs text-foreground">
          Arquivo somente leitura (o backend não conseguiu provar permissão de escrita). Edição e save
          desabilitados.
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
        <CodeMirror
          value={file.buffer}
          height={height}
          extensions={extensions}
          editable={!file.readOnly}
          readOnly={file.readOnly}
          onChange={(value) => onEdit(file.filePath, value)}
          basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
          aria-label={`Conteúdo de ${file.filePath}`}
        />
      </div>
    </div>
  );
}
