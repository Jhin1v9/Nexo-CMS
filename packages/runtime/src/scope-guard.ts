/**
 * Scope guard anti-escape (SPEC.md §4) — núcleo compartilhado da contenção de
 * paths dentro de um root permitido.
 *
 * Extraído do ScopedFilesystem (filesystem.ts) na Wave 5 (FIX 1) para ser
 * reutilizado TAMBÉM pelo CommandExecutor na validação de argumentos-path de
 * comandos SAFE — mesma lógica, duas camadas:
 *  1. Contenção lexical: path.resolve + prefixo (rejeita '../' e absolute
 *     escape). Aceita o path se contido no rootAbs OU no rootReal (o base de
 *     resolução pode ser um cwd já realpatheado — ex.: args de comando).
 *  2. Contenção real: realpath do ancestral existente mais próximo comparado
 *     ao rootReal (rejeita symlink escape — inclusive arquivo DENTRO do root
 *     que é symlink para fora, e alvo ainda inexistente sob ancestral real).
 *
 * O módulo NÃO constrói NexoError: retorna uma discriminated union pura e cada
 * consumidor mapeia para o seu erro estruturado (SCOPE_VIOLATION etc.), sem
 * acoplar mensagens entre filesystem e executor.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ScopeResolution =
  | { ok: true; abs: string }
  /** Escape de escopo (lexical ou via symlink). */
  | { ok: false; reason: 'ESCAPE' }
  /** Erro de FS inesperado durante realpath (ex.: EACCES). */
  | { ok: false; reason: 'ERROR'; cause: NodeJS.ErrnoException };

function isWithin(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(root + path.sep);
}

/**
 * Resolve `target` (relativo a `base`, default rootAbs) garantindo contenção
 * no root. `rootAbs` e `rootReal` devem ser path.resolve/realpath do MESMO
 * root permitido, computados pelo chamador (que pode cacheá-los).
 */
export async function resolveWithinRoot(
  rootAbs: string,
  rootReal: string,
  target: string,
  base?: string,
): Promise<ScopeResolution> {
  const abs = path.resolve(base ?? rootAbs, target);
  // 1) Contenção lexical (rápida): rejeita '../' e absolute escape. O base
  //    pode ser um caminho REAL (cwd realpatheado do executor), por isso
  //    aceitamos contenção em rootAbs ou em rootReal; a contenção real abaixo
  //    é a verificação autoritativa.
  if (!isWithin(abs, rootAbs) && !isWithin(abs, rootReal)) {
    return { ok: false, reason: 'ESCAPE' };
  }
  // 2) Contenção real: realpath do ancestral existente mais próximo.
  let ancestor = abs;
  const remainder: string[] = [];
  for (;;) {
    try {
      const realAncestor = await fs.realpath(ancestor);
      const candidate = remainder.length > 0 ? path.join(realAncestor, ...remainder.reverse()) : realAncestor;
      if (!isWithin(candidate, rootReal)) {
        return { ok: false, reason: 'ESCAPE' };
      }
      return { ok: true, abs };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        return { ok: false, reason: 'ERROR', cause: e as NodeJS.ErrnoException };
      }
      const parent = path.dirname(ancestor);
      if (parent === ancestor) {
        return { ok: false, reason: 'ESCAPE' };
      }
      remainder.push(path.basename(ancestor));
      ancestor = parent;
    }
  }
}
