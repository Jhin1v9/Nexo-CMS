/**
 * Deteccao de Native Project Components (doc 08§5.1 — "Nexo detects and
 * manages it") via AST do TypeScript compiler (permitido: TS AST; NUNCA
 * scanner semantico paralelo com regex — M3-CONTRACTS §2).
 *
 * Escopo da varredura: arquivos .tsx/.jsx sob os diretorios de componentes
 * DETECTADOS do projeto (ver COMPONENT_DIR_CANDIDATES — somente dirs que
 * existem no disco; nunca assumimos src/components sem evidencia).
 *
 * Extracao de props (honesta):
 *  - props sao lidas do type/interface do PRIMEIRO parametro do componente
 *    (type literal inline ou referencia local `XProps` resolvida no MESMO
 *    arquivo). Referencia externa nao resolvivel => props do binding pattern
 *    com type 'Unknown' e propsConfidence PARTIAL/UNKNOWN — nunca adivinhado.
 *  - Mapeamento TS -> PropType e ESTRITAMENTE sintatico (string->String,
 *    union de string literals -> Enum, T[]/Array<T> -> Array, type literal ->
 *    Object, ReactNode/JSX.Element -> Slot, (...)=>... em prop onXxx -> event).
 *    Image/Video/URL/Color/RichText NAO sao inferidos por nome de prop (seria
 *    invencao) — strings semanticas ficam 'String'.
 *  - defaults: somente literais (string/number/boolean) do destructuring;
 *    default nao-literal e indeterminado => omitido e propsConfidence PARTIAL.
 *  - events: props `onXxx` com tipo funcao vao para `events` (08§9), nao
 *    para `props` (nao ha PropType funcao no vocabulario congelado).
 *
 * Read-only: deteccao NUNCA escreve no projeto.
 */

import { createNodeDetectionContext, findFiles } from '@nexo/adapters';
import { err, nexoError, ok, type Result } from '@nexo/shared';
import ts from 'typescript';

import type { ComponentProp, ComponentSlot } from './types.js';

/** Diretorios candidatos de componentes (ordem estavel; so entram se EXISTIREM). */
export const COMPONENT_DIR_CANDIDATES: readonly string[] = [
  'src/components',
  'components',
  'src/ui',
  'app/components',
  'src/app/components',
];

export type PropsConfidence = 'EXACT' | 'PARTIAL' | 'UNKNOWN';

export interface DetectedComponent {
  name: string;
  /** Path relativo ao Project Root. */
  file: string;
  exportKind: 'named' | 'default';
  props: ComponentProp[];
  events: string[];
  slots: ComponentSlot[];
  /** Assets importados pelo arquivo do componente (08§18 — deps reais). */
  assets: string[];
  /** Como os props foram declarados (interface local, type alias, inline, ...). */
  propsDeclKind: 'interface' | 'type-alias' | 'inline' | 'binding-only' | 'none';
  /** Confidence da extracao de props (EXACT = interface/type resolvida localmente). */
  propsConfidence: PropsConfidence;
}

export interface ComponentDetection {
  components: DetectedComponent[];
  /** Diretorios de componentes efetivamente detectados no disco. */
  componentDirs: string[];
  scannedFiles: number;
  /** Arquivos .tsx/.jsx pulados por parse error (evidencia, nunca silencio). */
  skippedFiles: string[];
}

const ASSET_IMPORT_RE = /\.(png|jpe?g|gif|webp|svg|avif|mp4|webm|mov|woff2?|ttf|otf|pdf)$/i;

function parseTsx(rel: string, content: string): { sf: ts.SourceFile; parseOk: boolean } {
  const kind = rel.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const sf = ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true, kind);
  const parseDiagnostics =
    (sf as ts.SourceFile & { readonly parseDiagnostics?: readonly ts.Diagnostic[] })
      .parseDiagnostics ?? [];
  return { sf, parseOk: parseDiagnostics.length === 0 };
}

function isComponentLikeName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function hasDefaultModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

