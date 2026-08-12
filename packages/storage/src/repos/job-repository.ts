/**
 * JobRepository (SPEC §5): create, get, update status, result.
 * Estados: QUEUED | RUNNING | COMPLETED | FAILED | CANCELLED.
 * A maquina de estados (quais transicoes sao legais) pertence ao control-plane;
 * aqui apenas persistimos o estado declarado (Inv. 49: responsabilidade clara).
 */

import type Database from 'better-sqlite3';

import type { NexoError } from '@nexo/shared';

import type { Job, JobStatus } from '../types.js';

export interface JobFilter {
  status?: JobStatus;
  capabilityId?: string;
}

export interface JobRepository {
  create(j: Job): void;
  getById(id: string): Job | null;
  updateStatus(id: string, status: JobStatus): void;
  setResult(id: string, result: unknown): void;
  setError(id: string, error: NexoError): void;
  list(filter?: JobFilter): Job[];
}

interface JobRow {
  id: string;
  capability_id: string;
  status: string;
  input_json: string;
  result_json: string | null;
  error_json: string | null;
  created_at: string;
  updated_at: string;
}

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    capabilityId: row.capability_id,
    status: row.status as JobStatus,
    input: JSON.parse(row.input_json) as unknown,
    result: row.result_json === null ? null : (JSON.parse(row.result_json) as unknown),
    error: row.error_json === null ? null : (JSON.parse(row.error_json) as NexoError),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createJobRepository(db: Database.Database): JobRepository {
  const insertStmt = db.prepare(
    `INSERT INTO jobs (id, capability_id, status, input_json, result_json, error_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const getStmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
  const statusStmt = db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?');
  const resultStmt = db.prepare('UPDATE jobs SET result_json = ?, updated_at = ? WHERE id = ?');
  const errorStmt = db.prepare('UPDATE jobs SET error_json = ?, updated_at = ? WHERE id = ?');

  return {
    create(j) {
      insertStmt.run(
        j.id,
        j.capabilityId,
        j.status,
        JSON.stringify(j.input ?? null),
        j.result === null ? null : JSON.stringify(j.result),
        j.error === null ? null : JSON.stringify(j.error),
        j.createdAt,
        j.updatedAt,
      );
    },
    getById(id) {
      const row = getStmt.get(id) as JobRow | undefined;
      return row ? toJob(row) : null;
    },
    updateStatus(id, status) {
      statusStmt.run(status, nowIso(), id);
    },
    setResult(id, result) {
      resultStmt.run(JSON.stringify(result ?? null), nowIso(), id);
    },
    setError(id, error) {
      errorStmt.run(JSON.stringify(error), nowIso(), id);
    },
    list(filter = {}) {
      const clauses: string[] = [];
      const params: string[] = [];
      if (filter.status !== undefined) {
        clauses.push('status = ?');
        params.push(filter.status);
      }
      if (filter.capabilityId !== undefined) {
        clauses.push('capability_id = ?');
        params.push(filter.capabilityId);
      }
      const where = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
      const rows = db
        .prepare(`SELECT * FROM jobs${where} ORDER BY created_at ASC`)
        .all(...params) as JobRow[];
      return rows.map(toJob);
    },
  };
}
