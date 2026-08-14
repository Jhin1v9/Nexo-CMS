/**
 * Erros do Component Engine (doc 08; padrao de classificacao de @nexo/media):
 * `details.componentError` carrega o ComponentErrorKind machine-readable e o
 * NexoError.code mapeia para o contrato congelado SPEC §0. `nextAction`
 * orienta o proximo passo do agente.
 */

import { nexoError, type ErrorCode, type NexoError } from '@nexo/shared';

export type ComponentErrorKind =
  /** Componente nao encontrado no registry/escopo. */
  | 'ComponentNotFound'
  /** Nome duplicado no mesmo escopo (08§79 — duplication prevention). */
  | 'DuplicateComponent'
  /** Stack do projeto fora do write-path M3 (React+TSX — D6). */
  | 'UnsupportedStack'
  /** Escopo de criacao/mutacao nao suportado nesta wave. */
  | 'UnsupportedScope'
  /** Tipo de source sem operacao de escrita (ex.: ExternalWidget). */
  | 'UnsupportedSourceKind'
  /** Definicao invalida (nome, props, variants) — validada antes de mutar (08§12). */
  | 'InvalidDefinition'
  /** Transformacao AST falhou (diagnosticos do transformer propagados). */
  | 'TransformFailed'
  /** Falha de persistencia no disco. */
  | 'PersistenceFailed'
  /** Verificacao pos-escrita/re-analise falhou (No Fake Success, M3 §8.4). */
  | 'VerificationFailed'
  /** Escape de path fora do Project Root (SPEC §4). */
  | 'ScopeViolation'
  /** Delete bloqueado: referencias ativas sem confirm:true (08§23). */
  | 'DeleteBlockedByReferences'
  /** Delete bloqueado: scan de impacto incompleto (Unknown nunca = sem refs). */
  | 'DeleteBlockedImpactUnknown'
  /** Publish bloqueado: referencias privadas nao resolviveis (08§25/§74). */
  | 'PublishBlockedPrivateReferences'
  /** Publish bloqueado: segredo detectado no source/deps (08§65/§74). */
  | 'PublishBlockedSecretLeakage'
  /** Publish bloqueado: validacao §74 falhou (detalhe em PublishValidation). */
  | 'PublishValidationFailed';

const KIND_TO_CODE: Record<ComponentErrorKind, ErrorCode> = {
  ComponentNotFound: 'NOT_FOUND',
  DuplicateComponent: 'CONFLICT',
  UnsupportedStack: 'UNSUPPORTED',
  UnsupportedScope: 'UNSUPPORTED',
  UnsupportedSourceKind: 'UNSUPPORTED',
  InvalidDefinition: 'INVALID_INPUT',
  TransformFailed: 'INTERNAL',
  PersistenceFailed: 'INTERNAL',
  VerificationFailed: 'INTERNAL',
  ScopeViolation: 'SCOPE_VIOLATION',
  DeleteBlockedByReferences: 'CONFLICT',
  DeleteBlockedImpactUnknown: 'UNKNOWN',
  PublishBlockedPrivateReferences: 'FORBIDDEN',
  PublishBlockedSecretLeakage: 'FORBIDDEN',
  PublishValidationFailed: 'INVALID_INPUT',
};

const KIND_NEXT_ACTION: Partial<Record<ComponentErrorKind, string>> = {
  ComponentNotFound: 'component.list-para-ver-ids-validos',
  DuplicateComponent: 'reuse-existing-component-or-choose-another-name',
  UnsupportedStack: 'stack-first-class-m3-react-tsx-apenas',
  UnsupportedScope: 'use-scope-Project',
  UnsupportedSourceKind: 'operacao-disponivel-apenas-para-source-em-arquivo',
  InvalidDefinition: 'fix-definition-and-retry',
  TransformFailed: 'inspect-diagnostics-and-retry',
  DeleteBlockedByReferences: 'confirm:true-para-deletar-e-receber-referencias-quebradas',
  DeleteBlockedImpactUnknown: 'fix-unreadable-files-and-retry-scan',
  PublishBlockedPrivateReferences: 'inline-ou-mova-dependencia-para-dir-compartilhado',
  PublishBlockedSecretLeakage: 'remova-segredos-do-source-antes-de-publicar',
  PublishValidationFailed: 'inspect-publishValidation-and-fix',
};

export interface ComponentErrorOptions {
  operationId?: string;
  resource?: string;
  details?: Record<string, unknown>;
}

/** Converte um ComponentErrorKind em NexoError estruturado (details.componentError machine-readable). */
export function componentError(
  kind: ComponentErrorKind,
  message: string,
  opts: ComponentErrorOptions = {},
): NexoError {
  const nextAction = KIND_NEXT_ACTION[kind];
  return nexoError(KIND_TO_CODE[kind], message, {
    ...(opts.operationId !== undefined ? { operationId: opts.operationId } : {}),
    ...(opts.resource !== undefined ? { resource: opts.resource } : {}),
    retryable: false,
    ...(kind === 'DeleteBlockedByReferences' ? { requiresApproval: true } : {}),
    details: {
      componentError: kind,
      ...(nextAction !== undefined ? { nextAction } : {}),
      ...opts.details,
    },
  });
}
