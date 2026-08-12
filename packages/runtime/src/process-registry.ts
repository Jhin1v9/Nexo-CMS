/**
 * ProcessRegistry mínimo para process.list (SPEC.md §4):
 * apenas processos iniciados pelo CommandExecutor, com pid/status/startedAt.
 * Nunca fabrica estado: registra apenas o que o spawn real reportou.
 */

export type ProcessStatus = 'RUNNING' | 'EXITED' | 'TIMED_OUT' | 'FAILED';

export interface ProcessInfo {
  pid: number;
  command: string;
  args: string[];
  status: ProcessStatus;
  /** ISO 8601. */
  startedAt: string;
  /** ISO 8601; presente quando o processo terminou. */
  endedAt?: string;
  exitCode?: number | null;
  timedOut?: boolean;
}

export interface ProcessRegistry {
  list(): ProcessInfo[];
  /** Registra spawn real; retorna id interno para update posterior. */
  registerStart(info: Omit<ProcessInfo, 'status'>): void;
  registerEnd(pid: number, startedAt: string, end: { status: ProcessStatus; endedAt: string; exitCode: number | null; timedOut?: boolean }): void;
}

class InMemoryProcessRegistry implements ProcessRegistry {
  private readonly processes: ProcessInfo[] = [];

  registerStart(info: Omit<ProcessInfo, 'status'>): void {
    this.processes.push({ ...info, status: 'RUNNING' });
  }

  registerEnd(
    pid: number,
    startedAt: string,
    end: { status: ProcessStatus; endedAt: string; exitCode: number | null; timedOut?: boolean },
  ): void {
    const p = this.processes.find((x) => x.pid === pid && x.startedAt === startedAt);
    if (!p) return;
    p.status = end.status;
    p.endedAt = end.endedAt;
    p.exitCode = end.exitCode;
    if (end.timedOut !== undefined) p.timedOut = end.timedOut;
  }

  list(): ProcessInfo[] {
    return this.processes.map((p) => ({ ...p }));
  }
}

export function createProcessRegistry(): ProcessRegistry {
  return new InMemoryProcessRegistry();
}
