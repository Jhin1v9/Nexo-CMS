/**
 * Editor Recovery (07§65): pending state persistido via @nexo/storage
 * (Repository Pattern, decisao D10 — "Nexo stores what Nexo owns").
 *
 *  - Crash/reload: drafts (pending changes e buffers nao salvos) sobrevivem
 *    na tabela `editor_drafts` do nexo.db (migration storage version 4
 *    'm3-editor-drafts' — version RESERVADA ao editor pelo orquestrador M3).
 *  - Recovery data NUNCA e tratada como Source Project (07§65): drafts sao
 *    devolvidos embrulhados em RecoveredDraft, explicitamente marcados como
 *    rascunho (`isDraft: true`) — distinguiveis do source persistido.
 *  - Restaurar um draft re-verifica o estado real do disco: se o source mudou
 *    desde a captura do `before`, a restauracao recusa com CONFLICT (nunca
 *    reaplica sobre mudanca externa — 07§38/§59).
 *
 * Nota de fronteira: o repository vive neste pacote operando sobre o handle
 * `Storage['db']` para minimizar edicao concorrente em packages/storage nesta
 * wave; a migration (dono do schema) esta em packages/storage com o version
 * reservado 4. Se o orquestrador preferir o repo dentro de storage, mover e
 * mecanico (mesma interface).
 */

import { err, nexoError, ok, type Result } from '@nexo/shared';
import type { Storage } from '@nexo/storage';

import type { ChangeObject } from './types.js';

/** Handle SQLite exposto por @nexo/storage (sem dep direta em better-sqlite3). */
export type SqliteDb = Storage['db'];

export type DraftKind = 'pending-change' | 'unsaved-buffer';

export interface EditorDraft {
  id: string;
  projectId: string;
  kind: DraftKind;
  /** ChangeObject (pending-change) ou UnsavedBuffer (unsaved-buffer). */
  payload: unknown;
  updatedAt: string; // ISO 8601
}

/** Buffer nao persistido de um save que falhou (07§37 + 07§65). */
export interface UnsavedBuffer {
  filePath: string;
  content: string;
  failedAt: string;
  reason: string;
}

/**
 * Draft recuperado — SEMPRE distinguivel do source persistido (07§65):
 * `isDraft: true` e origem explicita 'recovery-store'.
 */
export interface RecoveredDraft {
  id: string;
  projectId: string;
  kind: DraftKind;
  isDraft: true;
  source: 'recovery-store';
  change?: ChangeObject;
  buffer?: UnsavedBuffer;
  persistedAt: string;
  recoveredAt: string;
}

export interface DraftStore {
  saveDraft(draft: EditorDraft): void;
  getDraft(projectId: string, draftId: string): EditorDraft | undefined;
  listDrafts(projectId: string): EditorDraft[];
  deleteDraft(projectId: string, draftId: string): void;
}

interface DraftRow {
  id: string;
  project_id: string;
  kind: string;
  payload_json: string;
  updated_at: string;
}

/**
 * DraftStore SQLite sobre o nexo.db do @nexo/storage. A tabela e criada pela
 * migration reservada (storage version 4); o CREATE IF NOT EXISTS aqui e
 * defesa idempotente para stores construidos sobre dbs sem migration (testes
 * unitarios isolados), nunca substitui a migration.
 */
export function createSqliteDraftStore(db: SqliteDb): DraftStore {
  db.exec(`
    CREATE TABLE IF NOT EXISTS editor_drafts (
      id           TEXT PRIMARY KEY,
      project_id   TEXT NOT NULL,
      kind         TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_editor_drafts_project ON editor_drafts(project_id, updated_at);
  `);

  const upsert = db.prepare(
    `INSERT INTO editor_drafts (id, project_id, kind, payload_json, updated_at)
     VALUES (@id, @project_id, @kind, @payload_json, @updated_at)
     ON CONFLICT(id) DO UPDATE SET payload_json = @payload_json, updated_at = @updated_at`,
  );
  const selectOne = db.prepare('SELECT * FROM editor_drafts WHERE id = ? AND project_id = ?');
  const selectAll = db.prepare('SELECT * FROM editor_drafts WHERE project_id = ? ORDER BY updated_at ASC');
  const remove = db.prepare('DELETE FROM editor_drafts WHERE id = ? AND project_id = ?');

  const toDraft = (row: DraftRow): EditorDraft => ({
    id: row.id,
    projectId: row.project_id,
    kind: row.kind as DraftKind,
    payload: JSON.parse(row.payload_json) as unknown,
    updatedAt: row.updated_at,
  });

  return {
    saveDraft(draft) {
      upsert.run({
        id: draft.id,
        project_id: draft.projectId,
        kind: draft.kind,
        payload_json: JSON.stringify(draft.payload),
        updated_at: draft.updatedAt,
      });
    },
    getDraft(projectId, draftId) {
      const row = selectOne.get(draftId, projectId) as DraftRow | undefined;
      return row === undefined ? undefined : toDraft(row);
    },
    listDrafts(projectId) {
      return (selectAll.all(projectId) as DraftRow[]).map(toDraft);
    },
    deleteDraft(projectId, draftId) {
      remove.run(draftId, projectId);
    },
  };
}

/** Wrap 07§65: todo draft recuperado sai marcado como rascunho, nunca source. */
export function toRecoveredDraft(draft: EditorDraft, recoveredAt: string): RecoveredDraft {
  const base: RecoveredDraft = {
    id: draft.id,
    projectId: draft.projectId,
    kind: draft.kind,
    isDraft: true,
    source: 'recovery-store',
    persistedAt: draft.updatedAt,
    recoveredAt,
  };
  if (draft.kind === 'pending-change') base.change = draft.payload as ChangeObject;
  if (draft.kind === 'unsaved-buffer') base.buffer = draft.payload as UnsavedBuffer;
  return base;
}

/**
 * Verifica se um draft de pending-change ainda e compativel com o disco
 * (07§59: nunca continuar editando representacao obsoleta). Retorna a lista
 * de arquivos cujo hash atual diverge do `before` capturado.
 */
export async function findStaleFiles(
  change: ChangeObject,
  readFile: (file: string) => Promise<Result<string>>,
  sha256: (content: string) => string,
): Promise<Result<string[]>> {
  const stale: string[] = [];
  for (const file of change.files) {
    const before = change.before[file];
    const current = await readFile(file);
    if (before === null || before === undefined) {
      if (current.ok) stale.push(file); // criado externamente
      else if (current.error.code !== 'NOT_FOUND') return err(current.error);
      continue;
    }
    if (!current.ok) {
      if (current.error.code === 'NOT_FOUND') stale.push(file); // removido externamente
      else return err(current.error);
      continue;
    }
    if (sha256(current.value) !== sha256(before)) stale.push(file);
  }
  if (stale.length > 0) {
    return err(
      nexoError('CONFLICT', 'recovered draft is stale: source changed since the draft was captured (07§59)', {
        details: { staleFiles: stale, changeId: change.id, nextAction: 'discard the draft or resolve the external changes' },
      }),
    );
  }
  return ok([]);
}
