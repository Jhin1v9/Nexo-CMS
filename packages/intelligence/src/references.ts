/**
 * Busca de referencias de asset (M3-CONTRACTS §2; doc 08§48/§51 —
 * media.replace/delete dependem de referencias REAIS, nunca inventadas).
 *
 * Varre arquivos de TEXTO do projeto (ignore: node_modules, .git, dist —
 * configuravel), read-only (discovery nunca muta).
 *
 * Regras de confidence (documentadas, deterministicas):
 *  - EXACT: import/export statement cujo module specifier contem o nome do
 *    asset (em .ts/.tsx/.js/.jsx via AST do TS compiler), incluindo
 *    `require('...asset')` (module reference estatica).
 *  - HIGH_CONFIDENCE: string literal em atributo JSX `src`/`href`, ou (em
 *    arquivos nao-TS: .html/.css/.md/...) ocorrencia em `src="..."`,
 *    `href="..."` ou `url(...)` na mesma linha.
 *  - PARTIAL: qualquer outra ocorrencia do nome (string literal generica,
 *    comentario, template string, texto solto) — evidencia fraca, marcada.
 *
 * Sem referencias => lista vazia (NAO e "Unused": 08§50 — Unknown nunca vira
 * Unused; quem decide uso e o consumidor, com esta evidencia).
 */

import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createNodeDetectionContext, findFiles } from '@nexo/adapters';
import type { Result } from '@nexo/shared';
import { err, nexoError, ok } from '@nexo/shared';
import ts from 'typescript';

export type ReferenceConfidence = 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL';

export interface AssetReference {
  /** Path relativo ao rootPath. */
  file: string;
  /** Linha 1-based. */
  line: number;
  /** Linha de origem (trim, truncada em 200 chars) com a ocorrencia. */
  context: string;
  confidence: ReferenceConfidence;
}

export interface AssetReferencesResult {
  assetFileName: string;
  references: AssetReference[];
  /** Quantidade de arquivos de texto efetivamente varridos (evidencia de cobertura). */
  scannedFiles: number;
  /** Diretorios ignorados na varredura (transparencia de cobertura). */
  ignoredDirs: string[];
}

export interface FindAssetReferencesRequest {
  /** Path absoluto do Project Root. */
  rootPath: string;
  /** Nome do arquivo do asset (ex.: 'logo.svg'). Termo de busca literal. */
  assetFileName: string;
  /** Default: ['node_modules', '.git', 'dist']. */
  ignoreDirs?: string[];
}

const CODE_EXTENSIONS = /\.(tsx?|jsx?|mts|cts|mjs|cjs)$/;
const TEXT_EXTENSIONS =
  /\.(tsx?|jsx?|mts|cts|mjs|cjs|css|scss|less|html?|json|jsonc|mdx?|vue|svelte|astro|svg|txt|ya?ml)$/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncateContext(line: string): string {
  const t = line.trim();
  return t.length > 200 ? `${t.slice(0, 197)}...` : t;
}

function lineOf(sf: ts.SourceFile, pos: number): number {
  return ts.getLineAndCharacterOfPosition(sf, pos).line + 1;
}

function contextLine(content: string, line1: number): string {
  const lines = content.split('\n');
  return truncateContext(lines[line1 - 1] ?? '');
}

interface CodeHit {
  /** Linha 1-based. */
  line: number;
  /** Offset no conteudo (dedupe interno). */
  pos: number;
  confidence: ReferenceConfidence;
}

/** Ocorrencias em codigo TS/JS via AST (import/require = EXACT; src/href JSX
 *  = HIGH_CONFIDENCE; demais strings = PARTIAL). */
