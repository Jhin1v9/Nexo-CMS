/**
 * Project Overview (/projects/$projectId) — ponto central de orientação
 * (doc 07 §21): stack detectada, suporte/confidence (§47/§48), branch e
 * estado git resumido, analyzedAt. STALE_CONTEXT oferece re-scan real
 * (project.refresh) em vez de fingir estado atualizado.
 */

import { GitBranch, RefreshCw, ScanSearch } from 'lucide-react';

import { useGitStatus, useProjectOpen, useRefreshProject } from '../../api/hooks';
import { formatDateTime } from '../../lib/cx';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetectionConfidenceBadge,
  EmptyState,
  ErrorState,
  Spinner,
  SupportBadge,
} from '../../components/ui';
import { useActiveProject } from './ProjectLayout';

function GitSummary({ projectId }: { projectId: string }) {
  const status = useGitStatus(projectId);
  if (status.isLoading) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner label="Consultando git.status" /> Consultando Git…
      </span>
    );
  }
  if (status.isError) {
    return <ErrorState error={status.error} operation="git.status" />;
  }
  const data = status.data;
  if (data === undefined || !data.isRepo) {
    return <p className="text-xs text-muted-foreground">Não é um repositório git.</p>;
  }
  const dirty =
    (data.staged?.length ?? 0) + (data.unstaged?.length ?? 0) + (data.untracked?.length ?? 0);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <GitBranch aria-hidden="true" size={12} />
        {data.branch ?? '(detached)'}
      </span>
      {data.tracking != null ? (
        <span>
          tracking {data.tracking} — ahead {data.ahead ?? 0} / behind {data.behind ?? 0}
        </span>
      ) : null}
      <Badge tone={dirty === 0 ? 'success' : 'warning'}>
        {dirty === 0 ? 'working tree limpa' : `${String(dirty)} arquivo(s) com mudanças`}
      </Badge>
      {(data.conflicts?.length ?? 0) > 0 ? <Badge tone="danger">conflitos pendentes</Badge> : null}
    </div>
  );
}

export function ProjectOverviewPage() {
  const project = useActiveProject();
  const open = useProjectOpen(project.id);
  const refresh = useRefreshProject(project.id);

  if (open.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner label="Analisando projeto" /> Carregando análise do projeto…
      </div>
    );
  }
  if (open.isError) {
    const isStale = (open.error as { code?: string }).code === 'STALE_CONTEXT';
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          error={open.error}
          operation="project.open"
          action={
            isStale ? (
              <Button size="sm" variant="primary" loading={refresh.isPending} onClick={() => refresh.mutate()}>
                <RefreshCw aria-hidden="true" size={14} />
                Re-scan agora (project.refresh)
              </Button>
            ) : (
              <Button size="sm" onClick={() => void open.refetch()}>
                Tentar novamente
              </Button>
            )
          }
        />
      </div>
    );
  }

  const model = open.data?.model;
  const technologies = model?.technologies ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <ScanSearch aria-hidden="true" size={16} className="text-primary" />
              Análise do projeto
            </span>
          }
          description={`Analisado em ${formatDateTime(open.data?.analyzedAt)} — fonte: project.open (snapshot real do ProjectModel).`}
          actions={
            <>
              <SupportBadge support={model?.support} />
              <DetectionConfidenceBadge confidence={model?.confidence} />
            </>
          }
        />
        <CardBody>
          {technologies.length === 0 ? (
            <EmptyState
              title="Nenhuma tecnologia detectada"
              description="O scan não identificou tecnologias com evidência suficiente. Incerto é reportado como UNKNOWN — nunca inventado."
            />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <li key={`${tech.technology}-${tech.adapterId}`}>
                  <Badge tone={tech.support === 'FULLY_SUPPORTED' ? 'success' : 'warning'} title={tech.evidence.join('\n')}>
                    {tech.technology}
                    {tech.version !== null ? ` ${tech.version}` : ''} — {tech.confidence}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Git" description="Estado real do repositório (git.status)." />
        <CardBody>
          <GitSummary projectId={project.id} />
        </CardBody>
      </Card>
    </div>
  );
}
