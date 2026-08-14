/**
 * EditorConflictDialog — resolução de CONFLICT (07§38-40).
 *
 * As 5 resoluções suportadas (D12): Keep Local | Keep External | Compare |
 * Reload | Cancel. MERGE NUNCA é oferecido: o backend a declara UNSUPPORTED
 * (D12 — proibido inventar merge sem regras explícitas, 07§39).
 * Compare mostra diff 3-way REAL: baseline (conteúdo do open) vs externo
 * (disco atual, relido via editor.source.open) vs local (buffer não salvo).
 */

import { TriangleAlert } from 'lucide-react';

import { Dialog, Button, ErrorState } from '../../components/ui';
import { diffLines, hasLineChanges } from './editorLib';
import { EditorLineDiffView } from './EditorDiffView';
import type { EditorConflict } from './editorStore';

export type ConflictResolutionChoice = 'KeepLocal' | 'KeepExternal' | 'Compare' | 'Reload' | 'Cancel';

export interface EditorConflictDialogProps {
  conflict: EditorConflict | null;
  /** Buffer local ATUAL (pode ter sido editado após a detecção). */
  currentBuffer: string;
  loadingExternal: boolean;
  onResolve: (resolution: ConflictResolutionChoice) => void;
}

export function EditorConflictDialog({
  conflict,
  currentBuffer,
  loadingExternal,
  onResolve,
}: EditorConflictDialogProps) {
  const open = conflict !== null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onResolve('Cancel');
      }}
      title={
        <span className="inline-flex items-center gap-2">
          <TriangleAlert aria-hidden="true" size={18} className="text-danger" />
          Conflito de edição
        </span>
      }
      description={
        conflict !== null ? (
          <span>
            O arquivo <code className="font-mono text-xs">{conflict.filePath}</code> mudou no disco desde a
            abertura e há edições locais não salvas (07§38). Nenhum lado será sobrescrito sem escolha
            explícita. Merge automático não é suportado (UNSUPPORTED — decisão D12).
          </span>
        ) : undefined
      }
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onResolve('Cancel')}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => onResolve('Reload')} loading={loadingExternal}>
            Reload
          </Button>
          <Button variant="secondary" onClick={() => onResolve('KeepExternal')} loading={loadingExternal}>
            Keep External
          </Button>
          <Button variant="danger" onClick={() => onResolve('KeepLocal')}>
            Keep Local
          </Button>
        </>
      }
    >
      {conflict === null ? null : (
        <div className="flex flex-col gap-3">
          {conflict.cause !== null ? <ErrorState error={conflict.cause} operation="editor.source.save" /> : null}

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => onResolve('Compare')} loading={loadingExternal}>
              Compare (diff 3-way)
            </Button>
            <p className="text-xs text-muted-foreground">
              Carrega o conteúdo atual do disco e compara com a baseline e suas edições locais.
            </p>
          </div>

          {conflict.externalContent !== null ? (
            <div className="flex max-h-80 flex-col gap-4 overflow-auto">
              <section aria-label="Baseline vs versão externa">
                <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                  1. Baseline (abertura) vs externo (disco)
                </h4>
                {hasLineChanges(diffLines(conflict.baselineContent, conflict.externalContent)) ? (
                  <EditorLineDiffView
                    diff={diffLines(conflict.baselineContent, conflict.externalContent)}
                    beforeLabel="Baseline"
                    afterLabel="Externo"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Baseline e versão externa são idênticos.</p>
                )}
              </section>
              <section aria-label="Versão externa vs edições locais">
                <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                  2. Externo (disco) vs local (suas edições)
                </h4>
                {hasLineChanges(diffLines(conflict.externalContent, currentBuffer)) ? (
                  <EditorLineDiffView
                    diff={diffLines(conflict.externalContent, currentBuffer)}
                    beforeLabel="Externo"
                    afterLabel="Local"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Suas edições locais são idênticas à versão externa.
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
