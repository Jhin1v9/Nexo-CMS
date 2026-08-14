/**
 * Impact Analysis (09§78-79): varredura REAL de referencias a um token /
 * variavel CSS no source do projeto, read-only.
 *
 * O que conta como uso (regras deterministicas, documentadas):
 *  - 'css-var-usage': ocorrencia de `var(--nome)` em qualquer arquivo texto;
 *  - 'css-var-definition': DEFINICAO de outra variavel cujo valor referencia
 *    o alvo via var() (tokens afetados em cadeia — 09§56);
 *  - 'literal-reference': ocorrencia literal do tokenRef fora de var()
 *    (ex.: referencia em config, comentario, classe arbitrary `bg-[var(--x)]`
 *    tambem casa aqui via o var() interno — dedupe por linha).
 *
 * Limitacoes declaradas (em `notes`, nunca escondidas — 09§36):
 *  - classes utilitarias Tailwind DERIVADAS do token (ex.: `bg-primary` de
 *    `--color-primary`) NAO sao contadas estaticamente (inferencia de classe
 *    seria heuristica demais para apresentar como fato);
 *  - computed value != source (09§77): o impacto em cascata final so e
 *    verificavel em browser (Responsive Lab).
 */

import { createNodeDetectionContext, findFiles, parseCssDeclarations } from '@nexo/adapters';

import type { ImpactEntry, ImpactReport } from './types.js';

const TEXT_EXTENSIONS =
  /\.(tsx?|jsx?|mts|cts|mjs|cjs|css|scss|less|html?|vue|svelte|astro|mdx?)$/;

const PAGE_DIRS = /(^|\/)(pages|routes|app)\//;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncateContext(line: string): string {
  const t = line.trim();
  return t.length > 200 ? `${t.slice(0, 197)}...` : t;
}

/**
 * Constroi o ImpactReport de um token/variavel ANTES da mutacao (09§78:
 * "a user should know when an apparently local edit has global impact").
 */
export async function buildTokenImpactReport(
  rootAbs: string,
  tokenRef: string,
  tokenSource: { file: string; line: number },
): Promise<ImpactReport> {
  const notes: string[] = [];
  const entries: ImpactEntry[] = [];
  const affectedTokens = new Set<string>();

  const isCssVar = tokenRef.startsWith('--');
  const varUsageRe = isCssVar ? new RegExp(`var\\(\\s*${escapeRegExp(tokenRef)}\\s*\\)`) : null;
  const literalRe = new RegExp(escapeRegExp(tokenRef));

  const ctx = createNodeDetectionContext(rootAbs);
  const files = await findFiles(ctx, (rel) => TEXT_EXTENSIONS.test(rel), {
    maxDepth: 10,
    ignoreDirs: ['node_modules', '.git', 'dist'],
    maxResults: 2000,
  });
  files.sort();
  let scannedFiles = 0;

  for (const rel of files) {
    const content = await ctx.readFile(rel);
    if (content === null) continue;
    if (!literalRe.test(content)) continue;
    scannedFiles += 1;

    const coveredLines = new Set<number>();
    const lines = content.split('\n');

    if (varUsageRe !== null) {
      // definicoes de OUTRAS variaveis que referenciam o alvo (cadeia de tokens)
      if (rel.endsWith('.css')) {
        for (const d of parseCssDeclarations(content)) {
          if (
            d.property.startsWith('--') &&
            d.property !== tokenRef &&
            varUsageRe.test(d.value)
          ) {
            affectedTokens.add(d.property);
            coveredLines.add(d.line);
            entries.push({
              file: rel,
              line: d.line,
              context: truncateContext(lines[d.line - 1] ?? ''),
              kind: 'css-var-definition',
            });
          }
        }
      }
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (varUsageRe.test(line) && !coveredLines.has(i + 1)) {
          const isOwnDefinition =
            rel === tokenSource.file &&
            i + 1 === tokenSource.line;
          coveredLines.add(i + 1);
          entries.push({
            file: rel,
            line: i + 1,
            context: truncateContext(line),
            kind: isOwnDefinition ? 'css-var-definition' : 'css-var-usage',
          });
        }
      }
    }
    // ocorrencias literais restantes (config, comentarios, classes arbitrary)
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      if (literalRe.test(line) && !coveredLines.has(i + 1)) {
        coveredLines.add(i + 1);
        entries.push({
          file: rel,
          line: i + 1,
          context: truncateContext(line),
          kind: 'literal-reference',
        });
      }
    }
  }

  if (isCssVar) {
    notes.push(
      'Classes utilitarias derivadas do token (ex.: bg-primary de --color-primary) nao sao contadas estaticamente; o impacto listado cobre var() e referencias literais.',
    );
  }
  notes.push(
    'Cascade awareness (09§76-77): o valor COMPUTADO final depende de cascata/media queries; este relatorio cobre o source, nao o render.',
  );
  return finalizeReport(tokenRef, entries, scannedFiles, notes, [...affectedTokens].sort());
}

