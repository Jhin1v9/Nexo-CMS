/**
 * @nexo/secrets — Secret store local M4 (M4-CONTRACTS §2.1/§9; D25; RT&SEC
 * §28-29/§69-71). AES-256-GCM (node:crypto, zero deps novas), chave mestra em
 * NEXO_HOME/keys/master.key (0600), registros cifrados na migration v7 de
 * @nexo/storage. Secrets NUNCA em logs/audit/diff/context/UI; plaintext só em
 * memória via useSecret. Capabilities secret.*: registradas no runtime (M4
 * Wave posterior) sobre esta API.
 */

export type {
  EmitAudit,
  SecretAuditEvent,
  SecretListFilter,
  SecretMetadata,
  SecretScope,
  StoreSecretInput,
} from './types.js';
export { noopEmitAudit } from './types.js';

export type { SecretErrorKind, SecretErrorOptions } from './errors.js';
export { secretError } from './errors.js';

export {
  GCM_AUTH_TAG_BYTES,
  GCM_IV_BYTES,
  KEYS_DIRNAME,
  MASTER_KEY_BYTES,
  MASTER_KEY_FILENAME,
  masterKeyPath,
} from './crypto.js';

export type { SecretPattern } from './redaction.js';
export {
  MIN_STORE_VALUE_REDACTION_LENGTH,
  REDACTED_PLACEHOLDER,
  redactPatterns,
  redactText,
  redactValues,
  SECRET_PATTERNS,
} from './redaction.js';

export type { SecretStore, SecretStoreDeps } from './service.js';
export { createSecretStore } from './service.js';
