/**
 * ReactTsxTransformer — write-path M3 para React + TSX/JSX (stack first-class,
 * M3-CONTRACTS §2; D8: AST via TypeScript compiler API, NUNCA string
 * replacement como estrategia de transformacao).
 *
 * Estrategia de edicao (documentada):
 *  1. O arquivo e parseado com ts.createSourceFile (modo TSX/JSX, parent nodes).
 *  2. O alvo e localizado EXCLUSIVAMENTE via AST (ElementSelector -> nos
 *     JsxElement/JsxSelfClosingElement; ambiguidade => AMBIGUOUS_TARGET).
 *  3. O NOVO trecho de sintaxe e construido com ts.factory e emitido com
 *     ts.createPrinter (a arvore nova sai do printer, nao de concatenacao).
 *  4. O trecho impresso e inserido no conteudo original APENAS nos offsets
 *     [start, end) fornecidos pelo AST do alvo — o restante do arquivo (comenta-
 *     rios, formatacao, imports) e preservado byte a byte. Isso e "preservar
 *     formatacao ao maximo" sem re-imprimir o arquivo inteiro (o printer do TS
 *     nao preserva trivia de arquivo completo).
 *  5. O resultado e RE-PARSEADO antes de retornar: se nao for sintaticamente
 *     valido, ok=false e nenhum conteudo e entregue (zero fake success).
 *
 * Excecao documentada: `createComponentSource` gera ARQUIVO NOVO. Como nao
 * existe source pre-existente para preservar, um template bem-formado e
 * permitido SOMENTE aqui — e mesmo assim o conteudo gerado e parseado pelo
 * TS compiler antes de ser retornado (template invalido => INVALID_INPUT).
 *
 * NENHUMA operacao escreve em disco. Extensao fora de .tsx/.jsx => UNSUPPORTED
 * honesto (write-path M3 e React+TSX; demais stacks sao detection-only — D6).
 */

import { readFile } from 'node:fs/promises';

import ts from 'typescript';

import type {
  ElementSelector,
  TransformDiagnostic,
  TransformResult,
} from './types.js';
import { diag, failTransform, okTransform } from './types.js';

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

export interface ComponentPropSpec {
  /** Nome do prop (identificador TS valido, camelCase por convencao). */
  name: string;
  /** Tipo TS em texto (ex.: 'string', 'number', '"sm" | "md"', 'ReactNode'). */
  type: string;
  /** Default true. Props nao requeridos viram `name?: type`. */
  required?: boolean;
  /** Expressao TS (texto) usada como default no destructuring. Exige required:false. */
  defaultValue?: string;
  /** JSDoc do prop. */
  description?: string;
}

export interface CreateComponentInput {
  /** Nome do componente: PascalCase, /^[A-Z][A-Za-z0-9]*$/. */
  name: string;
  props?: ComponentPropSpec[];
  /** Estilo opcional: className aplicado ao elemento raiz (ex.: utilidades Tailwind). */
  style?: { className?: string };
}

export interface SetJsxPropInput {
  /** Path absoluto do arquivo .tsx/.jsx. */
  file: string;
  elementSelector: ElementSelector;
  propName: string;
  /**
   * string  -> atributo string (`propName="value"`);
   * number|boolean -> expression container (`propName={value}`).
   * Remocao de prop NAO e esta operacao (use removeJsxElement para o elemento;
   * remover atributo isolado fica para wave futura — declarado, nao adivinhado).
   */
  value: string | number | boolean;
}

export interface UpdateJsxTextInput {
  file: string;
  elementSelector: ElementSelector;
  /**
   * Texto JSX puro. NAO pode conter '<' ou '{' (quebraria o parse JSX);
   * para conteudo dinamico use insertJsxChild com uma expressao/elemento.
   */
  newText: string;
}

export interface InsertJsxChildInput {
  file: string;
  parentSelector: ElementSelector;
  /** Source de EXATAMENTE um elemento/expressao JSX (ex.: '<Button label="Ok" />'). */
  childSource: string;
}

export interface RemoveJsxElementInput {
  file: string;
  elementSelector: ElementSelector;
}

export interface ReactTsxTransformer {
  createComponentSource(input: CreateComponentInput): TransformResult;
  setJsxProp(input: SetJsxPropInput): Promise<TransformResult>;
  updateJsxText(input: UpdateJsxTextInput): Promise<TransformResult>;
  insertJsxChild(input: InsertJsxChildInput): Promise<TransformResult>;
  removeJsxElement(input: RemoveJsxElementInput): Promise<TransformResult>;
}

