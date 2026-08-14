/**
 * Tipos do write-path M3 (M3-CONTRACTS.md §2; D8: transformacao via AST da
 * TypeScript compiler API, NUNCA string replacement como estrategia).
 *
 * Regras duras:
 *  - NENHUMA operacao deste modulo escreve em disco: quem persiste e o
 *    consumidor (packages/editor via @nexo/runtime), apos o save pipeline
 *    (07§36). O transformer le o arquivo e retorna `newContent`.
 *  - Seletor ambiguo -> diagnostico AMBIGUOUS_TARGET e ok=false; NUNCA
 *    "adivinhar" o elemento mais provavel (07§15, Inv. 6/25).
 *  - Toda transformacao que produz `newContent` re-parseia o resultado com o
 *    TS compiler antes de retornar: saida sintaticamente invalida => ok=false,
 *    sem newContent (zero fake success).
 */

/** Codigos estaveis de diagnostico (machine-friendly, alinhados a NexoError). */
export type TransformDiagnosticCode =
  | 'INVALID_INPUT'
  | 'PARSE_ERROR'
  | 'TARGET_NOT_FOUND'
  | 'AMBIGUOUS_TARGET'
  | 'UNSUPPORTED'
  | 'INTERNAL';

export interface TransformDiagnostic {
  code: TransformDiagnosticCode;
  severity: 'error' | 'warning' | 'info';
  message: string;
  /** Arquivo relativo/absoluto ao qual o diagnostico se refere, quando houver. */
  file?: string;
  /** 1-based, quando houver posicao conhecida. */
  line?: number;
  column?: number;
}

/** Report honesto de mecanismo nao suportado (Inv. 6/25; doc 08§90 item 24). */
export interface UnsupportedInfo {
  reason: string;
  /** Mecanismo detectado que nao temos suporte de escrita (ex.: 'css-modules'). */
  mechanism?: string;
}

/**
 * Resultado unico de toda operacao de transformacao (M3-CONTRACTS §2:
 * `transform(request): TransformResult | UNSUPPORTED`).
 *
 * - `ok === true` => `newContent` presente e re-parseado com sucesso.
 * - `ok === false` => NADA foi produzido; `diagnostics` explica;
 *   `unsupported` presente quando a falha e por mecanismo nao suportado.
 */
export interface TransformResult {
  ok: boolean;
  /** Conteudo completo do arquivo alvo apos a transformacao (nunca parcial). */
  newContent?: string;
  /** Arquivo ao qual `newContent` se refere (relevante quando a operacao
   *  escolhe a FONTE do token entre varios arquivos, ex.: Tailwind v4 @theme). */
  file?: string;
  diagnostics: TransformDiagnostic[];
  unsupported?: UnsupportedInfo;
}

/**
 * Seletor minimo de elemento JSX (forma congelada desta wave).
 *
 * Semantica (documentada — limitacoes explicitas):
 *  - Exatamente UM de `componentName` | `jsxTag` e obrigatorio:
 *      - `componentName`: casa a tag JSX EXATA de um uso de componente
 *        (ex.: 'Button' casa `<Button ...>`; case-sensitive; member expressions
 *        como `<Foo.Bar>` casam pelo texto completo 'Foo.Bar').
 *      - `jsxTag`: casa a tag literal (ex.: 'div', 'section').
 *    Fornecer ambos ou nenhum => INVALID_INPUT.
 *  - `propMatch` (opcional) restringe: atributo com `name` presente; se
 *    `value` informado, o inicializador deve ser string literal ou expressao
 *    cujo texto fonte (trim) seja igual a `value`.
 *  - A busca e feita no ARQUIVO inteiro informado na operacao (nao ha escopo
 *    de componente/ancestralidade nesta wave — limitacao documentada).
 *  - 0 matches => TARGET_NOT_FOUND; >1 matches => AMBIGUOUS_TARGET com as
 *    posicoes dos candidatos; exatamente 1 => opera.
 */
export interface ElementSelector {
  componentName?: string;
  jsxTag?: string;
  propMatch?: { name: string; value?: string };
}

export function okTransform(newContent: string, file?: string): TransformResult {
  return { ok: true, newContent, diagnostics: [], ...(file !== undefined ? { file } : {}) };
}

export function failTransform(
  diagnostics: TransformDiagnostic[],
  unsupported?: UnsupportedInfo,
): TransformResult {
  return { ok: false, diagnostics, ...(unsupported !== undefined ? { unsupported } : {}) };
}

export function diag(
  code: TransformDiagnosticCode,
  message: string,
  opts: { file?: string; line?: number; column?: number; severity?: 'error' | 'warning' | 'info' } = {},
): TransformDiagnostic {
  return {
    code,
    severity: opts.severity ?? 'error',
    message,
    ...(opts.file !== undefined ? { file: opts.file } : {}),
    ...(opts.line !== undefined ? { line: opts.line } : {}),
    ...(opts.column !== undefined ? { column: opts.column } : {}),
  };
}
