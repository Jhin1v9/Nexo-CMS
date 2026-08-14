/**
 * EditorService — composicao do pacote @nexo/editor (doc 07; M3-CONTRACTS §3.1).
 *
 * Expoe as operacoes que as capabilities `editor.*` do Control Plane vao
 * chamar (M3-CONTRACTS §3.1). NAO registra capabilities aqui — o registro e
 * da Wave 3 (apps/control-plane), que tambem faz o gate de permissao antes
 * de invocar (padrao D9; ver packages/git/service.ts).
 *
 * Deps injetadas (nada privilegiado e criado dentro do pacote):
 *  - resolveProjectRoot: raiz REAL do projeto; o ScopedFilesystem e criado
 *    por projeto via @nexo/runtime (scope guard em toda operacao, SPEC §4).
 *  - storage (@nexo/storage): recovery de pending state (07§65). Ausente ->
 *    recoverDrafts retorna UNSUPPORTED (nunca finge recovery).
 *  - adapter (M3-CONTRACTS §2), parseTsx (07§41), updateIntelligence/updatePreview
 *    (07§36), sourceMapper (07§13-15 — implementado por intelligence/adapters,
 *    NUNCA pelo editor, 07§74).
 */

import { err, nexoError, ok, type Result } from '@nexo/shared';
import { createScopedFilesystem, type ScopedFilesystem } from '@nexo/runtime';
import type { Storage } from '@nexo/storage';

import { ChangeManager, hashesOf, type ApplyOutcome } from './change-manager.js';
import {
  ConflictManager,
  type ConflictDetection,
  type ConflictResolutionOutcome,
} from './conflict.js';
import {
  createSqliteDraftStore,
  findStaleFiles,
  toRecoveredDraft,
  type DraftStore,
  type RecoveredDraft,
} from './recovery.js';
import { SourceManager, type OpenSourceResult, type SourceSaveResult } from './source.js';
import {
  persistFileVerified,
  runSavePipeline,
  type SaveRequest,
  type SourceTransformAdapter,
} from './save-pipeline.js';
import { UndoManager } from './undo.js';
import {
  nowIso,
  sha256Hex,
  type ChangeInput,
  type ChangeObject,
  type ConflictResolutionRequest,
  type Diff,
  type SaveState,
  type SelectionModel,
} from './types.js';

/** Source mapping (07§13) — NUNCA implementado pelo editor (07§74). */
export interface SourceMapper {
  map(input: { projectId: string; route?: string; nodeRef?: string }): Promise<Result<SelectionModel>> | Result<SelectionModel>;
}

export interface EditorServiceDeps {
  /** Raiz absoluta REAL do projeto (Project Root registrado no storage M1). */
  resolveProjectRoot(projectId: string): string;
  storage?: Storage | undefined;
  adapter?: SourceTransformAdapter | undefined;
  parseTsx?: ((content: string, filePath: string) => boolean | Promise<boolean>) | undefined;
  updateIntelligence?: ((projectId: string, files: string[]) => void | Promise<void>) | undefined;
  updatePreview?: ((projectId: string, files: string[]) => void | Promise<void>) | undefined;
  sourceMapper?: SourceMapper | undefined;
  idGen?: () => string;
}

export interface ApplyChangeResult {
  change: ChangeObject;
  saved: true;
  hashes: Record<string, string>;
  verified: boolean;
  diagnostics: string[];
}

export interface EditorService {
  // editor.source.* (M3-CONTRACTS §3.1)
  openSource(projectId: string, filePath: string): Promise<Result<OpenSourceResult>>;
  saveSource(projectId: string, filePath: string, content: string, expectedHash?: string): Promise<Result<SourceSaveResult>>;
  getSaveState(projectId: string, filePath: string): SaveState;
  // editor.selection.read
  readSelection(projectId: string, route?: string, nodeRef?: string): Promise<Result<SelectionModel>>;
  // editor.change.*
  createChange(projectId: string, input: ChangeInput): Promise<Result<ChangeObject>>;
  previewChange(projectId: string, changeId: string): Result<Diff>;
  applyChange(projectId: string, changeId: string, expectedHash?: string): Promise<Result<ApplyChangeResult>>;
  rejectChange(projectId: string, changeId: string): Result<ChangeObject>;
  listChanges(projectId: string): ChangeObject[];
  undo(projectId: string): Promise<Result<ChangeObject>>;
  redo(projectId: string): Promise<Result<ChangeObject>>;
  canUndo(projectId: string): boolean;
  canRedo(projectId: string): boolean;
  // Conflitos (07§38-40, D12)
  detectConflict(projectId: string, filePath: string): Promise<Result<ConflictDetection>>;
  resolveConflict(projectId: string, filePath: string, resolution: ConflictResolutionRequest): Promise<Result<ConflictResolutionOutcome>>;
  // Recovery (07§65)
  recoverDrafts(projectId: string): Result<RecoveredDraft[]>;
  restoreDraft(projectId: string, draftId: string): Promise<Result<ChangeObject>>;
}

