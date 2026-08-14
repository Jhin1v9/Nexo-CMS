/**
 * Contexto de filesystem do projeto + scope guard (padrao @nexo/media):
 * todo path passa por resolveWithinRoot de @nexo/runtime (contencao lexical
 * + realpath de ancestral). A escrita em disco acontece SOMENTE aqui, apos o
 * adapter retornar `newContent` (adapters NUNCA escrevem — M3-CONTRACTS §2).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, ok, type Result } from '@nexo/shared';
import { resolveWithinRoot } from '@nexo/runtime';

import { designError } from './errors.js';

/** Raiz do projeto resolvida/realpatheada. */
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
      designError('WriteFailed', `Project Root nao encontrado no disco: '${rootPath}'`, {
        resource: rootPath,
      }),
    );
  }
}

/** Scope guard: resolve `rel` dentro do root ou erro ScopeViolation. */
export async function guardPath(fsCtx: ProjectFs, rel: string): Promise<Result<string>> {
  if (typeof rel !== 'string' || rel.length === 0 || rel.includes('\0')) {
    return err(
      designError('MissingInput', `Path invalido: '${String(rel)}'`, { resource: String(rel) }),
    );
  }
  const resolved = await resolveWithinRoot(fsCtx.rootAbs, fsCtx.rootReal, rel);
  if (!resolved.ok) {
    if (resolved.reason === 'ESCAPE') {
      return err(
        designError('ScopeViolation', `Path escapa do Project Root: '${rel}'`, {
          resource: rel,
          details: { root: fsCtx.rootAbs, rel },
        }),
      );
    }
    return err(
      designError('WriteFailed', `Falha ao resolver path '${rel}': ${resolved.cause.message}`, {
        resource: rel,
      }),
    );
  }
  return ok(resolved.abs);
}

/** Converte path absoluto (contido no root) em relativo POSIX-like estavel. */
export function toRelative(fsCtx: ProjectFs, abs: string): string {
  return path.relative(fsCtx.rootAbs, abs).split(path.sep).join('/');
}

/**
 * Persiste `newContent` (produzido por um adapter) no arquivo alvo e faz
 * verificacao pos-escrita REAL: re-le o arquivo e exige igualdade exata de
 * conteudo (07§41 Content Updated; zero fake success — M3 §8.4).
 * `file` pode ser absoluto (PlainCss adapter) ou relativo ao root (Tailwind).
 */
export async function writeFileVerified(
  fsCtx: ProjectFs,
  file: string,
  newContent: string,
): Promise<Result<{ file: string }>> {
  const rel = path.isAbsolute(file) ? toRelative(fsCtx, file) : file.replace(/\\/g, '/');
  const guarded = await guardPath(fsCtx, rel);
  if (!guarded.ok) return err(guarded.error);
  const abs = guarded.value;
  try {
    await fs.writeFile(abs, newContent, 'utf8');
  } catch (e) {
    const cause = e as NodeJS.ErrnoException;
    return err(
      designError('WriteFailed', `Falha ao escrever '${rel}': ${cause.message}`, {
        resource: rel,
      }),
    );
  }
  let reread: string;
  try {
    reread = await fs.readFile(abs, 'utf8');
  } catch (e) {
    const cause = e as NodeJS.ErrnoException;
    return err(
      designError(
        'VerificationFailed',
        `Escrita feita mas re-leitura de '${rel}' falhou: ${cause.message}`,
        { resource: rel },
      ),
    );
  }
  if (reread !== newContent) {
    return err(
      designError(
        'VerificationFailed',
        `Verificacao pos-escrita falhou em '${rel}': conteudo em disco difere do produzido pelo adapter (mudanca externa concorrente?)`,
        { resource: rel },
      ),
    );
  }
  return ok({ file: rel });
}
