/**
 * Tipos do @nexo/secrets (M4 — M4-CONTRACTS §2.1/§9, D25).
 * SecretMetadata NUNCA carrega valor nem material cifrado — é o único tipo
 * que sai do store para consumidores (capabilities secret.list/read).
 * O plaintext existe SOMENTE no retorno de useSecret(), em memória, para
 * injeção na chamada (RT&SEC §71) — nunca logado, auditado ou persistido.
 */

import type { OpStatus } from '@nexo/shared';

export type SecretScope = 'WORKSPACE' | 'PROJECT';

/** Metadata pública de um secret (M4-CONTRACTS §2.1 — valor NUNCA retornado). */
export interface SecretMetadata {
  id: string;
  name: string;
  scope: SecretScope;
  projectId: string | null;
  providerId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  revokedAt: string | null; // ISO 8601
}

/** Input de secret.store (M4-CONTRACTS §2.1). */
export interface StoreSecretInput {
  name: string;
  value: string; // plaintext — cifrado antes de persistir, nunca retornado
  scope: SecretScope;
  projectId?: string;
  providerId?: string;
  metadata?: Record<string, unknown>;
}

export interface SecretListFilter {
  projectId?: string;
}

/**
 * Evento de audit emitido pelo store via emitAudit injetado (M4-CONTRACTS §9:
 * secrets NUNCA em audit). O evento carrega somente metadata de correlação
 * (id/name/scope) — NUNCA o valor, ciphertext, iv ou authTag.
 * Espelho estrutural do padrão AuditEvent de @nexo/security; este package não
 * depende de @nexo/security (M4-CONTRACTS §1: deps só shared/core/storage),
 * então quem integra (runtime/control-plane) adapta para o AuditSink real.
 */
export interface SecretAuditEvent {
  /** secret.store | secret.rotate | secret.revoke | secret.delete | secret.access-use */
  what:
    | 'secret.store'
    | 'secret.rotate'
    | 'secret.revoke'
    | 'secret.delete'
    | 'secret.access-use';
  /** id do secret (nunca o valor). */
  resource: string;
  result: OpStatus;
  at: string; // ISO 8601
  details?: Record<string, unknown>; // name/scope/errorCode — NUNCA valor
}

/** Sink injetado nas operações do store; implementado pelo consumidor. */
export type EmitAudit = (event: SecretAuditEvent) => void;

/** EmitAudit que descarta (default quando o consumidor não injeta um sink). */
export const noopEmitAudit: EmitAudit = () => {};
