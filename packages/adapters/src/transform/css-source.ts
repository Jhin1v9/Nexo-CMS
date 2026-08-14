/**
 * Parser textual CUIDADOSO de CSS para o write-path M3 (escopo: custom
 * properties `--*` e localizacao de declaracoes com offsets exatos).
 *
 * Por que textual e nao AST: o repo tem a restricao de ZERO deps novas (D2/D8
 * usam ferramentas ja presentes) e nao ha parser CSS no dependency graph;
 * a unica AST disponivel sem deps novas e a do TS compiler (nao parseia CSS).
 * O escopo do parser e, portanto, deliberadamente estreito e documentado:
 *
 * Suportado:
 *  - comentarios `/* ... *\/` (mascarados preservando offsets e newlines);
 *  - strings '"'/'"' dentro de valores (`;`/`{`/`}` dentro de string nao
 *    contam como delimitador);
 *  - parenteses dentro de valores (ex.: `var(--x)`, `hsl(0 0% 100%)`);
 *  - contexto de aninhamento: seletor da regra e at-rule envolvente
 *    (ex.: declaracao dentro de `@theme { ... }` ou `:root { ... }`);
 *  - declaracoes terminadas por `;` OU pelo `}` de fechamento da regra
 *    (ultimo declaration sem semicolon — CSS valido).
 *
 * Limitacoes declaradas (nunca adivinhamos — fora disto => UNSUPPORTED no
 * adapter que consome):
 *  - @import/@use com condicoes, CSS aninhado estilo SCSS aninhado profundo
 *    e interpolacao de pre-processador (SCSS/Less variables `$x`/`@x`) NAO
 *    sao interpretados;
 *  - shorthand/longhand NUNCA sao expandidos/colapsados aqui (09§18): o
 *    parser devolve a declaracao exatamente como escrita; quem edita substitui
 *    SOMENTE o range do valor da propriedade alvo.
 */

export interface CssDeclaration {
  /** Nome da propriedade (ex.: '--color-primary'). */
  property: string;
  /** Valor exatamente como escrito (trim aplicado nas bordas apenas). */
  value: string;
  /** Offsets no conteudo ORIGINAL (comentarios inclusos). */
  declStart: number;
  /** Inicio (inclusive) e fim (exclusive) do VALOR no conteudo original. */
  valueStart: number;
  valueEnd: number;
  /** Linha 1-based da declaracao. */
  line: number;
  /** Seletor da regra que contem a declaracao (ex.: ':root'), ou null. */
  selector: string | null;
  /** Nome da at-rule envolvente (ex.: 'theme' para `@theme { ... }`), ou null. */
  atRule: string | null;
}

interface BraceFrame {
  /** Texto do header (seletor ou preludio de at-rule) que abriu este bloco. */
  header: string;
  /** true se o header comeca com '@'. */
  isAtRule: boolean;
}

/**
 * Mascara comentarios (substituidos por espacos, newlines preservados) e
 * retorna tambem o mapa de chars em string (para nao tratar `;{}` em strings
 * como delimitadores). Offsets sao SEMPRE os do conteudo original.
 */
function maskCommentsAndStrings(content: string): { masked: string; inString: boolean[] } {
  const chars = content.split('');
  const inString: boolean[] = chars.map(() => false);
  let i = 0;
  let stringQuote: string | null = null;
  while (i < chars.length) {
    const c = chars[i] ?? '';
    if (stringQuote !== null) {
      inString[i] = true;
      if (c === '\\') {
        inString[i + 1] = true;
        i += 2;
        continue;
      }
      if (c === stringQuote) stringQuote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      stringQuote = c;
      inString[i] = true;
      i += 1;
      continue;
    }
    if (c === '/' && chars[i + 1] === '*') {
      // comentario: mascara ate '*/', preservando newlines
      let j = i;
      while (j < chars.length && !(chars[j] === '*' && chars[j + 1] === '/')) {
        if (chars[j] !== '\n') chars[j] = ' ';
        j += 1;
      }
      if (j < chars.length) {
        chars[j] = ' ';
        chars[j + 1] = ' ';
        j += 2;
      }
      i = j;
      continue;
    }
    i += 1;
  }
  return { masked: chars.join(''), inString };
}

/** Pre-computa offsets de inicio de cada linha (para line 1-based). */
function lineStartsOf(content: string): number[] {
  const starts = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function lineOf(starts: readonly number[], offset: number): number {
  // busca binaria: maior start <= offset
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] ?? 0) <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

const IDENT_CHAR = /[A-Za-z0-9_-]/;

