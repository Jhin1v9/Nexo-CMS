/**
 * MediaAssetRepository (M3 — doc 08§42/§82, D10).
 * Registry de media assets persistido em media_assets; a identidade completa
 * (AssetIdentity de @nexo/media) vive em identity_json (estrutural aqui, sem
 * dependência cruzada — mesmo padrão de PISnapshotRepository).
 * upsert é idempotente por id (INSERT OR REPLACE): re-registro após
 * replace/update reutiliza o id estável do asset.
 */

import type Database from 'better-sqlite3';

import type { MediaAssetRecord } from '../types.js';

export interface MediaAssetRepository {
  upsert(record: MediaAssetRecord): void;
  getById(id: string): MediaAssetRecord | null;
  listByProject(projectId: string): MediaAssetRecord[];
  /** Retorna true se um registro foi removido. */
  remove(id: string): boolean;
}

interface MediaAssetRow {
  id: string;
  project_id: string;
  name: string;
  type: string;
  identity_json: string;
  created_at: string;
  updated_at: string;
}

function toRecord(row: MediaAssetRow): MediaAssetRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    type: row.type,
    identity: JSON.parse(row.identity_json) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createMediaAssetRepository(db: Database.Database): MediaAssetRepository {
  const upsertStmt = db.prepare(
    `INSERT OR REPLACE INTO media_assets
       (id, project_id, name, type, identity_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const getStmt = db.prepare('SELECT * FROM media_assets WHERE id = ?');
  const listStmt = db.prepare(
    'SELECT * FROM media_assets WHERE project_id = ? ORDER BY created_at ASC, id ASC',
  );
  const removeStmt = db.prepare('DELETE FROM media_assets WHERE id = ?');

  return {
    upsert(record) {
      upsertStmt.run(
        record.id,
        record.projectId,
        record.name,
        record.type,
        JSON.stringify(record.identity),
        record.createdAt,
        record.updatedAt,
      );
    },
    getById(id) {
      const row = getStmt.get(id) as MediaAssetRow | undefined;
      return row ? toRecord(row) : null;
    },
    listByProject(projectId) {
      return (listStmt.all(projectId) as MediaAssetRow[]).map(toRecord);
    },
    remove(id) {
      return removeStmt.run(id).changes > 0;
    },
  };
}
