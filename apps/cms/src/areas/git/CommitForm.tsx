/**
 * CommitForm — commit real via git.commit (doc 10 §20/§21; escopo D5:
 * staged default | files[] staging explícito | all:true opt-in — files+all
 * são mutuamente exclusivos, validado no schema do backend). DESTRUCTIVE ->
 * ApprovalDialog antes de invocar (M3 §8.5).
 */

import { GitCommitHorizontal } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';

import { useGitStatus } from '../../api/hooks';
import {
  ApprovalDialog,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  GuardedButton,
  Textarea,
  useToast,
} from '../../components/ui';
import { useDestructiveAction } from './useDestructiveAction';

type CommitScope = 'staged' | 'files' | 'all';

interface CommitInput {
  projectId: string;
  message: string;
  files?: string[];
  all?: boolean;
}

export function CommitForm({ projectId }: { projectId: string }) {
  const toast = useToast();
  const messageId = useId();
  const status = useGitStatus(projectId);
  const [message, setMessage] = useState('');
  const [scope, setScope] = useState<CommitScope>('staged');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const action = useDestructiveAction<CommitInput>('git.commit', {
    onSuccess: () => {
      setMessage('');
      setSelected(new Set());
      toast.success('Commit realizado', 'Verificado pelo Control Plane.');
    },
  });

  // Arquivos elegíveis para staging explícito: unstaged + untracked (reais).
  const stageable = useMemo(() => {
    const data = status.data;
    if (data === undefined || !data.isRepo) return [];
    const unstaged = (data.unstaged ?? []).map((c) => c.path);
    const untracked = data.untracked ?? [];
    return [...new Set([...unstaged, ...untracked])].sort();
  }, [status.data]);

  const hasStaged = (status.data?.staged?.length ?? 0) > 0;
  const trimmed = message.trim();
  const filesScopeValid = scope !== 'files' || selected.size > 0;
  const stagedScopeValid = scope !== 'staged' || hasStaged;
  const canSubmit = trimmed.length > 0 && filesScopeValid && stagedScopeValid;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const input: CommitInput = { projectId, message: trimmed };
    if (scope === 'all') input.all = true;
    if (scope === 'files') input.files = [...selected].sort();
    action.request(input);
  };

  const toggleFile = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <GitCommitHorizontal aria-hidden="true" size={16} className="text-primary" />
            Commit
          </span>
        }
        description="Mensagem explícita obrigatória. Escopo padrão: somente o que já está staged (D5)."
      />
      <CardBody>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Mensagem do commit" htmlFor={messageId} required>
            <Textarea
              id={messageId}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva a mudança"
              required
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium text-foreground">Escopo do commit</legend>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="commit-scope"
                checked={scope === 'staged'}
                onChange={() => setScope('staged')}
              />
              Somente staged
              {!hasStaged ? (
                <span className="text-xs text-muted-foreground">(nada staged no momento)</span>
              ) : null}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="commit-scope"
                checked={scope === 'files'}
                onChange={() => setScope('files')}
                disabled={stageable.length === 0}
              />
              Arquivos selecionados (staging explícito)
            </label>
            {scope === 'files' ? (
              stageable.length === 0 ? (
                <EmptyState
                  title="Nada para stagear"
                  description="Não há arquivos unstaged ou untracked para seleção explícita."
                />
              ) : (
                <ul className="ml-6 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2">
                  {stageable.map((path) => (
                    <li key={path}>
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={selected.has(path)}
                          onChange={() => toggleFile(path)}
                        />
                        <span className="truncate font-mono">{path}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="commit-scope"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
              />
              Todos os arquivos rastreados modificados (all — opt-in)
            </label>
          </fieldset>

          <div className="flex items-center gap-2">
            <GuardedButton
              capabilityId="git.commit"
              variant="primary"
              type="submit"
              disabled={!canSubmit}
            >
              Revisar e commitar
            </GuardedButton>
            {!stagedScopeValid ? (
              <span className="text-xs text-muted-foreground">
                Stage arquivos ou escolha outro escopo.
              </span>
            ) : null}
          </div>
          {action.mutation.isError ? (
            <ErrorState error={action.mutation.error} operation="git.commit" />
          ) : null}
        </form>
      </CardBody>

      <ApprovalDialog
        open={action.pending !== null}
        onOpenChange={(open) => {
          if (!open) action.cancel();
        }}
        title="Confirmar commit"
        capabilityId="git.commit"
        loading={action.mutation.isPending}
        onConfirm={action.confirm}
        confirmLabel="Commitar"
      >
        {action.pending !== null ? (
          <dl className="flex flex-col gap-1 text-xs">
            <div className="flex gap-2">
              <dt className="font-medium text-muted-foreground">mensagem:</dt>
              <dd className="text-foreground">{action.pending.message}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-muted-foreground">escopo:</dt>
              <dd className="text-foreground">
                {action.pending.all === true
                  ? 'todos os rastreados modificados (all)'
                  : action.pending.files !== undefined
                    ? `${String(action.pending.files.length)} arquivo(s) selecionado(s)`
                    : 'somente staged'}
              </dd>
            </div>
            {action.pending.files !== undefined ? (
              <div className="flex gap-2">
                <dt className="font-medium text-muted-foreground">arquivos:</dt>
                <dd className="font-mono break-all text-foreground">{action.pending.files.join(', ')}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </ApprovalDialog>
    </Card>
  );
}
