/**
 * ExecutionContext + Actor (SPEC.md §2 — contratos congelados).
 */

export type Actor = { kind: 'HUMAN' | 'AGENT' | 'CLI' | 'SYSTEM'; id: string };

export type Environment = 'DEVELOPMENT' | 'PREVIEW' | 'STAGING' | 'PRODUCTION';

export interface ExecutionContext {
  operationId: string;
  initiatedBy: Actor;
  executedBy: Actor;
  workspaceId?: string;
  projectId?: string;
  environment?: Environment;
}
