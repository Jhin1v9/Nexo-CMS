/**
 * AuditRepository (SPEC §5) — implementa AuditSink (SPEC §3, espelho local em types.ts).
 * Audit nao pode mentir (Inv. 26): record() persiste o evento como recebido,
 * sem reescrita; list() retorna em ordem cronologica.
 */

import type Database from 'better-sqlite3';

import type { Actor, ExecutionContext } from '@nexo/core';
import type { OpStatus } from '@nexo/shared';

import type { AuditDecision, AuditEvent, AuditSink } from '../types.js';

export interface AuditFilter {
  result?: OpStatus;
  what?: string;
  resource?: string;
}

export interface AuditRepository extends AuditSink {
  list(filter?: AuditFilter): AuditEvent[];
}

interface AuditRow {
  id: string;
  who_json: string;
  what: string;
  resource: string | null;
  context_json: string;
  decision: string | null;
  result: string;
  at: string;
  details_json: string | null;
}

function toAuditEvent(row: AuditRow): AuditEvent {
  const event: AuditEvent = {
    id: row.id,
    who: JSON.parse(row.who_json) as Actor,
    what: row.what,
    context: JSON.parse(row.context_json) as ExecutionContext,
    result: row.result as OpStatus,
    at: row.at,
  };
  if (row.resource !== null) event.resource = row.resource;
  if (row.decision !== null) event.decision = row.decision as AuditDecision;
  if (row.details_json !== null) {
    event.details = JSON.parse(row.details_json) as Record<string, unknown>;
  }
  return event;
}

export function createAuditRepository(db: Database.Database): AuditRepository {
  const insertStmt = db.prepare(
    `INSERT INTO audit_events (id, who_json, what, resource, context_json, decision, result, at, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  return {
    record(e) {
      insertStmt.run(
        e.id,
        JSON.stringify(e.who),
        e.what,
        e.resource ?? null,
        JSON.stringify(e.context),
        e.decision ?? null,
        e.result,
        e.at,
        e.details === undefined ? null : JSON.stringify(e.details),
      );
    },
    list(filter = {}) {
      const clauses: string[] = [];
      const params: string[] = [];
      if (filter.result !== undefined) {
        clauses.push('result = ?');
        params.push(filter.result);
      }
      if (filter.what !== undefined) {
        clauses.push('what = ?');
        params.push(filter.what);
      }
      if (filter.resource !== undefined) {
        clauses.push('resource = ?');
        params.push(filter.resource);
      }
      const where = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
      const rows = db
        .prepare(`SELECT * FROM audit_events${where} ORDER BY at ASC`)
        .all(...params) as AuditRow[];
      return rows.map(toAuditEvent);
    },
  };
}
