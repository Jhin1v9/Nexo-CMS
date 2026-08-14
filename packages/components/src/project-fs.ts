/**
 * Contexto de filesystem do projeto para o Component Engine.
 * Todo path passa pelo scope guard de @nexo/runtime (resolveWithinRoot):
 * contencao lexical + realpath de ancestral (rejeita '../' e symlink escape).
 * Mesmo padrao de @nexo/media paths.ts (packages/components nao pode depender
 * de @nexo/media — M3-CONTRACTS §2).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { resolveWithinRoot } from '@nexo/runtime';
import { err, ok, type Result } from '@nexo/shared';

import { componentError } from './errors.js';

/** Contexto com raiz do projeto resolvida e realpatheada. */
export interface ProjectFs {
  rootAbs: string;
  rootReal: string;
}

export async function createProjectFs(rootPath: string): Promise<Result<ProjectFs>> {
  const rootAbs = path.resolve(rootPath);
  try {
    const rootReal = await fs.realpath(rootAbs);
    return ok({ rootAbs, rootReal });
  } catch {
    return err(
      componentError('ComponentNotFound', `Project Root nao encontrado no disco: '${rootPath}'`, {
        resource: rootPath,
      }),
    );
  }
}

/** Scope guard: resolve `rel` dentro do root ou erro SCOPE_VIOLATION. */
export async function guardPath(fsCtx: ProjectFs, rel: string): Promise<Result<string>> {
  if (typeof rel !== 'string' || rel.length === 0 || rel.includes('\0')) {
    return err(
      componentError('InvalidDefinition', `Path invalido: '${String(rel)}'`, {
        resource: String(rel),
      }),
    );
  }
  const resolved = await resolveWithinRoot(fsCtx.rootAbs, fsCtx.rootReal, rel);
  if (!resolved.ok) {
    if (resolved.reason === 'ESCAPE') {
      return err(
        componentError('ScopeViolation', `Path escapa do Project Root: '${rel}'`, {
          resource: rel,
          details: { root: fsCtx.rootAbs, rel },
        }),
      );
    }
    return err(
      componentError('VerificationFailed', `Falha ao resolver path '${rel}': ${resolved.cause.message}`, {
        resource: rel,
      }),
    );
  }
  return ok(resolved.abs);
}

/** Converte path absoluto (ja contido no root) em relativo POSIX-like estavel. */
export function toRelative(fsCtx: ProjectFs, abs: string): string {
  return path.relative(fsCtx.rootAbs, abs).split(path.sep).join('/');
}
