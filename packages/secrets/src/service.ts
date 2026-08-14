/**
 * SecretStore (M4 — M4-CONTRACTS §2.1/§9, D25): API do secret store local.
 *
 * - storeSecret: cifra (AES-256-GCM) e persiste; o valor NUNCA é retornado.
 * - getSecretMetadata / listSecrets: metadata apenas (sem material cifrado).
 * - rotateSecret: re-cifra com novo valor (iv novo); FORBIDDEN se revoked.
 * - revokeSecret: revokedAt setado; usos futuros falham FORBIDDEN (§2.1).
 * - deleteSecret: remove de vez; CONFLICT se não revoked (§2.1).
 * - useSecret: plaintext SOMENTE em memória, para injeção na chamada
 *   (RT&SEC §71); nunca logado/auditado/persistido.
 * - redactSecrets: padrões conhecidos + valores atuais do store -> '***'
 *   (RT&SEC §28-29).
 *
 * Audit: toda operação emite via emitAudit injetado (store/rotate/revoke/
 * delete/access-use) com id/name/scope apenas — NUNCA o valor (M4 §9).
 */

import { newOperationId, err, ok, type Result } from '@nexo/shared';
import {
  createSecretRepository,
  defaultDataDir,
  type SecretRecord,
  type SecretRepository,
  type Storage,
} from '@nexo/storage';

import {
  decryptSecret,
  encryptSecret,
  loadMasterKey,
} from './crypto.js';
import { secretError } from './errors.js';
import {
  MIN_STORE_VALUE_REDACTION_LENGTH,
  redactPatterns,
  redactValues,
} from './redaction.js';
import {
  noopEmitAudit,
  type EmitAudit,
  type SecretAuditEvent,
  type SecretListFilter,
  type SecretMetadata,
  type SecretScope,
  type StoreSecretInput,
} from './types.js';

export interface SecretStoreDeps {
  /** Storage real (Repository Pattern) — tabela secrets (migration v7). */
  storage: Storage;
  /** NEXO_HOME (default: env NEXO_HOME ou ~/.nexo, mesmo de defaultDataDir). */
  nexoHome?: string;
  /** Sink de audit injetado (default: descarta). Nunca recebe valor. */
  emitAudit?: EmitAudit;
}

export interface SecretStore {
  storeSecret(input: StoreSecretInput): Result<SecretMetadata>;
  getSecretMetadata(id: string): Result<SecretMetadata>;
  listSecrets(filter?: SecretListFilter): SecretMetadata[];
  rotateSecret(id: string, newValue: string): Result<SecretMetadata>;
  revokeSecret(id: string): Result<SecretMetadata>;
  deleteSecret(id: string): Result<SecretMetadata>;
  /** Plaintext SOMENTE em memória. FORBIDDEN se revoked. Nunca logar. */
  useSecret(id: string): Result<string>;
  /** Padrões conhecidos + valores atuais do store + extraSecrets -> '***'. */
  redactSecrets(text: string, extraSecrets?: readonly string[]): string;
}

function toMetadata(record: SecretRecord): SecretMetadata {
  return {
    id: record.id,
    name: record.name,
    scope: record.scope,
    projectId: record.projectId,
    providerId: record.providerId,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revokedAt: record.revokedAt,
  };
}

