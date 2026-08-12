/**
 * Análise de argumentos-path de comandos (Wave 5 — FIX 1, vulnerabilidade HIGH:
 * scope escape via args de comandos SAFE, ex.: `cat /etc/passwd`).
 *
 * Causa-raiz: a classificação SAFE aceita "args quaisquer" e o executor só
 * validava o `cwd` — nunca os argumentos. Este módulo é a análise PURA e
 * síncrona que decide, para cada token de `args`, se ele é um candidato a path
 * que DEVE ser validado contra o root permitido (validação async, com
 * realpath, vive no executor via scope-guard.ts — mesma lógica do
 * ScopedFilesystem).
 *
 * Regras (conservadoras por construção — No Fake Success aplicado a segurança):
 *  - Flags NUNCA são paths: `-x`, `--long`, `-n5` são ignorados.
 *  - `--flag=valor`: o VALOR é analisado como token independente — cobre flags
 *    que escrevem/referenciam arquivo (ex.: `--output=/etc/x`).
 *  - Flag com valor separado (`-o arquivo`, `--output arquivo`): o valor é um
 *    token não-flag como outro qualquer -> validado. Não dependemos de tabela
 *    de aridade por comando (incompletável); validar todo token não-flag é
 *    estritamente mais seguro e sem falsos positivos (pattern de grep que não
 *    existe em disco resolve para dentro do root e passa).
 *  - `--` (end-of-options) é ignorado; tokens após ele continuam validados.
 *  - `-` sozinho (convenção stdin/stdout) é ignorado.
 *  - Token iniciado por `~` ou contendo `\0` NÃO pode ser analisado com
 *    segurança -> `unanalyzable`. Regra documentada (SPEC §4 estendido na
 *    Wave 5): comando SAFE com arg-path não analisável é REBAIXADO para
 *    RESTRICTED — vai a REQUIRE_APPROVAL pela política em vez de executar.
 *  - TODO demais token não-flag é candidato a path: resolvido contra o cwd
 *    real e validado (contenção lexical + realpath do ancestral existente).
 *    Isso cobre absolute paths (`/etc/passwd`), relativos com escape
 *    (`../../segredo`) E nomes simples que são symlinks para fora do root.
 */

export interface ArgPathAnalysis {
  /** Tokens que devem ser validados contra o root permitido (async, executor). */
  pathCandidates: string[];
  /** Tokens não analisáveis com segurança -> rebaixar SAFE para RESTRICTED. */
  unanalyzable: string[];
}

function isFlagToken(token: string): boolean {
  // '-', '--' e flags (-x, --long, -n5) não são paths.
  return token.startsWith('-');
}

function classifyToken(token: string, out: ArgPathAnalysis): void {
  if (token.length === 0) return;
  if (token.includes('\0') || token.startsWith('~')) {
    out.unanalyzable.push(token);
    return;
  }
  out.pathCandidates.push(token);
}

export function analyzeCommandArgPaths(args: readonly string[]): ArgPathAnalysis {
  const out: ArgPathAnalysis = { pathCandidates: [], unanalyzable: [] };
  for (const raw of args) {
    if (typeof raw !== 'string' || raw.length === 0) continue;
    if (raw === '--' || raw === '-') continue;
    const eq = raw.startsWith('--') ? raw.indexOf('=') : -1;
    if (eq > 2) {
      // --flag=valor: o valor é analisado; a flag em si nunca é path.
      classifyToken(raw.slice(eq + 1), out);
      continue;
    }
    if (isFlagToken(raw)) continue;
    classifyToken(raw, out);
  }
  return out;
}
