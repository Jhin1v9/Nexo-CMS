/**
 * Erros do @nexo/secrets (M4-CONTRACTS §2.1): NOT_FOUND, FORBIDDEN (revoked),
 * INVALID_INPUT, CONFLICT (delete sem revoke). Padrão de mediaError (D16):
 * details.secretError carrega o kind machine-readable e NexoError.code usa o
 * contrato congelado SPEC §0.
 */

import { nexoError, type ErrorCode, type NexoError } from '@nexo/shared';

export type SecretErrorKind =
  /** id não existe no store. */
  | 'SecretNotFound'
  /** Secret revogado: usos futuros (useSecret) falham FORBIDDEN (§2.1). */
  | 'SecretRevoked'
  /** Input inválido (name/value vazios, PROJECT sem projectId, etc.). */
  | 'InvalidSecretInput'
  /** Delete bloqueado: secret não revogado (delete só se revoked — §2.1). */
  | 'DeleteRequiresRevoke'
  /** Falha de FS/cripto na chave mestra ou no decrypt (nunca contém valor). */
  | 'SecretStoreUnavailable';

const KIND_TO_CODE: Record<SecretErrorKind, ErrorCode> = {
  SecretNotFound: 'NOT_FOUND',
  SecretRevoked: 'FORBIDDEN',
  InvalidSecretInput: 'INVALID_INPUT',
  DeleteRequiresRevoke: 'CONFLICT',
  SecretStoreUnavailable: 'INTERNAL',
};

const KIND_NEXT_ACTION: Partial<Record<SecretErrorKind, string>> = {
  SecretNotFound: 'check-secret-id',
  SecretRevoked: 'rotate-or-store-a-new-secret',
  InvalidSecretInput: 'fix-input-and-retry',
  DeleteRequiresRevoke: 'revoke-before-delete',
  SecretStoreUnavailable: 'check-nexo-home-keys-permissions',
};

export interface SecretErrorOptions {
  resource?: string;
  details?: Record<string, unknown>;
}

/** Converte um SecretErrorKind em NexoError estruturado (details.secretError machine-readable). */
export function secretError(
  kind: SecretErrorKind,
  message: string,
  opts: SecretErrorOptions = {},
): NexoError {
  const nextAction = KIND_NEXT_ACTION[kind];
  return nexoError(KIND_TO_CODE[kind], message, {
    ...(opts.resource !== undefined ? { resource: opts.resource } : {}),
    retryable: kind === 'SecretStoreUnavailable',
    details: {
      secretError: kind,
      ...(nextAction !== undefined ? { nextAction } : {}),
      ...opts.details,
    },
  });
}
