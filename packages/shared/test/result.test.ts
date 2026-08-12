import { describe, expect, it } from 'vitest';

import type { NexoError, Result } from '../src/index.js';
import { err, nexoError, newOperationId, ok } from '../src/index.js';

describe('ok()', () => {
  it('wraps value com ok: true', () => {
    const r: Result<number> = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(42);
    }
  });
});

describe('err()', () => {
  it('wraps NexoError com ok: false', () => {
    const error: NexoError = nexoError('NOT_FOUND', 'projeto nao encontrado', {
      resource: 'project:123',
    });
    const r: Result<number> = err(error);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('NOT_FOUND');
      expect(r.error.retryable).toBe(false);
      expect(r.error.resource).toBe('project:123');
    }
  });

  it('nexoError preserva campos opcionais estruturados (SPEC §0)', () => {
    const e = nexoError('REQUIRE_APPROVAL', 'acao destrutiva', {
      operationId: newOperationId(),
      retryable: false,
      requiresApproval: true,
      requiredCapability: 'runtime.command.execute',
      details: { command: 'rm -rf /' },
    });
    expect(e.code).toBe('REQUIRE_APPROVAL');
    expect(e.requiresApproval).toBe(true);
    expect(e.requiredCapability).toBe('runtime.command.execute');
    expect(e.details?.['command']).toBe('rm -rf /');
    expect(e.operationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('newOperationId()', () => {
  it('gera UUID v4 unico', () => {
    const a = newOperationId();
    const b = newOperationId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
