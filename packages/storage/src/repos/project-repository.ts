/**
 * ProjectRepository (SPEC §5).
 * projects.id = uuid estavel fornecido pelo caller (control-plane), NUNCA
 * derivado de rootPath. findByRootPath existe para reimport idempotente:
 * mesmo path -> mesmo registro (update preserva id).
 */

import type Database from 'better-sqlite3';

import type { ProjectRegistration, ProjectStatus } from '../types.js';

export interface ProjectRepository {
  insert(p: ProjectRegistration): void;
  getById(id: string): ProjectRegistration | null;
  findByRootPath(rootPath: string): ProjectRegistration | null;
  update(p: ProjectRegistration): void;
  list(): ProjectRegistration[];
}

interface ProjectRow {
  id: string;
  name: string;
  root_path: string;
  fingerprint: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function toProject(row: ProjectRow): ProjectRegistration {
  return {
    id: row.id,
    name: row.name,
    rootPath: row.root_path,
    fingerprint: row.fingerprint,
    status: row.status as ProjectStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProjectRepository(db: Database.Database): ProjectRepository {
  const insertStmt = db.prepare(
    `INSERT INTO projects (id, name, root_path, fingerprint, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const getStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  const findByPathStmt = db.prepare('SELECT * FROM projects WHERE root_path = ?');
  const updateStmt = db.prepare(
    `UPDATE projects
       SET name = ?, root_path = ?, fingerprint = ?, status = ?, created_at = ?, updated_at = ?
     WHERE id = ?`,
  );
  const listStmt = db.prepare('SELECT * FROM projects ORDER BY created_at ASC');

  return {
    insert(p) {
      insertStmt.run(p.id, p.name, p.rootPath, p.fingerprint, p.status, p.createdAt, p.updatedAt);
    },
    getById(id) {
      const row = getStmt.get(id) as ProjectRow | undefined;
      return row ? toProject(row) : null;
    },
    findByRootPath(rootPath) {
      const row = findByPathStmt.get(rootPath) as ProjectRow | undefined;
      return row ? toProject(row) : null;
    },
    update(p) {
      updateStmt.run(p.name, p.rootPath, p.fingerprint, p.status, p.createdAt, p.updatedAt, p.id);
    },
    list() {
      return (listStmt.all() as ProjectRow[]).map(toProject);
    },
  };
}
