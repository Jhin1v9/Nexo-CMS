/**
 * theme.read / theme.update (M3-CONTRACTS §3.4; doc 09§52-53).
 *
 * Deteccao (09§52) por sinais REAIS no CSS do projeto:
 *  - Attributes: `[data-theme="dark"] { --... }` (prefixo html/body/:root ok);
 *  - Classes: `.dark { --... }`, `.light { ... }`, `.theme-foo { ... }`;
 *  - CssVariables: `@media (prefers-color-scheme: dark) { :root { --... } }`.
 *
 * Edicao (09§53): modifica SOMENTE o theme system existente — atualiza o
 * valor da variavel no range exato (parser compartilhado de @nexo/adapters),
 * verbatim (09§10). PROIBIDO introduzir tema Nexo paralelo: sem theme system
 * => NoThemeSystem com nextAction.
 *
 * Limitacao documentada: update suporta temas por Classes/Attributes. Temas
 * via media query (CssVariables) sao DETECTADOS mas o update retorna
 * UnsupportedMechanism honesto: o parser compartilhado nao expõe offsets de
 * bloco de at-rule, e recortar o bloco por heuristica propria violaria o
 * dono do parse (adapters). Configuration/ComponentState: idem (D6).
 */

import type { Confidence } from '@nexo/shared';
import { err, ok, type Result } from '@nexo/shared';
import { bracesBalanced, parseCssDeclarations } from '@nexo/adapters';

import { designError } from './errors.js';
import { buildTokenImpactReport } from './impact.js';
import { writeFileVerified, type ProjectFs } from './paths.js';
import type { CssFileInspected } from './inspect.js';
import type { ImpactReport, ThemeInfo, ThemeKind, ThemeMechanism } from './types.js';

// ---------------------------------------------------------------------------
// theme.read
// ---------------------------------------------------------------------------

const ATTR_SELECTOR = /^(?:(?:html|body|:root))?\s*\[\s*data-theme\s*=\s*["']?([A-Za-z0-9_-]+)["']?\s*\]$/;
const CLASS_SELECTOR = /^\.([A-Za-z][A-Za-z0-9_-]*)$/;
const PREFERS_SCHEME = /@media[^{}]*prefers-color-scheme\s*:\s*(dark|light)[^{}]*\{/gi;

function lineAt(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i += 1) {
    if (content[i] === '\n') line += 1;
  }
  return line;
}

/** Posicao do seletor seguido de '{' (para origem exata do tema). */
function findSelectorPosition(content: string, selector: string): number {
  let from = 0;
  for (;;) {
    const idx = content.indexOf(selector, from);
    if (idx === -1) return -1;
    let j = idx + selector.length;
    while (j < content.length && /\s/.test(content[j] ?? '')) j += 1;
    if (content[j] === '{') return idx;
    from = idx + 1;
  }
}

interface MediaBlock {
  scheme: 'dark' | 'light';
  matchStart: number;
  openBrace: number;
  closeBrace: number;
  activation: string;
}

/** Blocos @media prefers-color-scheme com range exato (contagem de chaves;
 *  strings com chaves dentro do bloco sao fora do escopo — documentado). */
function findPrefersColorSchemeBlocks(content: string): MediaBlock[] {
  const out: MediaBlock[] = [];
  PREFERS_SCHEME.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PREFERS_SCHEME.exec(content)) !== null) {
    const openBrace = m.index + m[0].length - 1;
    let depth = 0;
    let closeBrace = -1;
    for (let i = openBrace; i < content.length; i += 1) {
      const c = content[i];
      if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) {
          closeBrace = i;
          break;
        }
      }
    }
    if (closeBrace === -1) continue; // CSS quebrado: nao adivinhamos
    out.push({
      scheme: m[1] === 'light' ? 'light' : 'dark',
      matchStart: m.index,
      openBrace,
      closeBrace,
      activation: m[0].slice(0, -1).trim(),
    });
  }
  return out;
}