/**
 * Extrai TODAS as declaracoes `property: value` dentro de blocos `{ ... }`,
 * com contexto (seletor + at-rule) e offsets exatos no conteudo original.
 * Ordenado por posicao. Nunca lanca: CSS fora do escopo suportado simplesmente
 * nao produz declaracoes (o consumidor reporta TARGET_NOT_FOUND/UNSUPPORTED).
 */
export function parseCssDeclarations(content: string): CssDeclaration[] {
  const { masked, inString } = maskCommentsAndStrings(content);
  const starts = lineStartsOf(content);
  const out: CssDeclaration[] = [];

  const stack: BraceFrame[] = [];
  /** inicio do segmento corrente (desde o ultimo '{', '}' ou ';'). */
  let segmentStart = 0;

  const readDeclaration = (propStart: number): number | null => {
    // le property
    let i = propStart;
    while (i < masked.length && (IDENT_CHAR.test(masked[i] ?? '') )) i += 1;
    if (i === propStart) return null;
    const property = masked.slice(propStart, i);
    // pula espacos
    while (i < masked.length && /\s/.test(masked[i] ?? '')) i += 1;
    if (masked[i] !== ':') return null;
    i += 1;
    while (i < masked.length && /\s/.test(masked[i] ?? '')) i += 1;
    const valueStart = i;
    // le valor ate ';' ou '}' fora de string/parenteses
    let depth = 0;
    while (i < masked.length) {
      const c = masked[i] ?? '';
      if (!inString[i]) {
        if (c === '(') depth += 1;
        else if (c === ')') depth = Math.max(0, depth - 1);
        else if ((c === ';' || c === '}') && depth === 0) break;
      }
      i += 1;
    }
    if (i >= masked.length) return null; // declaracao nao terminada: CSS quebrado
    const valueEnd = i; // exclusive: antes do ';' ou '}'
    const rawValue = content.slice(valueStart, valueEnd);
    const trimmed = rawValue.trim();
    // valueStart ajustado para o inicio do valor sem whitespace
    const adjValueStart = valueStart + (rawValue.length - rawValue.trimStart().length);
    const adjValueEnd = adjValueStart + trimmed.length;
    const frames = [...stack].reverse();
    const atFrame = frames.find((f) => f.isAtRule);
    const ruleFrame = frames.find((f) => !f.isAtRule);
    out.push({
      property,
      value: trimmed,
      declStart: propStart,
      valueStart: adjValueStart,
      valueEnd: adjValueEnd,
      line: lineOf(starts, propStart),
      selector: ruleFrame?.header ?? null,
      atRule: atFrame !== undefined ? atFrame.header.replace(/^@/, '').split(/\s/)[0] ?? null : null,
    });
    return i; // posicao do terminador (';' ou '}')
  };

  let i = 0;
  while (i < masked.length) {
    const c = masked[i] ?? '';
    if (inString[i]) {
      i += 1;
      continue;
    }
    if (c === '{') {
      const header = masked.slice(segmentStart, i).trim();
      stack.push({ header, isAtRule: header.startsWith('@') });
      segmentStart = i + 1;
      i += 1;
      continue;
    }
    if (c === '}') {
      // declaracao terminada por '}' (ultimo decl sem ';')
      if (stack.length > 0) {
        const seg = masked.slice(segmentStart, i);
        const m = /^\s*([A-Za-z_-])/.exec(seg);
        if (m !== null) {
          const propOffset = segmentStart + (m[0].length - 1);
          readDeclaration(propOffset);
        }
      }
      stack.pop();
      segmentStart = i + 1;
      i += 1;
      continue;
    }
    if (c === ';') {
      segmentStart = i + 1;
      i += 1;
      continue;
    }
    // tenta declaracao apenas dentro de bloco e no inicio de um segmento
    if (stack.length > 0 && IDENT_CHAR.test(c)) {
      const segBefore = masked.slice(segmentStart, i);
      if (segBefore.trim() === '') {
        const end = readDeclaration(i);
        if (end !== null) {
          // end aponta para ';' ou '}'; o loop principal processa o terminador
          i = end;
          continue;
        }
      }
    }
    i += 1;
  }
  return out;
}

/** Balanceamento de chaves fora de comentarios/strings (sanidade pos-edicao). */
export function bracesBalanced(content: string): boolean {
  const { masked, inString } = maskCommentsAndStrings(content);
  let depth = 0;
  for (let i = 0; i < masked.length; i += 1) {
    if (inString[i]) continue;
    const c = masked[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}