function scanCodeAst(rel: string, content: string, name: string): CodeHit[] {
  const kind = rel.endsWith('.jsx') || rel.endsWith('.js') || rel.endsWith('.mjs') || rel.endsWith('.cjs')
    ? ts.ScriptKind.JSX
    : ts.ScriptKind.TSX;
  const sf = ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true, kind);
  const hits: CodeHit[] = [];

  const push = (pos: number, confidence: ReferenceConfidence): void => {
    hits.push({ line: lineOf(sf, pos), pos, confidence });
  };

  const visit = (node: ts.Node): void => {
    // import ... from '...asset' / export ... from '...asset' / import '...asset'
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.includes(name)
    ) {
      push(node.moduleSpecifier.getStart(sf), 'EXACT');
    }
    // require('...asset')
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length > 0
    ) {
      const arg = node.arguments[0];
      if (arg !== undefined && ts.isStringLiteral(arg) && arg.text.includes(name)) {
        push(arg.getStart(sf), 'EXACT');
      }
    }
    // <img src="...asset" /> / <a href={"...asset"} />
    if (ts.isJsxAttribute(node) && (node.name.getText(sf) === 'src' || node.name.getText(sf) === 'href')) {
      const init = node.initializer;
      if (init !== undefined && ts.isStringLiteral(init) && init.text.includes(name)) {
        push(init.getStart(sf), 'HIGH_CONFIDENCE');
      }
    }
    // demais string literals contendo o nome => PARTIAL
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      node.text.includes(name)
    ) {
      const pos = node.getStart(sf);
      if (!hits.some((h) => h.pos === pos)) {
        push(pos, 'PARTIAL');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

export async function findAssetReferences(
  req: FindAssetReferencesRequest,
): Promise<Result<AssetReferencesResult>> {
  if (typeof req.rootPath !== 'string' || req.rootPath.trim() === '') {
    return err(nexoError('INVALID_INPUT', 'rootPath deve ser string nao vazia', { retryable: false }));
  }
  if (typeof req.assetFileName !== 'string' || req.assetFileName.trim() === '') {
    return err(
      nexoError('INVALID_INPUT', 'assetFileName deve ser string nao vazia', { retryable: false }),
    );
  }
  const name = req.assetFileName.trim();
  const root = resolve(req.rootPath);
  try {
    const st = await stat(root);
    if (!st.isDirectory()) throw new Error('not-dir');
  } catch {
    return err(nexoError('NOT_FOUND', `diretorio nao encontrado: ${root}`, { resource: root, retryable: false }));
  }

  const ignoredDirs = req.ignoreDirs ?? ['node_modules', '.git', 'dist'];
  const ctx = createNodeDetectionContext(root);
  const files = await findFiles(
    ctx,
    (rel) => TEXT_EXTENSIONS.test(rel),
    { maxDepth: 10, ignoreDirs: ignoredDirs, maxResults: 2000 },
  );
  files.sort();

  const references: AssetReference[] = [];
  let scannedFiles = 0;
  // ocorrencia em src/href/url() em arquivos nao-codigo (linha inteira)
  const attrRe = new RegExp(
    `(?:src|href)\\s*=\\s*["'][^"']*${escapeRegExp(name)}|url\\(\\s*['"]?[^)]*${escapeRegExp(name)}`,
    'i',
  );

  for (const rel of files) {
    const content = await ctx.readFile(rel);
    if (content === null) continue;
    if (!content.includes(name)) continue; // fast-path: sem ocorrencia literal
    scannedFiles += 1;

    const coveredLines = new Set<number>();
    if (CODE_EXTENSIONS.test(rel)) {
      for (const hit of scanCodeAst(rel, content, name)) {
        coveredLines.add(hit.line);
        references.push({
          file: rel,
          line: hit.line,
          context: contextLine(content, hit.line),
          confidence: hit.confidence,
        });
      }
    } else {
      // arquivo texto nao-codigo: src=/href=/url() => HIGH_CONFIDENCE
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (line.includes(name) && attrRe.test(line)) {
          coveredLines.add(i + 1);
          references.push({
            file: rel,
            line: i + 1,
            context: truncateContext(line),
            confidence: 'HIGH_CONFIDENCE',
          });
        }
      }
    }

    // ocorrencia generica (qualquer linha restante com o nome) => PARTIAL
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      if (line.includes(name) && !coveredLines.has(i + 1)) {
        references.push({
          file: rel,
          line: i + 1,
          context: truncateContext(line),
          confidence: 'PARTIAL',
        });
      }
    }
  }

  // ordenacao por codigo ASCII (deterministica, igual ao sort() padrao de strings)
  references.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  return ok({ assetFileName: name, references, scannedFiles, ignoredDirs: [...ignoredDirs] });
}
