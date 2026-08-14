/**
 * Undo/Redo de edicao (07§33-35).
 *
 *  - Undo reverte a ultima mudanca Editor-managed APLICADA: restaura o
 *    `before` real retido no Change Object via runtime, com verificacao
 *    pos-escrita (07§41). NUNCA cria commit e NUNCA toca Git (07§35).
 *  - Undo/redo NUNCA tocam mudanca externa nao relacionada (07§33): antes de
 *    reverter, o hash atual de cada arquivo DEVE ser igual ao hash do `after`
 *    retido; divergencia = estado incompativel -> CONFLICT, nada e escrito.
 *  - Redo reaplica somente se o estado for compativel (07§34): hash atual ==
 *    hash do `before`; mudanca externa invalida redo inseguro -> UNSUPPORTED
 *    (07§34 "invalidate unsafe redo").
 *  - Undo de operacao 'create' exigiria remover o arquivo criado; o runtime
 *    M1 nao expoe delete -> UNSUPPORTED explicito (mesma fronteira do
 *    save-pipeline; nunca fingir).
 */

import { err, nexoError, ok, type Result } from '@nexo/shared';
import type { ScopedFilesystem } from '@nexo/runtime';

import { hashesOf } from './change-manager.js';
import { persistFileVerified } from './save-pipeline.js';
import { sha256Hex, type ChangeObject } from './types.js';

export interface UndoManagerDeps {
  fsFor(projectId: string): ScopedFilesystem;
  /** Transicoes de estado no ChangeManager (REVERTED / APPLIED). */
  markReverted(change: ChangeObject): void;
  markReapplied(change: ChangeObject): void;
  /** Atualiza baseline de conflito apos escrita verificada (07§38). */
  onFileRestored(projectId: string, file: string, content: string): Promise<void> | void;
  parseTsx?: ((content: string, filePath: string) => boolean | Promise<boolean>) | undefined;
}

export class UndoManager {
  private readonly deps: UndoManagerDeps;
  /** projectId -> pilha de changes APPLIED (topo = mais recente). */
  private readonly undoStack = new Map<string, ChangeObject[]>();
  /** projectId -> pilha de changes REVERTED elegiveis a redo. */
  private readonly redoStack = new Map<string, ChangeObject[]>();

  constructor(deps: UndoManagerDeps) {
    this.deps = deps;
  }

  private stack(map: Map<string, ChangeObject[]>, projectId: string): ChangeObject[] {
    let s = map.get(projectId);
    if (s === undefined) {
      s = [];
      map.set(projectId, s);
    }
    return s;
  }

  /** Registra change APPLIED (chamado pelo service apos apply confirmado). */
  push(change: ChangeObject): void {
    this.stack(this.undoStack, change.projectId).push(change);
    // Novo apply invalida redo pendente (modelo de historico linear, 07§33-34).
    this.stack(this.redoStack, change.projectId).length = 0;
  }

  canUndo(projectId: string): boolean {
    return (this.undoStack.get(projectId)?.length ?? 0) > 0;
  }

  canRedo(projectId: string): boolean {
    return (this.redoStack.get(projectId)?.length ?? 0) > 0;
  }

  /** Invalida redo inseguro quando arquivo mudou externamente (07§34). */
  invalidateRedoFor(projectId: string, file: string): void {
    const redo = this.stack(this.redoStack, projectId);
    for (let i = redo.length - 1; i >= 0; i--) {
      if (redo[i]?.files.includes(file)) redo.splice(i, 1);
    }
  }

