/**
 * Source open/save (editor.source.open / editor.source.save — M3-CONTRACTS §3.1).
 *
 *  - openSource: le via ScopedFilesystem do @nexo/runtime (scope guard em
 *    TODA operacao — fora do root -> SCOPE_VIOLATION), registra baseline
 *    sha256+mtime (07§38) e detecta readOnly de verdade (access W_OK).
 *  - saveSource: passa pelo save pipeline canonico 07§36 (via executor
 *    injetado pelo service). `expectedHash` divergente -> CONFLICT
 *    (concorrencia otimista, M3-CONTRACTS §3.1). Baseline registrada divergente
 *    do disco -> CONFLICT (07§38) — nunca sobrescreve mudanca externa.
 *  - Falha de persistencia -> SaveFailed + buffer nao salvo persistido no
 *    DraftStore (07§37/§65), NUNCA 'Saved'.
 */

import { promises as nodeFs } from 'node:fs';
import path from 'node:path';

import { err, nexoError, ok, type Result } from '@nexo/shared';
import { resolveWithinRoot, type ScopedFilesystem } from '@nexo/runtime';

import type { ConflictManager } from './conflict.js';
import type { DraftStore, UnsavedBuffer } from './recovery.js';
import type { SaveRequest, SaveSuccess } from './save-pipeline.js';
import { nowIso, sha256Hex } from './types.js';

/** Resultado de editor.source.open (M3-CONTRACTS §3.1). */
export interface OpenSourceResult {
  content: string;
  encoding: 'utf8';
  hash: string;
  language: string;
  readOnly: boolean;
}

/** Resultado de editor.source.save (M3-CONTRACTS §3.1). */
export interface SourceSaveResult {
  saved: true;
  hash: string;
  verified: boolean;
  diagnostics: string[];
}

export type PipelineRunner = (projectId: string, req: SaveRequest) => Promise<Result<SaveSuccess>>;

export interface SourceManagerDeps {
  fsFor(projectId: string): ScopedFilesystem;
  rootFor(projectId: string): string;
  conflicts: ConflictManager;
  runPipeline: PipelineRunner;
  drafts?: DraftStore | undefined;
  onSaveState(projectId: string, file: string, state: 'Saved' | 'SaveFailed' | 'Conflict'): void;
}

const LANGUAGE_BY_EXT: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.css': 'css',
  '.html': 'html',
  '.md': 'markdown',
};

export function languageFromPath(file: string): string {
  return LANGUAGE_BY_EXT[path.extname(file).toLowerCase()] ?? 'unknown';
}

export class SourceManager {
  private readonly deps: SourceManagerDeps;
  private readonly rootRealCache = new Map<string, Promise<string>>();

  constructor(deps: SourceManagerDeps) {
    this.deps = deps;
  }

  private rootReal(projectId: string): Promise<string> {
    let p = this.rootRealCache.get(projectId);
    if (p === undefined) {
      p = nodeFs.realpath(this.deps.rootFor(projectId));
      this.rootRealCache.set(projectId, p);
    }
    return p;
  }

  /**
   * readOnly real: resolve o path com o MESMO guard do runtime (contra
   * symlink escape) e testa W_OK no arquivo real. Indeterminado -> false com
   * ressalva? Nao: falha de acesso em arquivo existente e lido com sucesso
   * significa "nao conseguimos provar read-only" — reportamos false apenas se
   * o access W_OK passar; se falhar, readOnly true. Erros inesperados ->
   * readOnly false NUNCA esconderia falha de escrita depois (pipeline falha
   * de verdade), entao aqui e seguro e honesto.
   */
  private async detectReadOnly(projectId: string, file: string): Promise<Result<boolean>> {
    const rootAbs = path.resolve(this.deps.rootFor(projectId));
    let rootReal: string;
    try {
      rootReal = await this.rootReal(projectId);
    } catch (e) {
      return err(
        nexoError('INTERNAL', `cannot resolve project root for readOnly detection: ${(e as Error).message}`, { retryable: true }),
      );
    }
    const resolved = await resolveWithinRoot(rootAbs, rootReal, file);
    if (!resolved.ok) {
      if (resolved.reason === 'ESCAPE') {
        return err(
          nexoError('SCOPE_VIOLATION', `Path escapes scoped root: '${file}'`, { resource: file, details: { root: rootAbs } }),
        );
      }
      return err(
        nexoError('INTERNAL', `readOnly detection failed for '${file}': ${resolved.cause.message}`, { resource: file, retryable: true }),
      );
    }
    try {
      await nodeFs.access(resolved.abs, nodeFs.constants.W_OK);
      return ok(false);
    } catch {
      return ok(true);
    }
  }

