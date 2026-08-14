/**
 * EditorChangesPanel — Change Manager real (07§30-31): pending changes via
 * editor.change.list, create (SAFE — before capturado do disco pelo backend,
 * D7), preview (diff real via editor.change.preview, 07§42), apply
 * (DESTRUCTIVE -> ApprovalDialog D17), reject (SAFE), undo/redo (07§33-34;
 * DESTRUCTIVE -> aprovação; NOT_FOUND/UNSUPPORTED exibidos honestamente).
 */

import { Eye, GitCompareArrows, Redo2, Undo2, XCircle } from 'lucide-react';
import { useId, useState } from 'react';

import { currentActorId } from '../../api/client';
import {
  useEditorApplyChange,
  useEditorChanges,
  useEditorCreateChange,
  useEditorPreviewChange,
  useEditorRejectChange,
  useEditorRedo,
  useEditorUndo,
  type EditorChangeObject,
  type EditorChangeOperation,
  type EditorDiff,
} from '../../api/hooks';
import {
  ApprovalDialog,
  Badge,
  type BadgeTone,
  Button,
  EmptyState,
  ErrorState,
  Field,
  GuardedButton,
  Input,
  Select,
  Spinner,
  Textarea,
  Tooltip,
} from '../../components/ui';
import { formatDateTime } from '../../lib/cx';
import { changeFileStatus } from './editorLib';
import { EditorChangeDiffView, FileStatusBadge } from './EditorDiffView';

const OPERATION_TONE: Record<EditorChangeOperation, BadgeTone> = {
  modify: 'warning',
  create: 'success',
  delete: 'danger',
  rename: 'primary',
};

const STATE_TONE: Record<EditorChangeObject['state'], BadgeTone> = {
  PENDING: 'warning',
  APPLIED: 'success',
  REJECTED: 'neutral',
  FAILED: 'danger',
  REVERTED: 'neutral',
};

// ---- undo/redo (07§33-34) — também usado na barra de estado da página --------

export type UndoRedoAction = { kind: 'undo' } | { kind: 'redo' };

export function EditorUndoRedoButtons({
  onRequest,
}: {
  /** Abre o ApprovalDialog para a ação (o caller executa com aprovação D17). */
  onRequest: (action: UndoRedoAction) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Tooltip content="Reverte a última mudança aplicada pelo Editor (07§33). Se não houver nada a reverter, o backend responde NOT_FOUND; undo de delete/create pode ser UNSUPPORTED — exibido honestamente.">
        <GuardedButton capabilityId="editor.change.undo" size="sm" onClick={() => onRequest({ kind: 'undo' })}>
          <Undo2 aria-hidden="true" size={14} />
          Undo
        </GuardedButton>
      </Tooltip>
      <Tooltip content="Reaplica a última mudança revertida, se o estado do projeto continuar compatível (07§34); caso contrário o backend responde UNSUPPORTED.">
        <GuardedButton capabilityId="editor.change.redo" size="sm" onClick={() => onRequest({ kind: 'redo' })}>
          <Redo2 aria-hidden="true" size={14} />
          Redo
        </GuardedButton>
      </Tooltip>
    </div>
  );
}

// ---- create form (editor.change.create — SAFE) ----------------------------------

