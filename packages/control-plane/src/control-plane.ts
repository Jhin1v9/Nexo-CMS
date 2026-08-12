/**
 * ControlPlane (SPEC.md §8): fronteira única de invocação de capabilities.
 *
 * Fluxo de invoke (toda invocação, sync ou job):
 *   1. registry.get(id)            -> NOT_FOUND estruturado
 *   2. zod validate (inputSchema)  -> INVALID_INPUT com issues (agent-friendly)
 *   3. authorize via security      -> DENY/UNKNOWN => FORBIDDEN;
 *      REQUIRE_APPROVAL => REQUIRE_APPROVAL (requiresApproval: true).
 *      SEM executar o handler (SPEC §8: short-circuit).
 *   4. handler (sync, com timeout do contrato) OU Job (async:'job')
 *   5. AuditEvent em TUDO: allow E deny (Inv. 26: auditoria não mente)
 *   6. Result<O> | erro estruturado
 *
 * Jobs (SPEC §8): async:'job' -> JobRepository; estados
 * QUEUED -> RUNNING -> COMPLETED/FAILED. Progresso NUNCA fabricado:
 * Job não expõe campo de progresso; apenas transições reais de estado.
 */

import type { CapabilityId, ExecutionContext } from '@nexo/core';
import type { AuthorizationBoundary, AuditEvent, AuditSink, Decision } from '@nexo/security';
import { authorizationErrorFor } from '@nexo/security';
import type { NexoError, Result } from '@nexo/shared';
import { err, newOperationId, nexoError, ok } from '@nexo/shared';
import type { Job, JobRepository } from '@nexo/storage';

import type {
  CapabilityDescriptor,
  CapabilityRegistry,
  RegisteredCapability,
} from './registry.js';
import { createCapabilityRegistry } from './registry.js';

/** Descriptor de discovery enriquecido com a decisão de autorização (SPEC §8). */
export interface DiscoveredCapability extends CapabilityDescriptor {
  allowed: Decision;
}

export interface ControlPlane {
  register(c: RegisteredCapability): void;
  /** Discovery filtrado por authorize() para o ator do contexto. */
  discover(ctx: ExecutionContext): DiscoveredCapability[];
  /** Invocação síncrona (contratos async:'sync'). */
  invoke<I, O>(id: CapabilityId, input: I, ctx: ExecutionContext): Promise<Result<O>>;
  /** Invocação assíncrona (contratos async:'job') -> { jobId }. */
  invokeAsync(
    id: CapabilityId,
    input: unknown,
    ctx: ExecutionContext,
  ): Promise<Result<{ jobId: string }>>;
  getJob(jobId: string): Result<Job>;
}

export interface ControlPlaneDeps {
  security: AuthorizationBoundary;
  audit: AuditSink;
  jobs: JobRepository;
  /** Registry injetável (default: in-memory). */
  registry?: CapabilityRegistry;
}

function invalidInputFromZod(id: CapabilityId, issues: readonly unknown[], operationId: string): NexoError {
  return nexoError('INVALID_INPUT', `Invalid input for capability '${id}'`, {
    operationId,
    resource: id,
    details: { issues },
  });
}

