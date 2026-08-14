/**
 * Registro LOCAL de jobs assíncronos disparados por esta sessão da UI
 * (async:'job' -> { jobId }). O ESTADO do job (QUEUED/RUNNING/...) é server
 * state consultado via useJob + GET /v1/jobs/:id — aqui só guardamos quais
 * jobIds acompanhar (07§13: estado visual não é estado do projeto).
 */

import { create } from 'zustand';

export interface TrackedJob {
  jobId: string;
  capabilityId: string;
  /** Rótulo humano da operação (ex.: 'git.push'). */
  label: string;
  startedAt: string;
}

interface JobsState {
  tracked: TrackedJob[];
  track: (job: Omit<TrackedJob, 'startedAt'>) => void;
  dismiss: (jobId: string) => void;
  clearFinished: (terminalJobIds: readonly string[]) => void;
}

export const useJobsStore = create<JobsState>()((set) => ({
  tracked: [],
  track: (job) =>
    set((s) => ({
      tracked: [
        { ...job, startedAt: new Date().toISOString() },
        ...s.tracked.filter((t) => t.jobId !== job.jobId),
      ],
    })),
  dismiss: (jobId) => set((s) => ({ tracked: s.tracked.filter((t) => t.jobId !== jobId) })),
  clearFinished: (terminalJobIds) =>
    set((s) => ({ tracked: s.tracked.filter((t) => !terminalJobIds.includes(t.jobId)) })),
}));
