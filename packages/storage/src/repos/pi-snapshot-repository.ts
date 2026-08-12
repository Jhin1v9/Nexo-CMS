/**
 * PISnapshotRepository (SPEC §5).
 * pi_snapshots guarda o historico de snapshots do ProjectModel (model_json TEXT);
 * latest() retorna o mais recente por analyzed_at. O tipo forte do model vem de
 * @nexo/intelligence na integracao (Wave 3) — aqui: ProjectModelSnapshot
 * (Record<string, unknown>), sem dependencia cruzada (SPEC §5).
 */

import type Database from 'better-sqlite3';

import type { PISnapshot, ProjectModelSnapshot } from '../types.js';

export interface PISnapshotRepository {
  save(projectId: string, model: ProjectModelSnapshot, analysisVersion: string): void;
  latest(projectId: string): PISnapshot | null;
}

interface PISnapshotRow {
  project_id: string;
  model_json: string;
  analyzed_at: string;
  analysis_version: string;
}

function toSnapshot(row: PISnapshotRow): PISnapshot {
  return {
    projectId: row.project_id,
    model: JSON.parse(row.model_json) as ProjectModelSnapshot,
    analyzedAt: row.analyzed_at,
    analysisVersion: row.analysis_version,
  };
}

export function createPISnapshotRepository(db: Database.Database): PISnapshotRepository {
  const insertStmt = db.prepare(
    `INSERT INTO pi_snapshots (project_id, model_json, analyzed_at, analysis_version)
     VALUES (?, ?, ?, ?)`,
  );
  const latestStmt = db.prepare(
    `SELECT * FROM pi_snapshots
      WHERE project_id = ?
      ORDER BY analyzed_at DESC, rowid DESC
      LIMIT 1`,
  );

  return {
    save(projectId, model, analysisVersion) {
      insertStmt.run(projectId, JSON.stringify(model), new Date().toISOString(), analysisVersion);
    },
    latest(projectId) {
      const row = latestStmt.get(projectId) as PISnapshotRow | undefined;
      return row ? toSnapshot(row) : null;
    },
  };
}
