/**
 * Erros do Media Engine (doc 08§45/§51/§67 — padrão de classificação do
 * @nexo/git): `details.mediaError` carrega o MediaErrorKind machine-readable e
 * o NexoError.code mapeia para o contrato congelado SPEC §0 (ErrorCode não tem
 * UNSUPPORTED_MEDIA_TYPE — D16 nomeia o ERRO de domínio, que vai em details).
 */

import { nexoError, type ErrorCode, type NexoError } from '@nexo/shared';

export type MediaErrorKind =
  /** Magic bytes desconhecidos ou formato fora do conjunto suportado (08§45, D16). */
  | 'UnsupportedMediaType'
  /** Extensão do nome contradiz o MIME real detectado (08§45). */
  | 'MimeExtensionMismatch'
  /** SVG com conteúdo ativo: <script, on*=, javascript: (08§67). */
  | 'UnsafeSvgActiveContent'
  /** Conteúdo acima do limite configurável (default 25MB) (08§45 Size). */
  | 'FileTooLarge'
  /** Nenhum diretório de assets detectado e nenhum targetPath explícito (08§53). */
  | 'NoAssetDirectoryDetected'
  /** Mais de um diretório de assets candidato; targetPath explícito exigido (08§53). */
  | 'AmbiguousAssetDirectory'
  /** Nome de arquivo inválido (vazio, separadores, traversal, reservado) (08§45 Name). */
  | 'InvalidFileName'
  /** Asset não encontrado no registry. */
  | 'AssetNotFound'
  /** Replacement incompatível com o tipo do asset (08§48 Validate Compatibility). */
  | 'IncompatibleReplacement'
  /** Delete bloqueado: referências conhecidas sem confirm:true (08§51). */
  | 'DeleteBlockedByReferences'
  /** Delete bloqueado: uso Unknown (scan incompleto) — nunca tratar como Unused (08§50). */
  | 'DeleteBlockedUsageUnknown'
  /** Tentativa de deletar/modificar recurso remoto como se fosse local (08§55). */
  | 'ExternalAssetMutation'
  /** Escape de path fora do Project Root (SPEC §4). */
  | 'ScopeViolation'
  /** Verificação pós-escrita falhou (No Fake Success, M3 §8.4). */
  | 'VerificationFailed';

const KIND_TO_CODE: Record<MediaErrorKind, ErrorCode> = {
  UnsupportedMediaType: 'UNSUPPORTED',
  MimeExtensionMismatch: 'INVALID_INPUT',
  UnsafeSvgActiveContent: 'FORBIDDEN',
  FileTooLarge: 'INVALID_INPUT',
  NoAssetDirectoryDetected: 'UNKNOWN',
  AmbiguousAssetDirectory: 'INVALID_INPUT',
  InvalidFileName: 'INVALID_INPUT',
  AssetNotFound: 'NOT_FOUND',
  IncompatibleReplacement: 'INVALID_INPUT',
  DeleteBlockedByReferences: 'CONFLICT',
  DeleteBlockedUsageUnknown: 'UNKNOWN',
  ExternalAssetMutation: 'UNSUPPORTED',
  ScopeViolation: 'SCOPE_VIOLATION',
  VerificationFailed: 'INTERNAL',
};

const KIND_NEXT_ACTION: Partial<Record<MediaErrorKind, string>> = {
  UnsupportedMediaType: 'stop-unsupported-format',
  MimeExtensionMismatch: 'rename-file-to-real-type',
  UnsafeSvgActiveContent: 'remove-active-content-and-retry',
  FileTooLarge: 'reduce-file-size',
  NoAssetDirectoryDetected: 'provide-explicit-targetPath',
  AmbiguousAssetDirectory: 'provide-explicit-targetPath',
  DeleteBlockedByReferences: 'confirm:true-to-delete-and-report-broken-references',
  DeleteBlockedUsageUnknown: 'fix-unreadable-files-and-retry-scan',
  ExternalAssetMutation: 'manage-reference-only',
};

export interface MediaErrorOptions {
  operationId?: string;
  resource?: string;
  message?: string;
  details?: Record<string, unknown>;
}

/** Converte um MediaErrorKind em NexoError estruturado (details.mediaError machine-readable). */
export function mediaError(kind: MediaErrorKind, message: string, opts: MediaErrorOptions = {}): NexoError {
  const nextAction = KIND_NEXT_ACTION[kind];
  return nexoError(KIND_TO_CODE[kind], message, {
    ...(opts.operationId !== undefined ? { operationId: opts.operationId } : {}),
    ...(opts.resource !== undefined ? { resource: opts.resource } : {}),
    retryable: false,
    ...(kind === 'DeleteBlockedByReferences' ? { requiresApproval: true } : {}),
    details: {
      mediaError: kind,
      ...(nextAction !== undefined ? { nextAction } : {}),
      ...opts.details,
    },
  });
}
