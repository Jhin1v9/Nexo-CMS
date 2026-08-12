/**
 * AuditEvent + AuditSink (SPEC.md §3).
 * Who/What/Resource/Context/Decision/Result/Time (SPEC §0).
 * AuditSink é implementado por storage (Wave 2B); aqui apenas o contrato.
 */

import type { OpStatus } from '@nexo/shared';
import type { Actor, ExecutionContext } from '@nexo/core';
import type { Decision } from './decision.js';

export interface AuditEvent {
  id: string;
  who: Actor;
  what: string;
  resource?: string;
  context: ExecutionContext;
  decision?: Decision;
  result: OpStatus;
  /** ISO 8601. */
  at: string;
  details?: Record<string, unknown>;
}

export interface AuditSink {
  record(e: AuditEvent): void;
}
