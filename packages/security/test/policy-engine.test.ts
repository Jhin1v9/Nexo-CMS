import { describe, expect, it } from 'vitest';

import type { Actor } from '@nexo/core';
import {
  createPolicyEngine,
  NexoAuthorizationError,
  type AuditEvent,
  type AuditSink,
  type AuthorizationRequest,
} from '../src/index.js';

const agent: Actor = { kind: 'AGENT', id: 'agent:1' };
const human: Actor = { kind: 'HUMAN', id: 'human:1' };

function req(overrides: Partial<AuthorizationRequest> = {}): AuthorizationRequest {
  return {
    actor: agent,
    permission: 'project.read',
    scope: { projectId: 'p1' },
    ...overrides,
  };
}

class FakeSink implements AuditSink {
  events: AuditEvent[] = [];
  record(e: AuditEvent): void {
    this.events.push(e);
  }
}

describe('PolicyEngine (SPEC §3)', () => {
  it('DEFAULT DENY: sem grant explícito -> DENY', () => {
    const engine = createPolicyEngine();
    expect(engine.authorize(req())).toBe('DENY');
  });

  it('UNKNOWN ≠ ALLOW: request malformado -> UNKNOWN e requireAllow lança FORBIDDEN', () => {
    const engine = createPolicyEngine({ grants: { 'agent:1': ['project.read'] } });
    const malformed = { actor: { kind: 'AGENT', id: '' }, permission: '', scope: {} } as AuthorizationRequest;
    expect(engine.authorize(malformed)).toBe('UNKNOWN');
    expect(() => engine.requireAllow(malformed)).toThrowError(NexoAuthorizationError);
    try {
      engine.requireAllow(malformed);
    } catch (e) {
      const err = (e as NexoAuthorizationError).error;
      expect(err.code).toBe('FORBIDDEN');
      expect(err.retryable).toBe(false);
    }
  });

  it('grant explícito -> ALLOW; outro actor continua DENY', () => {
    const engine = createPolicyEngine({ grants: { 'agent:1': ['project.read'] } });
    expect(engine.authorize(req())).toBe('ALLOW');
    expect(engine.authorize(req({ actor: human }))).toBe('DENY');
    expect(engine.authorize(req({ permission: 'project.import' }))).toBe('DENY');
  });

  it('grant()/revoke() dinâmicos', () => {
    const engine = createPolicyEngine();
    engine.grant('agent:1', 'project.read');
    expect(engine.authorize(req())).toBe('ALLOW');
    engine.revoke('agent:1', 'project.read');
    expect(engine.authorize(req())).toBe('DENY');
  });

  it('risk DESTRUCTIVE/CRITICAL -> REQUIRE_APPROVAL mesmo com grant', () => {
    const engine = createPolicyEngine({
      grants: { 'agent:1': ['project.delete', 'runtime.command.execute'] },
      risks: { 'project.delete': 'DESTRUCTIVE', 'runtime.command.execute': 'MODIFYING' },
    });
    expect(engine.authorize(req({ permission: 'project.delete' }))).toBe('REQUIRE_APPROVAL');
    expect(engine.authorize(req({ permission: 'runtime.command.execute' }))).toBe('ALLOW');
  });

  it("permissões '*.execute_sensitive' -> REQUIRE_APPROVAL mesmo com grant", () => {
    const engine = createPolicyEngine({ grants: { 'agent:1': ['runtime.execute_sensitive'] } });
    const decision = engine.authorize(req({ permission: 'runtime.execute_sensitive' }));
    expect(decision).toBe('REQUIRE_APPROVAL');
  });

  // ---- D17: canal de aprovação por invocação ------------------------------
  describe('D17 — aprovação por invocação', () => {
    const engineWithRisk = (sink?: FakeSink) =>
      createPolicyEngine({
        grants: { 'agent:1': ['project.delete', 'project.read'] },
        risks: { 'project.delete': 'DESTRUCTIVE' },
        ...(sink !== undefined ? { audit: sink } : {}),
      });

    it('REQUIRE_APPROVAL + approval válida -> ALLOW somente nesta invocação (sem grant permanente)', () => {
      const engine = engineWithRisk();
      const approved = engine.authorize(
        req({ permission: 'project.delete', approval: { approver: 'human:1' } }),
      );
      expect(approved).toBe('ALLOW');
      // Por invocação: a chamada SEGUINTE sem approval volta a REQUIRE_APPROVAL.
      expect(engine.authorize(req({ permission: 'project.delete' }))).toBe('REQUIRE_APPROVAL');
    });

    it('approval com approver vazio/ausente -> permanece REQUIRE_APPROVAL', () => {
      const engine = engineWithRisk();
      expect(engine.authorize(req({ permission: 'project.delete', approval: { approver: '' } }))).toBe(
        'REQUIRE_APPROVAL',
      );
      expect(engine.authorize(req({ permission: 'project.delete', approval: { approver: '   ' } }))).toBe(
        'REQUIRE_APPROVAL',
      );
    });

    it('approval NUNCA converte DENY (sem grant) em ALLOW', () => {
      const engine = createPolicyEngine({ risks: { 'project.delete': 'DESTRUCTIVE' } });
      expect(
        engine.authorize(req({ permission: 'project.delete', approval: { approver: 'human:1' } })),
      ).toBe('DENY');
    });

    it('audit registra approvedBy/justification em ALLOW via aprovação (§65)', () => {
      const sink = new FakeSink();
      const engine = engineWithRisk(sink);
      engine.authorize(
        req({ permission: 'project.delete', approval: { approver: 'human:1', justification: 'hotfix' } }),
      );
      const approvedEvent = sink.events.find((e) => e.what === 'authorize:project.delete' && e.decision === 'ALLOW');
      expect(approvedEvent?.approval).toEqual({ approvedBy: 'human:1', justification: 'hotfix' });
      expect(approvedEvent?.who.id).toBe('agent:1'); // requestedBy
      expect(approvedEvent?.result).toBe('SUCCESS');
    });

    it('approval em permissão SAFE não altera ALLOW nem gera registro de aprovação', () => {
      const sink = new FakeSink();
      const engine = engineWithRisk(sink);
      const decision = engine.authorize(
        req({ permission: 'project.read', approval: { approver: 'human:1' } }),
      );
      expect(decision).toBe('ALLOW');
      const ev = sink.events.find((e) => e.what === 'authorize:project.read');
      expect(ev?.approval).toBeUndefined();
    });
  });

  it('requireAllow lança erro estruturado REQUIRE_APPROVAL (requiresApproval: true)', () => {
    const engine = createPolicyEngine({
      grants: { 'agent:1': ['project.delete'] },
      risks: { 'project.delete': 'CRITICAL' },
    });
    try {
      engine.requireAllow(req({ permission: 'project.delete' }));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(NexoAuthorizationError);
      const err = (e as NexoAuthorizationError).error;
      expect(err.code).toBe('REQUIRE_APPROVAL');
      expect(err.requiresApproval).toBe(true);
      expect(err.requiredCapability).toBe('project.delete');
      expect(err.resource).toBe('p1');
    }
  });

  it('requireAllow lança FORBIDDEN em DENY', () => {
    const engine = createPolicyEngine();
    try {
      engine.requireAllow(req());
      expect.unreachable();
    } catch (e) {
      const err = (e as NexoAuthorizationError).error;
      expect(err.code).toBe('FORBIDDEN');
      expect(err.requiresApproval).toBeUndefined();
    }
  });

  it('auditoria emitida em allow E deny via AuditSink injetado (SPEC §0/§3)', () => {
    const sink = new FakeSink();
    const engine = createPolicyEngine({ grants: { 'agent:1': ['project.read'] }, audit: sink });

    expect(engine.authorize(req())).toBe('ALLOW');
    expect(engine.authorize(req({ permission: 'project.import' }))).toBe('DENY');
    expect(() => engine.requireAllow(req({ permission: 'project.import' }))).toThrow();

    expect(sink.events).toHaveLength(3);
    const [allow, deny, denyViaRequire] = sink.events;
    expect(allow!.decision).toBe('ALLOW');
    expect(allow!.result).toBe('SUCCESS');
    expect(allow!.who).toEqual(agent);
    expect(allow!.what).toBe('authorize:project.read');
    expect(allow!.context.operationId).toBeTruthy();
    expect(deny!.decision).toBe('DENY');
    expect(deny!.result).toBe('FAILED');
    expect(denyViaRequire!.decision).toBe('DENY');
  });
});