/** Texto literal de um initializer quando determinavel; senao undefined. */
function literalValue(expr: ts.Expression): string | number | boolean | undefined {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

interface ExtractedProps {
  props: ComponentProp[];
  events: string[];
  slots: ComponentSlot[];
  declKind: DetectedComponent['propsDeclKind'];
  confidence: PropsConfidence;
}

/** Mapeamento estritamente sintatico TS -> PropType (ver header). */
function mapTsType(typeNode: ts.TypeNode, sf: ts.SourceFile): { type: ComponentProp['type']; validation?: string } {
  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { type: 'String' };
    case ts.SyntaxKind.NumberKeyword:
      return { type: 'Number' };
    case ts.SyntaxKind.BooleanKeyword:
      return { type: 'Boolean' };
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
      return { type: 'Unknown' };
    default:
      break;
  }
  if (ts.isArrayTypeNode(typeNode)) return { type: 'Array' };
  if (ts.isTypeLiteralNode(typeNode)) return { type: 'Object' };
  if (ts.isFunctionTypeNode(typeNode)) return { type: 'Unknown' };
  if (ts.isUnionTypeNode(typeNode)) {
    const literals: string[] = [];
    for (const member of typeNode.types) {
      if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) {
        literals.push(member.literal.text);
      } else {
        return { type: 'Unknown' };
      }
    }
    if (literals.length > 0) return { type: 'Enum', validation: `oneOf:${literals.join('|')}` };
    return { type: 'Unknown' };
  }
  if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
    return { type: 'Enum', validation: `oneOf:${typeNode.literal.text}` };
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const text = typeNode.typeName.getText(sf);
    if (text === 'Array') return { type: 'Array' };
    if (text === 'Record') return { type: 'Object' };
    if (
      text === 'ReactNode' ||
      text === 'ReactElement' ||
      text === 'React.ReactNode' ||
      text === 'React.ReactElement' ||
      text === 'JSX.Element'
    ) {
      return { type: 'Slot' };
    }
    return { type: 'Unknown' };
  }
  return { type: 'Unknown' };
}

function jsDocOf(node: ts.Node): string | undefined {
  const tags = ts.getJSDocCommentsAndTags(node);
  const first = tags[0];
  if (first !== undefined && ts.isJSDoc(first) && typeof first.comment === 'string') {
    return first.comment;
  }
  return undefined;
}

/** Extrai props de uma lista de PropertySignature (interface ou type literal). */
function propsFromTypeMembers(
  members: readonly ts.TypeElement[],
  sf: ts.SourceFile,
  defaults: Map<string, string | number | boolean | undefined>,
  declKind: ExtractedProps['declKind'],
): ExtractedProps {
  const props: ComponentProp[] = [];
  const events: string[] = [];
  const slots: ComponentSlot[] = [];
  let confidence: PropsConfidence = 'EXACT';

  for (const member of members) {
    if (!ts.isPropertySignature(member)) {
      // call signatures etc. dentro do type de props: indeterminado honesto
      confidence = 'PARTIAL';
      continue;
    }
    const nameNode = member.name;
    const name = ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) ? nameNode.text : null;
    if (name === null) {
      confidence = 'PARTIAL';
      continue;
    }
    const required = member.questionToken === undefined;
    const mapped = member.type !== undefined ? mapTsType(member.type, sf) : { type: 'Unknown' as const };
    if (mapped.type === 'Unknown') confidence = confidence === 'EXACT' ? 'PARTIAL' : confidence;

    const isFunctionTyped =
      member.type !== undefined && ts.isFunctionTypeNode(member.type);
    if (isFunctionTyped && /^on[A-Z]/.test(name)) {
      events.push(name);
      continue;
    }

    const defaultVal = defaults.get(name);
    if (defaults.has(name) && defaultVal === undefined && confidence === 'EXACT') {
      confidence = 'PARTIAL'; // default existe mas nao e literal determinavel
    }

    const prop: ComponentProp = {
      name,
      type: mapped.type,
      required,
      ...(defaultVal !== undefined ? { default: defaultVal } : {}),
      ...(jsDocOf(member) !== undefined ? { description: jsDocOf(member) } : {}),
      ...('validation' in mapped && mapped.validation !== undefined
        ? { validation: mapped.validation }
        : {}),
    };
    props.push(prop);
    if (mapped.type === 'Slot') slots.push({ name, kind: 'ComposableSlot' });
  }
  return { props, events, slots, declKind, confidence };
}

