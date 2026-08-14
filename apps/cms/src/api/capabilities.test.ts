/** Testes dos helpers puros de discovery (sem React). */

import { describe, expect, it } from 'vitest';

import {
  availabilityOf,
  groupByDomain,
  hasDomainCapabilities,
  isActionable,
  isJobTerminal,
  jobPollIntervalMs,
  unavailabilityReason,
} from './capabilities';
import type { DiscoveredCapability } from './client';

function cap(id: string, allowed: DiscoveredCapability['allowed'], risk: DiscoveredCapability['risk'] = 'SAFE'): DiscoveredCapability {
  const [domain = ''] = id.split('.');
  return {
    id,
    version: 1,
    domain,
    description: `desc ${id}`,
    requiredPermission: id,
    risk,
    sideEffects: risk !== 'SAFE',
    async: 'sync',
    timeoutMs: 10_000,
    allowed,
  };
}

describe('availabilityOf', () => {
  const caps = [
    cap('git.status', 'ALLOW'),
    cap('git.push', 'REQUIRE_APPROVAL', 'DESTRUCTIVE'),
    cap('runtime.command.execute', 'DENY', 'MODIFYING'),
  ];

  it('ALLOW -> available/actionable', () => {
    const a = availabilityOf(caps, 'git.status');
    expect(a.kind).toBe('available');
    expect(isActionable(a)).toBe(true);
  });

  it('REQUIRE_APPROVAL -> requires-approval/actionable (com diálogo)', () => {
    const a = availabilityOf(caps, 'git.push');
    expect(a.kind).toBe('requires-approval');
    expect(isActionable(a)).toBe(true);
  });

  it('DENY -> denied/não-actionable com motivo', () => {
    const a = availabilityOf(caps, 'runtime.command.execute');
    expect(a.kind).toBe('denied');
    expect(isActionable(a)).toBe(false);
    expect(unavailabilityReason(a)).toContain('Sem permissão');
  });

  it('ausente -> missing/não-actionable com motivo de backend pendente', () => {
    const a = availabilityOf(caps, 'editor.source.open');
    expect(a.kind).toBe('missing');
    expect(isActionable(a)).toBe(false);
    expect(unavailabilityReason(a)).toContain('ausente no discovery');
  });
});

describe('groupByDomain / hasDomainCapabilities', () => {
  it('agrupa por domínio preservando ordem de primeiro aparecimento', () => {
    const groups = groupByDomain([cap('git.status', 'ALLOW'), cap('project.list', 'ALLOW'), cap('git.push', 'ALLOW')]);
    expect(groups.map((g) => g.domain)).toEqual(['git', 'project']);
    expect(groups[0]?.capabilities.map((c) => c.id)).toEqual(['git.status', 'git.push']);
  });

  it('hasDomainCapabilities por prefixo', () => {
    const caps = [cap('git.status', 'ALLOW')];
    expect(hasDomainCapabilities(caps, 'git.')).toBe(true);
    expect(hasDomainCapabilities(caps, 'editor.')).toBe(false);
  });
});

describe('job polling (estado real, SPEC §8)', () => {
  it('QUEUED/RUNNING -> intervalo; terminais -> null', () => {
    expect(jobPollIntervalMs('QUEUED')).toBe(1_000);
    expect(jobPollIntervalMs('RUNNING')).toBe(1_000);
    expect(jobPollIntervalMs('COMPLETED')).toBeNull();
    expect(jobPollIntervalMs('FAILED')).toBeNull();
    expect(jobPollIntervalMs(undefined)).toBeNull();
  });

  it('isJobTerminal', () => {
    expect(isJobTerminal('COMPLETED')).toBe(true);
    expect(isJobTerminal('FAILED')).toBe(true);
    expect(isJobTerminal('RUNNING')).toBe(false);
  });
});