class NexoEditorService implements EditorService {
  private readonly deps: EditorServiceDeps;
  private readonly fsCache = new Map<string, ScopedFilesystem>();
  private readonly drafts: DraftStore | undefined;
  private readonly conflicts: ConflictManager;
  private readonly changes: ChangeManager;
  private readonly undoManager: UndoManager;
  private readonly source: SourceManager;
  /** projectId -> file -> SaveState (07§29). */
  private readonly saveStates = new Map<string, Map<string, SaveState>>();

  constructor(deps: EditorServiceDeps) {
    this.deps = deps;
    this.drafts = deps.storage !== undefined ? createSqliteDraftStore(deps.storage.db) : undefined;

    const fsFor = (projectId: string): ScopedFilesystem => this.fsFor(projectId);

    this.changes = new ChangeManager({
      fsFor,
      drafts: this.drafts,
      idGen: deps.idGen,
      apply: (change, expectedHash) => this.executeApply(change, expectedHash),
    });

    this.conflicts = new ConflictManager({
      fsFor,
      hasLocalChanges: (p, f) => this.changes.latestPendingFor(p, f) !== undefined,
      localContentFor: (p, f) => {
        const pending = this.changes.latestPendingFor(p, f);
        const content = pending?.after[f];
        return content === null || content === undefined ? null : content;
      },
      discardLocal: (p, f) => this.changes.rejectPendingFor(p, f).map((c) => c.id),
      baselineContentFor: (p, f) => {
        const pending = this.changes.latestPendingFor(p, f);
        const before = pending?.before[f];
        return before === null || before === undefined ? null : before;
      },
      persistLocal: (p, f, content) => this.persistLocal(p, f, content),
      onExternalRefresh: (p, f) => {
        // 07§40: External Change -> Detect -> Refresh -> Update Preview.
        this.undoManager.invalidateRedoFor(p, f); // redo inseguro invalidado (07§34)
        void this.deps.updatePreview?.(p, [f]);
      },
    });

    this.undoManager = new UndoManager({
      fsFor,
      markReverted: (c) => this.changes.markReverted(c),
      markReapplied: (c) => this.changes.markReapplied(c),
      onFileRestored: async (p, f, content) => {
        await this.conflicts.refreshBaseline(p, f, content);
        this.setSaveState(p, f, 'Saved');
      },
      parseTsx: deps.parseTsx,
    });

    this.source = new SourceManager({
      fsFor,
      rootFor: (p) => deps.resolveProjectRoot(p),
      conflicts: this.conflicts,
      runPipeline: (p, req) => runSavePipeline(this.pipelineDeps(p), req),
      drafts: this.drafts,
      onSaveState: (p, f, s) => this.setSaveState(p, f, s),
    });
  }

  private fsFor(projectId: string): ScopedFilesystem {
    let fs = this.fsCache.get(projectId);
    if (fs === undefined) {
      fs = createScopedFilesystem(this.deps.resolveProjectRoot(projectId));
      this.fsCache.set(projectId, fs);
    }
    return fs;
  }

  private pipelineDeps(projectId: string) {
    return {
      fs: this.fsFor(projectId),
      adapter: this.deps.adapter,
      parseTsx: this.deps.parseTsx,
      updateIntelligence:
        this.deps.updateIntelligence !== undefined
          ? (files: string[]) => this.deps.updateIntelligence?.(projectId, files)
          : undefined,
      updatePreview:
        this.deps.updatePreview !== undefined
          ? (files: string[]) => this.deps.updatePreview?.(projectId, files)
          : undefined,
    };
  }

  private setSaveState(projectId: string, file: string, state: SaveState): void {
    let m = this.saveStates.get(projectId);
    if (m === undefined) {
      m = new Map();
      this.saveStates.set(projectId, m);
    }
    m.set(file, state);
  }

  getSaveState(projectId: string, filePath: string): SaveState {
    // Arquivo sem estado rastreado: sem edits pendentes no editor -> o source
    // em disco e o estado persistido ('Saved' factual, 07§29).
    return this.saveStates.get(projectId)?.get(filePath) ?? 'Saved';
  }

