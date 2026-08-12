/**
 * PolicyEngine M1 (SPEC.md §3): AuthorizationBoundary puro e testável.
 * - Grants explícitos por actor: Map<actorId, Set<permission>> (match exato).
 * - DEFAULT DENY: sem grant -> DENY.
 * - Request malformado -> UNKNOWN (UNKNOWN ≠ ALLOW).
 * - Política estática M1: permissões '*.execute_sensitive' ou risk DESTRUCTIVE/CRITICAL
 *   (tabela de risco injetada) -> REQUIRE_APPROVAL mesmo com grant.
 * - Auditoria opcional via AuditSink injetado: emite AuditEvent em allow E deny (SPEC §0/§3).
 */

import { newOperationId } from '@nexo/shared';
import type { Actor, ExecutionContext } from '@nexo/core';
import type { RiskLevel } from '@nexo/core';
import {
  authorizationErrorFor,
  NexoAuthorizationError,
  type AuthorizationBoundary,
  type AuthorizationRequest,
  type Decision,
} from './decision.js';
import { isValidAuthorizationRequest } from './schemas.js';
import type { AuditEvent, AuditSink } from './audit.js';

export interface PolicyEngineOptions {
  /** Grants iniciais: actorId -> permissões exatas. */
  grants?: ReadonlyMap<string, ReadonlySet<string>> | Record<string, readonly string[]>;
  /** Risco estático por permissão (M1). DESTRUCTIVE/CRITICAL -> REQUIRE_APPROVAL. */
  risks?: ReadonlyMap<string, RiskLevel> | Record<string, RiskLevel>;
  /** Sink opcional: quando presente, authorize() registra AuditEvent (allow E deny). */
  audit?: AuditSink;
}

const APPROVAL_RISKS: ReadonlySet<RiskLevel> = new Set(['DESTRUCTIVE', 'CRITICAL']);

export class PolicyEngine implements AuthorizationBoundary {
  private readonly grants = new Map<string, Set<string>>();
  private readonly risks = new Map<string, RiskLevel>();
  private readonly audit?: AuditSink;

  constructor(opts: PolicyEngineOptions = {}) {
    if (opts.grants instanceof Map) {
      for (const [actorId, perms] of opts.grants) this.grants.set(actorId, new Set(perms));
    } else if (opts.grants) {
      for (const [actorId, perms] of Object.entries(opts.grants)) {
        this.grants.set(actorId, new Set(perms));
      }
    }
    const risks = opts.risks instanceof Map ? opts.risks.entries() : Object.entries(opts.risks ?? {});
    for (const [permission, risk] of risks) this.risks.set(permission, risk);
    this.audit = opts.audit;
  }

  grant(actorId: string, permission: string): void {
    const perms = this.grants.get(actorId) ?? new Set<string>();
    perms.add(permission);
    this.grants.set(actorId, perms);
  }

  revoke(actorId: string, permission: string): void {
    this.grants.get(actorId)?.delete(permission);
  }

  setRisk(permission: string, risk: RiskLevel): void {
    this.risks.set(permission, risk);
  }

  authorize(req: AuthorizationRequest): Decision {
    if (!isValidAuthorizationRequest(req)) {
      const decision: Decision = 'UNKNOWN';
      this.emit(req, decision);
      return decision;
    }
    let decision: Decision;
    if (!this.grants.get(req.actor.id)?.has(req.permission)) {
      decision = 'DENY'; // DEFAULT DENY
    } else if (this.requiresApproval(req.permission)) {
      decision = 'REQUIRE_APPROVAL';
    } else {
      decision = 'ALLOW';
    }
    this.emit(req, decision);
    return decision;
  }

  requireAllow(req: AuthorizationRequest): void {
    const decision = this.authorize(req);
    if (decision === 'ALLOW') return;
    throw new NexoAuthorizationError(authorizationErrorFor(req, decision));
  }

  /** Política estática M1: '*.execute_sensitive' ou risk DESTRUCTIVE+ -> approval. */
  private requiresApproval(permission: string): boolean {
    if (permission.endsWith('.execute_sensitive')) return true;
    const risk = this.risks.get(permission);
    return risk !== undefined && APPROVAL_RISKS.has(risk);
  }

  private emit(req: AuthorizationRequest, decision: Decision): void {
    if (!this.audit) return;
    const actor: Actor =
      req?.actor && typeof req.actor.id === 'string' && req.actor.id.length > 0
        ? req.actor
        : { kind: 'SYSTEM', id: 'unknown' };
    const context: ExecutionContext = {
      operationId: newOperationId(),
      initiatedBy: actor,
      executedBy: actor,
      workspaceId: req?.scope?.workspaceId,
      projectId: req?.scope?.projectId,
    };
    const event: AuditEvent = {
      id: newOperationId(),
      who: actor,
      what: `authorize:${typeof req?.permission === 'string' ? req.permission : 'unknown'}`,
      resource: req?.scope?.projectId ?? req?.scope?.workspaceId,
      context,
      decision,
      result: decision === 'ALLOW' ? 'SUCCESS' : 'FAILED',
      at: new Date().toISOString(),
    };
    this.audit.record(event);
  }
}

export function createPolicyEngine(opts: PolicyEngineOptions = {}): PolicyEngine {
  return new PolicyEngine(opts);
}
