/**
 * TailwindStylingAdapter — write-path M3 para Tailwind (stack first-class, D6).
 *
 * Mecanismos suportados (detectados por sinais REAIS, nunca assumidos):
 *  - Tailwind v4: arquivo(s) CSS com `@import "tailwindcss"` e bloco
 *    `@theme { --color-primary: ...; }` — tokens = custom properties do @theme.
 *  - Tailwind v3: `tailwind.config.{js,cjs,mjs,ts}` — objeto `theme` /
 *    `theme.extend`, grupos `colors` | `spacing` | `borderRadius`, valores
 *    folha string literais (nested colors viram nomes dotted: 'brand.light').
 *
 * Decisoes documentadas:
 *  - Precedencia em updateToken: @theme (v4) primeiro; se o token nao esta em
 *    nenhum @theme, tenta o config (v3). Projeto com AMBOS definindo o mesmo
 *    token e caso patologico: o @theme v4 e a fonte de verdade do v4.
 *  - Config e parseado via TS compiler (AST) — NUNCA eval/require do config
 *    do usuario (seguranca + determinismo). Valores dinamicos (calls,
 *    spreads, identificadores) NAO sao tokens editaveis: readTokens os omite
 *    e updateToken retorna UNSUPPORTED honesto.
 *  - Nenhuma conversao de representacao (09§10): o novo valor e escrito
 *    VERBATIM no range do valor antigo (HSL continua HSL etc.).
 *  - setUtilityClass NAO toca em arquivo: opera sobre a string classList
 *    (quem aplica no JSX e o ReactTsxTransformer via setJsxProp).
 */

import ts from 'typescript';

import type { Detection } from '@nexo/shared';

import { createNodeDetectionContext, findFiles } from '../fs-context.js';
import type { AdapterIdentity, DetectionContext } from '../types.js';
import { parseCssDeclarations, type CssDeclaration } from './css-source.js';
import type {
  DesignToken,
  ReadTokensInput,
  SetUtilityClassInput,
  StylingAdapter,
  UpdateTokenInput,
  UtilityClassResult,
} from './styling.js';
import {
  classifyRepresentation,
  kindFromConfigGroup,
  kindFromCssVar,
} from './styling.js';
import { diag, failTransform, okTransform, type TransformResult } from './types.js';

const TAILWIND_CONFIGS = [
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
] as const;

