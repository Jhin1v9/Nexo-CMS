/**
 * ResponsiveViewportRepository (M3 — doc 09§24/§25/§26).
 * Registry persistente de viewports (tabela responsive_viewports, migration v3
 * RESERVADA para @nexo/responsive — coordenação do orquestrador).
 * id = uuid estável fornecido pelo caller (@nexo/responsive), nunca derivado
 * de dimensões. Presets são dados configuráveis (isPreset), não verdade
 * universal (09§25/§62).
 */

import type Database from 'better-sqlite3';

import type { ResponsiveViewportRecord } from '../types.js';

export interface ResponsiveViewportRepository {
  insert(v: ResponsiveViewportRecord): void;
  getById(id: string): ResponsiveViewportRecord | null;
  list(): ResponsiveViewportRecord[];
  /** Retorna true se uma row foi removida de fato (nunca finge delete). */
  delete(id: string): boolean;
}

interface ViewportRow {
  id: string;
  name: string | null;
  width: number;
  height: number;
  dpr: number | null;
  orientation: string;
  is_preset: number;
  created_at: string;
}

function toViewport(row: ViewportRow): ResponsiveViewportRecord {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    dpr: row.dpr,
    orientation: row.orientation as ResponsiveViewportRecord['orientation'],
    isPreset: row.is_preset === 1,
    createdAt: row.created_at,
  };
}

export function createResponsiveViewportRepository(
  db: Database.Database,
): ResponsiveViewportRepository {
  const insertStmt = db.prepare(
    `INSERT INTO responsive_viewports (id, name, width, height, dpr, orientation, is_preset, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const getStmt = db.prepare('SELECT * FROM responsive_viewports WHERE id = ?');
  const listStmt = db.prepare('SELECT * FROM responsive_viewports ORDER BY created_at ASC');
  const deleteStmt = db.prepare('DELETE FROM responsive_viewports WHERE id = ?');

  return {
    insert(v) {
      insertStmt.run(v.id, v.name, v.width, v.height, v.dpr, v.orientation, v.isPreset ? 1 : 0, v.createdAt);
    },
    getById(id) {
      const row = getStmt.get(id) as ViewportRow | undefined;
      return row ? toViewport(row) : null;
    },
    list() {
      return (listStmt.all() as ViewportRow[]).map(toViewport);
    },
    delete(id) {
      return deleteStmt.run(id).changes > 0;
    },
  };
}
