/** Testes dos stores zustand (estado local de UI — puros, sem React). */

import { beforeEach, describe, expect, it } from 'vitest';

import { useJobsStore } from './jobs';
import { useUiStore } from './ui';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarCollapsed: false, mobileNavOpen: false });
  });

  it('toggleSidebar alterna o colapso', () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().setSidebarCollapsed(false);
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('mobileNavOpen controla overlay mobile', () => {
    useUiStore.getState().setMobileNavOpen(true);
    expect(useUiStore.getState().mobileNavOpen).toBe(true);
  });
});

describe('useJobsStore', () => {
  beforeEach(() => {
    useJobsStore.setState({ tracked: [] });
  });

  it('track adiciona com startedAt e deduplica por jobId', () => {
    useJobsStore.getState().track({ jobId: 'j1', capabilityId: 'responsive.diagnose', label: 'Diagnóstico' });
    useJobsStore.getState().track({ jobId: 'j1', capabilityId: 'responsive.diagnose', label: 'Diagnóstico' });
    const tracked = useJobsStore.getState().tracked;
    expect(tracked).toHaveLength(1);
    expect(tracked[0]?.startedAt.length).toBeGreaterThan(0);
  });

  it('dismiss remove; clearFinished remove só ids terminais informados', () => {
    const { track } = useJobsStore.getState();
    track({ jobId: 'j1', capabilityId: 'a', label: 'a' });
    track({ jobId: 'j2', capabilityId: 'b', label: 'b' });
    useJobsStore.getState().clearFinished(['j1']);
    expect(useJobsStore.getState().tracked.map((t) => t.jobId)).toEqual(['j2']);
    useJobsStore.getState().dismiss('j2');
    expect(useJobsStore.getState().tracked).toHaveLength(0);
  });
});
