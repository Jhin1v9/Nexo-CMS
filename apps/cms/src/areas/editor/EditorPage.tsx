/**
 * EditorPage (/projects/$projectId/editor) — workspace real do Editor (doc 07).
 *
 * ASSINATURA PARA WIRING (orquestrador): `export function EditorPage({
 * projectId: string })` — o caller extrai projectId da rota (useParams) e
 * passa como prop, mesmo padrão de GitPage. Auto-gateado: CapabilityArea
 * exige 'editor.source.open' no discovery (ausente -> EmptyState honesto).
 *
 * Layout (07§4): FileTree (esq) | centro com views Visual|Code|Split|
 * Preview|Inspector|Diff (07§6 — representações da MESMA verdade) |
 * Inspector/Changes (dir). Barra de estado com SaveState real + hash curto.
 *
 * - Save: Ctrl+S ou botão -> ApprovalDialog (D17) -> editor.source.save com
 *   expectedHash (07§38); Saved só após saved:true + verificação (07§79);
 *   Save Failed preserva pending + retry (07§37); CONFLICT -> ConflictDialog
 *   com as 5 resoluções (Merge NUNCA — D12).
 * - Visual: gate honesto — depende de editor.selection.read + responsive.preview
 *   (mapping + runtime real); sem elas, EmptyState explicando (07§56, Inv. 27).
 */

import {
  Columns2,
  Crosshair,
  Eye,
  FileCode,
  GitCompareArrows,
  MonitorPlay,
  Save,
  SquarePen,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { currentActorId, toControlPlaneError, type ControlPlaneErrorShape } from '../../api/client';
import { useCapability, useEditorOpenSource, useEditorRedo, useEditorUndo } from '../../api/hooks';
import {
  ApprovalDialog,
  Badge,
  EmptyState,
  ErrorState,
  GuardedButton,
  Tabs,
  useToast,
} from '../../components/ui';
import { shortHash } from '../../lib/cx';
import { CapabilityArea } from '../stubs/CapabilityArea';
import { EditorChangesPanel, EditorUndoRedoButtons, type UndoRedoAction } from './EditorChangesPanel';
import { EditorCodeView } from './EditorCodeView';
import { EditorConflictDialog } from './EditorConflictDialog';
import { EditorLineDiffView } from './EditorDiffView';
import { EditorFileTree } from './EditorFileTree';
import { EditorInspector } from './EditorInspector';
import { EditorPreviewPanel } from './EditorPreviewPanel';
import { diffLines } from './editorLib';
import { editorStore, useActiveFile, useEditorStore, type EditorView } from './editorStore';
import { SaveStateBadge } from './SaveStateBadge';
import { useEditorSaveFlow } from './useEditorSaveFlow';

const VIEW_LABEL: Record<EditorView, string> = {
  visual: 'Visual',
  code: 'Code',
  split: 'Split',
  preview: 'Preview',
  inspector: 'Inspector',
  diff: 'Diff',
};

function VisualGate({ projectId }: { projectId: string }) {
  const selectionCap = useCapability('editor.selection.read');
  const previewCap = useCapability('responsive.preview');
  const missing: string[] = [];
  if (selectionCap.availability?.kind === 'missing') missing.push('editor.selection.read');
  if (previewCap.availability?.kind === 'missing') missing.push('responsive.preview');

  if (missing.length > 0) {
    return (
      <EmptyState
        icon={Eye}
        title="Visual View indisponível"
        description={`A Visual View depende de source mapping e preview do runtime real (07§7/§45), mas ${missing.join(
          ' e ',
        )} não consta(m) no discovery do Control Plane. Use a Code View — mesma verdade do projeto (07§6).`}
      />
    );
  }
  // Capabilities presentes: preview real + seleção via Inspector (a seleção
  // por clique DENTRO do iframe exige instrumentação do runtime alvo — fora
  // do contrato M3; a seleção honesta é por route+nodeRef, 07§11/§16).
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Visual View: preview do runtime real abaixo. A seleção de elementos é feita por route + nodeRef na
        view Inspector (editor.selection.read) — o M3 não instrumenta clique dentro do iframe, e nada é
        simulado.
      </p>
      <EditorPreviewPanel projectId={projectId} compact />
    </div>
  );
}