/** Extrai props de binding pattern SEM type annotation (type Unknown honesto). */
function propsFromBinding(binding: ts.BindingPattern | ts.BindingName): ExtractedProps {
  const props: ComponentProp[] = [];
  if (ts.isObjectBindingPattern(binding)) {
    for (const el of binding.elements) {
      if (!ts.isIdentifier(el.name)) continue; // nested/rest: indeterminado, nao adivinhado
      const defaultVal = el.initializer !== undefined ? literalValue(el.initializer) : undefined;
      props.push({
        name: el.name.text,
        type: 'Unknown',
        required: el.initializer === undefined,
        ...(defaultVal !== undefined ? { default: defaultVal } : {}),
      });
    }
  }
  return {
    props,
    events: [],
    slots: [],
    declKind: 'binding-only',
    // sem type annotation nunca e EXACT — nomes sao reais, tipos Unknown
    confidence: 'PARTIAL',
  };
}

/** Coleta interfaces e type aliases locais do arquivo para resolver XProps. */
function collectLocalTypes(
  sf: ts.SourceFile,
): Map<string, { kind: 'interface' | 'type-alias'; members: readonly ts.TypeElement[] }> {
  const out = new Map<string, { kind: 'interface' | 'type-alias'; members: readonly ts.TypeElement[] }>();
  const visit = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node)) {
      out.set(node.name.text, { kind: 'interface', members: node.members });
    } else if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
      out.set(node.name.text, { kind: 'type-alias', members: node.type.members });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Defaults do destructuring do parametro (`{ a = 'x', b = 2 }`). */
function bindingDefaults(param: ts.ParameterDeclaration): Map<string, string | number | boolean | undefined> {
  const defaults = new Map<string, string | number | boolean | undefined>();
  if (ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) {
      if (!ts.isIdentifier(el.name)) continue;
      defaults.set(
        el.name.text,
        el.initializer !== undefined ? literalValue(el.initializer) : undefined,
      );
    }
  }
  return defaults;
}

/** Extrai props do primeiro parametro de uma assinatura de funcao componente. */
function extractPropsFromSignature(
  sig: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  sf: ts.SourceFile,
  localTypes: ReturnType<typeof collectLocalTypes>,
): ExtractedProps {
  const param = sig.parameters[0];
  if (param === undefined) {
    return { props: [], events: [], slots: [], declKind: 'none', confidence: 'EXACT' };
  }
  const defaults = bindingDefaults(param);

  if (param.type !== undefined) {
    if (ts.isTypeLiteralNode(param.type)) {
      return propsFromTypeMembers(param.type.members, sf, defaults, 'inline');
    }
    if (ts.isTypeReferenceNode(param.type)) {
      const typeName = param.type.typeName.getText(sf);
      const local = localTypes.get(typeName);
      if (local !== undefined) {
        return propsFromTypeMembers(local.members, sf, defaults, local.kind);
      }
      // type externo nao resolvivel neste arquivo: binding-only honesto
      if (ts.isObjectBindingPattern(param.name)) {
        const fromBinding = propsFromBinding(param.name);
        return { ...fromBinding, declKind: 'binding-only', confidence: 'PARTIAL' };
      }
      return { props: [], events: [], slots: [], declKind: 'none', confidence: 'UNKNOWN' };
    }
    // outro tipo de anotacao: indeterminado
    if (ts.isObjectBindingPattern(param.name)) {
      return propsFromBinding(param.name);
    }
    return { props: [], events: [], slots: [], declKind: 'none', confidence: 'UNKNOWN' };
  }
  return propsFromBinding(param.name);
}

