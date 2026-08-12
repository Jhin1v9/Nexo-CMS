/** WorkspaceRepository (SPEC §5) — minimo M1: insert/getById/list. */

import type Database from 'better-sqlite3';

import type { Workspace, WorkspaceStatus } from '../types.js';

export interface WorkspaceRepository {
  insert(w: Workspace): void;
  getById(id: string): Workspace | null;
  list(): Workspace[];
}

interface WorkspaceRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    status: row.status as WorkspaceStatus,
    createdAt: row.created_at,
  };
}

export function createWorkspaceRepository(db: Database.Database): WorkspaceRepository {
  const insertStmt = db.prepare(
    'INSERT INTO workspaces (id, name, status, created_at) VALUES (?, ?, ?, ?)',
  );
  const getStmt = db.prepare('SELECT * FROM workspaces WHERE id = ?');
  const listStmt = db.prepare('SELECT * FROM workspaces ORDER BY created_at ASC');

  return {
    insert(w) {
      insertStmt.run(w.id, w.name, w.status, w.createdAt);
    },
    getById(id) {
      const row = getStmt.get(id) as WorkspaceRow | undefined;
      return row ? toWorkspace(row) : null;
    },
    list() {
      return (listStmt.all() as WorkspaceRow[]).map(toWorkspace);
    },
  };
}
