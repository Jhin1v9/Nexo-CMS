/**
 * Redaction central (RT&SEC §28-29; M4-CONTRACTS §9): secrets NUNCA em logs,
 * audit, diff, AI context, error messages ou UI output. Dois mecanismos:
 *   1. SECRET_PATTERNS — formatos conhecidos de credencial (OpenAI, GitHub,
 *      Bearer, api_key=, Google AIza, Slack xox*, blocos PEM PRIVATE KEY).
 *   2. Valores concretos do secret store — resolvidos (decifrados SOMENTE em
 *      memória) e substituídos por '***' via match literal (nunca regex sobre
 *      o valor, que pode conter metacaracteres).
 * Toda substituição usa o placeholder '***'.
 */

export const REDACTED_PLACEHOLDER = '***';

/**
 * Valores do store com menos de 8 chars NÃO entram na redação automática:
 * strings curtas demais gerariam falsos positivos destrutivos (Inv. 26 —
 * redaction não pode mentir sobre o conteúdo). Valores curtos ainda podem ser
 * passados explicitamente via extraSecrets.
 */
export const MIN_STORE_VALUE_REDACTION_LENGTH = 8;

export interface SecretPattern {
  /** Nome machine-readable do formato (para diagnóstico/testes). */
  readonly name: string;
  readonly pattern: RegExp;
}

/**
 * Padrões conhecidos de secret (RT&SEC §28-29). Cada regex é global e
 * aplicada com String.replace — o match INTEIRO vira '***'.
 */
export const SECRET_PATTERNS: readonly SecretPattern[] = [
  {
    name: 'pem-private-key',
    // Bloco PEM completo (BEGIN ... END), qualquer variante de PRIVATE KEY.
    pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
  },
  {
    name: 'openai-api-key',
    // sk-..., incluindo sk-proj-... (hífens permitidos no corpo).
    pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    name: 'github-pat-fine-grained',
    pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    name: 'github-token-classic',
    pattern: /\bghp_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: 'slack-token',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    name: 'google-api-key',
    // AIza... (Google API keys: 'AIza' + 35 chars; tolerância 20+).
    pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  },
  {
    name: 'bearer-token',
    // Authorization: Bearer <token> — scheme case-insensitive (RFC 7235).
    pattern: /\bBearer[ \t]+[A-Za-z0-9._~+/=-]+/gi,
  },
  {
    name: 'api-key-param',
    // api_key=<valor> em query strings / configs (case-insensitive).
    pattern: /\bapi_key=[A-Za-z0-9._~+/-]+/gi,
  },
];

/** Redige SOMENTE os padrões conhecidos (SECRET_PATTERNS). */
export function redactPatterns(text: string): string {
  let out = text;
  for (const { pattern } of SECRET_PATTERNS) {
    out = out.replace(pattern, REDACTED_PLACEHOLDER);
  }
  return out;
}

/**
 * Redige valores literais (match exato, maiores primeiro para evitar
 * sobreposição parcial). Valores vazios são ignorados.
 */
export function redactValues(text: string, values: readonly string[]): string {
  let out = text;
  const sorted = [...new Set(values.filter((v) => v.length > 0))].sort(
    (a, b) => b.length - a.length,
  );
  for (const value of sorted) {
    out = out.split(value).join(REDACTED_PLACEHOLDER);
  }
  return out;
}

/**
 * Redação sem acesso ao store: padrões conhecidos + extraSecrets explícitos.
 * Para redigir também os valores do store, use SecretStore.redactSecrets.
 */
export function redactText(text: string, extraSecrets: readonly string[] = []): string {
  return redactPatterns(redactValues(text, extraSecrets));
}