  // -- editor.source.* -------------------------------------------------------

  openSource(projectId: string, filePath: string): Promise<Result<OpenSourceResult>> {
    return this.source.open(projectId, filePath);
  }

  saveSource(projectId: string, filePath: string, content: string, expectedHash?: string): Promise<Result<SourceSaveResult>> {
    return this.source.save(projectId, filePath, content, expectedHash);
  }

  // -- editor.selection.read (07§11-15) ---------------------------------------

  async readSelection(projectId: string, route?: string, nodeRef?: string): Promise<Result<SelectionModel>> {
    if (this.deps.sourceMapper === undefined) {
      // 07§15: mapping indisponivel -> UNKNOWN + alternativas seguras.
      // NUNCA adivinhar source (Inv. 6/25; mapping vem de intelligence, 07§74).
      return ok({
        projectId,
        ...(route !== undefined ? { route } : {}),
        ...(nodeRef !== undefined ? { nodeRef } : {}),
        confidence: 'UNKNOWN',
        alternatives: ['open page source', 'open related component', 'inspect project structure', 'use Code View'],
      });
    }
    return this.deps.sourceMapper.map({ projectId, ...(route !== undefined ? { route } : {}), ...(nodeRef !== undefined ? { nodeRef } : {}) });
  }

  // -- editor.change.* ---------------------------------------------------------

  async createChange(projectId: string, input: ChangeInput): Promise<Result<ChangeObject>> {
    const created = await this.changes.create(projectId, input);
    if (created.ok) {
      // Pending change = estado nao salvo (07§29 Unsaved), ate persistencia.
      for (const file of created.value.files) this.setSaveState(projectId, file, 'Unsaved');
    }
    return created;
  }

  previewChange(projectId: string, changeId: string): Result<Diff> {
    return this.changes.preview(projectId, changeId);
  }

  async applyChange(projectId: string, changeId: string, expectedHash?: string): Promise<Result<ApplyChangeResult>> {
    if (expectedHash !== undefined) {
      const change = this.changes.get(projectId, changeId);
      if (change !== undefined && change.files.length !== 1) {
        return err(
          nexoError('INVALID_INPUT', 'expectedHash is only defined for single-file changes', {
            resource: changeId,
            details: { files: change.files },
          }),
        );
      }
    }
    const applied = await this.changes.apply(projectId, changeId, expectedHash);
    if (!applied.ok) return err(applied.error);
    const { change, outcome } = applied.value;
    // Pos-apply (somente apos persistencia confirmada, 07§79): baselines,
    // estados Saved e pilha de undo (07§33).
    for (const file of change.files) {
      const content = change.after[file];
      if (content !== null && content !== undefined) {
        const refreshed = await this.conflicts.refreshBaseline(projectId, file, content);
        if (!refreshed.ok) return err(refreshed.error);
        this.setSaveState(projectId, file, 'Saved');
      }
    }
    this.undoManager.push(change);
    return ok({ change, saved: true, hashes: outcome.hashes, verified: outcome.verified, diagnostics: outcome.diagnostics });
  }

  rejectChange(projectId: string, changeId: string): Result<ChangeObject> {
    const rejected = this.changes.reject(projectId, changeId);
    if (rejected.ok) {
      for (const file of rejected.value.files) this.setSaveState(projectId, file, 'Saved');
    }
    return rejected;
  }

  listChanges(projectId: string): ChangeObject[] {
    return this.changes.list(projectId);
  }

  /** Executor injetado no ChangeManager: pipeline canonico 07§36. */
  private async executeApply(change: ChangeObject, expectedHash?: string): Promise<Result<ApplyOutcome>> {
    for (const file of change.files) this.setSaveState(change.projectId, file, 'Saving');
    const firstFile = change.files[0];
    const req: SaveRequest = {
      after: change.after,
      baselineHashes: hashesOf(change.before),
      beforeContents: change.before,
      ...(expectedHash !== undefined && firstFile !== undefined ? { expectedHash: { file: firstFile, hash: expectedHash } } : {}),
    };
    const saved = await runSavePipeline(this.pipelineDeps(change.projectId), req);
    if (!saved.ok) {
      const state: SaveState = saved.error.code === 'CONFLICT' ? 'Conflict' : 'SaveFailed';
      for (const file of change.files) this.setSaveState(change.projectId, file, state);
      return err(saved.error);
    }
    return ok({ hashes: saved.value.hashes, verified: saved.value.verified, diagnostics: saved.value.diagnostics });
  }

  // -- undo/redo (07§33-35) ----------------------------------------------------

