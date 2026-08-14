/**
 * JobsIndicator — indicador de jobs assíncronos (07 §63: observar operações
 * longas sem congelar a UI). Estados REAIS via polling de GET /v1/jobs/:id;
 * Job não expõe progresso (SPEC §8) -> mostramos estado, NUNCA percentual
 * fabricado (07 §33/§81).
 */

import { Popover } from '@base-ui/react/popover';
import { ListTodo, X } from 'lucide-react';

import { isJobTerminal } from '../../api/capabilities';
import { useJob } from '../../api/hooks';
import { cx, focusRing } from '../../lib/cx';
import { useJobsStore, type TrackedJob } from '../../stores/jobs';
import { Badge, type BadgeTone } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';

const JOB_TONE: Record<string, { tone: BadgeTone; label: string }> = {
  QUEUED: { tone: 'neutral', label: 'Na fila' },
  RUNNING: { tone: 'primary', label: 'Em execução' },
  COMPLETED: { tone: 'success', label: 'Concluído' },
  FAILED: { tone: 'danger', label: 'Falhou' },
};

function JobRow({ tracked }: { tracked: TrackedJob }) {
  const dismiss = useJobsStore((s) => s.dismiss);
  const query = useJob(tracked.jobId);
  const status = query.data?.status;
  const meta = status !== undefined ? (JOB_TONE[status] ?? { tone: 'neutral' as BadgeTone, label: status }) : undefined;

  return (
    <li className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
      {status !== undefined && !isJobTerminal(status) ? (
        <Spinner label={`Job ${tracked.label} em andamento`} />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{tracked.label}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">{tracked.jobId}</p>
      </div>
      {meta !== undefined ? (
        <Badge tone={meta.tone}>{meta.label}</Badge>
      ) : (
        <Badge tone="neutral">consultando</Badge>
      )}
      <button
        type="button"
        onClick={() => dismiss(tracked.jobId)}
        aria-label={`Remover job ${tracked.label} da lista`}
        className={cx('rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground', focusRing)}
      >
        <X aria-hidden="true" size={12} />
      </button>
    </li>
  );
}

export function JobsIndicator() {
  const tracked = useJobsStore((s) => s.tracked);
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Jobs assíncronos"
        className={cx(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground',
          focusRing,
        )}
      >
        <ListTodo aria-hidden="true" size={16} />
        {tracked.length > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
          >
            {tracked.length}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end" className="z-50">
          <Popover.Popup className="w-96 rounded-lg border border-border bg-background p-2 shadow-lg">
            <Popover.Title className="px-2 pt-1 pb-2 text-xs font-semibold text-muted-foreground">
              Jobs assíncronos desta sessão
            </Popover.Title>
            {tracked.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum job assíncrono nesta sessão.</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {tracked.map((job) => (
                  <JobRow key={job.jobId} tracked={job} />
                ))}
              </ul>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