// ---------------------------------------------------------------------------
// internos: parse / selecao / edicao
// ---------------------------------------------------------------------------

type JsxTarget = ts.JsxElement | ts.JsxSelfClosingElement;

interface ParsedFile {
  sourceFile: ts.SourceFile;
  parseDiagnostics: readonly ts.Diagnostic[];
}

function scriptKindFor(file: string): ts.ScriptKind | null {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX;
  return null;
}

function parseTsx(file: string, content: string): ParsedFile {
  const kind = scriptKindFor(file) ?? ts.ScriptKind.TSX;
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, kind);
  // parseDiagnostics e populado pelo parser incremental do createSourceFile;
  // o cast estreito (nao `any`) cobre a propriedade nao exposta na tipagem publica.
  const parseDiagnostics =
    (sourceFile as ts.SourceFile & { readonly parseDiagnostics?: readonly ts.Diagnostic[] })
      .parseDiagnostics ?? [];
  return { sourceFile, parseDiagnostics };
}

function posOf(sf: ts.SourceFile, pos: number): { line: number; column: number } {
  const lc = ts.getLineAndCharacterOfPosition(sf, pos);
  return { line: lc.line + 1, column: lc.character + 1 };
}

function tagTextOf(target: JsxTarget, sf: ts.SourceFile): string {
  const tag = ts.isJsxElement(target) ? target.openingElement.tagName : target.tagName;
  return tag.getText(sf);
}

function attributesOf(target: JsxTarget): ts.JsxAttributes {
  return ts.isJsxElement(target) ? target.openingElement.attributes : target.attributes;
}

function attrNameText(attr: ts.JsxAttribute, sf: ts.SourceFile): string {
  // TS 6 tipa `name` como opcional; na pratica JsxAttribute sempre tem nome.
  // Defensivo: atributo sem nome nunca casa (nao inventamos match).
  return attr.name === undefined ? '' : attr.name.getText(sf);
}

function attrMatches(
  attrs: ts.JsxAttributes,
  sf: ts.SourceFile,
  propMatch: { name: string; value?: string },
): boolean {
  for (const prop of attrs.properties) {
    if (!ts.isJsxAttribute(prop)) continue;
    if (attrNameText(prop, sf) !== propMatch.name) continue;
    if (propMatch.value === undefined) return true;
    const init = prop.initializer;
    if (init === undefined) return propMatch.value === '';
    if (ts.isStringLiteral(init)) return init.text === propMatch.value;
    return init.getText(sf).trim() === propMatch.value;
  }
  return false;
}

/** Erro de seletor mal formado, ou null se valido. */
function validateSelector(selector: ElementSelector): TransformDiagnostic | null {
  const hasComponent = selector.componentName !== undefined && selector.componentName !== '';
  const hasTag = selector.jsxTag !== undefined && selector.jsxTag !== '';
  if (hasComponent && hasTag) {
    return diag(
      'INVALID_INPUT',
      'elementSelector: forneca componentName OU jsxTag, nao ambos (semantica documentada em transform/types.ts)',
    );
  }
  if (!hasComponent && !hasTag) {
    return diag(
      'INVALID_INPUT',
      'elementSelector: componentName ou jsxTag e obrigatorio (seletor vazio nunca casa — nao adivinhamos alvo)',
    );
  }
  return null;
}

