/**
 * Classificação de erros do git CLI (doc 10 §62/§63).
 * Erros são machine-readable: `details.gitError` carrega o GitErrorKind e o
 * NexoError.code mapeia para o contrato SPEC §0 — agentes nunca precisam
 * parsear stderr cru (§63). stderr é SEMPRE redigido (§61) e truncado.
 */

import { nexoError, type ErrorCode, type NexoError } from '@nexo/shared';

import { redactText } from './redact.js';
import type { GitErrorKind } from './types.js';

/** stderr nunca vai integral para logs/erros: redigido e truncado (~500 chars). */
const STDERR_MAX = 500;

interface GitErrorPattern {
  kind: GitErrorKind;
  pattern: RegExp;
}

/**
 * Tabela de padrões conhecidos do git (mensagens estáveis do CLI, verificadas
 * em git 2.39.5). Ordem importa: padrões mais específicos primeiro.
 */
const GIT_ERROR_PATTERNS: readonly GitErrorPattern[] = [
  { kind: 'RepositoryNotFound', pattern: /not a git repository/i },
  { kind: 'AuthenticationFailed', pattern: /authentication failed|could not read (username|password)|authentication required/i },
  { kind: 'PermissionDenied', pattern: /permission denied/i },
  {
    kind: 'NonFastForward',
    pattern: /non-fast-forward|fetch first|failed to push some refs|tip of your current branch is behind/i,
  },
  { kind: 'NoTrackingBranch', pattern: /no tracking information|no upstream branch|has no upstream branch/i },
  { kind: 'HookFailed', pattern: /hook (declined|ignored|failed|rejected)|hook exited|pre-commit hook|commit-msg hook|pre-push hook/i },
  {
    kind: 'WorkingTreeDirty',
    pattern:
      /would be overwritten by (checkout|merge)|please commit your changes or stash|your local changes to the following files would be overwritten|you need to resolve your current index first/i,
  },
  {
    kind: 'MergeConflict',
    pattern: /automatic merge failed|fix conflicts and then commit|merge conflict in|not fully merged|after resolving the conflicts/i,
  },
  { kind: 'BranchNotFound', pattern: /branch '.*' not found|pathspec '.*' did not match any/i },
  { kind: 'RemoteNotFound', pattern: /does not appear to be a git repository|no such remote/i },
  {
    kind: 'InvalidReference',
    pattern: /not a valid object name|invalid reference|not a valid ref|bad revision|ambiguous argument|unknown revision|needed a single revision/i,
  },
];

/** Classifica stderr do git em um GitErrorKind (doc 10 §62). Pura e determinística. */
export function classifyGitError(stderr: string): GitErrorKind {
  const text = stderr ?? '';
  for (const { kind, pattern } of GIT_ERROR_PATTERNS) {
    if (pattern.test(text)) return kind;
  }
  return 'UnknownGitError';
}

/** Mapeamento GitErrorKind -> ErrorCode do SPEC §0 (contrato congelado). */
const KIND_TO_CODE: Record<GitErrorKind, ErrorCode> = {
  RepositoryNotFound: 'NOT_FOUND',
  BranchNotFound: 'NOT_FOUND',
  RemoteNotFound: 'NOT_FOUND',
  WorkingTreeDirty: 'CONFLICT',
  MergeConflict: 'CONFLICT',
  NonFastForward: 'CONFLICT',
  NoTrackingBranch: 'CONFLICT',
  AuthenticationFailed: 'FORBIDDEN',
  PermissionDenied: 'FORBIDDEN',
  InvalidReference: 'INVALID_INPUT',
  HookFailed: 'INTERNAL',
  UnknownGitError: 'INTERNAL',
};

/** Próxima ação sugerida para agentes (doc 10 §63: Retry/Fetch/Pull/Resolve/Stop). */
const KIND_NEXT_ACTION: Partial<Record<GitErrorKind, string>> = {
  NonFastForward: 'fetch-and-pull',
  NoTrackingBranch: 'push-with-explicit-remote-branch',
  WorkingTreeDirty: 'commit-or-stash',
  MergeConflict: 'resolve-conflict',
  AuthenticationFailed: 'stop-check-credentials',
  PermissionDenied: 'stop-check-permissions',
  InvalidReference: 'stop-check-reference',
};

export interface GitErrorOptions {
  operationId?: string;
  resource?: string;
  /** stderr/stdout originais — redigidos e truncados antes de entrar em details. */
  stderr?: string;
  details?: Record<string, unknown>;
  /** Sobrescreve a mensagem default (mantendo code/gitError machine-readable). */
  message?: string;
}

/**
 * Converte um GitErrorKind em NexoError estruturado:
 * `details.gitError` (machine-readable, doc 10 §63) + stderr redigido/truncado.
 */
export function gitErrorToNexo(kind: GitErrorKind, opts: GitErrorOptions = {}): NexoError {
  const stderr = opts.stderr === undefined ? undefined : redactText(opts.stderr).slice(0, STDERR_MAX);
  const nextAction = KIND_NEXT_ACTION[kind];
  return nexoError(KIND_TO_CODE[kind], opts.message ?? `Git error: ${kind}`, {
    operationId: opts.operationId,
    resource: opts.resource,
    retryable: false,
    details: {
      gitError: kind,
      ...(stderr !== undefined && stderr.length > 0 ? { stderr } : {}),
      ...(nextAction !== undefined ? { nextAction } : {}),
      ...(kind === 'HookFailed' ? { hookFailed: true } : {}),
      ...opts.details,
    },
  });
}
