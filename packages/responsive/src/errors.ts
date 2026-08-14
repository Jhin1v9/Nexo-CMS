/**
 * Helper de erros do Responsive Lab (M3 §3: NexoError estável + details +
 * nextAction). Razões específicas (BROWSER_UNAVAILABLE etc.) viajam em
 * details.reason porque o ErrorCode de @nexo/shared é congelado (SPEC §0) e
 * este pacote não pode estendê-lo — nunca fork privado de contrato.
 */

import { nexoError, type ErrorCode, type NexoError } from '@nexo/shared';

import type { ResponsiveReasonCode } from './types.js';

export function responsiveError(
  code: ErrorCode,
  reason: ResponsiveReasonCode,
  message: string,
  opts: {
    resource?: string;
    retryable?: boolean;
    nextAction?: string;
    details?: Record<string, unknown>;
  } = {},
): NexoError {
  const { nextAction, details, ...rest } = opts;
  return nexoError(code, `${reason}: ${message}`, {
    ...rest,
    details: { reason, ...(nextAction !== undefined ? { nextAction } : {}), ...details },
  });
}