  /**
   * Undo (07§33): reverte a ultima mudanca Editor-managed aplicada.
   * Compatibilidade verificada por hash ANTES de escrever — divergencia
   * (mudanca externa no alvo) -> CONFLICT e NADA e modificado.
   */
  async undo(projectId: string): Promise<Result<ChangeObject>> {
    const undo = this.stack(this.undoStack, projectId);
    const change = undo.at(-1);
    if (change === undefined) {
      return err(nexoError('NOT_FOUND', 'no applied editor-managed change to undo'));
    }
    const fs = this.deps.fsFor(projectId);
    const afterHashes = hashesOf(change.after);

    // Pre-check completo antes de qualquer escrita (nunca tocar mudanca
    // externa nao relacionada, 07§33).
    for (const file of change.files) {
      const expected = afterHashes[file];
      if (expected === null || expected === undefined) {
        return err(
          nexoError('UNSUPPORTED', `undo of '${change.operation}' on '${file}' requires file deletion, which the M1 runtime does not expose`, {
            resource: file,
            details: { changeId: change.id, nextAction: 'remove the file outside the editor' },
          }),
        );
      }
      const before = change.before[file];
      if (before === null || before === undefined) {
        return err(
          nexoError('UNSUPPORTED', `undo of 'create' on '${file}' requires file deletion, which the M1 runtime does not expose`, {
            resource: file,
            details: { changeId: change.id, nextAction: 'remove the file outside the editor' },
          }),
        );
      }
      const current = await fs.readFile(file);
      if (!current.ok) return err(current.error);
      if (sha256Hex(current.value) !== expected) {
        return err(
          nexoError('CONFLICT', `undo is unsafe: '${file}' changed since the change was applied (07§33)`, {
            resource: file,
            details: { changeId: change.id, expectedHash: expected, currentHash: sha256Hex(current.value), nextAction: 'resolve the external change first' },
          }),
        );
      }
    }

    for (const file of change.files) {
      const before = change.before[file];
      if (before === null || before === undefined) continue; // ja validado acima
      const restored = await persistFileVerified(fs, file, before, {
        parseTsx: this.deps.parseTsx,
        overwrite: true,
        rollbackTo: change.after[file] ?? undefined,
      });
      if (!restored.ok) return err(restored.error);
      await this.deps.onFileRestored(projectId, file, before);
    }

    undo.pop();
    this.deps.markReverted(change);
    this.stack(this.redoStack, projectId).push(change);
    return ok(change);
  }

  /**
   * Redo (07§34): reaplica somente se o estado atual for compativel
   * (hash atual == hash do before retido). Estado divergente -> UNSUPPORTED
   * (redo inseguro invalidado), nada escrito.
   */
  async redo(projectId: string): Promise<Result<ChangeObject>> {
    const redo = this.stack(this.redoStack, projectId);
    const change = redo.at(-1);
    if (change === undefined) {
      return err(nexoError('NOT_FOUND', 'no reverted editor-managed change to redo'));
    }
    const fs = this.deps.fsFor(projectId);
    const beforeHashes = hashesOf(change.before);

    for (const file of change.files) {
      const expected = beforeHashes[file];
      const after = change.after[file];
      if (after === null || after === undefined) {
        return err(
          nexoError('UNSUPPORTED', `redo of '${change.operation}' on '${file}' requires file deletion, which the M1 runtime does not expose`, {
            resource: file,
            details: { changeId: change.id },
          }),
        );
      }
      const current = await fs.readFile(file);
      const currentHash = current.ok ? sha256Hex(current.value) : null;
      if (currentHash !== expected) {
        // Mudanca externa (ou estado divergente) invalida redo inseguro (07§34).
        redo.splice(redo.indexOf(change), 1);
        return err(
          nexoError('UNSUPPORTED', `redo invalidated: '${file}' no longer matches the pre-undo state (07§34)`, {
            resource: file,
            details: { changeId: change.id, expectedHash: expected, currentHash, nextAction: 'create a new change from current source' },
          }),
        );
      }
    }

    for (const file of change.files) {
      const after = change.after[file];
      if (after === null || after === undefined) continue; // ja validado acima
      const reapplied = await persistFileVerified(fs, file, after, {
        parseTsx: this.deps.parseTsx,
        overwrite: change.before[file] !== null && change.before[file] !== undefined,
        rollbackTo: change.before[file] ?? undefined,
      });
      if (!reapplied.ok) return err(reapplied.error);
      await this.deps.onFileRestored(projectId, file, after);
    }

    redo.pop();
    this.deps.markReapplied(change);
    this.stack(this.undoStack, projectId).push(change);
    return ok(change);
  }
}
