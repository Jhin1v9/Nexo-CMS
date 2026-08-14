/**
 * Save Pipeline (07§36 — canonico, obrigatorio; M3-CONTRACTS §4):
 *
 *   Pending Changes -> Validate -> Check Conflict -> Adapter Transformation
 *   (se requerida) -> Filesystem Persistence -> Read/Verify
 *   -> Update Project Intelligence -> Update Preview -> Mark Saved
 *
 * Invariantes:
 *  - Sucesso SOMENTE apos persistencia confirmada (07§79: Source Project +
 *    Expected Modification + Persistence Confirmed). Esta funcao so retorna
 *    ok() depois de Read/Verify passar — nunca antes (07§64 No Fake Success).
 *  - Falha -> erro estruturado; o chamador (ChangeManager/saveSource) marca
 *    SaveFailed e mantem o pending recuperavel (07§37).
 *  - Conflito -> CONFLICT com hash baseline vs atual (07§38); NUNCA
 *    sobrescreve silenciosamente.
 *  - Verificacao pos-escrita (07§41): File Exists, Content Updated, Parser
 *    Succeeds (quando .tsx e parser injetado), Project Model Updated (hook).
 *    Profundidade proporcional (Inv. 28): checks sem hook injetado sao
 *    reportados como 'skipped' em diagnostics — nunca fingidos.
 *  - delete/rename: o ScopedFilesystem M1 (@nexo/runtime) nao expoe remocao
 *    de arquivo; operacoes que exigem delete retornam UNSUPPORTED explicito
 *    em vez de fingir suporte (Inv. 6/25). Registrado como limitacao M3.
 *
 * Adapter Transformation: contrato M3-CONTRACTS §2 (`transform(request):
 * TransformResult | UNSUPPORTED`). Para code-save puro (conteudo final ja
 * fornecido) a etapa e documentada como skip; se `transformRequest` for
 * passado sem adapter injetado -> UNSUPPORTED (nunca fallback silencioso).
 */

import { err, nexoError, ok, type NexoError, type Result } from '@nexo/shared';
import type { ScopedFilesystem } from '@nexo/runtime';

import { sha256Hex } from './types.js';

// ---------------------------------------------------------------------------
// Adapter (M3-CONTRACTS §2 — transform(request): TransformResult | UNSUPPORTED)
// ---------------------------------------------------------------------------

export interface TransformRequest {
  /** Conteudo atual por arquivo (relativo ao Project Root). */
  files: Record<string, string>;
  /** Instrucao de transformacao (ex.: editar prop visual). O adapter decide. */
  instruction: string;
  /** Contexto adicional opcional (selecao, prop, valor) para o adapter. */
  context?: Record<string, unknown>;
}

export type TransformResult =
  | { status: 'OK'; files: Record<string, string> }
  | { status: 'UNSUPPORTED'; reason: string };

export interface SourceTransformAdapter {
  transform(request: TransformRequest): Promise<TransformResult>;
}

// ---------------------------------------------------------------------------
// Hooks injetados (07§36/§41)
// ---------------------------------------------------------------------------

export interface SavePipelineDeps {
  fs: ScopedFilesystem;
  adapter?: SourceTransformAdapter | undefined;
  /** Parser TSX real injetado pelo consumidor (07§41 "Parser Succeeds"). */
  parseTsx?: ((content: string, filePath: string) => boolean | Promise<boolean>) | undefined;
  /** Update Project Intelligence (07§36). Ausente -> etapa skip documentado. */
  updateIntelligence?: ((files: string[]) => void | Promise<void>) | undefined;
  /** Update Preview (07§36/§46). Ausente -> etapa skip documentado. */
  updatePreview?: ((files: string[]) => void | Promise<void>) | undefined;
}

