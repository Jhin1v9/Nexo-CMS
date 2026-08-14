/**
 * SecretRepository (M4 — M4-CONTRACTS §2.1/§9, D25).
 * Persistência do secret store local na tabela secrets (migration v7).
 * Este repository NUNCA vê plaintext: recebe/devolve apenas ciphertext +
 * iv + authTag (AES-256-GCM aplicado por @nexo/secrets). metadata é JSON
 * estrutural sem secret material (WM §24).
 * Não há update de metadata/name aqui de propósito: as únicas mutações de
 * material são rotate (novo ciphertext/iv/authTag) e revoke (revoked_at).
 */

import type Database from 'better-sqlite3';

import type { SecretRecord } from '../types.js';

/** Material cifrado novo gravado num rotate (updatedAt obrigatório). */
export interface SecretMaterialUpdate {
  ciphertext: string;
  iv: string;
  authTag: string;
  updatedAt: string; // ISO 8601
}

export interface SecretRepository {
  insert(record: SecretRecord): void;
  getById(id: string): SecretRecord | null;
  /** projectId omitido => todos os registros (metadata + material cifrado). */
  list(projectId?: string): SecretRecord[];
  /** Rotate: substitui material cifrado. Retorna false se id inexistente. */
  updateMaterial(id: string, material: SecretMaterialUpdate): boolean;
  /** Revoke: seta revoked_at. Retorna false se id inexistente. */
  setRevoked(id: string, revokedAt: string): boolean;
  /** Delete físico — @nexo/secrets só chama quando revoked (CONTRACT §2.1). */
  remove(id: string): boolean;
}

interface SecretRow {
  id: string;
  name: string;
  scope: 'WORKSPACE' | 'PROJECT';
  project_id: string | null;
  provider_id: string | null;
  ciphertext: string;
  iv: string;
  auth_tag: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
}

function toRecord(row: SecretRow): SecretRecord {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    projectId: row.project_id,
    providerId: row.provider_id,
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.auth_tag,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at,
  };
}

export function createSecretRepository(db: Database.Database): SecretRepository {
  const insertStmt = db.prepare(
    `INSERT INTO secrets
       (id, name, scope, project_id, provider_id, ciphertext, iv, auth_tag,
        metadata_json, created_at, updated_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const getStmt = db.prepare('SELECT * FROM secrets WHERE id = ?');
  const listAllStmt = db.prepare('SELECT * FROM secrets ORDER BY created_at ASC, id ASC');
  const listProjectStmt = db.prepare(
    `SELECT * FROM secrets
     WHERE project_id = ? OR scope = 'WORKSPACE'
     ORDER BY created_at ASC, id ASC`,
  );
  const updateMaterialStmt = db.prepare(
    `UPDATE secrets
     SET ciphertext = ?, iv = ?, auth_tag = ?, updated_at = ?
     WHERE id = ?`,
  );
  const setRevokedStmt = db.prepare('UPDATE secrets SET revoked_at = ? WHERE id = ?');
  const removeStmt = db.prepare('DELETE FROM secrets WHERE id = ?');

  return {
    insert(record) {
      insertStmt.run(
        record.id,
        record.name,
        record.scope,
        record.projectId,
        record.providerId,
        record.ciphertext,
        record.iv,
        record.authTag,
        JSON.stringify(record.metadata),
        record.createdAt,
        record.updatedAt,
        record.revokedAt,
      );
    },
    getById(id) {
      const row = getStmt.get(id) as SecretRow | undefined;
      return row ? toRecord(row) : null;
    },
    list(projectId) {
      if (projectId === undefined) {
        return (listAllStmt.all() as SecretRow[]).map(toRecord);
      }
      return (listProjectStmt.all(projectId) as SecretRow[]).map(toRecord);
    },
    updateMaterial(id, material) {
      return (
        updateMaterialStmt.run(
          material.ciphertext,
          material.iv,
          material.authTag,
          material.updatedAt,
          id,
        ).changes > 0
      );
    },
    setRevoked(id, revokedAt) {
      return setRevokedStmt.run(revokedAt, id).changes > 0;
    },
    remove(id) {
      return removeStmt.run(id).changes > 0;
    },
  };
}