  /** editor.source.open (M3-CONTRACTS §3.1). Registra baseline (07§38). */
  async open(projectId: string, filePath: string): Promise<Result<OpenSourceResult>> {
    const fs = this.deps.fsFor(projectId);
    const read = await fs.readFile(filePath); // scope guard aqui dentro
    if (!read.ok) return err(read.error);
    const stat = await fs.stat(filePath);
    const hash = sha256Hex(read.value);
    const readOnly = await this.detectReadOnly(projectId, filePath);
    if (!readOnly.ok) return err(readOnly.error);
    this.deps.conflicts.registerBaseline(projectId, filePath, hash, stat.ok ? stat.value.mtime : '');
    this.deps.onSaveState(projectId, filePath, 'Saved');
    return ok({
      content: read.value,
      encoding: 'utf8',
      hash,
      language: languageFromPath(filePath),
      readOnly: readOnly.value,
    });
  }

  /**
   * editor.source.save (M3-CONTRACTS §3.1) — pipeline canonico 07§36.
   * CONFLICT se expectedHash diverge do disco OU se o disco diverge da
   * baseline registrada (mudanca externa, 07§38).
   */
  async save(
    projectId: string,
    filePath: string,
    content: string,
    expectedHash?: string,
  ): Promise<Result<SourceSaveResult>> {
    const fs = this.deps.fsFor(projectId);

    // Captura before REAL para rollback e baseline de conflito.
    const current = await fs.readFile(filePath);
    const beforeContent = current.ok ? current.value : null;
    if (!current.ok && current.error.code !== 'NOT_FOUND') return err(current.error);
    const baseline = this.deps.conflicts.getBaseline(projectId, filePath);
    const baselineHash = baseline?.hash ?? (beforeContent === null ? null : sha256Hex(beforeContent));

    const req: SaveRequest = {
      after: { [filePath]: content },
      baselineHashes: { [filePath]: baselineHash },
      beforeContents: { [filePath]: beforeContent },
      ...(expectedHash !== undefined ? { expectedHash: { file: filePath, hash: expectedHash } } : {}),
    };
    const saved = await this.deps.runPipeline(projectId, req);
    if (!saved.ok) {
      if (saved.error.code === 'CONFLICT') {
        this.deps.onSaveState(projectId, filePath, 'Conflict');
      } else {
        // 07§37: falha -> SaveFailed, pending RECUPERAVEL (07§65), nunca Saved.
        this.deps.onSaveState(projectId, filePath, 'SaveFailed');
        this.persistUnsavedBuffer(projectId, filePath, content, saved.error.message);
      }
      return err(saved.error);
    }
    // Sucesso SOMENTE apos persistencia confirmada pelo pipeline (07§79).
    const hash = saved.value.hashes[filePath];
    if (hash === undefined) {
      return err(
        nexoError('INTERNAL', `pipeline confirmed save but returned no hash for '${filePath}'`, { resource: filePath }),
      );
    }
    const refreshed = await this.deps.conflicts.refreshBaseline(projectId, filePath, content);
    if (!refreshed.ok) return err(refreshed.error);
    this.deps.onSaveState(projectId, filePath, 'Saved');
    return ok({ saved: true, hash, verified: saved.value.verified, diagnostics: saved.value.diagnostics });
  }

  private persistUnsavedBuffer(projectId: string, filePath: string, content: string, reason: string): void {
    const buffer: UnsavedBuffer = { filePath, content, failedAt: nowIso(), reason };
    this.deps.drafts?.saveDraft({
      id: `buffer:${projectId}:${filePath}`,
      projectId,
      kind: 'unsaved-buffer',
      payload: buffer,
      updatedAt: nowIso(),
    });
  }
}
