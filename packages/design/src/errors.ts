/**
 * Erros do Design Engine (padrao @nexo/media e @nexo/git): o NexoError.code
 * vem do contrato congelado (SPEC §0) e `details.designError` carrega o
 * DesignErrorKind machine-readable + `nextAction` acionavel.
 */

import { nexoError, type ErrorCode, type NexoError } from '@nexo/shared';

export type DesignErrorKind =
  /** Token nao encontrado em nenhum mecanismo suportado. */
  | 'TokenNotFound'
  /** Mesma variavel/token definido em mais de uma fonte; recusar adivinhar. */
  | 'AmbiguousToken'
  /** Projeto NAO tem theme system; proibido introduzir tema paralelo (09§53). */
  | 'NoThemeSystem'
  /** Tema pedido nao existe entre os temas detectados. */
  | 'ThemeNotFound'
  /** Variavel nao declarada no tema alvo (update-only nesta wave). */
  | 'ThemeVariableNotFound'
  /** Mecanismo sem suporte de escrita nesta wave (D6: detection-only). */
  | 'UnsupportedMechanism'
  /** PropertySource Unknown/ausente: exige escolha explicita (09§7, 09§75). */
  | 'UnknownPropertySource'
  /** Edicao desanexaria instancia de token compartilhado sem intencao explicita (09§56). */
  | 'DetachRequiresIntent'
  /** Input incompleto para a rota escolhida (ex.: classList ausente). */
  | 'MissingInput'
  /** Escape de path fora do Project Root (SPEC §4). */
  | 'ScopeViolation'
  /** Falha de escrita no filesystem. */
  | 'WriteFailed'
  /** Verificacao pos-escrita falhou (No Fake Success, M3 §8.4). */
  | 'VerificationFailed';

const KIND_TO_CODE: Record<DesignErrorKind, ErrorCode> = {
  TokenNotFound: 'NOT_FOUND',
  AmbiguousToken: 'INVALID_INPUT',
  NoThemeSystem: 'UNKNOWN',
  ThemeNotFound: 'NOT_FOUND',
  ThemeVariableNotFound: 'NOT_FOUND',
  UnsupportedMechanism: 'UNSUPPORTED',
  UnknownPropertySource: 'UNKNOWN',
  DetachRequiresIntent: 'CONFLICT',
  MissingInput: 'INVALID_INPUT',
  ScopeViolation: 'SCOPE_VIOLATION',
  WriteFailed: 'INTERNAL',
  VerificationFailed: 'INTERNAL',
};

const KIND_NEXT_ACTION: Record<DesignErrorKind, string> = {
  TokenNotFound: 'list-tokens-via-design.token.read',
  AmbiguousToken: 'refine-target-with-explicit-file',
  NoThemeSystem: 'explicitly-request-new-theme-architecture',
  ThemeNotFound: 'list-themes-via-theme.read',
  ThemeVariableNotFound: 'declare-variable-in-theme-source-first',
  UnsupportedMechanism: 'edit-source-directly-or-extend-styling-adapter',
  UnknownPropertySource: 'resolve-property-source-explicitly',
  DetachRequiresIntent: 'confirm-explicitDetach-or-update-token-source',
  MissingInput: 'provide-required-field-for-route',
  ScopeViolation: 'keep-paths-inside-project-root',
  WriteFailed: 'retry-or-inspect-filesystem',
  VerificationFailed: 'inspect-file-state-before-retry',
};

export interface DesignErrorOptions {
  operationId?: string;
  resource?: string;
  details?: Record<string, unknown>;
  requiresApproval?: boolean;
}

/** Converte um DesignErrorKind em NexoError estruturado (details.designError). */
export function designError(
  kind: DesignErrorKind,
  message: string,
  opts: DesignErrorOptions = {},
): NexoError {
  return nexoError(KIND_TO_CODE[kind], message, {
    ...(opts.operationId !== undefined ? { operationId: opts.operationId } : {}),
    ...(opts.resource !== undefined ? { resource: opts.resource } : {}),
    retryable: false,
    ...(opts.requiresApproval === true ? { requiresApproval: true } : {}),
    details: {
      designError: kind,
      nextAction: KIND_NEXT_ACTION[kind],
      ...opts.details,
    },
  });
}