export function createControlPlane(deps: ControlPlaneDeps): ControlPlane {
  const registry = deps.registry ?? createCapabilityRegistry();
  const { security, audit, jobs } = deps;

  function emitAudit(
    capId: CapabilityId,
    ctx: ExecutionContext,
    decision: Decision,
    result: AuditEvent['result'],
    details?: Record<string, unknown>,
  ): void {
    const event: AuditEvent = {
      id: newOperationId(),
      who: ctx.executedBy,
      what: capId,
      context: ctx,
      decision,
      result,
      at: new Date().toISOString(),
    };
    if (ctx.projectId !== undefined) event.resource = ctx.projectId;
    if (details !== undefined) event.details = details;
    audit.record(event);
  }

  function authorizeCapability(
    cap: RegisteredCapability,
    ctx: ExecutionContext,
  ): Result<Decision> {
    const decision = security.authorize({
      actor: ctx.executedBy,
      permission: cap.contract.requiredPermission,
      scope: {
        workspaceId: ctx.workspaceId,
        projectId: ctx.projectId,
        environment: ctx.environment,
      },
      context: { capabilityId: cap.contract.id, operationId: ctx.operationId },
    });
    if (decision === 'ALLOW') return ok(decision);
    // DENY/UNKNOWN -> FORBIDDEN; REQUIRE_APPROVAL -> REQUIRE_APPROVAL (SPEC §8).
    const error = authorizationErrorFor(
      {
        actor: ctx.executedBy,
        permission: cap.contract.requiredPermission,
        scope: { workspaceId: ctx.workspaceId, projectId: ctx.projectId, environment: ctx.environment },
      },
      decision,
    );
    error.operationId = ctx.operationId;
    emitAudit(cap.contract.id, ctx, decision, 'FAILED', { errorCode: error.code });
    return err(error);
  }

  /** Passos 1–3 compartilhados por invoke/invokeAsync: lookup -> zod -> authorize. */
  function gate(
    id: CapabilityId,
    input: unknown,
    ctx: ExecutionContext,
  ): Result<{ cap: RegisteredCapability; parsed: unknown }> {
    const cap = registry.get(id);
    if (cap === undefined) {
      return err(
        nexoError('NOT_FOUND', `Capability not registered: '${id}'`, {
          operationId: ctx.operationId,
          resource: id,
        }),
      );
    }
    const parsed = cap.contract.inputSchema.safeParse(input);
    if (!parsed.success) {
      const error = invalidInputFromZod(id, parsed.error.issues, ctx.operationId);
      emitAudit(id, ctx, 'DENY', 'FAILED', { errorCode: 'INVALID_INPUT' });
      return err(error);
    }
    const authz = authorizeCapability(cap, ctx);
    if (!authz.ok) return authz;
    return ok({ cap, parsed: parsed.data });
  }

  async function runWithTimeout(
    cap: RegisteredCapability,
    parsed: unknown,
    ctx: ExecutionContext,
  ): Promise<Result<unknown>> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<Result<unknown>>((resolve) => {
        timer = setTimeout(() => {
          resolve(
            err(
              nexoError('INTERNAL', `Capability '${cap.contract.id}' timed out after ${cap.contract.timeoutMs}ms`, {
                operationId: ctx.operationId,
                resource: cap.contract.id,
                retryable: true,
              }),
            ),
          );
        }, cap.contract.timeoutMs);
      });
      return await Promise.race([cap.handler(parsed, ctx), timeout]);
    } catch (cause) {
      // Handler não deveria lançar (contrato Result), mas exceção inesperada
      // vira erro estruturado INTERNAL — nunca propaga throw pela fronteira.
      return err(
        nexoError('INTERNAL', `Capability '${cap.contract.id}' threw unexpectedly`, {
          operationId: ctx.operationId,
          resource: cap.contract.id,
          retryable: true,
          details: { cause: cause instanceof Error ? cause.message : String(cause) },
        }),
      );
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  async function runJob(jobId: string, cap: RegisteredCapability, parsed: unknown, ctx: ExecutionContext): Promise<void> {
    jobs.updateStatus(jobId, 'RUNNING');
    const result = await runWithTimeout(cap, parsed, ctx);
    if (result.ok) {
      jobs.setResult(jobId, result.value);
      jobs.updateStatus(jobId, 'COMPLETED');
      emitAudit(cap.contract.id, ctx, 'ALLOW', 'SUCCESS', { jobId });
    } else {
      jobs.setError(jobId, result.error);
      jobs.updateStatus(jobId, 'FAILED');
      emitAudit(cap.contract.id, ctx, 'ALLOW', 'FAILED', { jobId, errorCode: result.error.code });
    }
  }

  return {
    register(c) {
      registry.register(c);
    },

    discover(ctx) {
      return registry.list().map((d) => ({
        ...d,
        allowed: security.authorize({
          actor: ctx.executedBy,
          permission: d.requiredPermission,
          scope: {
            workspaceId: ctx.workspaceId,
            projectId: ctx.projectId,
            environment: ctx.environment,
          },
          context: { capabilityId: d.id, operationId: ctx.operationId, discovery: true },
        }),
      }));
    },

    async invoke<I, O>(id: CapabilityId, input: I, ctx: ExecutionContext): Promise<Result<O>> {
      const gated = gate(id, input, ctx);
      if (!gated.ok) return gated;
      const { cap, parsed } = gated.value;
      if (cap.contract.async === 'job') {
        return err(
          nexoError('UNSUPPORTED', `Capability '${id}' is async:'job'; use invokeAsync / POST retorna {jobId}`, {
            operationId: ctx.operationId,
            resource: id,
          }),
        );
      }
      const result = await runWithTimeout(cap, parsed, ctx);
      if (result.ok) {
        emitAudit(id, ctx, 'ALLOW', 'SUCCESS');
      } else {
        emitAudit(id, ctx, 'ALLOW', 'FAILED', { errorCode: result.error.code });
      }
      return result as Result<O>;
    },

    async invokeAsync(
      id: CapabilityId,
      input: unknown,
      ctx: ExecutionContext,
    ): Promise<Result<{ jobId: string }>> {
      const gated = gate(id, input, ctx);
      if (!gated.ok) return gated;
      const { cap, parsed } = gated.value;
      if (cap.contract.async !== 'job') {
        return err(
          nexoError('UNSUPPORTED', `Capability '${id}' is sync; use invoke`, {
            operationId: ctx.operationId,
            resource: id,
          }),
        );
      }
      const now = new Date().toISOString();
      const job: Job = {
        id: newOperationId(),
        capabilityId: id,
        status: 'QUEUED',
        input: parsed,
        result: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      };
      jobs.create(job);
      emitAudit(id, ctx, 'ALLOW', 'SUCCESS', { jobId: job.id, jobStatus: 'QUEUED' });
      // Execução in-process: transições reais de estado persistidas no JobRepository.
      // void + catch interno em runJob: nenhuma rejeição escapa desta fronteira.
      void runJob(job.id, cap, parsed, ctx);
      return ok({ jobId: job.id });
    },

    getJob(jobId) {
      const job = jobs.getById(jobId);
      if (job === null) {
        return err(nexoError('NOT_FOUND', `Job not found: '${jobId}'`, { resource: jobId }));
      }
      return ok(job);
    },
  };
}