function CreateChangeForm({ projectId }: { projectId: string }) {
  const create = useEditorCreateChange();
  const operationId = useId();
  const fileId = useId();
  const renameToId = useId();
  const contentId = useId();
  const [operation, setOperation] = useState<EditorChangeOperation>('modify');
  const [filePath, setFilePath] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [content, setContent] = useState('');

  const needsContent = operation === 'modify' || operation === 'create';
  const valid =
    filePath.trim().length > 0 &&
    (!needsContent || content.length > 0) &&
    (operation !== 'rename' || renameTo.trim().length > 0);

  return (
    <form
      aria-label="Criar change pendente"
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const file = filePath.trim();
        create.mutate(
          {
            projectId,
            change: {
              files: [file],
              operation,
              // Criado na UI de código da CMS (07§32 — origem auditável real).
              source: 'code',
              origin: 'Code Editor',
              after: operation === 'delete' ? { [file]: null } : needsContent ? { [file]: content } : {},
              ...(operation === 'rename' ? { renameTo: renameTo.trim() } : {}),
            },
          },
          {
            onSuccess: () => {
              setContent('');
              setRenameTo('');
            },
          },
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Operação" htmlFor={operationId}>
          <Select
            id={operationId}
            value={operation}
            onChange={(e) => setOperation(e.target.value as EditorChangeOperation)}
          >
            <option value="modify">modify</option>
            <option value="create">create</option>
            <option value="delete">delete</option>
            <option value="rename">rename</option>
          </Select>
        </Field>
        <Field label="Arquivo (relativo ao Project Root)" htmlFor={fileId} required>
          <Input
            id={fileId}
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="src/App.tsx"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        </Field>
      </div>
      {operation === 'rename' ? (
        <Field
          label="Novo caminho (renameTo)"
          htmlFor={renameToId}
          description="Rename no write-path pode retornar UNSUPPORTED no apply (M3) — o erro real é exibido."
          required
        >
          <Input
            id={renameToId}
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value)}
            placeholder="src/NewName.tsx"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        </Field>
      ) : null}
      {needsContent ? (
        <Field
          label={operation === 'create' ? 'Conteúdo do novo arquivo (after)' : 'Conteúdo desejado (after)'}
          htmlFor={contentId}
          description="O estado before é capturado do disco real pelo backend (D7) — nunca informado aqui."
          required
        >
          <Textarea
            id={contentId}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            spellCheck={false}
            className="font-mono text-xs"
          />
        </Field>
      ) : null}
      {create.isError ? <ErrorState error={create.error} operation="editor.change.create" /> : null}
      <div>
        <Button type="submit" variant="primary" size="sm" disabled={!valid} loading={create.isPending}>
          Criar change pendente
        </Button>
      </div>
    </form>
  );
}

// ---- painel ----------------------------------------------------------------------

type PendingApply = { kind: 'apply'; change: EditorChangeObject } | UndoRedoAction;

