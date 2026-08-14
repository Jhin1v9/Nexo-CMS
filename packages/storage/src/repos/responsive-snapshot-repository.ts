/**
 * ResponsiveSnapshotRepository (M3 — doc 09§44).
 * Persiste METADATA de snapshots visuais (tabela responsive_snapshots,
 * migration v3 RESERVADA para @nexo/responsive). O binário da imagem fica em
 * arquivo no dataDir (imagePath) — este repository nunca armazena pixels.
 * Snapshots não são o Source Project (09§44): sourceState é referência
 * observada no momento da captura, sem autoridade sobre o projeto.
 */

import type Database from 'better-sqlite3';

import type { ResponsiveSnapshotRecord } from '../types.js';

export interface ResponsiveSnapshotRepository {
  insert(s: ResponsiveSnapshotRecord): void;
  getById(id: string): ResponsiveSnapshotRecord | null;
  listByProject(projectId: string): ResponsiveSnapshotRecord[];
  /** Retorna true se uma row foi removida de fato (nunca finge delete). */
  delete(id: string): boolean;
}

interface SnapshotRow {
  id: string;
  project_id: string;
  viewport_id: string;
  route: string;
  source_state: string;
  preview_ref: string;
  image_path: string;
  diagnostics_json: string;
  created_at: string;
}

function toSnapshot(row: SnapshotRow): ResponsiveSnapshotRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    viewportId: row.viewport_id,
    route: row.route,
    sourceState: row.source_state,
    previewRef: row.preview_ref,
    imagePath: row.image_path,
    diagnosticsJson: row.diagnostics_json,
    createdAt: row.created_at,
  };
}

export function createResponsiveSnapshotRepository(
  db: Database.Database,
): ResponsiveSnapshotRepository {
  const insertStmt = db.prepare(
    `INSERT INTO responsive_snapshots
       (id, project_id, viewport_id, route, source_state, preview_ref, image_path, diagnostics_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const getStmt = db.prepare('SELECT * FROM responsive_snapshots WHERE id = ?');
  const listStmt = db.prepare(
    'SELECT * FROM responsive_snapshots WHERE project_id = ? ORDER BY created_at ASC',
  );
  const deleteStmt = db.prepare('DELETE FROM responsive_snapshots WHERE id = ?');

  return {
    insert(s) {
      insertStmt.run(
        s.id,
        s.projectId,
        s.viewportId,
        s.route,
        s.sourceState,
        s.previewRef,
        s.imagePath,
        s.diagnosticsJson,
        s.createdAt,
      );
    },
    getById(id) {
      const row = getStmt.get(id) as SnapshotRow | undefined;
      return row ? toSnapshot(row) : null;
    },
    listByProject(projectId) {
      return (listStmt.all(projectId) as SnapshotRow[]).map(toSnapshot);
    },
    delete(id) {
      return deleteStmt.run(id).changes > 0;
    },
  };
}
