/**
 * Schemas zod para validação estrutural na fronteira de segurança.
 * // dep: zod — validação runtime de AuthorizationRequest/AuditEvent (payloads que cruzam
 * //      fronteiras de processo/serialização precisam de checagem estrutural; zod v4 é o
 * //      validador padrão do monorepo, ver SPEC.md §2).
 * Regra: request malformado NUNCA vira ALLOW (SPEC §3: UNKNOWN ≠ ALLOW).
 */

import { z } from 'zod';
import type { AuthorizationRequest } from './decision.js';
import type { AuditEvent } from './audit.js';

const actorSchema = z.object({
  kind: z.enum(['HUMAN', 'AGENT', 'CLI', 'SYSTEM']),
  id: z.string().min(1),
});

export const authorizationRequestSchema: z.ZodType<AuthorizationRequest> = z.object({
  actor: actorSchema,
  permission: z.string().min(1),
  scope: z.object({
    workspaceId: z.string().optional(),
    projectId: z.string().optional(),
    environment: z.string().optional(),
  }),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const auditEventSchema: z.ZodType<AuditEvent> = z.object({
  id: z.string().min(1),
  who: actorSchema,
  what: z.string().min(1),
  resource: z.string().optional(),
  context: z.object({
    operationId: z.string().min(1),
    initiatedBy: actorSchema,
    executedBy: actorSchema,
    workspaceId: z.string().optional(),
    projectId: z.string().optional(),
    environment: z.enum(['DEVELOPMENT', 'PREVIEW', 'STAGING', 'PRODUCTION']).optional(),
  }),
  decision: z.enum(['ALLOW', 'DENY', 'REQUIRE_APPROVAL', 'UNKNOWN']).optional(),
  result: z.enum(['SUCCESS', 'PARTIAL', 'FAILED']),
  at: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

/** true quando o request tem forma válida; malformado -> decisão UNKNOWN (nunca ALLOW). */
export function isValidAuthorizationRequest(req: unknown): req is AuthorizationRequest {
  return authorizationRequestSchema.safeParse(req).success;
}
