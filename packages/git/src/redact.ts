/**
 * Redação de credenciais em URLs e textos (doc 10 §28/§33/§61).
 * URLs remotas podem conter credenciais embutidas (`https://user:token@host/...`,
 * `ssh://user@host/...`, sintaxe scp-like `user@host:path`). Credenciais NUNCA
 * aparecem em logs, auditoria, erros ou resultados estruturados.
 */

const REDACTED = '***';

/** Substitui o userinfo de `scheme://userinfo@resto` por `***`. */
function redactSchemeUrl(url: string): string {
  return url.replace(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^/@\s]+)@/g, (_m, scheme: string) => `${scheme}${REDACTED}@`);
}

/** Sintaxe scp-like (`user@host:path`) — userinfo redigido por defesa em profundidade. */
function redactScpLike(url: string): string {
  return url.replace(/^([^\s/@:]+)@([^\s:]+):/, (_m, _user: string, host: string) => `${REDACTED}@${host}:`);
}

/**
 * Redige credenciais de UMA URL remota.
 * - `https://user:token@example.com/repo.git` -> `https://***@example.com/repo.git`
 * - `ssh://git@example.com/repo.git` -> `ssh://***@example.com/repo.git`
 * - `git@example.com:org/repo.git` (scp-like) -> `***@example.com:org/repo.git`
 * - URLs sem userinfo e paths locais passam inalterados.
 */
export function redactUrl(url: string): string {
  if (typeof url !== 'string' || url.length === 0) return url;
  return redactScpLike(redactSchemeUrl(url));
}

/**
 * Aplica redação a um texto arbitrário (stdout/stderr do git) antes de incluí-lo
 * em erros/detalhes (doc 10 §33/§61). Cobre userinfo `scheme://...@` e scp-like
 * embutidos no texto.
 */
export function redactText(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return text;
  const schemeRedacted = text.replace(
    /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^/@\s]+)@/g,
    (_m, scheme: string) => `${scheme}${REDACTED}@`,
  );
  return schemeRedacted.replace(/(^|[\s'"(])([^\s/@'"(:]+)@([^\s:'")]+):/gm, (_m, pre: string, _u: string, host: string) => `${pre}${REDACTED}@${host}:`);
}
