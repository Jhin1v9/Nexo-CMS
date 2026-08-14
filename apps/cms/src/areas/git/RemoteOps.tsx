/**
 * RemoteOps — git.fetch / git.pull / git.push (doc 10 §24-§27). Todos
 * DESTRUCTIVE -> ApprovalDialog. Push JAMAIS force: 'git.forcePush' é
 * permissão reservada sem grant (D3) — a UI não oferece a opção.
 */

import { ArrowDownToLine, ArrowUpToLine, CloudDownload } from 'lucide-react';
import { useId, useState } from 'react';

import {
  ApprovalDialog,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  GuardedButton,
  Input,
  useToast,
} from '../../components/ui';
import { useDestructiveAction } from './useDestructiveAction';

type RemoteOp = 'git.fetch' | 'git.pull' | 'git.push';

interface RemoteInput {
  projectId: string;
  remote?: string;
  branch?: string;
}

const OPS: { id: RemoteOp; label: string; icon: typeof CloudDownload; withBranch: boolean; description: string }[] = [
  { id: 'git.fetch', label: 'Fetch', icon: CloudDownload, withBranch: false, description: 'Busca refs do remoto sem alterar a working tree.' },
  { id: 'git.pull', label: 'Pull', icon: ArrowDownToLine, withBranch: true, description: 'Atualiza a branch atual a partir do remoto (pré-checagem de working tree suja).' },
  { id: 'git.push', label: 'Push', icon: ArrowUpToLine, withBranch: true, description: 'Envia commits ao remoto. Force-push não existe no Nexo (permissão reservada, D3).' },
];

export function RemoteOps({ projectId }: { projectId: string }) {
  const toast = useToast();
  const remoteId = useId();
  const branchId = useId();
  const [remote, setRemote] = useState('');
  const [branch, setBranch] = useState('');
  const fetchAction = useDestructiveAction<RemoteInput>('git.fetch', {
    onSuccess: () => toast.success('Fetch concluído'),
  });
  const pullAction = useDestructiveAction<RemoteInput>('git.pull', {
    onSuccess: () => toast.success('Pull concluído'),
  });
  const pushAction = useDestructiveAction<RemoteInput>('git.push', {
    onSuccess: () => toast.success('Push concluído'),
  });
  const actions = { 'git.fetch': fetchAction, 'git.pull': pullAction, 'git.push': pushAction } as const;

  const buildInput = (): RemoteInput => ({
    projectId,
    ...(remote.trim().length > 0 ? { remote: remote.trim() } : {}),
    ...(branch.trim().length > 0 ? { branch: branch.trim() } : {}),
  });

  return (
    <Card>
      <CardHeader
        title="Operações remotas"
        description="Remote/branch vazios usam o padrão configurado no repositório. Todas exigem aprovação (DESTRUCTIVE)."
      />
      <CardBody className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Remote (opcional)" htmlFor={remoteId}>
            <Input
              id={remoteId}
              value={remote}
              onChange={(e) => setRemote(e.target.value)}
              placeholder="origin"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field label="Branch (opcional)" htmlFor={branchId}>
            <Input
              id={branchId}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="branch atual"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {OPS.map((op) => {
            const Icon = op.icon;
            return (
              <GuardedButton
                key={op.id}
                capabilityId={op.id}
                title={op.description}
                onClick={() => actions[op.id].request(buildInput())}
              >
                <Icon aria-hidden="true" size={14} />
                {op.label}
              </GuardedButton>
            );
          })}
        </div>
        {OPS.map((op) =>
          actions[op.id].mutation.isError ? (
            <ErrorState key={op.id} error={actions[op.id].mutation.error} operation={op.id} />
          ) : null,
        )}
      </CardBody>

      {OPS.map((op) => {
        const action = actions[op.id];
        return (
          <ApprovalDialog
            key={op.id}
            open={action.pending !== null}
            onOpenChange={(open) => {
              if (!open) action.cancel();
            }}
            title={`Confirmar ${op.label.toLowerCase()}`}
            capabilityId={op.id}
            loading={action.mutation.isPending}
            onConfirm={action.confirm}
            confirmLabel={op.label}
          >
            {action.pending !== null ? (
              <p className="text-xs text-foreground">
                {op.description}{' '}
                Remote: <span className="font-mono">{action.pending.remote ?? '(padrão do repositório)'}</span>
                {op.withBranch ? (
                  <>
                    {' '}
                    — branch: <span className="font-mono">{action.pending.branch ?? '(atual)'}</span>
                  </>
                ) : null}
              </p>
            ) : null}
          </ApprovalDialog>
        );
      })}
    </Card>
  );
}