function themeKindOf(name: string): ThemeKind {
  const n = name.toLowerCase();
  if (n === 'light') return 'Light';
  if (n === 'dark') return 'Dark';
  if (n.includes('brand')) return 'Brand';
  return 'Custom';
}

interface ThemeAccumulator {
  info: ThemeInfo;
  variables: Set<string>;
  selectors: Set<string>;
}

/**
 * Detecta temas a partir dos arquivos CSS inspecionados (somente sinais
 * reais; sem sinais => lista vazia — nunca inventado).
 */
export function detectThemes(cssFiles: CssFileInspected[]): ThemeInfo[] {
  const acc = new Map<string, ThemeAccumulator>();

  const get = (mechanism: ThemeMechanism, name: string): ThemeAccumulator => {
    const key = `${mechanism}:${name.toLowerCase()}`;
    const existing = acc.get(key);
    if (existing !== undefined) return existing;
    const created: ThemeAccumulator = {
      info: {
        name,
        kind: themeKindOf(name),
        mechanism,
        activation: '',
        selectors: [],
        variables: [],
        source: { file: '', line: 0 },
        confidence: 'CONFIRMED',
      },
      variables: new Set(),
      selectors: new Set(),
    };
    acc.set(key, created);
    return created;
  };

  const setSource = (t: ThemeAccumulator, file: string, line: number): void => {
    if (t.info.source.file === '') t.info.source = { file, line };
  };

  for (const f of cssFiles) {
    // -- seletores de tema (Classes / Attributes) ---------------------------
    for (const d of f.decls) {
      if (!d.property.startsWith('--') || d.selector === null || d.selector === ':root') continue;
      if (d.atRule !== null) continue; // @theme e token, nao tema; @media abaixo
      const sel = d.selector;
      const attrMatch = ATTR_SELECTOR.exec(sel);
      if (attrMatch !== null) {
        const name = attrMatch[1] ?? '';
        const t = get('Attributes', name);
        t.info.activation = sel;
        t.selectors.add(sel);
        t.variables.add(d.property);
        setSource(t, f.rel, lineAt(f.content, findSelectorPosition(f.content, sel)));
        continue;
      }
      const classMatch = CLASS_SELECTOR.exec(sel);
      if (classMatch !== null) {
        const cls = classMatch[1] ?? '';
        if (cls !== 'dark' && cls !== 'light' && !cls.startsWith('theme-')) continue;
        const name = cls.startsWith('theme-') ? cls.slice('theme-'.length) : cls;
        const t = get('Classes', name);
        t.info.activation = sel;
        t.selectors.add(sel);
        t.variables.add(d.property);
        setSource(t, f.rel, lineAt(f.content, findSelectorPosition(f.content, sel)));
      }
    }

    // -- media query (CssVariables) -----------------------------------------
    for (const block of findPrefersColorSchemeBlocks(f.content)) {
      const vars = f.decls.filter(
        (d) =>
          d.property.startsWith('--') &&
          d.atRule === 'media' &&
          (d.selector === ':root' || d.selector === 'html') &&
          d.declStart > block.openBrace &&
          d.declStart < block.closeBrace,
      );
      if (vars.length === 0) continue;
      const t = get('CssVariables', block.scheme);
      t.info.activation = block.activation;
      for (const v of vars) t.variables.add(v.property);
      setSource(t, f.rel, lineAt(f.content, block.matchStart));
    }
  }

  const themes: ThemeInfo[] = [];
  for (const t of acc.values()) {
    t.info.selectors = [...t.selectors].sort();
    t.info.variables = [...t.variables].sort();
    themes.push(t.info);
  }
  return themes.sort((a, b) =>
    a.name === b.name ? a.mechanism.localeCompare(b.mechanism) : a.name.localeCompare(b.name),
  );
}

export interface ThemeReadResult {
  themes: ThemeInfo[];
  /** confidence geral: UNKNOWN quando nenhum tema foi detectado. */
  confidence: Confidence;
}

