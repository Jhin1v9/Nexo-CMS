/**
 * Result<T, E> (SPEC.md §2 — contrato congelado).
 * Nunca lançar exceção para falha esperada: retornar err().
 */

import type { NexoError } from './errors.js';

export type Result<T, E = NexoError> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends NexoError = NexoError>(error: E): Result<never, E> {
  return { ok: false, error };
}
