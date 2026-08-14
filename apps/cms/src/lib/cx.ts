/** Merge de className sem dependência nova (condicionais honestas). */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}

/**
 * Foco visível WCAG 2.2 — token --color-focus (único padrão de foco da app).
 * String literal para o scanner do Tailwind 4 enxergar as classes.
 */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** Convenção da CLI (apps/cli/src/format.ts): hash exibido com 12 chars. */
export function shortHash(hash: string): string {
  return hash.slice(0, 12);
}

/** Data ISO -> texto local curto; inválida/vazia retorna o bruto (nunca inventa). */
export function formatDateTime(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso.length === 0) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
