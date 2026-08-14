/**
 * Tipos do @nexo/editor (doc 07 EDITOR + M3-CONTRACTS.md §3.1/§4/§5/§6).
 *
 * Autoridade: M3-CONTRACTS.md (FROZEN). Decisoes registradas: D7 (Change
 * Object concreto, §6), D12 (Merge = UNSUPPORTED). Proibido fork privado.
 *
 * Regras duras respeitadas aqui:
 *  - SaveState NUNCA reporta 'Saved' antes de persistencia confirmada
 *    (07§29/§64/§79; Inv. "No Fake Success").
 *  - Mapeamento incerto NUNCA apresentado como exato (07§12/§15).
 *  - 'Merge' nao existe em ConflictResolution: quem pedir Merge recebe
 *    UNSUPPORTED explicito (D12).
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Change Object (M3-CONTRACTS §6 — tipagem concreta congelada, D7)
// ---------------------------------------------------------------------------

export type ChangeOperation = 'modify' | 'create' | 'delete' | 'rename';

/** Origem tecnica da mudanca (07§31-32). */
export type ChangeSource = 'visual' | 'code' | 'ai' | 'external' | 'generated';

/** Origem auditavel da mudanca (07§31). */
export type ChangeOrigin = 'Human' | 'AI' | 'Visual Editor' | 'Code Editor' | 'External Change';

export type ChangeState = 'PENDING' | 'APPLIED' | 'REJECTED' | 'FAILED' | 'REVERTED';

/**
 * Change Object (07§31; concreto em M3-CONTRACTS §6).
 * `before`/`after`: filePath relativo ao Project Root -> conteudo utf8;
 * null em `before` = arquivo nao existia; null em `after` = removido.
 * Retidos integralmente para undo, redo e diff (07§30).
 */
export interface ChangeObject {
  id: string;
  projectId: string;
  files: string[];
  operation: ChangeOperation;
  source: ChangeSource;
  origin: ChangeOrigin;
  before: Record<string, string | null>;
  after: Record<string, string | null>;
  state: ChangeState;
  createdAt: string; // ISO 8601
  appliedAt: string | null; // ISO 8601
}

/**
 * Entrada para criacao de Change (editor.change.create, M3-CONTRACTS §3.1).
 * `before` NUNCA vem do chamador: o ChangeManager captura o estado real do
 * disco no momento da criacao (07§30 — undo/diff dependem do before real).
 */
export interface ChangeInput {
  files: string[];
  operation: ChangeOperation;
  source: ChangeSource;
  origin: ChangeOrigin;
  /** Conteudo desejado por arquivo (null = remocao; ver limitacao delete em save-pipeline). */
  after: Record<string, string | null>;
  /** Obrigatorio quando operation === 'rename' (M3: rename retorna UNSUPPORTED no apply). */
  renameTo?: string;
}

// ---------------------------------------------------------------------------
// Save State (07§29)
// ---------------------------------------------------------------------------

/**
 * Estados de save (07§29). 'Saved' SOMENTE apos persistencia confirmada
 * (07§79: Source Project + Expected Modification + Persistence Confirmed).
 */
export type SaveState = 'Saved' | 'Unsaved' | 'Saving' | 'SaveFailed' | 'Conflict';

// ---------------------------------------------------------------------------
// Conflitos (07§38-40, D12)
// ---------------------------------------------------------------------------

/**
 * Resolucoes suportadas em M3 (D12). 'Merge' NAO faz parte deste tipo por
 * decisao congelada: resolveConflict recebe a uniao com 'Merge' e retorna
 * UNSUPPORTED explicito — nunca um merge inventado (07§39 "eventually";
 * Inv. 39).
 */
export type ConflictResolution = 'KeepLocal' | 'KeepExternal' | 'Compare' | 'Reload' | 'Cancel';

/** Entrada aceita por resolveConflict — inclui 'Merge' para rejeicao honesta. */
export type ConflictResolutionRequest = ConflictResolution | 'Merge';

export const SUPPORTED_CONFLICT_RESOLUTIONS: readonly ConflictResolution[] = [
  'KeepLocal',
  'KeepExternal',
  'Compare',
  'Reload',
  'Cancel',
];

// ---------------------------------------------------------------------------
// Selection Model (07§11-12)
// ---------------------------------------------------------------------------

/**
 * Confidence de source mapping (07§12/§13-15). Mapeamento incerto NUNCA e
 * apresentado como EXACT (07§12). Falha de mapping -> UNKNOWN + alternativas
 * seguras (07§15), nunca adivinhacao silenciosa.
 */
export type MappingConfidence = 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN';

export interface SourceLocation {
  line: number;
  column: number;
}

/** Selection Model (07§11). Nem toda selecao tem todos os campos (07§11). */
export interface SelectionModel {
  projectId: string;
  route?: string;
  nodeRef?: string;
  component?: string;
  sourceFile?: string;
  sourceLocation?: SourceLocation;
  confidence: MappingConfidence;
  /** Alternativas seguras quando confidence e PARTIAL/UNKNOWN (07§15). */
  alternatives?: string[];
}

// ---------------------------------------------------------------------------
// Diff (07§42)
// ---------------------------------------------------------------------------

export type FileDiffStatus = 'Added' | 'Removed' | 'Modified';

/**
 * Diff por arquivo (07§42: File, Before, After, Added, Removed, Modified;
 * Moved representado via `movedTo` quando aplicavel — rename e UNSUPPORTED
 * em M3 no write-path).
 */
export interface FileDiff {
  file: string;
  before: string | null;
  after: string | null;
  status: FileDiffStatus;
  /** Linhas presentes somente em `after`. */
  added: string[];
  /** Linhas presentes somente em `before`. */
  removed: string[];
  /** Pares de linha substituida (regiao alterada, emparelhamento posicional). */
  modified: Array<{ before: string; after: string }>;
  movedTo?: string;
}

/** Diff de uma mudanca (07§42); `origin` identifica a origem quando conhecida. */
export interface Diff {
  files: FileDiff[];
  origin?: ChangeOrigin;
}

// ---------------------------------------------------------------------------
// Utilitarios deterministicos compartilhados
// ---------------------------------------------------------------------------

/** Hash de conteudo usado em baselines/verificacao (07§38: hash + mtime). */
export function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Agora em ISO 8601 — ponto unico para facilitar testes deterministas. */
export function nowIso(): string {
  return new Date().toISOString();
}
