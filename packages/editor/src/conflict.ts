/**
 * Conflitos de edicao (07§38-40; D12 em OPEN-QUESTIONS.md).
 *
 *  - Baseline sha256 + mtime por arquivo aberto (registrado em openSource e
 *    atualizado apos cada persistencia confirmada).
 *  - Deteccao (07§38/§40): hash atual != baseline -> mudanca externa.
 *    COM mudancas locais pendentes -> CONFLICT (07§38); SEM -> refresh
 *    automatico do baseline (07§40: Detect -> Refresh -> Update Preview).
 *  - Resolucoes (D12): KeepLocal (escreve local com verificacao), KeepExternal
 *    (descarta pendencias locais e recarrega), Compare (diff 3-way informativo,
 *    nao altera nada), Reload (re-le disco, atualiza baseline), Cancel (no-op).
 *  - 'Merge' -> UNSUPPORTED explicito (D12; 07§39 "eventually"; Inv. 39).
 *  - NUNCA sobrescreve silenciosamente nenhum dos lados (07§38).
 */

import { err, nexoError, ok, type Result } from '@nexo/shared';
import type { ScopedFilesystem } from '@nexo/runtime';

import { threeWayDiff, type ThreeWayDiff } from './change-manager.js';
import {
  SUPPORTED_CONFLICT_RESOLUTIONS,
  nowIso,
  sha256Hex,
  type ConflictResolution,
  type ConflictResolutionRequest,
} from './types.js';

export interface FileBaseline {
  file: string;
  hash: string;
  mtime: string;
  registeredAt: string;
}

export interface ConflictInfo {
  file: string;
  baselineHash: string;
  currentHash: string;
  baselineMtime: string;
  currentMtime: string;
  /** true quando havia pendencia local no momento da deteccao (07§38). */
  hasLocalChanges: boolean;
  /** Resolucoes suportadas — 'Merge' NUNCA listado (D12). */
  resolutions: readonly ConflictResolution[];
}

export type ConflictDetection =
  | { kind: 'CONFLICT'; conflict: ConflictInfo }
  /** 07§40: mudanca externa SEM edits locais -> baseline ja foi atualizado. */
  | { kind: 'EXTERNAL_REFRESHED'; file: string; hash: string }
  | { kind: 'UNCHANGED'; file: string };

export type ConflictResolutionOutcome =
  | { resolution: 'KeepLocal'; saved: true; hash: string; verified: boolean; diagnostics: string[] }
  | { resolution: 'KeepExternal'; content: string; hash: string; discardedChangeIds: string[] }
  | { resolution: 'Compare'; threeWay: ThreeWayDiff }
  | { resolution: 'Reload'; content: string; hash: string }
  | { resolution: 'Cancel'; file: string };

export interface ConflictManagerDeps {
  fsFor(projectId: string): ScopedFilesystem;
  /** Pendencia local existe para o arquivo? (ChangeManager). */
  hasLocalChanges(projectId: string, file: string): boolean;
  /** Conteudo local pendente mais recente para KeepLocal (null se nenhum). */
  localContentFor(projectId: string, file: string): string | null;
  /** Descarta pendencias locais do arquivo (KeepExternal); retorna ids. */
  discardLocal(projectId: string, file: string): string[];
  /** Persiste local com verificacao real (KeepLocal) — save pipeline interno. */
  persistLocal(projectId: string, file: string, content: string): Promise<Result<{ hash: string; verified: boolean; diagnostics: string[] }>>;
  /**
   * Conteudo baseline real (before do change pendente que toca o arquivo).
   * Usado SOMENTE pelo Compare (diff 3-way); null quando nao ha before
   * registrado — nunca inventado.
   */
  baselineContentFor(projectId: string, file: string): string | null;
  /** Hook 07§40: preview atualizado apos refresh externo (opcional). */
  onExternalRefresh?: ((projectId: string, file: string) => void) | undefined;
}

export class ConflictManager {
  private readonly deps: ConflictManagerDeps;
  /** `${projectId}::${file}` -> baseline. */
  private readonly baselines = new Map<string, FileBaseline>();

  constructor(deps: ConflictManagerDeps) {
    this.deps = deps;
  }

  private key(projectId: string, file: string): string {
    return `${projectId}::${file}`;
  }

  registerBaseline(projectId: string, file: string, hash: string, mtime: string): void {
    this.baselines.set(this.key(projectId, file), { file, hash, mtime, registeredAt: nowIso() });
  }

  getBaseline(projectId: string, file: string): FileBaseline | undefined {
    return this.baselines.get(this.key(projectId, file));
  }

  /** Atualiza baseline para o conteudo conhecido (apos persistencia verificada). */
  async refreshBaseline(projectId: string, file: string, knownContent?: string): Promise<Result<FileBaseline>> {
    const fs = this.deps.fsFor(projectId);
    const stat = await fs.stat(file);
    const mtime = stat.ok ? stat.value.mtime : '';
    if (knownContent !== undefined) {
      const baseline: FileBaseline = { file, hash: sha256Hex(knownContent), mtime, registeredAt: nowIso() };
      this.baselines.set(this.key(projectId, file), baseline);
      return ok(baseline);
    }
    const current = await fs.readFile(file);
    if (!current.ok) return err(current.error);
    const baseline: FileBaseline = { file, hash: sha256Hex(current.value), mtime, registeredAt: nowIso() };
    this.baselines.set(this.key(projectId, file), baseline);
    return ok(baseline);
  }

