import { describe, expect, it } from 'vitest';

import { auditEventSchema, authorizationRequestSchema } from '../src/index.js';

describe('schemas (fronteira de segurança)', () => {
  it('AuthorizationRequest válido parseia; inválido falha', () => {
    const okReq = {
      actor: { kind: 'CLI', id: 'cli:local' },
      permission: 'runtime.command.execute',
      scope: { workspaceId: 'w1' },
    };
    expect(authorizationRequestSchema.safeParse(okReq).success).toBe(true);
    expect(authorizationRequestSchema.safeParse({ actor: { kind: 'X', id: 'a' }, permission: 'p', scope: {} }).success).toBe(false);
    expect(authorizationRequestSchema.safeParse(null).success).toBe(false);
  });

  it('AuditEvent válido parseia', () => {
    const actor = { kind: 'SYSTEM', id: 'runtime' };
    const event = {
      id: 'e1',
      who: actor,
      what: 'runtime.command.execute',
      context: { operationId: 'op1', initiatedBy: actor, executedBy: actor },
      decision: 'ALLOW',
      result: 'SUCCESS',
      at: new Date().toISOString(),
    };
    expect(auditEventSchema.safeParse(event).success).toBe(true);
  });
});
