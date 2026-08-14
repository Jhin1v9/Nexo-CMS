/**
 * ChangeManager (07§30-32): rastreia edits ANTES da persistencia.
 *
 *  - createChange: captura `before` REAL do disco (nunca do chamador) —
 *    undo/redo/diff dependem dele (07§30). Origem (07§31-32) e obrigatoria.
 *  - previewChange: Diff (07§42) calculado de before/after retidos — NUNCA
 *    persiste nem toca o disco.
 *  - applyChange: delega ao save pipeline injetado (07§36) — successo so
 *    marca APPLIED apos persistencia confirmada; falha marca FAILED e mantem
 *    o pending recuperavel (07§37); conflito NAO muda o estado (segue PENDING,
 *    SaveState 'Conflict' e do tracker do service).
 *  - rejectChange: descarta pendente; NUNCA toca o source (M3-CONTRACTS §3.1).
 *  - Pending changes sao espelhados no DraftStore (recovery, 07§65) quando
 *    injetado — crash nao perde rascunho, e rascunho recuperado continua
 *    distinguivel do source persistido.
 */

import { err, nexoError, ok, type Result } from '@nexo/shared';
import type { ScopedFilesystem } from '@nexo/runtime';

import type { DraftStore } from './recovery.js';
import {
  nowIso,
  sha256Hex,
  type ChangeInput,
  type ChangeObject,
  type Diff,
  type FileDiff,
} from './types.js';

/** Resultado do pipeline para um Change (definido em save-pipeline). */
export interface ApplyOutcome {
  hashes: Record<string, string>;
  verified: boolean;
  diagnostics: string[];
}

/**
 * Executor do save pipeline injetado pelo service (07§36). Recebe o Change e
 * o expectedHash opcional; retorna ApplyOutcome ou erro (CONFLICT/INTERNAL...).
 */
export type ApplyExecutor = (
  change: ChangeObject,
  expectedHash?: string,
) => Promise<Result<ApplyOutcome>>;

export interface ChangeManagerDeps {
  fsFor(projectId: string): ScopedFilesystem;
  drafts?: DraftStore | undefined;
  /** Injetado pelo service (save pipeline + pos-apply: undo stack, baselines). */
  apply: ApplyExecutor;
  idGen?: () => string;
}

function defaultId(): string {
  return globalThis.crypto.randomUUID();
}

export class ChangeManager {
  private readonly deps: ChangeManagerDeps;
  /** projectId -> changeId -> ChangeObject (PENDING + historico da sessao). */
  private readonly changes = new Map<string, Map<string, ChangeObject>>();

  constructor(deps: ChangeManagerDeps) {
    this.deps = deps;
  }

  private bucket(projectId: string): Map<string, ChangeObject> {
    let b = this.changes.get(projectId);
    if (b === undefined) {
      b = new Map();
      this.changes.set(projectId, b);
    }
    return b;
  }

  get(projectId: string, changeId: string): ChangeObject | undefined {
    return this.changes.get(projectId)?.get(changeId);
  }

  /** Pending changes + estados (editor.change.list, M3-CONTRACTS §3.1). */
  list(projectId: string): ChangeObject[] {
    return [...(this.changes.get(projectId)?.values() ?? [])];
  }

  /** Re-registra um Change recuperado do DraftStore (07§65) como PENDING. */
  restore(change: ChangeObject): void {
    this.bucket(change.projectId).set(change.id, change);
  }

