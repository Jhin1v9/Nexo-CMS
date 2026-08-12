/**
 * Contract tests do Control Plane (SPEC.md §8):
 * registry/discover/invoke/deny/approval/job lifecycle/erros agent-friendly.
 * Usa storage REAL (sqlite em tmpdir) para JobRepository/AuditRepository e
 * PolicyEngine REAL de @nexo/security — sem mocks das fronteiras M1.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ExecutionContext } from '@nexo/core';
import { createPolicyEngine } from '@nexo/security';
import { ok, err, nexoError } from '@nexo/shared';
import { createStorage, type Storage } from '@nexo/storage';

import {
  asSecurityAuditSink,
  createCapabilityRegistry,
  createControlPlane,
  toStorageAuditEvent,
  type ControlPlane,
  type RegisteredCapability,
} from '../src/index.js';

const ACTOR = { kind: 'CLI' as const, id: 'cli:test' };

function ctx(operationId = 'op-test'): ExecutionContext {
  return { operationId, initiatedBy: ACTOR, executedBy: ACTOR };
}

function makeCapability(overrides: Partial<RegisteredCapability['contract']> = {}): RegisteredCapability {
  return {
    contract: {
      id: 'test.ping',
      version: 1,
      domain: 'test',
      description: 'ping de teste',
      inputSchema: z.object({ msg: z.string().min(1) }),
      resultSchema: z.object({ echo: z.string() }),
      requiredPermission: 'test.ping',
      risk: 'SAFE',
      sideEffects: false,
      async: 'sync',
      timeoutMs: 5_000,
      ...overrides,
    },
    handler: async (input) => ok({ echo: (input as { msg: string }).msg }),
  };
}

describe('control-plane contract', () => {
  let dir: string;
  let storage: Storage;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'nexo-cp-'));
    const s = createStorage(dir);
    if (!s.ok) throw new Error('storage indisponível no teste');
    storage = s.value;
  });

  afterEach(() => {
    storage.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function makeControlPlane(opts: { grants?: string[]; risks?: Record<string, 'SAFE' | 'MODIFYING' | 'DESTRUCTIVE' | 'CRITICAL'> } = {}) {
    const security = createPolicyEngine({
      grants: { [ACTOR.id]: opts.grants ?? ['test.ping', 'test.job', 'test.slow'] },
      risks: opts.risks,
    });
    const auditSink = asSecurityAuditSink(storage.repos.audit);
    const cp = createControlPlane({ security, audit: auditSink, jobs: storage.repos.jobs });
    return cp;
  }

  it('registry: register/get/list e rejeita duplicado', () => {
    const registry = createCapabilityRegistry();
    const cap = makeCapability();
    registry.register(cap);
    expect(registry.get('test.ping')?.contract.id).toBe('test.ping');
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0]).toMatchObject({ id: 'test.ping', domain: 'test', risk: 'SAFE' });
    expect(() => registry.register(cap)).toThrow(/duplicada/);
  });

  it('discover: filtra por authorize() — ALLOW com grant, DENY sem grant', () => {
    const cp = makeControlPlane();
    cp.register(makeCapability());
    cp.register(makeCapability({ id: 'test.secret', requiredPermission: 'test.secret' }));

    const all = cp.discover(ctx());
    const byId = new Map(all.map((d) => [d.id, d.allowed]));
    expect(byId.get('test.ping')).toBe('ALLOW');
    expect(byId.get('test.secret')).toBe('DENY'); // DEFAULT DENY
  });

  it('invoke: sucesso retorna output do handler e audita ALLOW/SUCCESS', async () => {
    const cp = makeControlPlane();
    cp.register(makeCapability());
    const res = await cp.invoke('test.ping', { msg: 'ola' }, ctx('op-1'));
    expect(res).toEqual({ ok: true, value: { echo: 'ola' } });

    const events = storage.repos.audit.list({ what: 'test.ping' });
    expect(events.some((e) => e.decision === 'ALLOW' && e.result === 'SUCCESS')).toBe(true);
    expect(events[0]?.context.operationId).toBe('op-1');
  });

  it('invoke: input inválido -> INVALID_INPUT com issues zod, handler NÃO executa', async () => {
    const cp = makeControlPlane();
    let called = false;
    const cap = makeCapability();
    cap.handler = async (i) => {
      called = true;
      return ok(i);
    };
    cp.register(cap);

    const res = await cp.invoke('test.ping', { msg: 42 }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('INVALID_INPUT');
      expect(res.error.retryable).toBe(false);
      expect(Array.isArray(res.error.details?.['issues'])).toBe(true);
    }
    expect(called).toBe(false);
  });

  it('invoke: capability desconhecida -> NOT_FOUND estruturado', async () => {
    const cp = makeControlPlane();
    const res = await cp.invoke('test.inexistente', {}, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('NOT_FOUND');
  });

  it('invoke: DENY (sem grant) -> FORBIDDEN estruturado, handler NÃO executa, audit registra deny', async () => {
    const cp = makeControlPlane({ grants: [] }); // DEFAULT DENY
    let called = false;
    const cap = makeCapability();
    cap.handler = async (i) => {
      called = true;
      return ok(i);
    };
    cp.register(cap);

    const res = await cp.invoke('test.ping', { msg: 'x' }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('FORBIDDEN');
      expect(res.error.requiredCapability).toBe('test.ping');
    }
    expect(called).toBe(false);
    const denies = storage.repos.audit.list({ what: 'test.ping' });
    expect(denies.some((e) => e.decision === 'DENY' && e.result === 'FAILED')).toBe(true);
  });

  it('invoke: REQUIRE_APPROVAL (risk DESTRUCTIVE) -> erro estruturado sem executar handler', async () => {
    const cp = makeControlPlane({ risks: { 'test.ping': 'DESTRUCTIVE' } });
    let called = false;
    const cap = makeCapability({ risk: 'DESTRUCTIVE' });
    cap.handler = async (i) => {
      called = true;
      return ok(i);
    };
    cp.register(cap);

    const res = await cp.invoke('test.ping', { msg: 'x' }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('REQUIRE_APPROVAL');
      expect(res.error.requiresApproval).toBe(true);
      expect(res.error.requiredCapability).toBe('test.ping');
    }
    expect(called).toBe(false);
  });

  it('invoke: erro do handler propaga como Result err + audit FAILED', async () => {
    const cp = makeControlPlane();
    const cap = makeCapability();
    cap.handler = async () => err(nexoError('CONFLICT', 'conflito de teste', { resource: 'x' }));
    cp.register(cap);

    const res = await cp.invoke('test.ping', { msg: 'x' }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('CONFLICT');
    const events = storage.repos.audit.list({ what: 'test.ping' });
    expect(events.some((e) => e.result === 'FAILED' && e.decision === 'ALLOW')).toBe(true);
  });

  it('invoke: exceção inesperada do handler vira INTERNAL estruturado (nunca throw na fronteira)', async () => {
    const cp = makeControlPlane();
    const cap = makeCapability();
    cap.handler = async () => {
      throw new Error('boom');
    };
    cp.register(cap);
    const res = await cp.invoke('test.ping', { msg: 'x' }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('INTERNAL');
  });

  it('invoke: timeout do contrato -> INTERNAL retryable', async () => {
    const cp = makeControlPlane();
    const cap = makeCapability({ timeoutMs: 50 });
    cap.handler = async () => new Promise(() => {}); // nunca resolve
    cp.register(cap);
    const res = await cp.invoke('test.ping', { msg: 'x' }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('INTERNAL');
      expect(res.error.retryable).toBe(true);
    }
  });

  it('job lifecycle: QUEUED -> RUNNING -> COMPLETED com resultado real', async () => {
    const cp = makeControlPlane();
    cp.register(
      makeCapability({
        id: 'test.job',
        requiredPermission: 'test.job',
        async: 'job',
      }),
    );

    const started = await cp.invokeAsync('test.job', { msg: 'async' }, ctx());
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const { jobId } = started.value;

    // Job existe imediatamente em QUEUED (ou já avançou — transições reais).
    const first = cp.getJob(jobId);
    expect(first.ok).toBe(true);

    // Aguarda transição real (polling no repositório, sem progresso fabricado).
    let job = first.ok ? first.value : undefined;
    for (let i = 0; i < 100 && job?.status !== 'COMPLETED'; i++) {
      await new Promise((r) => setTimeout(r, 10));
      const j = cp.getJob(jobId);
      if (j.ok) job = j.value;
    }
    expect(job?.status).toBe('COMPLETED');
    expect(job?.result).toEqual({ echo: 'async' });
    expect(job?.error).toBeNull();
  });

  it('job lifecycle: handler falha -> FAILED com erro estruturado persistido', async () => {
    const cp = makeControlPlane();
    const cap = makeCapability({ id: 'test.job', requiredPermission: 'test.job', async: 'job' });
    cap.handler = async () => err(nexoError('INTERNAL', 'falhou de verdade'));
    cp.register(cap);

    const started = await cp.invokeAsync('test.job', { msg: 'x' }, ctx());
    if (!started.ok) throw new Error('invokeAsync deveria aceitar');
    let job;
    for (let i = 0; i < 100; i++) {
      const j = cp.getJob(started.value.jobId);
      if (j.ok && (j.value.status === 'FAILED' || j.value.status === 'COMPLETED')) {
        job = j.value;
        break;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(job?.status).toBe('FAILED');
    expect(job?.error?.code).toBe('INTERNAL');
  });

  it('invokeAsync: deny NÃO cria job', async () => {
    const cp = makeControlPlane({ grants: [] });
    cp.register(makeCapability({ id: 'test.job', requiredPermission: 'test.job', async: 'job' }));
    const res = await cp.invokeAsync('test.job', { msg: 'x' }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('FORBIDDEN');
    expect(storage.repos.jobs.list()).toHaveLength(0);
  });

  it('invoke em capability async:job -> UNSUPPORTED; invokeAsync em sync -> UNSUPPORTED', async () => {
    const cp = makeControlPlane();
    cp.register(makeCapability({ id: 'test.job', requiredPermission: 'test.job', async: 'job' }));
    cp.register(makeCapability({ id: 'test.ping', requiredPermission: 'test.ping', async: 'sync' }));

    const syncCall = await cp.invoke('test.job', { msg: 'x' }, ctx());
    expect(syncCall.ok).toBe(false);
    if (!syncCall.ok) expect(syncCall.error.code).toBe('UNSUPPORTED');

    const asyncCall = await cp.invokeAsync('test.ping', { msg: 'x' }, ctx());
    expect(asyncCall.ok).toBe(false);
    if (!asyncCall.ok) expect(asyncCall.error.code).toBe('UNSUPPORTED');
  });

  it('getJob: inexistente -> NOT_FOUND', () => {
    const cp = makeControlPlane();
    const res = cp.getJob('nope');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('NOT_FOUND');
  });

  it('convergência de tipos: toStorageAuditEvent adapta security -> storage sem cast', () => {
    // Prova da tarefa de integração #1: os shapes são estruturalmente compatíveis.
    const event = {
      id: 'e1',
      who: ACTOR,
      what: 'test.ping',
      resource: 'p1',
      context: ctx(),
      decision: 'ALLOW' as const,
      result: 'SUCCESS' as const,
      at: new Date().toISOString(),
      details: { k: 'v' },
    };
    const adapted = toStorageAuditEvent(event);
    expect(adapted).toEqual(event);
  });
});

describe('control-plane: timeout de job', () => {
  it('job lento -> FAILED com timeout (sem vazar promise)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nexo-cp-'));
    const s = createStorage(dir);
    if (!s.ok) throw new Error('storage');
    try {
      const cp: ControlPlane = createControlPlane({
        security: createPolicyEngine({ grants: { [ACTOR.id]: ['test.slow'] } }),
        audit: asSecurityAuditSink(s.value.repos.audit),
        jobs: s.value.repos.jobs,
      });
      const cap = makeCapability({ id: 'test.slow', requiredPermission: 'test.slow', async: 'job', timeoutMs: 50 });
      cap.handler = async () => new Promise(() => {});
      cp.register(cap);
      const started = await cp.invokeAsync('test.slow', { msg: 'x' }, ctx());
      if (!started.ok) throw new Error('aceito');
      let job;
      for (let i = 0; i < 100; i++) {
        const j = cp.getJob(started.value.jobId);
        if (j.ok && j.value.status === 'FAILED') {
          job = j.value;
          break;
        }
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(job?.status).toBe('FAILED');
      expect(job?.error?.code).toBe('INTERNAL');
    } finally {
      s.value.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