  /**
   * Deteccao de mudanca externa (07§38/§40). Sem baseline registrado, nao ha
   * como afirmar mudanca: UNKNOWN honesto via UNCHANGED (nada a comparar).
   */
  async detect(projectId: string, file: string): Promise<Result<ConflictDetection>> {
    const baseline = this.getBaseline(projectId, file);
    if (baseline === undefined) return ok({ kind: 'UNCHANGED', file });
    const fs = this.deps.fsFor(projectId);
    const current = await fs.readFile(file);
    if (!current.ok) {
      if (current.error.code === 'NOT_FOUND') {
        // Arquivo removido externamente: com pendencia local = CONFLICT.
        if (this.deps.hasLocalChanges(projectId, file)) {
          return ok({
            kind: 'CONFLICT',
            conflict: {
              file,
              baselineHash: baseline.hash,
              currentHash: '',
              baselineMtime: baseline.mtime,
              currentMtime: '',
              hasLocalChanges: true,
              resolutions: SUPPORTED_CONFLICT_RESOLUTIONS,
            },
          });
        }
        this.baselines.delete(this.key(projectId, file));
        this.deps.onExternalRefresh?.(projectId, file);
        return ok({ kind: 'EXTERNAL_REFRESHED', file, hash: '' });
      }
      return err(current.error);
    }
    const currentHash = sha256Hex(current.value);
    if (currentHash === baseline.hash) return ok({ kind: 'UNCHANGED', file });
    const stat = await fs.stat(file);
    const currentMtime = stat.ok ? stat.value.mtime : '';

    if (this.deps.hasLocalChanges(projectId, file)) {
      // 07§38: Unsaved Local Change + External Source Change = CONFLICT.
      return ok({
        kind: 'CONFLICT',
        conflict: {
          file,
          baselineHash: baseline.hash,
          currentHash,
          baselineMtime: baseline.mtime,
          currentMtime,
          hasLocalChanges: true,
          resolutions: SUPPORTED_CONFLICT_RESOLUTIONS,
        },
      });
    }
    // 07§40: sem edits locais -> Detect -> Refresh -> Update Preview.
    this.registerBaseline(projectId, file, currentHash, currentMtime);
    this.deps.onExternalRefresh?.(projectId, file);
    return ok({ kind: 'EXTERNAL_REFRESHED', file, hash: currentHash });
  }

  /**
   * Resolve um conflito (D12). 'Merge' -> UNSUPPORTED explicito, sempre.
   * Nenhuma resolucao sobrescreve lado algum silenciosamente: KeepLocal so
   * escreve o conteudo local pendente (com verificacao); KeepExternal so
   * descarta pendencias locais explicitamente registradas.
   */
  async resolve(
    projectId: string,
    file: string,
    resolution: ConflictResolutionRequest,
  ): Promise<Result<ConflictResolutionOutcome>> {
    if (resolution === 'Merge') {
      return err(
        nexoError(
          'UNSUPPORTED',
          "conflict resolution 'Merge' is UNSUPPORTED in M3 (decision D12; doc 07 §39 defers merge to the source-editing subsystem)",
          {
            resource: file,
            details: {
              supported: SUPPORTED_CONFLICT_RESOLUTIONS,
              nextAction: "use 'Compare' for a 3-way diff and then 'KeepLocal' or 'KeepExternal'",
            },
          },
        ),
      );
    }
    const fs = this.deps.fsFor(projectId);

    switch (resolution) {
      case 'Cancel':
        // No-op explicito: ambos os lados preservados (07§38).
        return ok({ resolution: 'Cancel', file });

      case 'Reload': {
        const current = await fs.readFile(file);
        if (!current.ok) return err(current.error);
        const refreshed = await this.refreshBaseline(projectId, file, current.value);
        if (!refreshed.ok) return err(refreshed.error);
        return ok({ resolution: 'Reload', content: current.value, hash: refreshed.value.hash });
      }

      case 'Compare': {
        if (this.getBaseline(projectId, file) === undefined) {
          return err(
            nexoError('INVALID_INPUT', `Compare requires a registered baseline for '${file}' (open the source first)`, {
              resource: file,
            }),
          );
        }
        const external = await fs.readFile(file);
        if (!external.ok) return err(external.error);
        const local = this.deps.localContentFor(projectId, file);
        const baselineContent = this.deps.baselineContentFor(projectId, file);
        // Diff 3-way INFORMATIVO: nao altera disco, baseline nem pendencias.
        return ok({
          resolution: 'Compare',
          threeWay: threeWayDiff(file, baselineContent, local, external.value),
        });
      }

      case 'KeepLocal': {
        const local = this.deps.localContentFor(projectId, file);
        if (local === null) {
          return err(
            nexoError('INVALID_INPUT', `KeepLocal requires local pending content for '${file}' (none registered)`, {
              resource: file,
              details: { nextAction: 'create a change first or use Reload/KeepExternal' },
            }),
          );
        }
        const persisted = await this.deps.persistLocal(projectId, file, local);
        if (!persisted.ok) return err(persisted.error);
        const refreshed = await this.refreshBaseline(projectId, file, local);
        if (!refreshed.ok) return err(refreshed.error);
        return ok({
          resolution: 'KeepLocal',
          saved: true,
          hash: persisted.value.hash,
          verified: persisted.value.verified,
          diagnostics: persisted.value.diagnostics,
        });
      }

      case 'KeepExternal': {
        // Descarta SOMENTE pendencias locais registradas; recarrega o externo.
        const discarded = this.deps.discardLocal(projectId, file);
        const current = await fs.readFile(file);
        if (!current.ok) return err(current.error);
        const refreshed = await this.refreshBaseline(projectId, file, current.value);
        if (!refreshed.ok) return err(refreshed.error);
        return ok({ resolution: 'KeepExternal', content: current.value, hash: refreshed.value.hash, discardedChangeIds: discarded });
      }
    }
  }

}