export function EditorChangesPanel({ projectId }: { projectId: string }) {
  const changes = useEditorChanges(projectId);
  const preview = useEditorPreviewChange();
  const apply = useEditorApplyChange();
  const reject = useEditorRejectChange();
  const undo = useEditorUndo();
  const redo = useEditorRedo();

  const [pendingApproval, setPendingApproval] = useState<PendingApply | null>(null);
  const [previewDiff, setPreviewDiff] = useState<{ changeId: string; diff: EditorDiff } | null>(null);

  const busy = apply.isPending || undo.isPending || redo.isPending;

  const confirmApproval = (justification?: string) => {
    if (pendingApproval === null) return;
    const approval = {
      approver: currentActorId(),
      ...(justification !== undefined ? { justification } : {}),
    };
    const action = pendingApproval;
    setPendingApproval(null);
    if (action.kind === 'apply') {
      apply.mutate({ projectId, changeId: action.change.id, approval });
      return;
    }
    if (action.kind === 'undo') {
      undo.mutate({ projectId, approval });
      return;
    }
    redo.mutate({ projectId, approval });
  };

  const mutationError = apply.isError
    ? { error: apply.error, operation: 'editor.change.apply' }
    : undo.isError
      ? { error: undo.error, operation: 'editor.change.undo' }
      : redo.isError
        ? { error: redo.error, operation: 'editor.change.redo' }
        : reject.isError
          ? { error: reject.error, operation: 'editor.change.reject' }
          : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Pending changes (Change Manager)</h3>
        <EditorUndoRedoButtons onRequest={(a) => setPendingApproval(a)} />
      </div>

      {mutationError !== null ? (
        <ErrorState error={mutationError.error} operation={mutationError.operation} />
      ) : null}

      {changes.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner label="Consultando editor.change.list" /> Consultando pending changes…
        </div>
      ) : changes.isError ? (
        <ErrorState
          error={changes.error}
          operation="editor.change.list"
          action={
            <Button size="sm" onClick={() => void changes.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : (changes.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Nenhum change pendente"
          description="O Change Manager não tem mudanças pendentes neste projeto. Crie um change abaixo ou edite arquivos na Code View."
        />
      ) : (
        <ul aria-label="Changes" className="flex flex-col gap-2">
          {(changes.data ?? []).map((change) => (
            <li key={change.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={OPERATION_TONE[change.operation]}>{change.operation}</Badge>
                <Badge tone={STATE_TONE[change.state]}>{change.state}</Badge>
                <span className="text-xs text-muted-foreground">
                  {change.origin} · {change.source} · {formatDateTime(change.createdAt)}
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{change.id}</span>
              </div>
              <ul className="flex flex-col gap-0.5">
                {change.files.map((file) => (
                  <li key={file} className="flex items-center gap-2">
                    <FileStatusBadge
                      status={changeFileStatus(change.before[file], change.after[file])}
                    />
                    <span className="truncate font-mono text-xs text-foreground" title={file}>
                      {file}
                    </span>
                  </li>
                ))}
              </ul>
              {previewDiff?.changeId === change.id ? (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <EditorChangeDiffView diff={previewDiff.diff} />
                </div>
              ) : null}
              {change.state === 'PENDING' ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={preview.isPending && preview.variables?.changeId === change.id}
                    onClick={() =>
                      preview.mutate(
                        { projectId, changeId: change.id },
                        {
                          onSuccess: (diff) => setPreviewDiff({ changeId: change.id, diff }),
                        },
                      )
                    }
                  >
                    <Eye aria-hidden="true" size={14} />
                    Preview diff
                  </Button>
                  <GuardedButton
                    capabilityId="editor.change.apply"
                    size="sm"
                    variant="primary"
                    onClick={() => setPendingApproval({ kind: 'apply', change })}
                  >
                    Aplicar
                  </GuardedButton>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={reject.isPending && reject.variables?.changeId === change.id}
                    onClick={() => reject.mutate({ projectId, changeId: change.id })}
                  >
                    <XCircle aria-hidden="true" size={14} />
                    Rejeitar
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <section aria-label="Criar change">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Criar change pendente</h3>
        <CreateChangeForm projectId={projectId} />
      </section>

      <ApprovalDialog
        open={pendingApproval !== null}
        onOpenChange={(next) => {
          if (!next) setPendingApproval(null);
        }}
        title={
          pendingApproval?.kind === 'apply'
            ? 'Aplicar change pendente'
            : pendingApproval?.kind === 'undo'
              ? 'Undo da última mudança do Editor'
              : 'Redo da última mudança revertida'
        }
        capabilityId={
          pendingApproval?.kind === 'apply'
            ? 'editor.change.apply'
            : pendingApproval?.kind === 'undo'
              ? 'editor.change.undo'
              : 'editor.change.redo'
        }
        loading={busy}
        onConfirm={confirmApproval}
      >
        {pendingApproval?.kind === 'apply' ? (
          <span className="text-sm">
            Aplica o change <code className="font-mono text-xs">{pendingApproval.change.id}</code> (
            {pendingApproval.change.operation} em {pendingApproval.change.files.join(', ')}) via save
            pipeline completo (07§36: validação, conflito, persistência, verificação, PI).
          </span>
        ) : pendingApproval?.kind === 'undo' ? (
          <span className="text-sm">
            Reverte a última mudança Editor-managed aplicada (07§33). Mudanças externas não relacionadas
            nunca são tocadas.
          </span>
        ) : (
          <span className="text-sm">
            Reaplica a última mudança revertida se o estado do projeto continuar compatível (07§34);
            inseguro retorna UNSUPPORTED.
          </span>
        )}
      </ApprovalDialog>
    </div>
  );
}
