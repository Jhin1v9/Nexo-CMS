/**
 * ScopedFilesystem (SPEC.md §4): acesso a arquivos restrito ao Project Root.
 * Guard anti-escape em TODA operação:
 *  1. path.resolve + contenção lexical (rejeita '../' e absolute escape);
 *  2. realpath do ancestral existente mais próximo (rejeita symlink escape —
 *     inclusive arquivo DENTRO do root que é symlink para fora).
 * Violação -> SCOPE_VIOLATION (erro estruturado, SPEC §0). Overwrite só explícito.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, nexoError, ok, type NexoError, type Result } from '@nexo/shared';

import { resolveWithinRoot } from './scope-guard.js';

export interface DirEntry {
  name: string;
  kind: 'file' | 'dir' | 'symlink' | 'other';
  size?: number;
  /** ISO 8601. */
  mtime: string;
}

export interface ScopedFilesystem {
  /** Caminho relativo ao Project Root. */
  readFile(rel: string): Promise<Result<string>>;
  /** Overwrite somente explícito (opts.overwrite === true), senão CONFLICT. */
  writeFile(rel: string, content: string, opts: { overwrite: boolean }): Promise<Result<void>>;
  listDir(rel?: string): Promise<Result<DirEntry[]>>;
  exists(rel: string): Promise<boolean>;
  stat(rel: string): Promise<Result<DirEntry>>;
}

function scopeViolation(root: string, rel: string): NexoError {
  return nexoError('SCOPE_VIOLATION', `Path escapes scoped root: '${rel}'`, {
    resource: rel,
    details: { root, rel },
  });
}

function invalidInput(message: string, rel: string): NexoError {
  return nexoError('INVALID_INPUT', message, { resource: rel });
}

function mapFsError(e: NodeJS.ErrnoException, rel: string, op: string): NexoError {
  switch (e.code) {
    case 'ENOENT':
      return nexoError('NOT_FOUND', `${op}: not found: '${rel}'`, { resource: rel });
    case 'EEXIST':
      return nexoError('CONFLICT', `${op}: already exists: '${rel}'`, { resource: rel });
    case 'EISDIR':
    case 'ENOTDIR':
      return invalidInput(`${op}: not a file/directory as expected: '${rel}'`, rel);
    case 'EACCES':
    case 'EPERM':
      return nexoError('FORBIDDEN', `${op}: permission denied: '${rel}'`, { resource: rel });
    default:
      return nexoError('INTERNAL', `${op}: ${e.message}`, {
        resource: rel,
        retryable: true,
        details: { errno: e.code },
      });
  }
}

class NodeScopedFilesystem implements ScopedFilesystem {
  private readonly rootAbs: string;
  private rootRealPromise: Promise<string> | null = null;

  constructor(rootAbsPath: string) {
    this.rootAbs = path.resolve(rootAbsPath);
  }

  private rootReal(): Promise<string> {
    this.rootRealPromise ??= fs.realpath(this.rootAbs);
    return this.rootRealPromise;
  }

  /**
   * Resolve `rel` garantindo contenção no root. Retorna o caminho absoluto
   * ou NexoError (SCOPE_VIOLATION / INVALID_INPUT). Núcleo do guard vive em
   * scope-guard.ts (compartilhado com o CommandExecutor — Wave 5 FIX 1).
   */
  private async guard(rel: string): Promise<Result<string>> {
    if (typeof rel !== 'string' || rel.length === 0 || rel.includes('\0')) {
      return err(invalidInput(`Invalid path: '${String(rel)}'`, String(rel)));
    }
    let rootReal: string;
    try {
      rootReal = await this.rootReal();
    } catch (e) {
      return err(mapFsError(e as NodeJS.ErrnoException, '.', 'stat root'));
    }
    const resolved = await resolveWithinRoot(this.rootAbs, rootReal, rel);
    if (!resolved.ok) {
      if (resolved.reason === 'ESCAPE') return err(scopeViolation(this.rootAbs, rel));
      return err(mapFsError(resolved.cause, rel, 'realpath'));
    }
    return ok(resolved.abs);
  }

  async readFile(rel: string): Promise<Result<string>> {
    const guarded = await this.guard(rel);
    if (!guarded.ok) return guarded;
    try {
      return ok(await fs.readFile(guarded.value, 'utf8'));
    } catch (e) {
      return err(mapFsError(e as NodeJS.ErrnoException, rel, 'readFile'));
    }
  }

  async writeFile(rel: string, content: string, opts: { overwrite: boolean }): Promise<Result<void>> {
    const guarded = await this.guard(rel);
    if (!guarded.ok) return guarded;
    try {
      // 'wx' = falha atomicamente se existe -> overwrite só explícito (SPEC §4).
      await fs.writeFile(guarded.value, content, { encoding: 'utf8', flag: opts.overwrite ? 'w' : 'wx' });
      return ok(undefined);
    } catch (e) {
      return err(mapFsError(e as NodeJS.ErrnoException, rel, 'writeFile'));
    }
  }

  async listDir(rel = '.'): Promise<Result<DirEntry[]>> {
    const guarded = await this.guard(rel);
    if (!guarded.ok) return guarded;
    try {
      const dirents = await fs.readdir(guarded.value, { withFileTypes: true });
      const entries: DirEntry[] = [];
      for (const d of dirents) {
        entries.push({
          name: d.name,
          kind: d.isFile() ? 'file' : d.isDirectory() ? 'dir' : d.isSymbolicLink() ? 'symlink' : 'other',
          mtime: (await fs.lstat(path.join(guarded.value, d.name))).mtime.toISOString(),
        });
      }
      return ok(entries);
    } catch (e) {
      return err(mapFsError(e as NodeJS.ErrnoException, rel, 'listDir'));
    }
  }

  async exists(rel: string): Promise<boolean> {
    const guarded = await this.guard(rel);
    if (!guarded.ok) return false;
    try {
      await fs.lstat(guarded.value);
      return true;
    } catch {
      return false;
    }
  }

  async stat(rel: string): Promise<Result<DirEntry>> {
    const guarded = await this.guard(rel);
    if (!guarded.ok) return guarded;
    try {
      const st = await fs.lstat(guarded.value);
      return ok({
        name: path.basename(guarded.value),
        kind: st.isFile() ? 'file' : st.isDirectory() ? 'dir' : st.isSymbolicLink() ? 'symlink' : 'other',
        size: st.size,
        mtime: st.mtime.toISOString(),
      });
    } catch (e) {
      return err(mapFsError(e as NodeJS.ErrnoException, rel, 'stat'));
    }
  }
}

export function createScopedFilesystem(rootAbsPath: string): ScopedFilesystem {
  return new NodeScopedFilesystem(rootAbsPath);
}