export interface SaveRequest {
  /** filePath relativo -> conteudo final desejado (null = remocao: UNSUPPORTED em M3). */
  after: Record<string, string | null>;
  /**
   * Baseline para Check Conflict (07§38): sha256 do conteudo observado quando
   * a mudanca/buffer foi capturado (null = arquivo nao existia).
   */
  baselineHashes: Record<string, string | null>;
  /** Conteudo de rollback por arquivo (para desfazer escrita que falhou na verificacao). */
  beforeContents?: Record<string, string | null>;
  /** Concorrencia otimista: hash que o chamador acredita estar no disco. */
  expectedHash?: { file: string; hash: string };
  /** Se presente, a etapa Adapter Transformation e OBRIGATORIA (sem skip). */
  transformRequest?: TransformRequest;
}

export interface SaveSuccess {
  saved: true;
  /** sha256 do conteudo persistido por arquivo (lido de volta do disco). */
  hashes: Record<string, string>;
  /** true somente se TODA a verificacao 07§41 disponivel passou. */
  verified: boolean;
  /** Trilha real das etapas (inclui skips explicitos — nada fingido). */
  diagnostics: string[];
}

type Stage =
  | 'validate'
  | 'check-conflict'
  | 'adapter-transformation'
  | 'persistence'
  | 'verify'
  | 'update-intelligence'
  | 'update-preview'
  | 'mark-saved';

function stageError(
  code: NexoError['code'],
  stage: Stage,
  message: string,
  diagnostics: string[],
  details?: Record<string, unknown>,
): NexoError {
  return nexoError(code, message, {
    retryable: code === 'INTERNAL',
    details: { stage, diagnostics, ...details },
  });
}

/**
 * Persiste UM arquivo e verifica de verdade (07§41): existe, conteudo
 * identico ao esperado, parser ok quando .tsx e parser injetado. Usado pelo
 * pipeline e por resolucoes de conflito/undo que tambem escrevem source.
 * Em falha de verificacao, tenta rollback para `rollbackTo` (best-effort,
 * reportado em diagnostics — nunca silencioso).
 */
export async function persistFileVerified(
  fs: ScopedFilesystem,
  file: string,
  content: string,
  opts: {
    parseTsx?: ((content: string, filePath: string) => boolean | Promise<boolean>) | undefined;
    /** Conteudo anterior para rollback; undefined = sem rollback possivel. */
    rollbackTo?: string | undefined;
    /** Conteudo ja existente permitido (modify) ou nao (create). */
    overwrite: boolean;
  },
): Promise<Result<{ hash: string; verified: boolean; diagnostics: string[] }>> {
  const diagnostics: string[] = [];
  const written = await fs.writeFile(file, content, { overwrite: opts.overwrite });
  if (!written.ok) {
    return err(
      nexoError(written.error.code, `persistence failed for '${file}': ${written.error.message}`, {
        resource: file,
        retryable: written.error.retryable,
        details: { stage: 'persistence', cause: written.error },
      }),
    );
  }
  diagnostics.push(`persisted '${file}' (${content.length} bytes)`);

  // Read/Verify (07§41): File Exists + Content Updated — leitura real pos-escrita.
  const readBack = await fs.readFile(file);
  if (!readBack.ok) {
    return err(
      nexoError('INTERNAL', `verification failed: cannot read back '${file}' after write`, {
        resource: file,
        retryable: true,
        details: { stage: 'verify', cause: readBack.error },
      }),
    );
  }
  if (readBack.value !== content) {
    await tryRollback(fs, file, opts.rollbackTo, diagnostics);
    return err(
      nexoError('INTERNAL', `verification failed: content mismatch on '${file}' after write`, {
        resource: file,
        retryable: true,
        details: { stage: 'verify', expectedHash: sha256Hex(content), actualHash: sha256Hex(readBack.value) },
      }),
    );
  }
  diagnostics.push(`verified content of '${file}' (sha256 ${sha256Hex(content).slice(0, 12)}...)`);

  // Parser Succeeds (07§41) — somente quando parser injetado; senao skip honesto.
  if (file.endsWith('.tsx')) {
    if (opts.parseTsx !== undefined) {
      const parses = await opts.parseTsx(readBack.value, file);
      if (!parses) {
        await tryRollback(fs, file, opts.rollbackTo, diagnostics);
        return err(
          nexoError('INVALID_INPUT', `verification failed: '${file}' does not parse as TSX after write`, {
            resource: file,
            details: { stage: 'verify', check: 'Parser Succeeds', diagnostics },
          }),
        );
      }
      diagnostics.push(`parser check passed for '${file}'`);
    } else {
      diagnostics.push(`parser check skipped for '${file}' (no parser injected)`);
    }
  }
  return ok({ hash: sha256Hex(readBack.value), verified: true, diagnostics });
}