/**
 * Impact report de uma CLASSE compartilhada (09§78: "'.button → 17 usages'").
 * Conta ocorrencias literais da classe (word-boundary) em arquivos texto do
 * projeto; usada por design.update antes de mutar utility/props que outras
 * instancias tambem podem carregar.
 */
export async function buildClassImpactReport(
  rootAbs: string,
  className: string,
  excludeFile?: string,
): Promise<ImpactReport> {
  const classRe = new RegExp(`(^|[\\s"'{])${escapeRegExp(className)}(?=$|[\\s"'})])`);
  const ctx = createNodeDetectionContext(rootAbs);
  const files = await findFiles(ctx, (rel) => TEXT_EXTENSIONS.test(rel), {
    maxDepth: 10,
    ignoreDirs: ['node_modules', '.git', 'dist'],
    maxResults: 2000,
  });
  files.sort();
  let scannedFiles = 0;
  const entries: ImpactEntry[] = [];
  for (const rel of files) {
    const content = await ctx.readFile(rel);
    if (content === null || !content.includes(className)) continue;
    scannedFiles += 1;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      if (!line.includes(className) || !classRe.test(line)) continue;
      entries.push({
        file: rel,
        line: i + 1,
        context: truncateContext(line),
        kind: 'literal-reference',
      });
    }
  }
  const filtered = excludeFile === undefined ? entries : entries.filter((e) => e.file !== excludeFile);
  filtered.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  return finalizeReport(className, filtered, scannedFiles, [
    `A classe '${className}' e compartilhada: usos listados sao OUTROS pontos do source que carregam a mesma classe (a instancia editada fica em ${excludeFile ?? 'arquivo alvo'}).`,
    'Cascade awareness (09§76-77): o efeito visual final depende de cascata/media queries; este relatorio cobre o source, nao o render.',
  ]);
}

function finalizeReport(
  target: string,
  entries: ImpactEntry[],
  scannedFiles: number,
  notes: string[],
  affectedTokens: string[] = [],
): ImpactReport {
  entries.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));

  const affectedFiles = [...new Set(entries.map((e) => e.file))];
  const codeFiles = entries.filter((e) => /\.(tsx?|jsx?)$/.test(e.file));
  const affectedPages = [...new Set(codeFiles.filter((e) => PAGE_DIRS.test(e.file)).map((e) => e.file))];
  const affectedComponents = [
    ...new Set(codeFiles.filter((e) => !PAGE_DIRS.test(e.file)).map((e) => e.file)),
  ];

  return {
    target,
    usagesCount: entries.length,
    scannedFiles,
    affectedFiles,
    affectedComponents,
    affectedPages,
    affectedTokens,
    affectedInstances: codeFiles.length,
    entries,
    notes,
  };
}
