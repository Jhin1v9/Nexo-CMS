/**
 * StatusPanel — estado real do repositório via git.status (doc 10 §4/§8):
 * branch/HEAD/tracking, staged/unstaged/untracked/conflitos. Nunca fingido.
 */

import { FileDiff, RefreshCw } from 'lucide-react';

import type { GitFileChange, GitStatusOutput } from '../../api/client';
import { useGitStatus } from '../../api/hooks';
import { shortHash } from '../../lib/cx';
import { Badge, type BadgeTone, Button, EmptyState, ErrorState, Spinner } from '../../components/ui';

const KIND_TONE: Record<string, BadgeTone> = {
  ADDED: 'success',
  MODIFIED: 'warning',
  DELETED: 'danger',
  RENAMED: 'primary',
  CONFLICT: 'danger',
};

export function ChangeKindBadge({ kind }: { kind: string }) {
  return <Badge tone={KIND_TONE[kind] ?? 'neutral'}>{kind}</Badge>;
}

export function ChangeList({
  title,
  changes,
}: {
  title: string;
  changes: GitFileChange[];
}) {
  if (changes.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{title}</h3>
      <ul className="divide-y divide-border rounded-md border border-border">
        {changes.map((change) => (
          <li key={`${change.kind}-${change.path}`} className="flex items-center gap-2 px-3 py-1.5">
            <ChangeKindBadge kind={change.kind} />
            <span className="truncate font-mono text-xs text-foreground" title={change.path}>
              {change.origPath !== undefined ? `${change.origPath} -> ${change.path}` : change.path}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function gitStatusIsClean(status: GitStatusOutput): boolean {
  return (
    (status.staged?.length ?? 0) === 0 &&
    (status.unstaged?.length ?? 0) === 0 &&
    (status.untracked?.length ?? 0) === 0 &&
    (status.conflicts?.length ?? 0) === 0
  );
}

export function StatusPanel({ projectId }: { projectId: string }) {
  const status = useGitStatus(projectId);

  if (status.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner label="Consultando git.status" /> Consultando estado do repositório…
      </div>
    );
  }
  if (status.isError) {
    return (
      <ErrorState
        error={status.error}
        operation="git.status"
        action={
          <Button size="sm" onClick={() => void status.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }
  const data = status.data;
  if (data === undefined) return null;
  if (!data.isRepo) {
    return (
      <EmptyState
        icon={FileDiff}
        title="Não é um repositório git"
        description="O diretório do projeto não possui repositório git (NO_REPOSITORY). Inicialize o git fora do Nexo e atualize."
      />
    );
  }

  const clean = gitStatusIsClean(data);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
        <span className="font-medium">branch: {data.branch ?? '(detached)'}</span>
        {data.detached === true ? <Badge tone="warning">DETACHED</Badge> : null}
        {data.head != null ? <span className="font-mono text-xs text-muted-foreground">HEAD {shortHash(data.head)}</span> : null}
        {data.tracking != null ? (
          <span className="text-xs text-muted-foreground">
            tracking {data.tracking} — ahead {data.ahead ?? 0} / behind {data.behind ?? 0}
          </span>
        ) : (
          <Badge tone="neutral">sem upstream</Badge>
        )}
        {data.remoteState !== undefined ? (
          <span className="text-xs text-muted-foreground">remoto: {data.remoteState}</span>
        ) : null}
        <Button
          size="sm"
          className="ml-auto"
          loading={status.isRefetching}
          onClick={() => void status.refetch()}
        >
          <RefreshCw aria-hidden="true" size={14} />
          Atualizar
        </Button>
      </div>
      {data.states.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {data.states.map((state) => (
            <Badge key={state} tone="neutral">
              {state}
            </Badge>
          ))}
        </div>
      ) : null}
      {clean ? (
        <EmptyState
          title="Working tree limpa"
          description="Nenhuma mudança staged, unstaged ou untracked no momento."
        />
      ) : (
        <>
          <ChangeList title="Staged" changes={data.staged ?? []} />
          <ChangeList title="Unstaged" changes={data.unstaged ?? []} />
          {(data.untracked?.length ?? 0) > 0 ? (
            <section aria-label="Untracked">
              <h3 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Untracked</h3>
              <ul className="divide-y divide-border rounded-md border border-border">
                {(data.untracked ?? []).map((path) => (
                  <li key={path} className="flex items-center gap-2 px-3 py-1.5">
                    <Badge tone="neutral">UNTRACKED</Badge>
                    <span className="truncate font-mono text-xs text-foreground">{path}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <ChangeList title="Conflitos" changes={data.conflicts ?? []} />
        </>
      )}
    </div>
  );
}