export function readThemes(cssFiles: CssFileInspected[]): ThemeReadResult {
  const themes = detectThemes(cssFiles);
  return { themes, confidence: themes.length > 0 ? 'CONFIRMED' : 'UNKNOWN' };
}

// ---------------------------------------------------------------------------
// theme.update
// ---------------------------------------------------------------------------

export interface ThemeUpdateInput {
  /** Nome do tema como detectado (ex.: 'dark'). Case-insensitive. */
  theme: string;
  /** Desambigua quando o mesmo nome existe em mais de um mecanismo. */
  mechanism?: ThemeMechanism;
  /** Variavel CSS -> novo valor (VERBATIM — 09§10). Somente variaveis JA
   *  declaradas no tema (update-only nesta wave; adicionar = erro honesto). */
  patch: Record<string, string>;
}

export interface ThemeVariableUpdate {
  variable: string;
  previousValue: string;
  value: string;
  file: string;
  line: number;
  impact: ImpactReport;
}

export interface ThemeUpdateResult {
  theme: ThemeInfo;
  updatedVariables: ThemeVariableUpdate[];
  filesChanged: string[];
  verified: true;
}

export async function updateTheme(
  fsCtx: ProjectFs,
  cssFiles: CssFileInspected[],
  input: ThemeUpdateInput,
): Promise<Result<ThemeUpdateResult>> {
  const patchEntries = Object.entries(input.patch);
  if (patchEntries.length === 0) {
    return err(designError('MissingInput', 'patch vazio: informe ao menos uma variavel', {}));
  }
  for (const [name] of patchEntries) {
    if (!/^--[A-Za-z0-9_-]+$/.test(name)) {
      return err(
        designError('MissingInput', `nome de variavel CSS invalido no patch: '${name}'`, {
          resource: name,
        }),
      );
    }
  }

  const { themes } = readThemes(cssFiles);
  if (themes.length === 0) {
    // 09§53: PROIBIDO introduzir tema Nexo paralelo.
    return err(
      designError(
        'NoThemeSystem',
        'O projeto nao tem theme system detectado (09§52). O Nexo nao introduz um tema paralelo; peca explicitamente uma arquitetura de tema nova se for o caso.',
        { resource: input.theme },
      ),
    );
  }

  const candidates = themes.filter(
    (t) =>
      t.name.toLowerCase() === input.theme.toLowerCase() &&
      (input.mechanism === undefined || t.mechanism === input.mechanism),
  );
  if (candidates.length === 0) {
    return err(
      designError(
        'ThemeNotFound',
        `Tema '${input.theme}' nao encontrado. Temas detectados: [${themes.map((t) => `${t.name} (${t.mechanism})`).join(', ')}]`,
        { resource: input.theme },
      ),
    );
  }
  if (candidates.length > 1) {
    return err(
      designError(
        'AmbiguousToken',
        `Tema '${input.theme}' existe em multiplos mecanismos: [${candidates.map((t) => t.mechanism).join(', ')}]; informe mechanism explicitamente`,
        { resource: input.theme },
      ),
    );
  }
  const theme = candidates[0];
  if (theme === undefined) {
    return err(designError('ThemeNotFound', `Tema '${input.theme}' nao resolvido`, { resource: input.theme }));
  }

  if (theme.mechanism !== 'Classes' && theme.mechanism !== 'Attributes') {
    return err(
      designError(
        'UnsupportedMechanism',
        `theme.update suporta temas por Classes/Attributes; '${theme.name}' usa ${theme.mechanism} (${theme.activation}) — detection-only nesta wave`,
        { resource: input.theme, details: { mechanism: theme.mechanism } },
      ),
    );
  }

  // -- resolve cada variavel do patch a UMA declaracao sob o seletor do tema -
  interface ResolvedEdit {
    variable: string;
    value: string;
    file: CssFileInspected;
    line: number;
    previousValue: string;
    valueStart: number;
    valueEnd: number;
  }
  const edits: ResolvedEdit[] = [];
  for (const [variable, value] of patchEntries) {
    const matches: { file: CssFileInspected; decl: CssFileInspected['decls'][number] }[] = [];
    for (const f of cssFiles) {
      for (const d of f.decls) {
        if (d.property !== variable || d.selector === null) continue;
        if (theme.selectors.includes(d.selector)) matches.push({ file: f, decl: d });
      }
    }
    if (matches.length === 0) {
      return err(
        designError(
          'ThemeVariableNotFound',
          `Variavel '${variable}' nao declarada no tema '${theme.name}' (seletores: ${theme.selectors.join(', ')}). Update-only nesta wave: declare a variavel no source do tema primeiro.`,
          { resource: variable },
        ),
      );
    }
    if (matches.length > 1) {
      return err(
        designError(
          'AmbiguousToken',
          `Variavel '${variable}' definida ${matches.length}x no tema '${theme.name}': ${matches.map((mm) => `${mm.file.rel}:${mm.decl.line}`).join(', ')}`,
          { resource: variable },
        ),
      );
    }
    const m = matches[0];
    if (m === undefined) continue;
    edits.push({
      variable,
      value,
      file: m.file,
      line: m.decl.line,
      previousValue: m.decl.value,
      valueStart: m.decl.valueStart,
      valueEnd: m.decl.valueEnd,
    });
  }

  // -- impact report ANTES de mutar (09§78-79) -------------------------------
  const impacts = new Map<string, ImpactReport>();
  for (const e of edits) {
    impacts.set(
      e.variable,
      await buildTokenImpactReport(fsCtx.rootAbs, e.variable, { file: e.file.rel, line: e.line }),
    );
  }

  // -- aplica por arquivo (edits em ordem reversa de offset) ------------------
  const byFile = new Map<string, ResolvedEdit[]>();
  for (const e of edits) {
    const list = byFile.get(e.file.rel) ?? [];
    list.push(e);
    byFile.set(e.file.rel, list);
  }

  const filesChanged: string[] = [];
  for (const [rel, fileEdits] of byFile) {
    const file = fileEdits[0]?.file;
    if (file === undefined) continue;
    let newContent = file.content;
    for (const e of [...fileEdits].sort((a, b) => b.valueStart - a.valueStart)) {
      newContent = newContent.slice(0, e.valueStart) + e.value + newContent.slice(e.valueEnd);
    }
    // verificacao pre-escrita: chaves balanceadas + declaracoes re-parseiam
    if (!bracesBalanced(newContent)) {
      return err(
        designError('VerificationFailed', `Edicao do tema produziria CSS com chaves desbalanceadas em '${rel}' (descartada, arquivo intocado)`, { resource: rel }),
      );
    }
    const recheck = parseCssDeclarations(newContent);
    for (const e of fileEdits) {
      const found = recheck.find(
        (d) => d.property === e.variable && d.selector !== null && theme.selectors.includes(d.selector),
      );
      if (found === undefined || found.value !== e.value.trim()) {
        return err(
          designError('VerificationFailed', `Edicao de '${e.variable}' nao sobreviveu ao re-parse em '${rel}' (descartada, arquivo intocado)`, { resource: rel }),
        );
      }
    }
    const written = await writeFileVerified(fsCtx, rel, newContent);
    if (!written.ok) return err(written.error);
    filesChanged.push(written.value.file);
  }

  const updatedVariables: ThemeVariableUpdate[] = edits.map((e) => {
    const impact = impacts.get(e.variable);
    return {
      variable: e.variable,
      previousValue: e.previousValue,
      value: e.value,
      file: e.file.rel,
      line: e.line,
      impact: impact ?? {
        target: e.variable,
        usagesCount: 0,
        scannedFiles: 0,
        affectedFiles: [],
        affectedComponents: [],
        affectedPages: [],
        affectedTokens: [],
        affectedInstances: 0,
        entries: [],
        notes: [],
      },
    };
  });

  return ok({ theme, updatedVariables, filesChanged: filesChanged.sort(), verified: true });
}
