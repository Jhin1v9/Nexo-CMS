/**
 * DetectionContext real sobre o filesystem (Node), read-only.
 * Tolerante a erros por contrato: readFile -> null, listDir -> [], exists -> false
 * quando o recurso não existe ou não pode ser lido. NUNCA escreve (INVARIANTS:
 * discovery nunca muta o projeto).
 */

import { readdir, readFile as fsReadFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { DetectionContext, DirEntry } from './types.js';

export function createNodeDetectionContext(root: string): DetectionContext {
  const absRoot = resolve(root);
  return {
    root: absRoot,
    async readFile(rel: string): Promise<string | null> {
      try {
        return await fsReadFile(join(absRoot, rel), 'utf8');
      } catch {
        // ausência, diretório, permissão: detecção tolerante -> null (SPEC §6)
        return null;
      }
    },
    async exists(rel: string): Promise<boolean> {
      try {
        await stat(join(absRoot, rel));
        return true;
      } catch {
        return false;
      }
    },
    async listDir(rel = '.'): Promise<DirEntry[]> {
      try {
        const dirents = await readdir(join(absRoot, rel), { withFileTypes: true });
        const entries: DirEntry[] = [];
        for (const d of dirents) {
          const kind: DirEntry['kind'] = d.isFile()
            ? 'file'
            : d.isDirectory()
              ? 'dir'
              : d.isSymbolicLink()
                ? 'symlink'
                : 'other';
          entries.push({ name: d.name, kind });
        }
        return entries;
      } catch {
        return [];
      }
    },
  };
}

export interface FindFilesOptions {
  /** Profundidade máxima em segmentos de path a partir do root (default 3). */
  maxDepth?: number;
  /** Nomes de diretório ignorados em qualquer nível (default node_modules, .git). */
  ignoreDirs?: readonly string[];
  /** Limite de resultados para evitar varreduras explosivas (default 200). */
  maxResults?: number;
}

/**
 * Varredura recursiva RASA via ctx.listDir (sem seguir symlinks).
 * Retorna paths relativos com separador '/'. Read-only.
 */
export async function findFiles(
  ctx: DetectionContext,
  match: (rel: string) => boolean,
  opts: FindFilesOptions = {},
): Promise<string[]> {
  const maxDepth = opts.maxDepth ?? 3;
  const ignoreDirs = new Set(opts.ignoreDirs ?? ['node_modules', '.git']);
  const maxResults = opts.maxResults ?? 200;
  const found: string[] = [];

  async function walk(relDir: string, depth: number): Promise<void> {
    if (found.length >= maxResults) return;
    const entries = await ctx.listDir(relDir === '' ? undefined : relDir);
    for (const e of entries) {
      if (found.length >= maxResults) return;
      const rel = relDir === '' ? e.name : `${relDir}/${e.name}`;
      if (e.kind === 'dir') {
        if (!ignoreDirs.has(e.name) && depth < maxDepth) {
          await walk(rel, depth + 1);
        }
      } else if (e.kind === 'file') {
        if (match(rel)) found.push(rel);
      }
      // symlinks/other: não seguidos (evita loops e escapes)
    }
  }

  await walk('', 1);
  return found;
}
