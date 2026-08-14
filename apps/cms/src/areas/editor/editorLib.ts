/**
 * editorLib — helpers PUROS da área Editor (sem React/DOM — testáveis em
 * node). Nenhuma lógica de domínio duplicada do backend: apenas derivações
 * de apresentação e montagem de inputs dos contratos M3 (M3-CONTRACTS §3.1).
 */

import type { EditorFileDiffStatus, EditorSaveState } from '../../api/hooks';

// ---- linguagem por extensão ---------------------------------------------------

/**
 * Id de linguagem por extensão — mesma tabela do backend
 * (packages/editor/src/source.ts LANGUAGE_BY_EXT), usada só para escolher o
 * modo de highlight do CodeMirror. Extensão desconhecida -> 'unknown'
 * (highlight neutro; nunca adivinhado).
 */
export type EditorLanguageId =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'json'
  | 'css'
  | 'html'
  | 'markdown'
  | 'unknown';

const LANGUAGE_BY_EXT: Record<string, EditorLanguageId> = {
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

export function languageIdFromPath(filePath: string): EditorLanguageId {
  const base = filePath.split('/').pop() ?? filePath;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return 'unknown';
  return LANGUAGE_BY_EXT[base.slice(dot).toLowerCase()] ?? 'unknown';
}

// ---- save (07§29/§36/§38) ------------------------------------------------------

/** Estado de save derivado: buffer == conteúdo confirmado -> Saved. */
export function deriveSaveState(buffer: string, savedContent: string): 'Saved' | 'Unsaved' {
  return buffer === savedContent ? 'Saved' : 'Unsaved';
}

export const SAVE_STATE_LABEL: Record<EditorSaveState, string> = {
  Saved: 'Saved',
  Unsaved: 'Unsaved',
  Saving: 'Saving',
  SaveFailed: 'Save Failed',
  Conflict: 'Conflict',
};

/**
 * Monta o input de editor.source.save com concorrência otimista (07§38):
 * `expectedHash` = hash retornado pelo último open/save bem-sucedido.
 * Sem baseline conhecida o campo é omitido (opcional no contrato) — nunca
 * fabricado.
 */
export function buildSaveInput(
  projectId: string,
  filePath: string,
  content: string,
  baselineHash: string | null,
): { projectId: string; filePath: string; content: string; expectedHash?: string } {
  return {
    projectId,
    filePath,
    content,
    ...(baselineHash !== null && baselineHash.length > 0 ? { expectedHash: baselineHash } : {}),
  };
}

// ---- diff de linhas (07§42 — apresentação local) --------------------------------

export type LineDiffStatus = 'Added' | 'Removed' | 'Modified';

export interface LocalLineDiff {
  status: LineDiffStatus;
  /** Linhas só em `after`. */
  added: string[];
  /** Linhas só em `before`. */
  removed: string[];
  /** Pares posicionais de linha substituída. */
  modified: Array<{ before: string; after: string }>;
}

/**
 * Diff de linhas LOCAL (para as views Diff/Compare): mesmo modelo de
 * apresentação do FileDiff do backend (packages/editor — emparelhamento
 * posicional da região alterada, sem algoritmo sofisticado). NÃO é o Diff
 * Engine do ChangeManager: diffs de Change Objects vêm de
 * editor.change.preview (backend). Idêntico -> status 'Modified' com
 * listas vazias (diff sem mudanças é representado honestamente).
 */
export function diffLines(before: string, after: string): LocalLineDiff {
  const a = before.split('\n');
  const b = after.split('\n');

  // Prefixo e sufixo comuns.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const removedBlock = a.slice(start, endA);
  const addedBlock = b.slice(start, endB);
  const paired = Math.min(removedBlock.length, addedBlock.length);

  const modified: Array<{ before: string; after: string }> = [];
  for (let i = 0; i < paired; i += 1) {
    modified.push({ before: removedBlock[i] ?? '', after: addedBlock[i] ?? '' });
  }
  const removed = removedBlock.slice(paired);
  const added = addedBlock.slice(paired);

  const status: LineDiffStatus =
    before.length === 0 && after.length > 0
      ? 'Added'
      : after.length === 0 && before.length > 0
        ? 'Removed'
        : 'Modified';

  return { status, added, removed, modified };
}

/** Diff local tem mudanças? (buffer vs conteúdo salvo, etc.) */
export function hasLineChanges(diff: LocalLineDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0;
}

// ---- status de arquivo de Change Object -----------------------------------------

/** Status Added/Removed/Modified de um arquivo num Change Object (07§42). */
export function changeFileStatus(
  before: string | null | undefined,
  after: string | null | undefined,
): EditorFileDiffStatus {
  if (before === null || before === undefined) return 'Added';
  if (after === null || after === undefined) return 'Removed';
  return 'Modified';
}

// ---- paths ------------------------------------------------------------------------

/** Nome do arquivo (último segmento) para exibição; path vazio -> ''. */
export function fileNameOf(filePath: string): string {
  const parts = filePath.split('/').filter((p) => p.length > 0);
  return parts[parts.length - 1] ?? filePath;
}

/** Diretório-pai de um path relativo ('' quando na raiz). */
export function parentDirOf(filePath: string): string {
  const parts = filePath.split('/').filter((p) => p.length > 0);
  return parts.slice(0, -1).join('/');
}
