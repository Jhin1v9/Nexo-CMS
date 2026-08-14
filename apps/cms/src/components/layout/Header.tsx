/**
 * Header — contexto explícito (doc 07 §7/§9): projeto ativo + estado,
 * saúde do Control Plane (real, /v1/health), jobs assíncronos, breadcrumbs.
 */

import { useParams } from '@tanstack/react-router';
import { Menu, Wifi, WifiOff } from 'lucide-react';

import { useHealth, useProject } from '../../api/hooks';
import { cx, focusRing } from '../../lib/cx';
import { useUiStore } from '../../stores/ui';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { Breadcrumbs } from './Breadcrumbs';
import { JobsIndicator } from './JobsIndicator';

function HealthIndicator() {
  const health = useHealth();
  const online = health.isSuccess && health.data.status === 'ok';
  const label = online
    ? `Control Plane conectado (v${health.data.version})`
    : 'Control Plane indisponível — o runtime está no ar?';
  return (
    <Tooltip content={label}>
      <span
        role="status"
        aria-label={label}
        className={cx(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border',
          online ? 'text-success' : 'text-danger',
        )}
      >
        {online ? <Wifi aria-hidden="true" size={16} /> : <WifiOff aria-hidden="true" size={16} />}
      </span>
    </Tooltip>
  );
}

function ProjectContext({ projectId }: { projectId: string }) {
  const query = useProject(projectId);
  const project = query.data?.project;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {project?.name ?? projectId}
        </p>
        {project !== undefined ? (
          <p className="truncate font-mono text-[11px] text-muted-foreground" title={project.rootPath}>
            {project.rootPath}
          </p>
        ) : null}
      </div>
      {project !== undefined ? <Badge tone={project.status === 'ACTIVE' ? 'success' : 'neutral'}>{project.status}</Badge> : null}
    </div>
  );
}

export function Header() {
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen);
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId;
  const projectQuery = useProject(projectId ?? '');
  const projectName = projectId !== undefined ? projectQuery.data?.project.name : undefined;

  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b border-border bg-background px-3 py-2">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir navegação"
        className={cx(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground md:hidden',
          focusRing,
        )}
      >
        <Menu aria-hidden="true" size={16} />
      </button>
      {projectId !== undefined ? <ProjectContext projectId={projectId} /> : null}
      <div className="min-w-0 flex-1" />
      <Breadcrumbs projectName={projectName} />
      <JobsIndicator />
      <HealthIndicator />
    </header>
  );
}
