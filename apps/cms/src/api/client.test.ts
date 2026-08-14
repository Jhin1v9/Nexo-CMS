/**
 * Testes de unidade do client HTTP (fetch mockado via vi.stubGlobal — sem
 * jsdom, ambiente node). Cobrem: envelope ok/erro, mapeamento de erro tipado
 * (REQUIRE_APPROVAL -> requiresApproval), falha de transporte, nextAction.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ControlPlaneError,
  createControlPlaneClient,
  DEFAULT_ACTOR_ID,
  nextActionOf,
  toControlPlaneError,
  withApproval,
} from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('controlPlane client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('discoverCapabilities: envelope ok -> value.capabilities', async () => {
    const capabilities = [
      {
        id: 'git.status',
        version: 1,
        domain: 'git',
        description: 'estado real',
        requiredPermission: 'git.status',
        risk: 'SAFE',
        sideEffects: false,
        async: 'sync',
        timeoutMs: 30_000,
        allowed: 'ALLOW',
      },
    ];
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true, value: { capabilities } }));
    const client = createControlPlaneClient();
    const result = await client.discoverCapabilities();
    expect(result.capabilities).toHaveLength(1);
    expect(result.capabilities[0]?.id).toBe('git.status');

    // header de ator explícito (fail-closed no runtime sem header)
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-nexo-actor']).toBe(DEFAULT_ACTOR_ID);
  });

  it('invoke: envelope de erro vira ControlPlaneError com code e requiresApproval', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          ok: false,
          error: {
            code: 'REQUIRE_APPROVAL',
            message: "Permission 'git.push' requires explicit approval",
            retryable: false,
            requiresApproval: true,
            requiredCapability: 'git.push',
            details: { nextAction: 'aprovacao explicita no Control Plane' },
          },
        },
        422,
      ),
    );
    const client = createControlPlaneClient();
    const caught = await client.invoke('git.push', { projectId: 'p1' }).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ControlPlaneError);
    const err = caught as ControlPlaneError;
    expect(err.code).toBe('REQUIRE_APPROVAL');
    expect(err.requiresApproval).toBe(true);
    expect(err.nextAction).toBe('aprovacao explicita no Control Plane');
  });

  it('invoke: falha de transporte -> INTERNAL retryable (runtime fora do ar)', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    const client = createControlPlaneClient();
    const caught = await client.invoke('project.list', {}).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ControlPlaneError);
    expect((caught as ControlPlaneError).code).toBe('INTERNAL');
    expect((caught as ControlPlaneError).retryable).toBe(true);
  });

  it('invoke: resposta não-JSON -> INTERNAL', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('<html>oops</html>', { status: 502 }));
    const client = createControlPlaneClient();
    const caught = await client.invoke('project.list', {}).catch((e: unknown) => e);
    expect((caught as ControlPlaneError).code).toBe('INTERNAL');
  });

  it('invoke (async job): HTTP 202 com value { jobId } retorna o value', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true, value: { jobId: 'job-123' } }, 202));
    const client = createControlPlaneClient();
    const result = await client.invoke<{ jobId: string }>('responsive.diagnose', { projectId: 'p1' });
    expect(result.jobId).toBe('job-123');
  });

  it('getJob: retorna Job com status real', async () => {
    const job = {
      id: 'job-1',
      capabilityId: 'responsive.diagnose',
      status: 'RUNNING',
      input: {},
      result: null,
      error: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:01.000Z',
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true, value: job }));
    const client = createControlPlaneClient();
    const result = await client.getJob('job-1');
    expect(result.status).toBe('RUNNING');
    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toBe('/v1/jobs/job-1');
  });

  it('health: shape direto sem envelope', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ status: 'ok', version: '0.0.0-m1' }));
    const client = createControlPlaneClient();
    const result = await client.health();
    expect(result.status).toBe('ok');
  });
  it('invoke com approval (D17): envelope carrega approval como chave irmã do input', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true, value: { pushed: true } }));
    const client = createControlPlaneClient();
    const result = await client.invoke<{ pushed: boolean }>(
      'git.push',
      { projectId: 'p1' },
      { approval: { approver: 'cli:local', justification: 'release 1.0' } },
    );
    expect(result.pushed).toBe(true);
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body['projectId']).toBe('p1');
    expect(body['approval']).toEqual({ approver: 'cli:local', justification: 'release 1.0' });
  });
});

describe('withApproval (D17)', () => {
  it('sem approval devolve o input intacto', () => {
    const input = { projectId: 'p1', message: 'x' };
    expect(withApproval(input)).toBe(input);
  });

  it('mescla approval; justificativa vazia/branca é omitida', () => {
    expect(withApproval({ projectId: 'p1' }, { approver: 'cli:local' })).toEqual({
      projectId: 'p1',
      approval: { approver: 'cli:local' },
    });
    expect(withApproval({ projectId: 'p1' }, { approver: 'cli:local', justification: '   ' })).toEqual({
      projectId: 'p1',
      approval: { approver: 'cli:local' },
    });
    expect(withApproval({ a: 1 }, { approver: 'u', justification: 'why' })).toEqual({
      a: 1,
      approval: { approver: 'u', justification: 'why' },
    });
  });
});

describe('nextActionOf / toControlPlaneError', () => {
  it('extrai details.nextAction quando string', () => {
    expect(
      nextActionOf({ code: 'CONFLICT', message: 'x', retryable: true, details: { nextAction: 'reload' } }),
    ).toBe('reload');
    expect(nextActionOf({ code: 'CONFLICT', message: 'x', retryable: true })).toBeUndefined();
    expect(
      nextActionOf({ code: 'CONFLICT', message: 'x', retryable: true, details: { nextAction: 42 } }),
    ).toBeUndefined();
  });

  it('toControlPlaneError: passa ControlPlaneError adiante e envelopa desconhecidos', () => {
    const known = new ControlPlaneError({ code: 'NOT_FOUND', message: 'n', retryable: false });
    expect(toControlPlaneError(known)).toBe(known);
    const wrapped = toControlPlaneError(new Error('boom'));
    expect(wrapped.code).toBe('INTERNAL');
    expect(wrapped.message).toBe('boom');
  });
});
