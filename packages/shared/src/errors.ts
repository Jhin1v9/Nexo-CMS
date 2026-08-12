/**
 * Erros estruturados agent-friendly (SPEC.md §0/§2 — contrato congelado).
 */

export type ErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'STALE_CONTEXT'
  | 'UNSUPPORTED'
  | 'UNKNOWN'
  | 'REQUIRE_APPROVAL'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'SCOPE_VIOLATION'
  | 'COMMAND_BLOCKED'
  | 'INTERNAL'
  | 'STORAGE_UNAVAILABLE';

export interface NexoError {
  code: ErrorCode;
  message: string;
  operationId?: string;
  resource?: string;
  retryable: boolean;
  requiresApproval?: boolean;
  requiredCapability?: string;
  details?: Record<string, unknown>;
}

/** Construtor de conveniência para NexoError (retryable explícito, SPEC §0). */
export function nexoError(
  code: ErrorCode,
  message: string,
  opts: Omit<NexoError, 'code' | 'message' | 'retryable'> & { retryable?: boolean } = {},
): NexoError {
  const { retryable = false, ...rest } = opts;
  return { code, message, retryable, ...rest };
}