  async create(projectId: string, input: ChangeInput): Promise<Result<ChangeObject>> {
    if (!Array.isArray(input.files) || input.files.length === 0) {
      return err(nexoError('INVALID_INPUT', 'change must reference at least one file'));
    }
    const fs = this.deps.fsFor(projectId);
    const before: Record<string, string | null> = {};
    for (const file of input.files) {
      if (!(file in input.after)) {
        return err(nexoError('INVALID_INPUT', `missing 'after' content for '${file}'`, { resource: file }));
      }
      // Captura do estado REAL (07§30). NOT_FOUND -> null (arquivo nao existe).
      const current = await fs.readFile(file);
      if (current.ok) {
        before[file] = current.value;
      } else if (current.error.code === 'NOT_FOUND') {
        before[file] = null;
      } else {
        return err(current.error); // SCOPE_VIOLATION etc. — propaga, nunca contorna
      }
    }
    // Validacao de coerencia operacao <-> estados (07§31; sem invencao).
    for (const file of input.files) {
      const b = before[file] ?? null;
      const a = input.after[file] ?? null;
      if (input.operation === 'create' && b !== null) {
        return err(nexoError('CONFLICT', `operation 'create' but '${file}' already exists`, { resource: file }));
      }
      if (input.operation === 'modify' && b === null) {
        return err(nexoError('NOT_FOUND', `operation 'modify' but '${file}' does not exist`, { resource: file }));
      }
      if (input.operation === 'modify' && b === a) {
        return err(nexoError('INVALID_INPUT', `operation 'modify' with identical before/after for '${file}'`, { resource: file }));
      }
      if (input.operation === 'delete' && b === null) {
        return err(nexoError('NOT_FOUND', `operation 'delete' but '${file}' does not exist`, { resource: file }));
      }
      if (input.operation === 'rename' && typeof input.renameTo !== 'string') {
        return err(nexoError('INVALID_INPUT', "operation 'rename' requires 'renameTo'", { resource: file }));
      }
    }

    const change: ChangeObject = {
      id: (this.deps.idGen ?? defaultId)(),
      projectId,
      files: [...input.files],
      operation: input.operation,
      source: input.source,
      origin: input.origin,
      before,
      after: { ...input.after },
      state: 'PENDING',
      createdAt: nowIso(),
      appliedAt: null,
    };
    this.bucket(projectId).set(change.id, change);
    this.persistDraft(change);
    return ok(change);
  }

  /** Diff de before/after retidos — NUNCA persiste (editor.change.preview). */
  preview(projectId: string, changeId: string): Result<Diff> {
    const change = this.get(projectId, changeId);
    if (change === undefined) {
      return err(nexoError('NOT_FOUND', `change not found: '${changeId}'`, { resource: changeId }));
    }
    return ok(diffOfChange(change));
  }

  /**
   * Aplica via save pipeline (07§36) injetado. APPLIED somente apos
   * persistencia confirmada (07§79). Falha -> FAILED + draft mantido (07§37).
   * CONFLICT -> change segue PENDING (resolucao via conflict.ts, D12).
   */
  async apply(projectId: string, changeId: string, expectedHash?: string): Promise<Result<{ change: ChangeObject; outcome: ApplyOutcome }>> {
    const change = this.get(projectId, changeId);
    if (change === undefined) {
      return err(nexoError('NOT_FOUND', `change not found: '${changeId}'`, { resource: changeId }));
    }
    if (change.state !== 'PENDING') {
      return err(
        nexoError('INVALID_INPUT', `change '${changeId}' is not PENDING (state: ${change.state})`, {
          resource: changeId,
          details: { state: change.state },
        }),
      );
    }
    const applied = await this.deps.apply(change, expectedHash);
    if (!applied.ok) {
      if (applied.error.code !== 'CONFLICT') {
        // 07§37: falha de persistencia -> FAILED, pending recuperavel (draft fica).
        change.state = 'FAILED';
        this.persistDraft(change);
      }
      // CONFLICT: segue PENDING; o tracker de SaveState marca 'Conflict'.
      return err(applied.error);
    }
    change.state = 'APPLIED';
    change.appliedAt = nowIso();
    this.deps.drafts?.deleteDraft(projectId, change.id);
    return ok({ change, outcome: applied.value });
  }

  /** Descarta pendente sem tocar o source (editor.change.reject). */
  reject(projectId: string, changeId: string): Result<ChangeObject> {
    const change = this.get(projectId, changeId);
    if (change === undefined) {
      return err(nexoError('NOT_FOUND', `change not found: '${changeId}'`, { resource: changeId }));
    }
    if (change.state !== 'PENDING' && change.state !== 'FAILED') {
      return err(
        nexoError('INVALID_INPUT', `only PENDING/FAILED changes can be rejected (state: ${change.state})`, {
          resource: changeId,
          details: { state: change.state },
        }),
      );
    }
    change.state = 'REJECTED';
    this.deps.drafts?.deleteDraft(projectId, changeId);
    return ok(change);
  }

