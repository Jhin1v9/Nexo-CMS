/**
 * ComponentRepository (M3 — doc 08§6/§26, D10).
 * Registry de componentes persistido em components; o schema completo
 * (ComponentSchema de @nexo/components) vive em schema_json (estrutural aqui,
 * sem dependência cruzada — mesmo padrão de MediaAssetRepository).
 * upsert é idempotente por id (INSERT OR REPLACE): re-registro após
 * detecção/update reutiliza o id estável do componente dentro do escopo.
 * Versions (08§26) são insert-only: um projeto usando versão X nunca muda
 * silenciosamente para Y.
 */

import type Database from 'better-sqlite3';

import type { ComponentRecord, ComponentVersionRow } from '../types.js';

export interface ComponentRepository {
  upsert(record: ComponentRecord): void;
  getById(id: string): ComponentRecord | null;
  listByProject(projectId: string): ComponentRecord[];
  listByScope(scope: string): ComponentRecord[];
  /** Retorna true se um registro foi removido. */
  remove(id: string): boolean;
  insertVersion(row: ComponentVersionRow): void;
  listVersions(componentId: string): ComponentVersionRow[];
}

interface ComponentRow {
  id: string;
  project_id: string | null;
  name: string;
  scope: string;
  schema_json: string;
  created_at: string;
  updated_at: string;
}

interface VersionRow {
  id: string;
  component_id: string;
  version: string;
  record_json: string;
  published_at: string;
}

function toRecord(row: ComponentRow): ComponentRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    scope: row.scope,
    schema: JSON.parse(row.schema_json) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVersion(row: VersionRow): ComponentVersionRow {
  return {
    id: row.id,
    componentId: row.component_id,
    version: row.version,
    record: JSON.parse(row.record_json) as Record<string, unknown>,
    publishedAt: row.published_at,
  };
}

export function createComponentRepository(db: Database.Database): ComponentRepository {
  const upsertStmt = db.prepare(
    `INSERT OR REPLACE INTO components
       (id, project_id, name, scope, schema_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const getStmt = db.prepare('SELECT * FROM components WHERE id = ?');
  const listProjectStmt = db.prepare(
    'SELECT * FROM components WHERE project_id = ? ORDER BY created_at ASC, id ASC',
  );
  const listScopeStmt = db.prepare(
    'SELECT * FROM components WHERE scope = ? ORDER BY created_at ASC, id ASC',
  );
  const removeStmt = db.prepare('DELETE FROM components WHERE id = ?');
  const insertVersionStmt = db.prepare(
    `INSERT INTO component_versions (id, component_id, version, record_json, published_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const listVersionsStmt = db.prepare(
    'SELECT * FROM component_versions WHERE component_id = ? ORDER BY published_at ASC, id ASC',
  );

  return {
    upsert(record) {
      upsertStmt.run(
        record.id,
        record.projectId,
        record.name,
        record.scope,
        JSON.stringify(record.schema),
        record.createdAt,
        record.updatedAt,
      );
    },
    getById(id) {
      const row = getStmt.get(id) as ComponentRow | undefined;
      return row ? toRecord(row) : null;
    },
    listByProject(projectId) {
      return (listProjectStmt.all(projectId) as ComponentRow[]).map(toRecord);
    },
    listByScope(scope) {
      return (listScopeStmt.all(scope) as ComponentRow[]).map(toRecord);
    },
    remove(id) {
      return removeStmt.run(id).changes > 0;
    },
    insertVersion(row) {
      insertVersionStmt.run(
        row.id,
        row.componentId,
        row.version,
        JSON.stringify(row.record),
        row.publishedAt,
      );
    },
    listVersions(componentId) {
      return (listVersionsStmt.all(componentId) as VersionRow[]).map(toVersion);
    },
  };
}