async function tryRollback(
  fs: ScopedFilesystem,
  file: string,
  rollbackTo: string | undefined,
  diagnostics: string[],
): Promise<void> {
  if (rollbackTo === undefined) {
    diagnostics.push(`rollback unavailable for '${file}' (no before content captured)`);
    return;
  }
  const r = await fs.writeFile(file, rollbackTo, { overwrite: true });
  diagnostics.push(
    r.ok
      ? `rolled back '${file}' to before content after failed verification`
      : `rollback FAILED for '${file}': ${r.error.message}`,
  );
}

/** Pipeline canonico 07§36. Sucesso somente apos persistencia confirmada. */
export async function runSavePipeline(
  deps: SavePipelineDeps,
  req: SaveRequest,
): Promise<Result<SaveSuccess>> {
  const diagnostics: string[] = [];
  const files = Object.keys(req.after);

  // -- 1. Validate -----------------------------------------------------------
  if (files.length === 0) {
    return err(stageError('INVALID_INPUT', 'validate', 'save request has no files', diagnostics));
  }
  for (const file of files) {
    if (typeof file !== 'string' || file.length === 0) {
      return err(stageError('INVALID_INPUT', 'validate', 'invalid file path in save request', diagnostics));
    }
    if (req.after[file] === null) {
      // delete exige remocao de arquivo — ScopedFilesystem M1 nao expoe (ver header).
      return err(
        stageError(
          'UNSUPPORTED',
          'validate',
          `file deletion is UNSUPPORTED in M3: runtime ScopedFilesystem has no remove operation ('${file}')`,
          diagnostics,
          { file, nextAction: 'remove the file outside the editor or wait for runtime delete support' },
        ),
      );
    }
  }
  if (req.expectedHash !== undefined && !(req.expectedHash.file in req.after)) {
    return err(
      stageError('INVALID_INPUT', 'validate', `expectedHash refers to '${req.expectedHash.file}' which is not in the save set`, diagnostics),
    );
  }
  diagnostics.push(`validate: ok (${files.length} file(s))`);

  // -- 2. Check Conflict (07§38: hash baseline + conteudo real atual) --------
  const currentHashes: Record<string, string | null> = {};
  for (const file of files) {
    const current = await deps.fs.readFile(file);
    const currentHash = current.ok ? sha256Hex(current.value) : null;
    currentHashes[file] = currentHash;
    const baseline = req.baselineHashes[file];
    if (baseline === undefined) {
      return err(stageError('INVALID_INPUT', 'check-conflict', `missing baseline hash for '${file}'`, diagnostics, { file }));
    }
    if (baseline === null && currentHash !== null) {
      return err(
        stageError('CONFLICT', 'check-conflict', `file '${file}' was created externally since the change was captured`, diagnostics, {
          file,
          baselineHash: null,
          currentHash,
          nextAction: 'resolve-conflict',
        }),
      );
    }
    if (baseline !== null && currentHash === null) {
      return err(
        stageError('CONFLICT', 'check-conflict', `file '${file}' was removed externally since the change was captured`, diagnostics, {
          file,
          baselineHash: baseline,
          currentHash: null,
          nextAction: 'resolve-conflict',
        }),
      );
    }
    if (baseline !== null && currentHash !== null && baseline !== currentHash) {
      return err(
        stageError('CONFLICT', 'check-conflict', `file '${file}' changed externally (baseline != current)`, diagnostics, {
          file,
          baselineHash: baseline,
          currentHash,
          nextAction: 'resolve-conflict',
        }),
      );
    }
  }
  if (req.expectedHash !== undefined) {
    const { file, hash } = req.expectedHash;
    if (currentHashes[file] !== hash) {
      return err(
        stageError('CONFLICT', 'check-conflict', `expectedHash mismatch for '${file}': source changed since last read`, diagnostics, {
          file,
          expectedHash: hash,
          currentHash: currentHashes[file],
          nextAction: 're-read source and retry',
        }),
      );
    }
  }
  diagnostics.push('check-conflict: ok (baselines match current source)');

  // -- 3. Adapter Transformation (se requerida) ------------------------------
  let finalContents: Record<string, string> = {};
  for (const file of files) {
    const c = req.after[file];
    if (c !== null && c !== undefined) finalContents[file] = c;
  }
  if (req.transformRequest !== undefined) {
    if (deps.adapter === undefined) {
      return err(
        stageError(
          'UNSUPPORTED',
          'adapter-transformation',
          'adapter transformation required but no SourceTransformAdapter was injected',
          diagnostics,
          { instruction: req.transformRequest.instruction, nextAction: 'inject an adapter or provide final content (code-save)' },
        ),
      );
    }
    const transformed = await deps.adapter.transform(req.transformRequest);
    if (transformed.status === 'UNSUPPORTED') {
      return err(
        stageError('UNSUPPORTED', 'adapter-transformation', `adapter returned UNSUPPORTED: ${transformed.reason}`, diagnostics),
      );
    }
    for (const [file, content] of Object.entries(transformed.files)) {
      if (!(file in req.after)) {
        return err(
          stageError('INVALID_INPUT', 'adapter-transformation', `adapter produced unexpected file '${file}' outside the change set`, diagnostics, { file }),
        );
      }
      finalContents[file] = content;
    }
    diagnostics.push('adapter-transformation: applied');
  } else {
    // Code-save puro: conteudo final ja fornecido — etapa skip DOCUMENTADO.
    diagnostics.push('adapter-transformation: skipped (code-save: final content already provided)');
  }

  // -- 4. Filesystem Persistence + 5. Read/Verify (07§41) --------------------
  const hashes: Record<string, string> = {};
  let verified = true;
  for (const file of files) {
    const content = finalContents[file];
    if (content === undefined) {
      return err(stageError('INTERNAL', 'persistence', `no final content for '${file}' after transformation stage`, diagnostics, { file }));
    }
    const before = req.beforeContents?.[file];
    const persisted = await persistFileVerified(deps.fs, file, content, {
      parseTsx: deps.parseTsx,
      overwrite: req.baselineHashes[file] !== null,
      ...(before !== null && before !== undefined ? { rollbackTo: before } : {}),
    });
    if (!persisted.ok) {
      persisted.error.details = { ...persisted.error.details, diagnostics: [...diagnostics, ...stringArray(persisted.error.details?.['diagnostics'])] };
      return persisted;
    }
    diagnostics.push(...persisted.value.diagnostics);
    hashes[file] = persisted.value.hash;
    verified = verified && persisted.value.verified;
  }

  // -- 6. Update Project Intelligence (hook injetado; skip honesto) ----------
  if (deps.updateIntelligence !== undefined) {
    try {
      await deps.updateIntelligence(files);
      diagnostics.push('update-project-intelligence: hook executed');
    } catch (e) {
      // Persistencia JA esta confirmada; falha de PI nao desdiz o save —
      // mas NUNCA e escondida (07§63: estado real em diagnostics).
      diagnostics.push(
        `update-project-intelligence: hook FAILED (save persisted): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  } else {
    diagnostics.push('update-project-intelligence: skipped (no hook injected)');
  }

  // -- 7. Update Preview (hook injetado; skip honesto) -----------------------
  if (deps.updatePreview !== undefined) {
    try {
      await deps.updatePreview(files);
      diagnostics.push('update-preview: hook executed');
    } catch (e) {
      diagnostics.push(`update-preview: hook FAILED (save persisted): ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    diagnostics.push('update-preview: skipped (no hook injected)');
  }

  // -- 8. Mark Saved (SOMENTE aqui — 07§29/§79) -------------------------------
  diagnostics.push('mark-saved: persistence confirmed');
  return ok({ saved: true, hashes, verified, diagnostics });
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