  /** Transicoes internas usadas por undo/redo (07§33-34). */
  markReverted(change: ChangeObject): void {
    change.state = 'REVERTED';
  }

  markReapplied(change: ChangeObject): void {
    change.state = 'APPLIED';
    change.appliedAt = nowIso();
  }

  /** Ultimo PENDING que toca `file` (usado por KeepLocal/KeepExternal). */
  latestPendingFor(projectId: string, file: string): ChangeObject | undefined {
    const all = this.list(projectId).filter((c) => c.state === 'PENDING' && c.files.includes(file));
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  }

  /** Rejeita todos os PENDING que tocam `file` (KeepExternal — descarta local). */
  rejectPendingFor(projectId: string, file: string): ChangeObject[] {
    const rejected: ChangeObject[] = [];
    for (const c of this.list(projectId)) {
      if (c.state === 'PENDING' && c.files.includes(file)) {
        c.state = 'REJECTED';
        this.deps.drafts?.deleteDraft(projectId, c.id);
        rejected.push(c);
      }
    }
    return rejected;
  }

  private persistDraft(change: ChangeObject): void {
    this.deps.drafts?.saveDraft({
      id: change.id,
      projectId: change.projectId,
      kind: 'pending-change',
      payload: change,
      updatedAt: nowIso(),
    });
  }
}

// ---------------------------------------------------------------------------
// Diff engine (07§42) — linha a linha, deterministico
// ---------------------------------------------------------------------------

/** Diff completo de um Change retido (File/Before/After/Added/Removed/Modified). */
export function diffOfChange(change: ChangeObject): Diff {
  const files: FileDiff[] = change.files.map((file) => {
    const before = change.before[file] ?? null;
    const after = change.after[file] ?? null;
    return diffFile(file, before, after, change.operation === 'rename' ? change.after[file] !== null : false);
  });
  return { files, origin: change.origin };
}

/** Diff 3-way informativo (resolucao Compare, 07§39/D12). */
export interface ThreeWayDiff {
  file: string;
  baseline: string | null;
  local: string | null;
  external: string | null;
  localVsBaseline: FileDiff;
  externalVsBaseline: FileDiff;
  localVsExternal: FileDiff;
}

export function threeWayDiff(file: string, baseline: string | null, local: string | null, external: string | null): ThreeWayDiff {
  return {
    file,
    baseline,
    local,
    external,
    localVsBaseline: diffFile(file, baseline, local),
    externalVsBaseline: diffFile(file, baseline, external),
    localVsExternal: diffFile(file, local, external),
  };
}

/**
 * Diff de arquivo: prefixo/sufixo comuns removidos; regiao central pareada
 * posicionalmente (modified) e excedentes como added/removed. Capacidade
 * declarada: diff informativo para review (07§42) — nao e um merge (D12).
 */
export function diffFile(file: string, before: string | null, after: string | null, moved = false): FileDiff {
  const status = before === null ? 'Added' : after === null ? 'Removed' : 'Modified';
  const base: FileDiff = { file, before, after, status, added: [], removed: [], modified: [] };
  if (moved) base.movedTo = file;
  if (before === null || after === null) {
    if (after !== null) base.added = splitLines(after);
    if (before !== null) base.removed = splitLines(before);
    return base;
  }
  if (before === after) return base;

  const a = splitLines(before);
  const b = splitLines(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const pair = Math.min(midA.length, midB.length);
  for (let i = 0; i < pair; i++) {
    base.modified.push({ before: midA[i] ?? '', after: midB[i] ?? '' });
  }
  base.removed = midA.slice(pair);
  base.added = midB.slice(pair);
  return base;
}

function splitLines(content: string): string[] {
  // Preserva conteudo de linha sem quebra final artificial.
  return content.length === 0 ? [] : content.replace(/\n$/, '').split('\n');
}

/** Hashes sha256 de um mapa de conteudos (null preservado). */
export function hashesOf(contents: Record<string, string | null>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [file, c] of Object.entries(contents)) out[file] = c === null ? null : sha256Hex(c);
  return out;
}