export function createSecretStore(deps: SecretStoreDeps): SecretStore {
  const repo: SecretRepository = createSecretRepository(deps.storage.db);
  const nexoHome = deps.nexoHome ?? defaultDataDir();
  const emit: EmitAudit = deps.emitAudit ?? noopEmitAudit;
  // Chave mestra carregada uma vez (gerada na 1ª execução, modo 0600 — D25).
  const keyResult = loadMasterKey(nexoHome);

  function audit(
    what: SecretAuditEvent['what'],
    result: SecretAuditEvent['result'],
    resource: string,
    details?: Record<string, unknown>,
  ): void {
    const event: SecretAuditEvent = {
      what,
      resource,
      result,
      at: new Date().toISOString(),
      ...(details !== undefined ? { details } : {}),
    };
    emit(event);
  }

  function auditFailure(
    what: SecretAuditEvent['what'],
    resource: string,
    error: { code: string },
    details?: Record<string, unknown>,
  ): void {
    audit(what, 'FAILED', resource, { ...details, errorCode: error.code });
  }

  function validateStoreInput(input: StoreSecretInput): Result<{
    name: string;
    scope: SecretScope;
    projectId: string | null;
    providerId: string | null;
    metadata: Record<string, unknown>;
  }> {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (name.length === 0) {
      return err(secretError('InvalidSecretInput', 'name nao pode ser vazio'));
    }
    if (typeof input.value !== 'string' || input.value.length === 0) {
      return err(
        secretError('InvalidSecretInput', 'value nao pode ser vazio', { resource: name }),
      );
    }
    if (input.scope !== 'WORKSPACE' && input.scope !== 'PROJECT') {
      return err(
        secretError('InvalidSecretInput', "scope deve ser 'WORKSPACE' ou 'PROJECT'", {
          resource: name,
        }),
      );
    }
    if (input.scope === 'PROJECT') {
      const projectId = typeof input.projectId === 'string' ? input.projectId.trim() : '';
      if (projectId.length === 0) {
        return err(
          secretError('InvalidSecretInput', 'scope PROJECT exige projectId', {
            resource: name,
          }),
        );
      }
      return ok({
        name,
        scope: input.scope,
        projectId,
        providerId: input.providerId ?? null,
        metadata: input.metadata ?? {},
      });
    }
    if (input.projectId !== undefined && input.projectId !== '') {
      return err(
        secretError(
          'InvalidSecretInput',
          'scope WORKSPACE nao aceita projectId',
          { resource: name },
        ),
      );
    }
    return ok({
      name,
      scope: input.scope,
      projectId: null,
      providerId: input.providerId ?? null,
      metadata: input.metadata ?? {},
    });
  }

  return {
    storeSecret(input) {
      const validated = validateStoreInput(input);
      if (!validated.ok) {
        auditFailure('secret.store', input.name ?? 'unknown', validated.error);
        return validated;
      }
      if (!keyResult.ok) return err(keyResult.error);
      const { name, scope, projectId, providerId, metadata } = validated.value;
      const encrypted = encryptSecret(keyResult.value, input.value);
      const now = new Date().toISOString();
      const record: SecretRecord = {
        id: newOperationId(),
        name,
        scope,
        projectId,
        providerId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        metadata,
        createdAt: now,
        updatedAt: now,
        revokedAt: null,
      };
      repo.insert(record);
      audit('secret.store', 'SUCCESS', record.id, { name, scope });
      return ok(toMetadata(record));
    },

    getSecretMetadata(id) {
      const record = repo.getById(id);
      if (record === null) {
        return err(
          secretError('SecretNotFound', `secret '${id}' nao encontrado`, { resource: id }),
        );
      }
      return ok(toMetadata(record));
    },

    listSecrets(filter) {
      return repo.list(filter?.projectId).map(toMetadata);
    },

    rotateSecret(id, newValue) {
      const record = repo.getById(id);
      if (record === null) {
        const error = secretError('SecretNotFound', `secret '${id}' nao encontrado`, {
          resource: id,
        });
        auditFailure('secret.rotate', id, error);
        return err(error);
      }
      if (record.revokedAt !== null) {
        const error = secretError(
          'SecretRevoked',
          `secret '${record.name}' esta revogado; armazene um novo em vez de rotacionar`,
          { resource: id },
        );
        auditFailure('secret.rotate', id, error, { name: record.name });
        return err(error);
      }
      if (typeof newValue !== 'string' || newValue.length === 0) {
        const error = secretError('InvalidSecretInput', 'newValue nao pode ser vazio', {
          resource: id,
        });
        auditFailure('secret.rotate', id, error, { name: record.name });
        return err(error);
      }
      if (!keyResult.ok) return err(keyResult.error);
      const encrypted = encryptSecret(keyResult.value, newValue);
      const updatedAt = new Date().toISOString();
      repo.updateMaterial(id, {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        updatedAt,
      });
      audit('secret.rotate', 'SUCCESS', id, { name: record.name, scope: record.scope });
      const updated = repo.getById(id);
      // updateMaterial confirmou o row; se sumiu entre as duas leituras, NOT_FOUND honesto
      if (updated === null) {
        return err(
          secretError('SecretNotFound', `secret '${id}' nao encontrado`, { resource: id }),
        );
      }
      return ok(toMetadata(updated));
    },

    revokeSecret(id) {
      const record = repo.getById(id);
      if (record === null) {
        const error = secretError('SecretNotFound', `secret '${id}' nao encontrado`, {
          resource: id,
        });
        auditFailure('secret.revoke', id, error);
        return err(error);
      }
      if (record.revokedAt !== null) {
        // Idempotente: ja revogado — preserva o revokedAt original.
        audit('secret.revoke', 'SUCCESS', id, {
          name: record.name,
          alreadyRevoked: true,
        });
        return ok(toMetadata(record));
      }
      const revokedAt = new Date().toISOString();
      repo.setRevoked(id, revokedAt);
      audit('secret.revoke', 'SUCCESS', id, { name: record.name, scope: record.scope });
      return ok(toMetadata({ ...record, revokedAt }));
    },

    deleteSecret(id) {
      const record = repo.getById(id);
      if (record === null) {
        const error = secretError('SecretNotFound', `secret '${id}' nao encontrado`, {
          resource: id,
        });
        auditFailure('secret.delete', id, error);
        return err(error);
      }
      if (record.revokedAt === null) {
        const error = secretError(
          'DeleteRequiresRevoke',
          `secret '${record.name}' so pode ser deletado apos revoke`,
          { resource: id },
        );
        auditFailure('secret.delete', id, error, { name: record.name });
        return err(error);
      }
      repo.remove(id);
      audit('secret.delete', 'SUCCESS', id, { name: record.name, scope: record.scope });
      return ok(toMetadata(record));
    },

    useSecret(id) {
      const record = repo.getById(id);
      if (record === null) {
        const error = secretError('SecretNotFound', `secret '${id}' nao encontrado`, {
          resource: id,
        });
        auditFailure('secret.access-use', id, error);
        return err(error);
      }
      if (record.revokedAt !== null) {
        const error = secretError(
          'SecretRevoked',
          `secret '${record.name}' esta revogado; usos futuros falham`,
          { resource: id },
        );
        auditFailure('secret.access-use', id, error, { name: record.name });
        return err(error);
      }
      if (!keyResult.ok) return err(keyResult.error);
      const decrypted = decryptSecret(keyResult.value, {
        ciphertext: record.ciphertext,
        iv: record.iv,
        authTag: record.authTag,
      });
      if (!decrypted.ok) {
        auditFailure('secret.access-use', id, decrypted.error, { name: record.name });
        return decrypted;
      }
      // Audit registra o ACESSO (quem/qual id), NUNCA o valor (M4 §9).
      audit('secret.access-use', 'SUCCESS', id, { name: record.name, scope: record.scope });
      return ok(decrypted.value);
    },

    redactSecrets(text, extraSecrets = []) {
      // Resolve TODOS os valores do store (incl. revoked — revogado ainda vaza
      // se impresso) decifrando SOMENTE em memória; nunca persiste/loga.
      const storeValues: string[] = [];
      if (keyResult.ok) {
        for (const record of repo.list()) {
          const decrypted = decryptSecret(keyResult.value, {
            ciphertext: record.ciphertext,
            iv: record.iv,
            authTag: record.authTag,
          });
          if (decrypted.ok && decrypted.value.length >= MIN_STORE_VALUE_REDACTION_LENGTH) {
            storeValues.push(decrypted.value);
          }
        }
      }
      return redactPatterns(redactValues(text, [...storeValues, ...extraSecrets]));
    },
  };
}
