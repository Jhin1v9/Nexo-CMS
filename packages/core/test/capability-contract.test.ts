import { newOperationId, ok } from '@nexo/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Actor, CapabilityContract, ExecutionContext } from '../src/index.js';

/**
 * Contrato de exemplo (SPEC §2): valida input/output com zod v4.
 * Tambem prova resolucao cross-package @nexo/shared -> src sem build.
 */

const exampleInput = z.object({ rootPath: z.string().min(1) });
const exampleOutput = z.object({ imported: z.boolean() });

type ExampleInput = z.infer<typeof exampleInput>;
type ExampleOutput = z.infer<typeof exampleOutput>;

const exampleContract: CapabilityContract<ExampleInput, ExampleOutput> = {
  id: 'project.import',
  version: 1,
  domain: 'project',
  description: 'Importa um projeto pelo root path',
  inputSchema: exampleInput,
  resultSchema: exampleOutput,
  requiredPermission: 'project.import',
  risk: 'MODIFYING',
  sideEffects: true,
  async: 'sync',
  timeoutMs: 30_000,
};

describe('CapabilityContract', () => {
  it('valida input valido com zod', () => {
    const parsed = exampleContract.inputSchema.safeParse({ rootPath: '/tmp/proj' });
    expect(parsed.success).toBe(true);
  });

  it('rejeita input invalido com zod', () => {
    expect(exampleContract.inputSchema.safeParse({}).success).toBe(false);
    expect(exampleContract.inputSchema.safeParse({ rootPath: '' }).success).toBe(false);
  });

  it('valida output com resultSchema', () => {
    expect(exampleContract.resultSchema.safeParse({ imported: true }).success).toBe(true);
    expect(exampleContract.resultSchema.safeParse({ imported: 'yes' }).success).toBe(false);
  });

  it('metadados do contrato respeitam o formato congelado', () => {
    expect(exampleContract.version).toBe(1);
    expect(exampleContract.risk).toBe('MODIFYING');
    expect(exampleContract.async).toBe('sync');
  });
});

describe('ExecutionContext + Actor (SPEC §2)', () => {
  it('monta contexto com actors e operationId do @nexo/shared', () => {
    const human: Actor = { kind: 'HUMAN', id: 'user:local' };
    const cli: Actor = { kind: 'CLI', id: 'cli:local' };
    const ctx: ExecutionContext = {
      operationId: newOperationId(),
      initiatedBy: human,
      executedBy: cli,
      environment: 'DEVELOPMENT',
    };
    expect(ctx.operationId).toBeTruthy();
    expect(ctx.initiatedBy.kind).toBe('HUMAN');
    expect(ctx.executedBy.kind).toBe('CLI');
    expect(ok(ctx).ok).toBe(true);
  });
});
