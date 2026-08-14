/**
 * EditorFileTree — painel esquerdo do Editor (doc 07§4/§8: file navigation).
 *
 * DESVIO DOCUMENTADO (não há capability de listagem de arquivos): nenhuma
 * capability M1/M3 expõe a árvore de arquivos do projeto (project.read retorna
 * o ProjectModel sem file tree; M3-CONTRACTS §3 não tem editor.file.list).
 * Em vez de inventar endpoint, o painel oferece:
 *  - entrada manual de caminho relativo ao Project Root -> editor.source.open;
 *  - lista dos arquivos abertos na sessão (verdade local, 07§28), com SaveState.
 * Quando uma capability de listagem existir, este painel passa a consumi-la.
 */

import { FileCode, FolderOpen, X } from 'lucide-react';
import { useId } from 'react';

import { Button, Field, Input } from '../../components/ui';
import { cx, focusRing } from '../../lib/cx';
import { fileNameOf, parentDirOf } from './editorLib';
import { SaveStateBadge } from './SaveStateBadge';
import type { EditorOpenFile } from './editorStore';

export interface EditorFileTreeProps {
  /** Arquivos abertos na sessão (ordem estável de abertura). */
  files: EditorOpenFile[];
  activePath: string | null;
  pathDraft: string;
  opening: boolean;
  onPathDraftChange: (path: string) => void;
  /** Abre via editor.source.open (caminho relativo ao Project Root). */
  onOpen: (path: string) => void;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function EditorFileTree({
  files,
  activePath,
  pathDraft,
  opening,
  onPathDraftChange,
  onOpen,
  onSelect,
  onClose,
}: EditorFileTreeProps) {
  const inputId = useId();
  const trimmed = pathDraft.trim();

  return (
    <nav aria-label="Arquivos do projeto" className="flex min-h-0 flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed.length > 0) onOpen(trimmed);
        }}
      >
        <Field
          label="Abrir arquivo (caminho relativo ao Project Root)"
          htmlFor={inputId}
          description="Não há capability de listagem de arquivos no Control Plane — informe o caminho (ex.: src/App.tsx)."
        >
          <div className="flex gap-1.5">
            <Input
              id={inputId}
              value={pathDraft}
              onChange={(e) => onPathDraftChange(e.target.value)}
              placeholder="src/App.tsx"
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-xs"
            />
            <Button type="submit" variant="primary" size="sm" disabled={trimmed.length === 0} loading={opening}>
              <FolderOpen aria-hidden="true" size={14} />
              Abrir
            </Button>
          </div>
        </Field>
      </form>

      {files.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Nenhum arquivo aberto nesta sessão.
        </p>
      ) : (
        <ul aria-label="Arquivos abertos" className="divide-y divide-border rounded-md border border-border">
          {files.map((file) => {
            const active = file.filePath === activePath;
            return (
              <li
                key={file.filePath}
                className={cx('flex items-center gap-1.5 px-2 py-1.5', active && 'bg-muted')}
              >
                <button
                  type="button"
                  onClick={() => onSelect(file.filePath)}
                  aria-current={active ? 'true' : undefined}
                  title={file.filePath}
                  className={cx(
                    'flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 py-0.5 text-left',
                    focusRing,
                  )}
                >
                  <FileCode aria-hidden="true" size={14} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {fileNameOf(file.filePath)}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">
                      {parentDirOf(file.filePath) === '' ? '/' : parentDirOf(file.filePath)}
                    </span>
                  </span>
                  <SaveStateBadge state={file.saveState} />
                </button>
                <button
                  type="button"
                  onClick={() => onClose(file.filePath)}
                  aria-label={`Fechar ${file.filePath}`}
                  className={cx(
                    'rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground',
                    focusRing,
                  )}
                >
                  <X aria-hidden="true" size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
