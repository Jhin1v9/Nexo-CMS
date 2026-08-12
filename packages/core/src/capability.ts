/**
 * CapabilityContract (SPEC.md §2 — contrato congelado).
 * Toda capability do Control Plane declara I/O validado via zod v4.
 */

import type { z } from 'zod';

export type CapabilityId = string; // 'project.import' | 'runtime.command.execute' | ...

export type RiskLevel = 'SAFE' | 'MODIFYING' | 'DESTRUCTIVE' | 'CRITICAL';

export interface CapabilityContract<I = unknown, O = unknown> {
  id: CapabilityId;
  version: 1;
  domain: string; // 'project' | 'runtime' | ...
  description: string;
  inputSchema: z.ZodType<I>; // zod v4
  resultSchema: z.ZodType<O>;
  requiredPermission: string; // 'project.import', 'runtime.command.execute', ...
  risk: RiskLevel;
  sideEffects: boolean;
  async: 'sync' | 'job';
  timeoutMs: number;
}