  undo(projectId: string): Promise<Result<ChangeObject>> {
    return this.undoManager.undo(projectId);
  }

  redo(projectId: string): Promise<Result<ChangeObject>> {
    return this.undoManager.redo(projectId);
  }

  canUndo(projectId: string): boolean {
    return this.undoManager.canUndo(projectId);
  }

  canRedo(projectId: string): boolean {
    return this.undoManager.canRedo(projectId);
  }

  // -- Conflitos (07§38-40, D12) -------------------------------------------------

  async detectConflict(projectId: string, filePath: string): Promise<Result<ConflictDetection>> {
    const detected = await this.conflicts.detect(projectId, filePath);
    if (!detected.ok) return detected;
    if (detected.value.kind === 'CONFLICT') {
      this.setSaveState(projectId, filePath, 'Conflict');
      this.undoManager.invalidateRedoFor(projectId, filePath);
    }
    return detected;
  }

  resolveConflict(
    projectId: string,
    filePath: string,
    resolution: ConflictResolutionRequest,
  ): Promise<Result<ConflictResolutionOutcome>> {
    return this.conflicts.resolve(projectId, filePath, resolution);
  }

  /** KeepLocal: escreve o local COM verificacao e marca o change aplicado. */
  private async persistLocal(
    projectId: string,
    file: string,
    content: string,
  ): Promise<Result<{ hash: string; verified: boolean; diagnostics: string[] }>> {
    const fs = this.fsFor(projectId);
    // Rollback para o conteudo EXTERNO atual (nunca para o before antigo).
    const current = await fs.readFile(file);
    const persisted = await persistFileVerified(fs, file, content, {
      parseTsx: this.deps.parseTsx,
      overwrite: current.ok,
      ...(current.ok ? { rollbackTo: current.value } : {}),
    });
    if (!persisted.ok) {
      this.setSaveState(projectId, file, 'SaveFailed');
      return err(persisted.error);
    }
    // O change pendente que carregava esse conteudo vira APPLIED + undo-able.
    const pending = this.changes.latestPendingFor(projectId, file);
    if (pending !== undefined && pending.after[file] === content) {
      pending.state = 'APPLIED';
      pending.appliedAt = nowIso();
      this.drafts?.deleteDraft(projectId, pending.id);
      this.undoManager.push(pending);
    }
    this.setSaveState(projectId, file, 'Saved');
    return ok(persisted.value);
  }

  // -- Recovery (07§65) -----------------------------------------------------------

  recoverDrafts(projectId: string): Result<RecoveredDraft[]> {
    if (this.drafts === undefined) {
      return err(
        nexoError('UNSUPPORTED', 'editor recovery requires @nexo/storage (not injected)', {
          details: { nextAction: 'inject storage into createEditorService' },
        }),
      );
    }
    const at = nowIso();
    return ok(this.drafts.listDrafts(projectId).map((d) => toRecoveredDraft(d, at)));
  }

  /**
   * Restaura um pending-change recuperado (07§65) SOMENTE se o source ainda
   * corresponder ao `before` capturado (07§59: nunca editar representacao
   * obsoleta). unsaved-buffer nao e restauravel automaticamente — o conteudo
   * ja vem no RecoveredDraft para o chamador decidir.
   */
  async restoreDraft(projectId: string, draftId: string): Promise<Result<ChangeObject>> {
    if (this.drafts === undefined) {
      return err(nexoError('UNSUPPORTED', 'editor recovery requires @nexo/storage (not injected)'));
    }
    const draft = this.drafts.getDraft(projectId, draftId);
    if (draft === undefined) {
      return err(nexoError('NOT_FOUND', `draft not found: '${draftId}'`, { resource: draftId }));
    }
    if (draft.kind !== 'pending-change') {
      return err(
        nexoError('INVALID_INPUT', `draft '${draftId}' is an unsaved buffer, not a restorable pending change`, {
          resource: draftId,
          details: { kind: draft.kind, nextAction: 'read RecoveredDraft.buffer and saveSource explicitly' },
        }),
      );
    }
    const change = draft.payload as ChangeObject;
    const stale = await findStaleFiles(change, (f) => this.fsFor(projectId).readFile(f), sha256Hex);
    if (!stale.ok) return err(stale.error);
    change.state = 'PENDING'; // FAILED/PENDING recuperavel -> PENDING (07§37/§65)
    this.changes.restore(change);
    for (const file of change.files) this.setSaveState(projectId, file, 'Unsaved');
    return ok(change);
  }
}

export function createEditorService(deps: EditorServiceDeps): EditorService {
  return new NexoEditorService(deps);
}