/** Localiza alvos via AST. 0 -> TARGET_NOT_FOUND; >1 -> AMBIGUOUS_TARGET. */
function selectTarget(
  sf: ts.SourceFile,
  file: string,
  selector: ElementSelector,
): { target: JsxTarget } | { failure: TransformResult } {
  const invalid = validateSelector(selector);
  if (invalid) return { failure: failTransform([invalid]) };

  const wantedTag = selector.componentName ?? selector.jsxTag ?? '';
  const matches: JsxTarget[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (
        tagTextOf(node, sf) === wantedTag &&
        (selector.propMatch === undefined ||
          attrMatches(attributesOf(node), sf, selector.propMatch))
      ) {
        matches.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (matches.length === 0) {
    return {
      failure: failTransform([
        diag('TARGET_NOT_FOUND', `nenhum elemento JSX <${wantedTag}> encontrado em ${file}`, {
          file,
        }),
      ]),
    };
  }
  const first = matches[0];
  if (matches.length > 1 || first === undefined) {
    const diagnostics: TransformDiagnostic[] = [
      diag(
        'AMBIGUOUS_TARGET',
        `seletor <${wantedTag}> casa ${matches.length} elementos em ${file}; refine com propMatch (nunca escolhemos arbitrariamente)`,
        { file },
      ),
      ...matches.map((m) => {
        const p = posOf(sf, m.getStart(sf));
        return diag('AMBIGUOUS_TARGET', `candidato em ${file}:${p.line}:${p.column}`, {
          file,
          line: p.line,
          column: p.column,
          severity: 'info',
        });
      }),
    ];
    return { failure: failTransform(diagnostics) };
  }
  return { target: first };
}

/** Aplica edicoes [start,end)->text em ordem reversa; offsets vem do AST. */
function applyEdits(
  content: string,
  edits: readonly { start: number; end: number; text: string }[],
): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = content;
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

/**
 * Re-parse de verificacao (obrigatorio em toda operacao): o conteudo produzido
 * DEVE continuar sintaticamente valido; senao ok=false e nada e entregue.
 */
function verifyReparses(file: string, newContent: string): TransformDiagnostic | null {
  const { parseDiagnostics } = parseTsx(file, newContent);
  if (parseDiagnostics.length === 0) return null;
  const first = parseDiagnostics[0];
  const message = first ? ts.flattenDiagnosticMessageText(first.messageText, ' ') : 'erro';
  return diag(
    'INTERNAL',
    `transformacao produziu TSX invalido (descartado, arquivo original intocado): ${message}`,
    { file },
  );
}

interface LoadOk {
  content: string;
  parsed: ParsedFile;
}

async function loadAndParse(file: string): Promise<LoadOk | TransformResult> {
  if (scriptKindFor(file) === null) {
    return failTransform(
      [diag('UNSUPPORTED', `write-path M3 suporta apenas .tsx/.jsx (stack first-class React+TSX — D6); recebido: ${file}`, { file })],
      { reason: 'extensao fora do write-path M3', mechanism: 'non-tsx' },
    );
  }
  let content: string;
  try {
    content = await readFile(file, 'utf8');
  } catch {
    return failTransform([diag('INVALID_INPUT', `arquivo nao legivel: ${file}`, { file })]);
  }
  const parsed = parseTsx(file, content);
  if (parsed.parseDiagnostics.length > 0) {
    return failTransform([
      diag('PARSE_ERROR', 'arquivo de entrada nao parseia como TSX valido; transformacao abortada (nunca mutamos source quebrado)', { file }),
    ]);
  }
  return { content, parsed };
}

function isFailure(r: LoadOk | TransformResult): r is TransformResult {
  return 'ok' in r;
}

// ---------------------------------------------------------------------------
// fabrica
// ---------------------------------------------------------------------------

export function createReactTsxTransformer(): ReactTsxTransformer {
  const printer = ts.createPrinter();

  function printAttr(attr: ts.JsxAttribute, sf: ts.SourceFile): string {
    return printer.printNode(ts.EmitHint.Unspecified, attr, sf);
  }

  function buildAttr(propName: string, value: string | number | boolean): ts.JsxAttribute {
    const name = ts.factory.createIdentifier(propName);
    if (typeof value === 'string') {
      return ts.factory.createJsxAttribute(name, ts.factory.createStringLiteral(value));
    }
    const expr =
      typeof value === 'number'
        ? ts.factory.createNumericLiteral(value)
        : value
          ? ts.factory.createTrue()
          : ts.factory.createFalse();
    return ts.factory.createJsxAttribute(name, ts.factory.createJsxExpression(undefined, expr));
  }

  return {
    // -- arquivo NOVO: template permitido SOMENTE aqui (ver header) ----------
    createComponentSource(input: CreateComponentInput): TransformResult {
      if (!/^[A-Z][A-Za-z0-9]*$/.test(input.name)) {
        return failTransform([
          diag('INVALID_INPUT', `nome de componente invalido (PascalCase /^[A-Z][A-Za-z0-9]*$/): ${input.name}`),
        ]);
      }
      const props = input.props ?? [];
      for (const p of props) {
        if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p.name)) {
          return failTransform([diag('INVALID_INPUT', `nome de prop invalido: ${p.name}`)]);
        }
        if (p.defaultValue !== undefined && p.required !== false) {
          return failTransform([
            diag('INVALID_INPUT', `prop '${p.name}': defaultValue exige required:false`),
          ]);
        }
      }

      const lines: string[] = [];
      if (props.length > 0) {
        lines.push(`export interface ${input.name}Props {`);
        for (const p of props) {
          if (p.description !== undefined) lines.push(`  /** ${p.description} */`);
          const optional = p.required === false ? '?' : '';
          lines.push(`  ${p.name}${optional}: ${p.type};`);
        }
        lines.push('}', '');
      }

      const destructure = props
        .map((p) =>
          p.defaultValue !== undefined ? `${p.name} = ${p.defaultValue}` : p.name,
        )
        .join(', ');
      const propsParam =
        props.length > 0 ? `{ ${destructure} }: ${input.name}Props` : '';
      const classAttr =
        input.style?.className !== undefined && input.style.className !== ''
          ? ` className="${input.style.className}"`
          : '';

      lines.push(`export function ${input.name}(${propsParam}) {`);
      lines.push(`  return (`);
      lines.push(`    <div${classAttr}>`);
      lines.push(`    </div>`);
      lines.push(`  );`);
      lines.push('}');
      lines.push('');

      const content = lines.join('\n');
      // Mesmo arquivo novo e verificado pelo parser (template invalido => erro honesto).
      const { parseDiagnostics } = parseTsx(`${input.name}.tsx`, content);
      if (parseDiagnostics.length > 0) {
        const first = parseDiagnostics[0];
        const message = first ? ts.flattenDiagnosticMessageText(first.messageText, ' ') : 'erro';
        return failTransform([
          diag('INVALID_INPUT', `template gerado nao parseia (verifique tipos/defaultValue dos props): ${message}`),
        ]);
      }
      return okTransform(content);
    },

    // -- setJsxProp ------------------------------------------------------------
    async setJsxProp(input: SetJsxPropInput): Promise<TransformResult> {
      const loaded = await loadAndParse(input.file);
      if (isFailure(loaded)) return loaded;
      const { content, parsed } = loaded;
      const sf = parsed.sourceFile;

      const sel = selectTarget(sf, input.file, input.elementSelector);
      if ('failure' in sel) return sel.failure;
      const attrs = attributesOf(sel.target);

      const newAttr = buildAttr(input.propName, input.value);
      const printed = printAttr(newAttr, sf);

      const existing = attrs.properties.find(
        (p): p is ts.JsxAttribute =>
          ts.isJsxAttribute(p) && attrNameText(p, sf) === input.propName,
      );

      let newContent: string;
      if (existing !== undefined) {
        // substitui o atributo inteiro no range AST exato (preserva o resto)
        newContent = applyEdits(content, [
          { start: existing.getStart(sf), end: existing.getEnd(), text: printed },
        ]);
      } else {
        const opening = ts.isJsxElement(sel.target) ? sel.target.openingElement : sel.target;
        const insertAt = opening.tagName.getEnd();
        newContent = applyEdits(content, [
          { start: insertAt, end: insertAt, text: ` ${printed}` },
        ]);
      }

      const bad = verifyReparses(input.file, newContent);
      if (bad) return failTransform([bad]);
      return okTransform(newContent, input.file);
    },

    // -- updateJsxText ---------------------------------------------------------
    async updateJsxText(input: UpdateJsxTextInput): Promise<TransformResult> {
      if (/[<{]/.test(input.newText)) {
        return failTransform([
          diag(
            'INVALID_INPUT',
            "newText nao pode conter '<' ou '{' (texto JSX puro); para conteudo dinamico use insertJsxChild",
            { file: input.file },
          ),
        ]);
      }
      const loaded = await loadAndParse(input.file);
      if (isFailure(loaded)) return loaded;
      const { content, parsed } = loaded;
      const sf = parsed.sourceFile;

      const sel = selectTarget(sf, input.file, input.elementSelector);
      if ('failure' in sel) return sel.failure;

      let newContent: string;
      if (ts.isJsxElement(sel.target)) {
        // substitui TODOS os filhos (range entre '>' da abertura e '<' do fechamento)
        const start = sel.target.openingElement.getEnd();
        const end = sel.target.closingElement.getStart(sf);
        newContent = applyEdits(content, [{ start, end, text: input.newText }]);
      } else {
        // self-closing <div/> -> <div>texto</div> (conversao documentada)
        const tag = tagTextOf(sel.target, sf);
        const start = sel.target.tagName.getEnd();
        const end = sel.target.getEnd(); // cobre ' />' final
        newContent = applyEdits(content, [
          { start, end, text: `>${input.newText}</${tag}>` },
        ]);
      }

      const bad = verifyReparses(input.file, newContent);
      if (bad) return failTransform([bad]);
      return okTransform(newContent, input.file);
    },

    // -- insertJsxChild --------------------------------------------------------
    async insertJsxChild(input: InsertJsxChildInput): Promise<TransformResult> {
      // valida childSource como JSX: exatamente 1 elemento/expressao nao-trivia
      const wrapped = parseTsx('child.tsx', `<>${input.childSource}</>`);
      if (wrapped.parseDiagnostics.length > 0) {
        return failTransform([
          diag('INVALID_INPUT', 'childSource nao parseia como JSX valido', { file: input.file }),
        ]);
      }
      const fragments: ts.JsxFragment[] = [];
      const findFragment = (node: ts.Node): void => {
        if (ts.isJsxFragment(node)) fragments.push(node);
        ts.forEachChild(node, findFragment);
      };
      findFragment(wrapped.sourceFile);
      const fragment = fragments[0];
      const meaningful =
        fragment?.children.filter(
          (c: ts.JsxChild) => !(ts.isJsxText(c) && c.getText(wrapped.sourceFile).trim() === ''),
        ) ?? [];
      if (meaningful.length !== 1) {
        return failTransform([
          diag(
            'INVALID_INPUT',
            `childSource deve conter EXATAMENTE um elemento/expressao JSX (recebido: ${meaningful.length})`,
            { file: input.file },
          ),
        ]);
      }
      const childText = input.childSource.trim();

      const loaded = await loadAndParse(input.file);
      if (isFailure(loaded)) return loaded;
      const { content, parsed } = loaded;
      const sf = parsed.sourceFile;

      const sel = selectTarget(sf, input.file, input.parentSelector);
      if ('failure' in sel) return sel.failure;

      const lineStart = (pos: number): number => content.lastIndexOf('\n', pos - 1) + 1;
      const indentAt = (pos: number): string => {
        const ls = lineStart(pos);
        const m = /^[ \t]*/.exec(content.slice(ls, pos));
        return m?.[0] ?? '';
      };

      let newContent: string;
      if (ts.isJsxElement(sel.target)) {
        const closing = sel.target.closingElement;
        const closingIndent = indentAt(closing.getStart(sf));
        const elementChildren = sel.target.children.filter(
          (c): c is ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxExpression =>
            ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c) || ts.isJsxExpression(c),
        );
        const firstChild = elementChildren[0];
        const childIndent =
          firstChild !== undefined ? indentAt(firstChild.getStart(sf)) : `${closingIndent}  `;

        if (firstChild !== undefined) {
          const lastChild = elementChildren[elementChildren.length - 1];
          if (lastChild === undefined) {
            return failTransform([diag('INTERNAL', 'falha interna ao localizar filhos', { file: input.file })]);
          }
          newContent = applyEdits(content, [
            { start: lastChild.getEnd(), end: lastChild.getEnd(), text: `\n${childIndent}${childText}` },
          ]);
        } else {
          const start = sel.target.openingElement.getEnd();
          const end = closing.getStart(sf);
          newContent = applyEdits(content, [
            { start, end, text: `\n${childIndent}${childText}\n${closingIndent}` },
          ]);
        }
      } else {
        // self-closing <Parent/> -> <Parent>\n  child\n</Parent> (conversao documentada)
        const tag = tagTextOf(sel.target, sf);
        const parentIndent = indentAt(sel.target.getStart(sf));
        const childIndent = `${parentIndent}  `;
        const start = sel.target.tagName.getEnd();
        const end = sel.target.getEnd(); // cobre ' />' final
        newContent = applyEdits(content, [
          {
            start,
            end,
            text: `>\n${childIndent}${childText}\n${parentIndent}</${tag}>`,
          },
        ]);
      }

      const bad = verifyReparses(input.file, newContent);
      if (bad) return failTransform([bad]);
      return okTransform(newContent, input.file);
    },

    // -- removeJsxElement ------------------------------------------------------
    async removeJsxElement(input: RemoveJsxElementInput): Promise<TransformResult> {
      const loaded = await loadAndParse(input.file);
      if (isFailure(loaded)) return loaded;
      const { content, parsed } = loaded;
      const sf = parsed.sourceFile;

      const sel = selectTarget(sf, input.file, input.elementSelector);
      if ('failure' in sel) return sel.failure;

      let start = sel.target.getStart(sf);
      let end = sel.target.getEnd();
      // Se o elemento ocupa sua(s) propria(s) linha(s), remove tambem a
      // indentacao a esquerda e a quebra de linha a direita (nao deixa linha
      // fantasma em branco). So expande quando seguro (resto da linha vazio).
      const ls = content.lastIndexOf('\n', start - 1) + 1;
      if (content.slice(ls, start).trim() === '') {
        start = ls;
        if (content[end] === '\n') end += 1;
      }
      const newContent = applyEdits(content, [{ start, end, text: '' }]);

      const bad = verifyReparses(input.file, newContent);
      if (bad) return failTransform([bad]);
      return okTransform(newContent, input.file);
    },
  };
}