function collectAssetImports(sf: ts.SourceFile): string[] {
  const assets: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      ASSET_IMPORT_RE.test(node.moduleSpecifier.text)
    ) {
      assets.push(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return assets.sort();
}

/**
 * Analisa UM arquivo .tsx/.jsx e retorna os componentes exportados
 * (component-like: nome PascalCase ou export default). Usado pela deteccao
 * de projeto E pela re-analise pos-mutacao (create/update — 08§20/§22).
 */
export function analyzeComponentFile(
  rel: string,
  content: string,
): { components: DetectedComponent[]; parseOk: boolean } {
  const { sf, parseOk } = parseTsx(rel, content);
  if (!parseOk) return { components: [], parseOk: false };

  const localTypes = collectLocalTypes(sf);
  const assets = collectAssetImports(sf);
  const components: DetectedComponent[] = [];
  const fileStem = rel.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') ?? '';

  const pushComponent = (
    name: string,
    sig: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
    exportKind: 'named' | 'default',
  ): void => {
    const extracted = extractPropsFromSignature(sig, sf, localTypes);
    components.push({
      name,
      file: rel,
      exportKind,
      props: extracted.props,
      events: extracted.events,
      slots: extracted.slots,
      assets,
      propsDeclKind: extracted.declKind,
      propsConfidence: extracted.confidence,
    });
  };

  const visit = (node: ts.Node): void => {
    if (hasExportModifier(node) && ts.isFunctionDeclaration(node)) {
      const isDefault = hasDefaultModifier(node);
      const name = node.name?.text ?? (isDefault && isComponentLikeName(fileStem) ? fileStem : null);
      if (name !== null && isComponentLikeName(name)) {
        pushComponent(name, node, isDefault ? 'default' : 'named');
      }
    }
    if (hasExportModifier(node) && ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !isComponentLikeName(decl.name.text)) continue;
        const init = decl.initializer;
        if (init !== undefined && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          pushComponent(decl.name.text, init, 'named');
        }
      }
    }
    // `export default Identifier` / `export default (arrow)` sao resolvidos
    // na segunda passada (visitDefault), apos declaracoes locais.
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // export default Identifier / export default (arrow) — segunda passada
  const visitDefault = (node: ts.Node): void => {
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const expr = node.expression;
      if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
        const name = isComponentLikeName(fileStem) ? fileStem : 'DefaultComponent';
        pushComponent(name, expr, 'default');
      } else if (ts.isIdentifier(expr)) {
        // `const Foo = () => ...; export default Foo;`
        const findLocal = (n: ts.Node): void => {
          if (
            ts.isVariableStatement(n) &&
            !components.some((c) => c.exportKind === 'default')
          ) {
            for (const decl of n.declarationList.declarations) {
              if (
                ts.isIdentifier(decl.name) &&
                decl.name.text === expr.text &&
                decl.initializer !== undefined &&
                (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
              ) {
                pushComponent(decl.name.text, decl.initializer, 'default');
              }
            }
          }
          ts.forEachChild(n, findLocal);
        };
        findLocal(sf);
      }
    }
    ts.forEachChild(node, visitDefault);
  };
  visitDefault(sf);

  return { components, parseOk: true };
}

/** Detecta diretorios de componentes existentes (evidencia de disco). */
export async function detectComponentDirs(rootAbs: string): Promise<string[]> {
  const ctx = createNodeDetectionContext(rootAbs);
  const found: string[] = [];
  for (const candidate of COMPONENT_DIR_CANDIDATES) {
    if (await ctx.exists(candidate)) found.push(candidate);
  }
  return found;
}

/**
 * Deteccao de Native Project Components: componentes exportados em arquivos
 * .tsx/.jsx sob os diretorios de componentes detectados do projeto.
 * Projeto sem diretorio de componentes => lista vazia (NAO erro — ausencia
 * de componentes e um estado legitimo, reportado via componentDirs=[]).
 */
export async function detectNativeComponents(
  rootAbs: string,
  componentDirs?: readonly string[],
): Promise<Result<ComponentDetection>> {
  if (typeof rootAbs !== 'string' || rootAbs.trim() === '') {
    return err(nexoError('INVALID_INPUT', 'rootAbs deve ser string nao vazia', { retryable: false }));
  }
  const ctx = createNodeDetectionContext(rootAbs);
  const dirs = componentDirs !== undefined ? [...componentDirs] : await detectComponentDirs(rootAbs);
  if (dirs.length === 0) {
    return ok({ components: [], componentDirs: [], scannedFiles: 0, skippedFiles: [] });
  }

  const dirSet = dirs.map((d) => d.replace(/\/+$/, ''));
  const files = await findFiles(
    ctx,
    (rel) =>
      /\.(tsx|jsx)$/.test(rel) && dirSet.some((d) => rel === d || rel.startsWith(`${d}/`)),
    { maxDepth: 10, ignoreDirs: ['node_modules', '.git', 'dist'], maxResults: 1000 },
  );
  files.sort();

  const components: DetectedComponent[] = [];
  const skippedFiles: string[] = [];
  let scannedFiles = 0;
  for (const rel of files) {
    const content = await ctx.readFile(rel);
    if (content === null) {
      skippedFiles.push(rel);
      continue;
    }
    scannedFiles += 1;
    const analyzed = analyzeComponentFile(rel, content);
    if (!analyzed.parseOk) {
      skippedFiles.push(rel);
      continue;
    }
    components.push(...analyzed.components);
  }
  components.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.file < b.file ? -1 : 1));
  return ok({ components, componentDirs: dirs, scannedFiles, skippedFiles });
}
