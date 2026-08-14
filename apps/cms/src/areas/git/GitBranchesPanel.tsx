/**
 * BranchesPanel — git.branch.list/create/switch/delete (doc 10 §14/§16).
 * As três mutações são DESTRUCTIVE -> ApprovalDialog (M3 §8.5). Force-delete
 * é capability RESERVADA (git.branch.deleteForce, D3) sem grant — a UI NUNCA
 * oferece force; erro UNSUPPORTED do backend é exibido se ocorrer.
 */

import { GitBranch, GitBranchPlus, RefreshCw } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { useGitBranches } from '../../api/hooks';
import { shortHash } from '../../lib/cx';
import {
  ApprovalDialog,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  GuardedButton,
  Input,
  Spinner,
  useToast,
} from '../../components/ui';
import { useDestructiveAction } from './useDestructiveAction';

interface BranchNameInput {
  projectId: string;
  name: string;
}

interface BranchCreateInput {
  projectId: string;
  name: string;
  startPoint?: string;
  checkout?: boolean;
}

function CreateBranchForm({ projectId }: { projectId: string }) {
  const toast = useToast();
  const nameId = useId();
  const startId = useId();
  const checkoutId = useId();
  const [name, setName] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [checkout, setCheckout] = useState(false);
  const action = useDestructiveAction<BranchCreateInput>('git.branch.create', {
    onSuccess: () => {
      setName('');
      setStartPoint('');
      setCheckout(false);
      toast.success('Branch criada');
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    action.request({
      projectId,
      name: trimmed,
      ...(startPoint.trim().length > 0 ? { startPoint: startPoint.trim() } : {}),
      checkout,
    });
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <GitBranchPlus aria-hidden="true" size={16} className="text-primary" />
            Criar branch
          </span>
        }
        description="Validação real de ref-format pelo git. Opcional: ponto de partida e checkout imediato."
      />
      <CardBody>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Nome da branch" htmlFor={nameId} required className="flex-1">
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="feature/minha-branch"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </Field>
          <Field label="Ponto de partida (opcional)" htmlFor={startId} className="flex-1">
            <Input
              id={startId}
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              placeholder="main ou hash"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <label htmlFor={checkoutId} className="flex h-9 items-center gap-2 text-sm text-foreground">
            <input
              id={checkoutId}
              type="checkbox"
              checked={checkout}
              onChange={(e) => setCheckout(e.target.checked)}
            />
            Checkout após criar
          </label>
          <GuardedButton capabilityId="git.branch.create" variant="primary" type="submit" disabled={name.trim().length === 0}>
            Criar
          </GuardedButton>
        </form>
        {action.mutation.isError ? (
          <div className="mt-3">
            <ErrorState error={action.mutation.error} operation="git.branch.create" />
          </div>
        ) : null}
      </CardBody>

      <ApprovalDialog
        open={action.pending !== null}
        onOpenChange={(open) => {
          if (!open) action.cancel();
        }}
        title="Confirmar criação de branch"
        capabilityId="git.branch.create"
        loading={action.mutation.isPending}
        onConfirm={action.confirm}
        confirmLabel="Criar branch"
      >
        {action.pending !== null ? (
          <p className="text-xs text-foreground">
            Criar branch <span className="font-mono font-medium">{action.pending.name}</span>
            {action.pending.startPoint !== undefined ? (
              <>
                {' '}
                a partir de <span className="font-mono">{action.pending.startPoint}</span>
              </>
            ) : null}
            {action.pending.checkout === true ? ' e trocar para ela (checkout).' : '.'}
          </p>
        ) : null}
      </ApprovalDialog>
    </Card>
  );
}

export function BranchesPanel({ projectId }: { projectId: string }) {
  const toast = useToast();
  const branches = useGitBranches(projectId);
  const switchAction = useDestructiveAction<BranchNameInput>('git.branch.switch', {
    onSuccess: () => toast.success('Branch trocada', 'Project Intelligence pode estar stale — um refresh será recomendado.'),
  });
  const deleteAction = useDestructiveAction<BranchNameInput>('git.branch.delete', {
    onSuccess: () => toast.success('Branch removida'),
  });

  return (
    <div className="flex flex-col gap-4">
      <CreateBranchForm projectId={projectId} />

      {branches.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner label="Listando branches" /> Listando branches…
        </div>
      ) : branches.isError ? (
        <ErrorState error={branches.error} operation="git.branch.list" />
      ) : (branches.data?.length ?? 0) === 0 ? (
        <EmptyState icon={GitBranch} title="Sem branches" description="Nenhuma branch encontrada no repositório." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground">Branches do repositório</p>
            <Button size="sm" loading={branches.isRefetching} onClick={() => void branches.refetch()}>
              <RefreshCw aria-hidden="true" size={14} />
              Atualizar
            </Button>
          </div>
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Branches</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">Branch</th>
                <th scope="col" className="px-3 py-2 font-medium">HEAD</th>
                <th scope="col" className="px-3 py-2 font-medium">Tracking</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(branches.data ?? []).map((branch) => (
                <tr key={branch.name} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-foreground">
                    <span className="inline-flex items-center gap-2">
                      {branch.name}
                      {branch.current ? <Badge tone="primary">atual</Badge> : null}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {branch.head !== null ? shortHash(branch.head) : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{branch.tracking ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <GuardedButton
                        capabilityId="git.branch.switch"
                        size="sm"
                        disabled={branch.current}
                        onClick={() => switchAction.request({ projectId, name: branch.name })}
                      >
                        Trocar
                      </GuardedButton>
                      <GuardedButton
                        capabilityId="git.branch.delete"
                        size="sm"
                        variant="danger"
                        disabled={branch.current}
                        onClick={() => deleteAction.request({ projectId, name: branch.name })}
                      >
                        Remover
                      </GuardedButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {switchAction.mutation.isError ? (
        <ErrorState error={switchAction.mutation.error} operation="git.branch.switch" />
      ) : null}
      {deleteAction.mutation.isError ? (
        <ErrorState error={deleteAction.mutation.error} operation="git.branch.delete" />
      ) : null}

      <ApprovalDialog
        open={switchAction.pending !== null}
        onOpenChange={(open) => {
          if (!open) switchAction.cancel();
        }}
        title="Confirmar troca de branch"
        capabilityId="git.branch.switch"
        loading={switchAction.mutation.isPending}
        onConfirm={switchAction.confirm}
        confirmLabel="Trocar de branch"
      >
        {switchAction.pending !== null ? (
          <p className="text-xs text-foreground">
            Trocar para <span className="font-mono font-medium">{switchAction.pending.name}</span>. O backend
            executa pré-checagens reais (conflitos, operação em progresso, working tree suja) antes de trocar.
          </p>
        ) : null}
      </ApprovalDialog>

      <ApprovalDialog
        open={deleteAction.pending !== null}
        onOpenChange={(open) => {
          if (!open) deleteAction.cancel();
        }}
        title="Confirmar remoção de branch"
        capabilityId="git.branch.delete"
        loading={deleteAction.mutation.isPending}
        onConfirm={deleteAction.confirm}
        confirmLabel="Remover branch"
      >
        {deleteAction.pending !== null ? (
          <p className="text-xs text-foreground">
            Remover a branch <span className="font-mono font-medium">{deleteAction.pending.name}</span>. A branch
            atual nunca é removida; force-delete é capability reservada sem grant (D3) e não é oferecida aqui.
          </p>
        ) : null}
      </ApprovalDialog>
    </div>
  );
}
