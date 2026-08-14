/**
 * Decision + AuthorizationRequest + AuthorizationBoundary (SPEC.md §3).
 * DEFAULT DENY; UNKNOWN ≠ ALLOW.
 */

import type { NexoError } from '@nexo/shared';
import { nexoError } from '@nexo/shared';
import type { Actor } from '@nexo/core';

export type Decision = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'UNKNOWN';

/**
 * Aprovação POR INVOCAÇÃO (decisão D17, Permission Model §20/§65/§67):
 * presente no envelope de invoke (`approval: { approver, justification? }`),
 * NUNCA vira grant permanente. Válida somente com `approver` não-vazio —
 * o PolicyEngine valida na fronteira (approver vazio/ausente = sem aprovação,
 * a decisão segue REQUIRE_APPROVAL).
 */
export interface Approval {
  approver: string;
  justification?: string;
}

export interface AuthorizationRequest {
  actor: Actor;
  permission: string;
  scope: {
    workspaceId?: string;
    projectId?: string;
    environment?: string;
  };
  context?: Record<string, unknown>;
  /** Aprovação por invocação (D17) — só converte REQUIRE_APPROVAL em ALLOW. */
  approval?: Approval;
}

export interface AuthorizationBoundary {
  /** DEFAULT DENY; UNKNOWN ≠ ALLOW. Pura: sem side effects além de auditoria injetada. */
  authorize(req: AuthorizationRequest): Decision;
  /**
   * Lança NexoAuthorizationError estruturado quando a decisão não é ALLOW:
   * - REQUIRE_APPROVAL -> code REQUIRE_APPROVAL (requiresApproval: true)
   * - DENY / UNKNOWN   -> code FORBIDDEN
   */
  requireAllow(req: AuthorizationRequest): void;
}

/** Erro estruturado agent-friendly (SPEC §0) lançado por requireAllow. */
export class NexoAuthorizationError extends Error {
  readonly error: NexoError;

  constructor(error: NexoError) {
    super(error.message);
    this.name = 'NexoAuthorizationError';
    this.error = error;
  }

  get code(): NexoError['code'] {
    return this.error.code;
  }
}

export function authorizationErrorFor(req: AuthorizationRequest, decision: Decision): NexoError {
  const resource = req.scope.projectId ?? req.scope.workspaceId;
  if (decision === 'REQUIRE_APPROVAL') {
    return nexoError('REQUIRE_APPROVAL', `Permission '${req.permission}' requires explicit approval`, {
      resource,
      requiresApproval: true,
      requiredCapability: req.permission,
      details: { actorId: req.actor.id, permission: req.permission },
    });
  }
  return nexoError('FORBIDDEN', `Permission '${req.permission}' denied for actor '${req.actor.id}'`, {
    resource,
    requiredCapability: req.permission,
    details: { actorId: req.actor.id, permission: req.permission, decision },
  });
}