function DiffTab() {
  const file = useActiveFile();
  if (file === null) {
    return (
      <EmptyState
        icon={GitCompareArrows}
        title="Nenhum arquivo aberto"
        description="Abra um arquivo para comparar o buffer local com o conteúdo do disco. Diffs de Change Objects estão no painel Changes (editor.change.preview)."
      />
    );
  }
  const diff = diffLines(file.savedContent, file.buffer);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Diff local de <code className="font-mono">{file.filePath}</code> (disco vs buffer não salvo). Diffs de
        pending changes (07§42) ficam no painel Changes.
      </p>
      <EditorLineDiffView diff={diff} beforeLabel="Disco (último open/save)" afterLabel="Buffer local" />
    </div>
  );
}

function EditorWorkspace({ projectId }: { projectId: string }) {
  const toast = useToast();
  const open = useEditorOpenSource();
  const flow = useEditorSaveFlow(projectId);

  const view = useEditorStore((s) => s.view);
  const setView = useEditorStore((s) => s.setView);
  const pathDraft = useEditorStore((s) => s.pathDraft);
  const setPathDraft = useEditorStore((s) => s.setPathDraft);
  const openPaths = useEditorStore((s) => s.openPaths);
  const files = useEditorStore((s) => s.files);
  const activePath = useEditorStore((s) => s.activePath);
  const setActivePath = useEditorStore((s) => s.setActivePath);
  const closeFile = useEditorStore((s) => s.closeFile);
  const editBuffer = useEditorStore((s) => s.editBuffer);
  const activeFile = useActiveFile();

  const [openError, setOpenError] = useState<ControlPlaneErrorShape | null>(null);
  const [pendingUndoRedo, setPendingUndoRedo] = useState<UndoRedoAction | null>(null);

  // Troca de projeto -> estado local temporário resetado (07§28).
  useEffect(() => {
    editorStore.getState().resetForProject(projectId);
  }, [projectId]);

  const openFile = (filePath: string) => {
    setOpenError(null);
    open.mutate(
      { projectId, filePath },
      {
        onSuccess: (data) => {
          editorStore.getState().openLoaded({
            filePath,
            content: data.content,
            hash: data.hash,
            language: data.language,
            readOnly: data.readOnly,
          });
          setPathDraft('');
        },
        onError: (cause) => {
          const error = toControlPlaneError(cause);
          setOpenError(error.shape);
          toast.error('Falha ao abrir arquivo', error.nextAction ?? error.message);
        },
      },
    );
  };

  // Ctrl+S / Cmd+S -> fluxo de save com aprovação (07§36, D17).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        const st = editorStore.getState();
        const file = st.activePath === null ? null : st.files[st.activePath];
        if (file !== null && file !== undefined && !file.readOnly && file.saveState !== 'Saved') {
          e.preventDefault();
          flow.requestSave(file.filePath);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // flow.requestSave é estável o suficiente (setState + getState); deps do fluxo.
  }, [flow.requestSave]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = activeFile !== null && activeFile.saveState !== 'Saved';

  return (
    <div className="flex min-h-[70vh] flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        {/* FileTree (esq) — 07§4 */}
        <aside className="min-h-0 rounded-md border border-border p-3">
          <EditorFileTree
            files={openPaths.map((p) => files[p]).filter((f) => f !== undefined)}
            activePath={activePath}
            pathDraft={pathDraft}
            opening={open.isPending}
            onPathDraftChange={setPathDraft}
            onOpen={openFile}
            onSelect={(p) => setActivePath(p)}
            onClose={closeFile}
          />
          {openError !== null ? (
            <div className="mt-3">
              <ErrorState error={openError} operation="editor.source.open" />
            </div>
          ) : null}
        </aside>

        {/* Centro — views (07§6) */}
        <section aria-label="Views do editor" className="flex min-h-0 flex-col rounded-md border border-border p-3">
          <Tabs
            ariaLabel="Views do editor"
            value={view}
            onValueChange={(v) => setView(v as EditorView)}
            items={[
              { value: 'visual', label: VIEW_LABEL.visual, icon: Eye, panel: <VisualGate projectId={projectId} /> },
              {
                value: 'code',
                label: VIEW_LABEL.code,
                icon: FileCode,
                panel: <EditorCodeView file={activeFile} onEdit={editBuffer} height="55vh" />,
              },
              {
                value: 'split',
                label: VIEW_LABEL.split,
                icon: Columns2,
                panel: (
                  <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-2">
                    <EditorCodeView file={activeFile} onEdit={editBuffer} height="55vh" />
                    <EditorPreviewPanel projectId={projectId} compact />
                  </div>
                ),
              },
              {
                value: 'preview',
                label: VIEW_LABEL.preview,
                icon: MonitorPlay,
                panel: <EditorPreviewPanel projectId={projectId} />,
              },
              {
                value: 'inspector',
                label: VIEW_LABEL.inspector,
                icon: Crosshair,
                panel: <EditorInspector projectId={projectId} onOpenSource={openFile} />,
              },
              { value: 'diff', label: VIEW_LABEL.diff, icon: GitCompareArrows, panel: <DiffTab /> },
            ]}
          />
        </section>

        {/* Inspector/Changes (dir) — 07§4 */}
        <aside className="min-h-0 rounded-md border border-border p-3">
          <Tabs
            ariaLabel="Painel lateral do editor"
            items={[
              {
                value: 'inspector',
                label: 'Inspector',
                icon: Crosshair,
                panel: <EditorInspector projectId={projectId} onOpenSource={openFile} />,
              },
              {
                value: 'changes',
                label: 'Changes',
                icon: GitCompareArrows,
                panel: <EditorChangesPanel projectId={projectId} />,
              },
            ]}
          />
        </aside>
      </div>

      {/* Barra de estado — SaveState REAL + hash (07§29) */}
      <footer
        aria-label="Estado do editor"
        className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
      >
        {activeFile === null ? (
          <span className="text-xs text-muted-foreground">Nenhum arquivo ativo.</span>
        ) : (
          <>
            <span className="font-mono text-xs text-foreground" title={activeFile.filePath}>
              {activeFile.filePath}
            </span>
            <SaveStateBadge state={activeFile.saveState} />
            <span className="font-mono text-[10px] text-muted-foreground" title={activeFile.hash}>
              hash {shortHash(activeFile.hash)}
            </span>
            <Badge tone="neutral">{activeFile.language}</Badge>
            {activeFile.readOnly ? <Badge tone="warning">read-only</Badge> : null}
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <EditorUndoRedoButtons onRequest={setPendingUndoRedo} />
          <GuardedButton
            capabilityId="editor.source.save"
            variant="primary"
            size="sm"
            disabled={activeFile === null || !dirty || activeFile.readOnly || flow.saving}
            loading={flow.saving}
            onClick={() => {
              if (activeFile !== null) flow.requestSave(activeFile.filePath);
            }}
          >
            <Save aria-hidden="true" size={14} />
            Salvar (Ctrl+S)
          </GuardedButton>
        </div>
      </footer>

      {/* Save Failed: pending preservado + retry (07§37) */}
      {activeFile?.saveState === 'SaveFailed' && activeFile.saveError !== null ? (
        <ErrorState
          error={activeFile.saveError}
          operation="editor.source.save"
          action={
            <GuardedButton
              capabilityId="editor.source.save"
              size="sm"
              onClick={() => flow.retrySave(activeFile.filePath)}
            >
              Tentar novamente
            </GuardedButton>
          }
        />
      ) : null}

      {/* Aprovação do save / Keep Local (D17) */}
      <ApprovalDialog
        open={flow.pendingApproval !== null}
        onOpenChange={(next) => {
          if (!next) flow.cancelApproval();
        }}
        title={
          flow.pendingApproval?.mode === 'keepLocal'
            ? 'Keep Local: sobrescrever mudança externa'
            : 'Salvar arquivo no source do projeto'
        }
        capabilityId="editor.source.save"
        loading={flow.saving}
        onConfirm={flow.confirmApproval}
      >
        {flow.pendingApproval !== null ? (
          <span className="text-sm">
            {flow.pendingApproval.mode === 'keepLocal'
              ? 'O arquivo mudou externamente (CONFLICT, 07§38). Sua versão local será relida contra a baseline atual do disco e sobrescreverá a mudança externa — escolha explícita registrada em auditoria.'
              : 'Persiste o buffer local no Source Project real via save pipeline (07§36: validação, conflito, persistência, verificação pós-escrita, atualização da Project Intelligence).'}
            {' Arquivo: '}
            <code className="font-mono text-xs">{flow.pendingApproval.filePath}</code>
            {activeFile !== null && flow.pendingApproval.mode === 'save' ? (
              <>
                {' · expectedHash '}
                <code className="font-mono text-xs">{shortHash(activeFile.hash)}</code> (07§38)
              </>
            ) : null}
          </span>
        ) : null}
      </ApprovalDialog>

      {/* Conflito — 5 resoluções, Merge NUNCA (D12) */}
      <EditorConflictDialog
        conflict={flow.pendingApproval === null ? flow.conflict : null}
        currentBuffer={
          flow.conflict !== null
            ? (files[flow.conflict.filePath]?.buffer ?? flow.conflict.localContent)
            : ''
        }
        loadingExternal={flow.loadingExternal}
        onResolve={flow.resolveConflict}
      />

      {/* Undo/redo da barra de estado — aprovação D17 (o painel Changes tem o seu) */}
      <UndoRedoApprovalBridge projectId={projectId} action={pendingUndoRedo} onClose={() => setPendingUndoRedo(null)} />
    </div>
  );
}

/**
 * Aprovação + execução real de Undo/Redo disparados da barra de estado
 * (07§33-34, D17). Erros reais (NOT_FOUND quando não há o que reverter,
 * UNSUPPORTED de redo inseguro/delete) viram toast com nextAction — nunca
 * escondidos.
 */
function UndoRedoApprovalBridge({
  projectId,
  action,
  onClose,
}: {
  projectId: string;
  action: UndoRedoAction | null;
  onClose: () => void;
}) {
  const undo = useEditorUndo();
  const redo = useEditorRedo();
  const toast = useToast();
  const busy = undo.isPending || redo.isPending;

  return (
    <ApprovalDialog
      open={action !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={action?.kind === 'undo' ? 'Undo da última mudança do Editor' : 'Redo da última mudança revertida'}
      capabilityId={action?.kind === 'undo' ? 'editor.change.undo' : 'editor.change.redo'}
      loading={busy}
      onConfirm={(justification) => {
        if (action === null) return;
        const approval = {
          approver: currentActorId(),
          ...(justification !== undefined ? { justification } : {}),
        };
        const mutation = action.kind === 'undo' ? undo : redo;
        mutation.mutate(
          { projectId, approval },
          {
            onSuccess: (change) => {
              toast.success(
                action.kind === 'undo' ? 'Undo aplicado' : 'Redo aplicado',
                `Change ${change.id} (${change.operation} em ${change.files.join(', ')}) — estado ${change.state}.`,
              );
              onClose();
            },
            onError: (cause) => {
              const error = toControlPlaneError(cause);
              toast.error(
                action.kind === 'undo' ? 'Undo não executado' : 'Redo não executado',
                error.nextAction ?? error.message,
              );
              onClose();
            },
          },
        );
      }}
    >
      <span className="text-sm">
        {action?.kind === 'undo'
          ? 'Reverte a última mudança Editor-managed aplicada (07§33); mudanças externas não são tocadas.'
          : 'Reaplica a última mudança revertida se o estado continuar compatível (07§34); inseguro retorna UNSUPPORTED.'}
      </span>
    </ApprovalDialog>
  );
}

export function EditorPage({ projectId }: { projectId: string }) {
  return (
    <CapabilityArea title="Editor" icon={SquarePen} requires={['editor.source.open']}>
      <EditorWorkspace projectId={projectId} />
    </CapabilityArea>
  );
}
