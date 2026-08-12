/**
 * Hono HTTP Agent API (SPEC.md §9): expõe o Control Plane em 127.0.0.1.
 *
 * Rotas:
 *  - GET  /v1/health                    -> { status: 'ok', version }
 *  - GET  /v1/capabilities              -> discovery filtrado por authorize()
 *  - POST /v1/capabilities/:id/invoke   -> body = input JSON -> Result JSON (sync)
 *                                          ou { jobId } (async:'job', HTTP 202)
 *  - GET  /v1/jobs/:id                  -> Job
 *
 * Actor M1: header `x-nexo-actor` — mecanismo M1 documentado; auth formal é
 * milestone futuro (OPEN QUESTION #2 — NÃO inventar OAuth). Enforcement real
 * fica no Control Plane (authorize por invoke); localhost NÃO é confiança
 * (DEFAULT DENY para outros actor ids).
 *
 * Wave 5 (FIX 2 — MEDIUM): header ausente/vazio NÃO assume `cli:local`
 * (fail-open fechado). Sem header -> ator `anonymous:unknown` (kind SYSTEM,
 * zero grants -> DEFAULT DENY / FORBIDDEN). Clientes legítimos (apps/cli)
 * enviam o header explicitamente.
 *
 * Erros: NexoError JSON com HTTP status mapeado (SPEC §9).
 */

import type { ExecutionContext } from '@nexo/core';
import type { ControlPlane } from '@nexo/control-plane';
import type { ErrorCode, NexoError, Result } from '@nexo/shared';
import { newOperationId, nexoError } from '@nexo/shared';
import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { ANONYMOUS_ACTOR } from './policy.js';

export const AGENT_API_VERSION = '0.0.0-m1';

/** Mapeamento ErrorCode -> HTTP status (SPEC §9). */
const ERROR_HTTP_STATUS: Record<ErrorCode, ContentfulStatusCode> = {
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  SCOPE_VIOLATION: 403,
  COMMAND_BLOCKED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  STALE_CONTEXT: 409,
  REQUIRE_APPROVAL: 422,
  UNSUPPORTED: 501,
  UNKNOWN: 500,
  INTERNAL: 500,
  STORAGE_UNAVAILABLE: 503,
};

function errorStatus(code: ErrorCode): ContentfulStatusCode {
  return ERROR_HTTP_STATUS[code] ?? 500;
}

/** Extrai projectId do input (best-effort) para o scope de autorização/audit. */
function extractProjectId(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null) {
    const pid = (body as Record<string, unknown>)['projectId'];
    if (typeof pid === 'string' && pid.length > 0) return pid;
  }
  return undefined;
}

export interface RuntimeAppDeps {
  controlPlane: ControlPlane;
}

export function createAgentApi(deps: RuntimeAppDeps): Hono {
  const { controlPlane } = deps;
  const app = new Hono();

  /**
   * ExecutionContext por request: actor via header x-nexo-actor. Wave 5
   * (FIX 2): ausente/vazio -> anonymous:unknown (SYSTEM, DEFAULT DENY) —
   * nunca assume o ator privilegiado (fail-closed).
   */
  function executionContext(headerActor: string | undefined, body?: unknown): ExecutionContext {
    const actor =
      headerActor !== undefined && headerActor.trim().length > 0
        ? { kind: 'CLI' as const, id: headerActor.trim() }
        : { ...ANONYMOUS_ACTOR };
    const projectId = extractProjectId(body);
    return {
      operationId: newOperationId(),
      initiatedBy: actor,
      executedBy: actor,
      ...(projectId !== undefined ? { projectId } : {}),
    };
  }

  function resultResponse(c: Context, result: Result<unknown>, okStatus: ContentfulStatusCode = 200) {
    if (result.ok) return c.json({ ok: true, value: result.value }, okStatus);
    return c.json({ ok: false, error: result.error }, errorStatus(result.error.code));
  }

  app.get('/v1/health', (c) => c.json({ status: 'ok', version: AGENT_API_VERSION }));

  app.get('/v1/capabilities', (c) => {
    const ctx = executionContext(c.req.header('x-nexo-actor'));
    return c.json({ ok: true, value: { capabilities: controlPlane.discover(ctx) } });
  });

  app.post('/v1/capabilities/:id/invoke', async (c) => {
    const id = c.req.param('id');
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      const error: NexoError = nexoError('INVALID_INPUT', 'Request body must be valid JSON (capability input)', {
        resource: id,
      });
      return c.json({ ok: false, error }, 400);
    }
    const ctx = executionContext(c.req.header('x-nexo-actor'), body);

    // Contrato async:'job' -> invokeAsync -> { jobId } (HTTP 202); sync -> invoke.
    const descriptor = controlPlane.discover(ctx).find((d) => d.id === id);
    if (descriptor?.async === 'job') {
      const result = await controlPlane.invokeAsync(id, body, ctx);
      return resultResponse(c, result, 202);
    }
    const result = await controlPlane.invoke(id, body, ctx);
    return resultResponse(c, result);
  });

  app.get('/v1/jobs/:id', (c) => {
    const result = controlPlane.getJob(c.req.param('id'));
    return resultResponse(c, result);
  });

  return app;
}
