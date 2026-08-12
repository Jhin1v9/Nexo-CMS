/**
 * DomainEvent (SPEC.md §2 — contrato congelado).
 * occurredAt: ISO 8601 string (serializavel em JSON/SQLite).
 */

export type DomainEvent = {
  id: string;
  type: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};
