/**
 * Diff local de componentes (08§22 — component.update retorna Diff).
 * Espelho local da semantica de 07§42 (FileDiff): @nexo/components NAO pode
 * depender de @nexo/editor (M3-CONTRACTS §2), entao o diff de linha e
 * implementado aqui com a mesma estrutura (added/removed por multiset de
 * linhas — determinístico, sem ambiguidade positional).
 */

import type { ComponentDiff, ComponentFileDiff, ComponentFileDiffStatus } from './types.js';

function countLines(content: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of content.split('\n')) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

/** Linhas presentes em `content` alem das cobertas por `other` (multiset). */
function surplus(content: string, other: string): string[] {
  const remaining = countLines(other);
  const out: string[] = [];
  for (const line of content.split('\n')) {
    const left = remaining.get(line) ?? 0;
    if (left > 0) {
      remaining.set(line, left - 1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Diff de UM arquivo (before null = criado; after null = removido). */
export function diffFile(file: string, before: string | null, after: string | null): ComponentFileDiff {
  const status: ComponentFileDiffStatus =
    before === null ? 'Added' : after === null ? 'Removed' : 'Modified';
  return {
    file,
    before,
    after,
    status,
    added: after === null ? [] : surplus(after, before ?? ''),
    removed: before === null ? [] : surplus(before, after ?? ''),
  };
}

/** Diff de um conjunto arquivo -> (before, after). */
export function diffFiles(
  changes: Readonly<Record<string, { before: string | null; after: string | null }>>,
): ComponentDiff {
  const files = Object.keys(changes)
    .sort()
    .map((file) => {
      const c = changes[file];
      return diffFile(file, c?.before ?? null, c?.after ?? null);
    });
  return { files };
}
