/**
 * PolicyEngine M1 (SPEC.md §3): AuthorizationBoundary puro e testável.
 * - Grants explícitos por actor: Map<actorId, Set<permission>> (match exato).
 * - DEFAULT DENY: sem grant -> DENY.
 * - Request malformado -> UNKNOWN (UNKNOWN ≠ ALLOW).
 * - Política estática M1: permissões '*.execute_sensitive' ou risk DESTRUCTIVE/CRITICAL
 *   (tabela de risco injetada) -> REQUIRE_APPROVAL mesmo com grant.
 * - D17 (canal de aprovação, Permission Model §20/§65/§67): quando a decisão
 *   seria REQUIRE_APPROVAL e o request traz `approval` VÁLIDA (approver
 *   não-vazio), a decisão vira ALLOW e o AuditEvent registra a aprovação
 *   (requestedBy = who, approvedBy = approval.approver, when = at). Aprovação
 *   é POR INVOCAÇÃO: nenhum grant é criado/alterado. Aprovação NUNCA converte
 *   DENY (sem grant) nem UNKNOWN (request malformado) em ALLOW.
 * - Auditoria opcional via AuditSink injetado: emite AuditEvent em allow E deny (SPEC §0/§3).
 */

import { newOperationId } from '@nexo/shared';
import type { Actor, ExecutionContext } from '@nexo/core';
import type { RiskLevel } from '@nexo/core';
import {
  authorizationErrorFor,
  NexoAuthorizationError,
  type Approval,
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

/**
 * Aprovação válida (D17): objeto com `approver` string não-vazia. Qualquer
 * outra forma = SEM aprovação (a decisão segue REQUIRE_APPROVAL — nunca
 * UNKNOWN/FORBIDDEN por causa de um envelope de aprovação malformado; o 400
 * do envelope inválido é responsabilidade da fronteira HTTP, apps/runtime).
 */
function validApproval(approval: Approval | undefined): Approval | undefined {
  if (approval === undefined) return undefined;
  if (typeof approval.approver !== 'string' || approval.approver.trim().length === 0) return undefined;
  return approval;
}

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
    let approval: Approval | undefined;
    if (!this.grants.get(req.actor.id)?.has(req.permission)) {
      decision = 'DENY'; // DEFAULT DENY — aprovação NUNCA cria grant (D17)
    } else if (this.requiresApproval(req.permission)) {
      // D17: aprovação válida (approver não-vazio) converte REQUIRE_APPROVAL
      // em ALLOW apenas NESTA invocação; sem aprovação válida, permanece
      // REQUIRE_APPROVAL (determinístico — mesma entrada, mesma decisão).
      approval = validApproval(req.approval);
      decision = approval !== undefined ? 'ALLOW' : 'REQUIRE_APPROVAL';
    } else {
      decision = 'ALLOW';
    }
    this.emit(req, decision, approval);
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

  private emit(req: AuthorizationRequest, decision: Decision, approval?: Approval): void {
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
    // D17/§65: operação aprovada registra approvedBy + justification (requestedBy = who).
    if (approval !== undefined) {
      event.approval = {
        approvedBy: approval.approver,
        ...(approval.justification !== undefined ? { justification: approval.justification } : {}),
      };
    }
    this.audit.record(event);
  }
}

export function createPolicyEngine(opts: PolicyEngineOptions = {}): PolicyEngine {
  return new PolicyEngine(opts);
}