const TAILWIND_V4_IMPORT = /@import\s+["']tailwindcss["']/;
const THEME_BLOCK = /@theme\s*\{/;

/** Prefixo de utilidade por propriedade CSS (tabela FIXA e documentada desta
 *  wave; propriedade fora da tabela => UNSUPPORTED, nunca prefixo inventado).
 *  CONFLITO CONHECIDO (documentado): 'color' e 'font-size' compartilham o
 *  prefixo `text-` do Tailwind; setUtilityClass remove classes `text-*`
 *  existentes em ambos os casos (limitacao declarada). */
const PROPERTY_PREFIX: Readonly<Record<string, string>> = {
  color: 'text',
  'background-color': 'bg',
  'border-color': 'border',
  padding: 'p',
  'padding-left': 'pl',
  'padding-right': 'pr',
  'padding-top': 'pt',
  'padding-bottom': 'pb',
  margin: 'm',
  'margin-left': 'ml',
  'margin-right': 'mr',
  'margin-top': 'mt',
  'margin-bottom': 'mb',
  'border-radius': 'rounded',
  width: 'w',
  height: 'h',
  gap: 'gap',
  'font-size': 'text',
  'font-weight': 'font',
};

const CONFIG_GROUPS = ['colors', 'spacing', 'borderRadius'] as const;

// ---------------------------------------------------------------------------
// Tailwind v4 (@theme em CSS)
// ---------------------------------------------------------------------------

interface ThemeCssFile {
  rel: string;
  content: string;
  themeDecls: CssDeclaration[];
}

async function findThemeCssFiles(ctx: DetectionContext): Promise<ThemeCssFile[]> {
  const cssFiles = await findFiles(
    ctx,
    (rel) => rel.endsWith('.css'),
    { maxDepth: 6, ignoreDirs: ['node_modules', '.git', 'dist'], maxResults: 100 },
  );
  const out: ThemeCssFile[] = [];
  for (const rel of cssFiles) {
    const content = await ctx.readFile(rel);
    if (content === null) continue;
    if (!TAILWIND_V4_IMPORT.test(content) && !THEME_BLOCK.test(content)) continue;
    const themeDecls = parseCssDeclarations(content).filter(
      (d) => d.atRule === 'theme' && d.property.startsWith('--'),
    );
    if (themeDecls.length > 0) out.push({ rel, content, themeDecls });
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

// ---------------------------------------------------------------------------
// Tailwind v3 (tailwind.config.* via AST do TS compiler — nunca eval)
// ---------------------------------------------------------------------------

interface ConfigTokenEntry {
  tokenRef: string; // ex.: 'colors.primary', 'extend.colors.brand.light'
  value: string;
  node: ts.StringLiteral;
  file: string;
  line: number;
}

function unwrapExpr(expr: ts.Expression): ts.Expression {
  let e = expr;
  for (;;) {
    if (ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e) || ts.isAsExpression(e)) {
      e = e.expression;
      continue;
    }
    return e;
  }
}

function propertyOf(obj: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | null {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const n = prop.name;
    if (
      (ts.isIdentifier(n) && n.text === name) ||
      (ts.isStringLiteral(n) && n.text === name)
    ) {
      return prop;
    }
  }
  return null;
}

/** Objeto de config top-level: `export default {...}` ou `module.exports = {...}`. */
function findConfigObject(sf: ts.SourceFile): ts.ObjectLiteralExpression | null {
  let found: ts.ObjectLiteralExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (found !== null) return;
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const e = unwrapExpr(node.expression);
      if (ts.isObjectLiteralExpression(e)) found = e;
      return;
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.expression.getText(sf) === 'module' &&
      node.left.name.text === 'exports'
    ) {
      const e = unwrapExpr(node.right);
      if (ts.isObjectLiteralExpression(e)) found = e;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Extrai tokens string-literal dos grupos colors/spacing/borderRadius de um
 *  objeto theme (ou extend). Retorna entradas com node para edicao futura. */
function extractGroupTokens(
  sf: ts.SourceFile,
  file: string,
  themeObj: ts.ObjectLiteralExpression,
  refPrefix: string,
): ConfigTokenEntry[] {
  const out: ConfigTokenEntry[] = [];
  for (const group of CONFIG_GROUPS) {
    const groupProp = propertyOf(themeObj, group);
    if (groupProp === null) continue;
    const groupObj = unwrapExpr(groupProp.initializer);
    if (!ts.isObjectLiteralExpression(groupObj)) continue; // dinamico: nao e token editavel

    const walk = (obj: ts.ObjectLiteralExpression, path: string[]): void => {
      for (const prop of obj.properties) {
        if (!ts.isPropertyAssignment(prop)) continue; // spread/etc: fora do escopo
        const n = prop.name;
        const key =
          ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n) ? n.text : null;
        if (key === null) continue;
        const value = unwrapExpr(prop.initializer);
        const nextPath = [...path, key];
        if (ts.isStringLiteral(value)) {
          const lc = ts.getLineAndCharacterOfPosition(sf, value.getStart(sf));
          out.push({
            tokenRef: `${refPrefix}${group}.${nextPath.join('.')}`,
            value: value.text,
            node: value,
            file,
            line: lc.line + 1,
          });
        } else if (ts.isObjectLiteralExpression(value)) {
          walk(value, nextPath); // colors aninhadas: brand.light etc.
        }
        // demais formas (call/identifier/array): dinamicas — omitidas, nao adivinhadas
      }
    };
    walk(groupObj, []);
  }
  return out;
}

async function readConfigTokens(
  ctx: DetectionContext,
): Promise<{ file: string; content: string; sf: ts.SourceFile; tokens: ConfigTokenEntry[] }[]> {
  const out: { file: string; content: string; sf: ts.SourceFile; tokens: ConfigTokenEntry[] }[] = [];
  for (const rel of TAILWIND_CONFIGS) {
    const content = await ctx.readFile(rel);
    if (content === null) continue;
    const sf = ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const configObj = findConfigObject(sf);
    if (configObj === null) continue;
    const themeProp = propertyOf(configObj, 'theme');
    if (themeProp === null) continue;
    const themeObj = unwrapExpr(themeProp.initializer);
    if (!ts.isObjectLiteralExpression(themeObj)) continue;

    const tokens: ConfigTokenEntry[] = extractGroupTokens(sf, rel, themeObj, '');
    const extendProp = propertyOf(themeObj, 'extend');
    if (extendProp !== null) {
      const extendObj = unwrapExpr(extendProp.initializer);
      if (ts.isObjectLiteralExpression(extendObj)) {
        tokens.push(...extractGroupTokens(sf, rel, extendObj, 'extend.'));
      }
    }
    out.push({ file: rel, content, sf, tokens });
  }
  return out;
}

// ---------------------------------------------------------------------------
// adapter
// ---------------------------------------------------------------------------

export interface TailwindStylingAdapter extends StylingAdapter {
  updateToken(input: UpdateTokenInput): Promise<TransformResult>;
  setUtilityClass(input: SetUtilityClassInput): UtilityClassResult;
}

export function createTailwindStylingAdapter(): TailwindStylingAdapter {
  const identity: AdapterIdentity = {
    id: 'tailwind-styling',
    name: 'Tailwind CSS (write-path)',
    category: 'STYLING',
    adapterVersion: '0.0.0',
  };

  return {
    identity,

    async detect(ctx: DetectionContext): Promise<Detection<unknown>> {
      const evidence: string[] = [];
      const themeFiles = await findThemeCssFiles(ctx);
      for (const f of themeFiles) evidence.push(`file:${f.rel} (@theme, ${f.themeDecls.length} tokens)`);
      const configs: string[] = [];
      for (const rel of TAILWIND_CONFIGS) {
        if (await ctx.exists(rel)) configs.push(rel);
      }
      for (const c of configs) evidence.push(`file:${c}`);
      if (evidence.length === 0) {
        return { value: null, confidence: 'UNKNOWN', evidence: [] };
      }
      return {
        value: {
          version: null,
          details: {
            v4ThemeFiles: themeFiles.map((f) => f.rel),
            configFiles: configs,
          },
        },
        confidence: themeFiles.length > 0 ? 'CONFIRMED' : 'MEDIUM',
        evidence,
      };
    },

    async readTokens(input: ReadTokensInput): Promise<DesignToken[]> {
      const ctx = createNodeDetectionContext(input.root);
      const tokens: DesignToken[] = [];

      for (const f of await findThemeCssFiles(ctx)) {
        for (const d of f.themeDecls) {
          tokens.push({
            tokenRef: d.property,
            value: d.value,
            kind: kindFromCssVar(d.property),
            representation: classifyRepresentation(d.value),
            source: { file: f.rel, line: d.line },
          });
        }
      }
      for (const cfg of await readConfigTokens(ctx)) {
        for (const t of cfg.tokens) {
          tokens.push({
            tokenRef: t.tokenRef,
            value: t.value,
            kind: kindFromConfigGroup(t.tokenRef.split('.')[0] ?? ''),
            representation: classifyRepresentation(t.value),
            source: { file: t.file, line: t.line },
          });
        }
      }
      return tokens;
    },

    async updateToken(input: UpdateTokenInput): Promise<TransformResult> {
      const ctx = createNodeDetectionContext(input.root);
      const ref = input.tokenRef.trim();

      // -- forma v4: '--color-primary' ou 'color-primary' --------------------
      const cssVarRef = ref.startsWith('--')
        ? ref
        : /^[a-z]+-[a-z0-9-]+$/i.test(ref) && !ref.includes('.')
          ? `--${ref}`
          : null;

      if (cssVarRef !== null) {
        const candidates: { f: ThemeCssFile; d: CssDeclaration }[] = [];
        for (const f of await findThemeCssFiles(ctx)) {
          for (const d of f.themeDecls) {
            if (d.property === cssVarRef) candidates.push({ f, d });
          }
        }
        if (candidates.length > 1) {
          return failTransform(
            candidates.map(({ f, d }) =>
              diag(
                'AMBIGUOUS_TARGET',
                `token ${cssVarRef} definido em multiplos @theme: ${f.rel}:${d.line}`,
                { file: f.rel, line: d.line },
              ),
            ),
          );
        }
        const hit = candidates[0];
        if (hit !== undefined) {
          const { f, d } = hit;
          // substitui SOMENTE o range do valor (09§10: representacao preservada;
          // 09§18: nada de shorthand/longhand e tocado).
          const newContent =
            f.content.slice(0, d.valueStart) + input.value + f.content.slice(d.valueEnd);
          return okTransform(newContent, f.rel);
        }
        // nao achou no @theme: se a forma era claramente v4 ('--...'), nao cai
        // para config — documentado (v4 e v3 sao mecanismos distintos).
        if (ref.startsWith('--')) {
          return failTransform([
            diag('TARGET_NOT_FOUND', `token ${ref} nao encontrado em nenhum @theme do projeto`),
          ]);
        }
      }

      // -- forma v3 config: 'colors.primary' | 'theme.colors.a' | 'extend...'
      let path = ref.replace(/^theme\./, '');
      const configs = await readConfigTokens(ctx);
      const matchIn = (wantPrefix: '' | 'extend.'): { cfg: (typeof configs)[number]; t: ConfigTokenEntry } | null => {
        for (const cfg of configs) {
          const t = cfg.tokens.find((tk) => tk.tokenRef === `${wantPrefix}${path}`);
          if (t !== undefined) return { cfg, t };
        }
        return null;
      };
      // 'extend.' explicito, senao direto, senao fallback para extend (documentado)
      const hit = path.startsWith('extend.')
        ? matchIn('')
        : (matchIn('') ?? matchIn('extend.'));
      if (hit === null) {
        if (configs.length === 0) {
          return failTransform(
            [
              diag(
                'UNSUPPORTED',
                `token '${input.tokenRef}' nao encontrado e o projeto nao tem @theme v4 nem tailwind.config.* com theme literal; mecanismo de tokens desconhecido`,
              ),
            ],
            { reason: 'token fora dos mecanismos suportados (v4 @theme / v3 config literal)' },
          );
        }
        return failTransform([
          diag('TARGET_NOT_FOUND', `token '${input.tokenRef}' nao encontrado no config tailwind`),
        ]);
      }

      const { cfg, t } = hit;
      // valor dinamico nao vira token (extractGroupTokens so emite StringLiteral),
      // entao aqui o node e SEMPRE string literal. Preserva o estilo de aspas
      // do arquivo (09§10: preservar representacao).
      const rawText = t.node.getText(cfg.sf);
      const quote = rawText.startsWith("'") ? "'" : '"';
      const escaped = input.value.split(quote).join(`\\${quote}`);
      const newContent =
        cfg.content.slice(0, t.node.getStart(cfg.sf)) +
        `${quote}${escaped}${quote}` +
        cfg.content.slice(t.node.getEnd());
      return okTransform(newContent, cfg.file);
    },

    setUtilityClass(input: SetUtilityClassInput): UtilityClassResult {
      const prefix = PROPERTY_PREFIX[input.property];
      if (prefix === undefined) {
        return {
          ok: false,
          diagnostics: [
            diag(
              'UNSUPPORTED',
              `propriedade '${input.property}' fora da tabela documentada de mapeamento Tailwind (${Object.keys(PROPERTY_PREFIX).join(', ')})`,
            ),
          ],
          unsupported: { reason: 'propriedade sem prefixo Tailwind mapeado nesta wave' },
        };
      }
      if (/\s/.test(input.value)) {
        return {
          ok: false,
          diagnostics: [
            diag('INVALID_INPUT', 'valor com espacos nao pode virar classe Tailwind (arbitrary values nao admitem espacos crus)'),
          ],
        };
      }

      const isArbitrary =
        input.value.startsWith('#') ||
        input.value.startsWith('var(') ||
        input.value.startsWith('calc(') ||
        /[()]/.test(input.value) ||
        /[\d.](px|rem|em|%|vh|vw|ch)$/i.test(input.value);
      const newClass = isArbitrary ? `${prefix}-[${input.value}]` : `${prefix}-${input.value}`;

      // remove classes existentes do MESMO prefixo (inclusive arbitrary do prefixo)
      const kept = input.classList
        .split(/\s+/)
        .filter((c) => c.length > 0)
        .filter((c) => c !== prefix && !c.startsWith(`${prefix}-`));
      return { ok: true, newClassList: [...kept, newClass].join(' '), diagnostics: [] };
    },
  };
}
