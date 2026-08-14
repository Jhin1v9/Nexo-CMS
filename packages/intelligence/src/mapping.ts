/**
 * Source Mapping (M3-CONTRACTS §5; doc 07§13-15) — componente/arquivo ->
 * file:line:column com confidence EXACT|HIGH_CONFIDENCE|PARTIAL|UNKNOWN.
 *
 * Implementacao: scan AST (TypeScript compiler API) de .tsx/.jsx do projeto.
 * Read-only: NUNCA escreve no projeto (discovery nunca muta).
 *
 * Regras de confidence (documentadas, deterministicas):
 *  - EXACT: exatamente UM componente EXPORTADO com o nome pedido encontrado
 *    (named export de declaracao: `export function X`, `export const X =`,
 *    `export class X`, ou `export { X }` resolvido a declaracao local;
 *    `export default function X` / `export default X` tambem conta).
 *  - PARTIAL (ambiguidade de exports): mais de um arquivo exporta o nome —
 *    retorna o primeiro candidato (ordem alfabetica) e lista TODOS em
 *    evidence; nunca apresenta como EXACT (07§12).
 *  - HIGH_CONFIDENCE: sem export com esse nome, mas ha USO JSX `<Name ...>`
 *    (localizacao do uso, nao da definicao — declarado em evidence).
 *  - PARTIAL (heuristico): fallback por nome de arquivo (basename sem
 *    extensao === componentName, ex.: src/Button.tsx) — linha 1:1 marcada.
 *  - UNKNOWN: nenhum sinal; file/line/column/exportName null. NUNCA inventar.
 *
 * Com `filePath` (sem componentName): resolve o componente exportado DAQUELE
 * arquivo (EXACT); arquivo sem componente identificavel => PARTIAL em 1:1;
 * arquivo inexistente => err(NOT_FOUND).
 */

import { stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { createNodeDetectionContext, findFiles } from '@nexo/adapters';
import type { Result } from '@nexo/shared';
import { err, nexoError, ok } from '@nexo/shared';
import ts from 'typescript';

export type MappingConfidence = 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN';

export interface SourceMapping {
  /** Path relativo ao rootPath (null quando UNKNOWN). */
  file: string | null;
  /** 1-based (null quando UNKNOWN). */
  line: number | null;
  column: number | null;
  /** Nome do export encontrado ('default' para export default), null se nao resolvido. */
  exportName: string | null;
  confidence: MappingConfidence;
  evidence: string[];
}

export interface SourceMappingRequest {
  /** Path absoluto do Project Root. */
  rootPath: string;
  /** Nome do componente (ex.: 'Button'). Pelo menos um de componentName/filePath. */
  componentName?: string;
  /** Path relativo ao root; restringe a busca a este arquivo. */
  filePath?: string;
}

interface Candidate {
  file: string;
  pos: number;
  sf: ts.SourceFile;
  exportName: string;
}

interface Usage {
  file: string;
  pos: number;
  sf: ts.SourceFile;
}

function parseSource(rel: string, content: string): ts.SourceFile {
  const kind = rel.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  return ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true, kind);
}

function isComponentLikeName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

/** Coleta exports de componente com nome `wanted` no source file. */
function collectExports(sf: ts.SourceFile, rel: string, wanted: string, out: Candidate[]): void {
  const localDecls = new Map<string, ts.Node>();
  const visit = (node: ts.Node): void => {
    // export function X / export const X = / export class X
    const isExported =
      ts.canHaveModifiers(node) &&
      (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (
      isExported &&
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name !== undefined
    ) {
      const isDefault =
        ts.canHaveModifiers(node) &&
        (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      if (node.name.text === wanted) {
        out.push({
          file: rel,
          pos: node.name.getStart(sf),
          sf,
          exportName: isDefault ? 'default' : node.name.text,
        });
      }
      localDecls.set(node.name.text, node.name);
    }
    if (isExported && ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          if (decl.name.text === wanted) {
            out.push({ file: rel, pos: decl.name.getStart(sf), sf, exportName: decl.name.text });
          }
          localDecls.set(decl.name.text, decl.name);
        }
      }
    }
    // export { X } / export { X as Y } — resolve a declaracao local
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier === undefined &&
      node.exportClause !== undefined &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const el of node.exportClause.elements) {
        const exported = el.name.text;
        const local = el.propertyName?.text ?? el.name.text;
        if (exported === wanted) {
          const localNode = localDecls.get(local);
          if (localNode !== undefined) {
            out.push({ file: rel, pos: localNode.getStart(sf), sf, exportName: exported });
          } else {
            // re-export local sem declaracao conhecida neste arquivo ainda
            // (declaracoes sao coletadas em ordem; fallback: posicao do specifier)
            out.push({ file: rel, pos: el.name.getStart(sf), sf, exportName: exported });
          }
        }
      }
    }
    // export default function X / export default X (identificador local)
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const e = node.expression;
      if (ts.isIdentifier(e) && e.text === wanted) {
        out.push({ file: rel, pos: e.getStart(sf), sf, exportName: 'default' });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/** Coleta usos JSX `<wanted ...>` (inclui self-closing). */
function collectUsages(sf: ts.SourceFile, rel: string, wanted: string, out: Usage[]): void {
  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sf) === wanted) {
      out.push({ file: rel, pos: node.openingElement.tagName.getStart(sf), sf });
    } else if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sf) === wanted) {
      out.push({ file: rel, pos: node.tagName.getStart(sf), sf });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/** Primeiro export "component-like" do arquivo (para filePath sem nome). */
function findExportedComponent(sf: ts.SourceFile, rel: string): Candidate | null {
  const out: Candidate[] = [];
  const visit = (node: ts.Node): void => {
    if (out.length > 0) return;
    const mods = ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : [];
    const isExported = mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    if (
      isExported &&
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name !== undefined &&
      isComponentLikeName(node.name.text)
    ) {
      out.push({
        file: rel,
        pos: node.name.getStart(sf),
        sf,
        exportName: isDefault ? 'default' : node.name.text,
      });
      return;
    }
    if (isExported && ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && isComponentLikeName(decl.name.text)) {
          out.push({ file: rel, pos: decl.name.getStart(sf), sf, exportName: decl.name.text });
          return;
        }
      }
    }
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      out.push({ file: rel, pos: node.expression.getStart(sf), sf, exportName: 'default' });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out[0] ?? null;
}

function toMapping(
  confidence: MappingConfidence,
  c: { file: string; pos: number; sf: ts.SourceFile; exportName: string | null },
  evidence: string[],
): SourceMapping {
  const lc = ts.getLineAndCharacterOfPosition(c.sf, c.pos);
  return {
    file: c.file,
    line: lc.line + 1,
    column: lc.character + 1,
    exportName: c.exportName,
    confidence,
    evidence,
  };
}

const UNKNOWN_MAPPING: SourceMapping = {
  file: null,
  line: null,
  column: null,
  exportName: null,
  confidence: 'UNKNOWN',
  evidence: [],
};

export async function mapComponentSource(
  req: SourceMappingRequest,
): Promise<Result<SourceMapping>> {
  if (typeof req.rootPath !== 'string' || req.rootPath.trim() === '') {
    return err(nexoError('INVALID_INPUT', 'rootPath deve ser string nao vazia', { retryable: false }));
  }
  const hasName = req.componentName !== undefined && req.componentName.trim() !== '';
  const hasFile = req.filePath !== undefined && req.filePath.trim() !== '';
  if (!hasName && !hasFile) {
    return err(
      nexoError('INVALID_INPUT', 'componentName ou filePath e obrigatorio (nao adivinhamos alvo)', {
        retryable: false,
      }),
    );
  }
  const root = resolve(req.rootPath);
  try {
    const st = await stat(root);
    if (!st.isDirectory()) throw new Error('not-dir');
  } catch {
    return err(nexoError('NOT_FOUND', `diretorio nao encontrado: ${root}`, { resource: root, retryable: false }));
  }

  const ctx = createNodeDetectionContext(root);

  // -- modo filePath (sem componentName): componente exportado daquele arquivo
  if (!hasName && hasFile) {
    const rel = req.filePath ?? '';
    const content = await ctx.readFile(rel);
    if (content === null) {
      return err(nexoError('NOT_FOUND', `arquivo nao encontrado: ${rel}`, { resource: rel, retryable: false }));
    }
    const sf = parseSource(rel, content);
    const found = findExportedComponent(sf, rel);
    if (found !== null) {
      return ok(
        toMapping('EXACT', found, [`file:${rel}`, `export:${found.exportName ?? 'default'}`]),
      );
    }
    return ok({
      ...UNKNOWN_MAPPING,
      file: rel,
      line: 1,
      column: 1,
      confidence: 'PARTIAL',
      evidence: [`file:${rel} existe, mas nenhum componente exportado identificavel (heuristico)`],
    });
  }

  const wanted = (req.componentName ?? '').trim();

  // -- coleta de sinais AST em .tsx/.jsx (restrito a filePath se informado)
  let files: string[];
  if (hasFile) {
    files = (await ctx.exists(req.filePath ?? '')) ? [req.filePath ?? ''] : [];
    if (files.length === 0) {
      return err(
        nexoError('NOT_FOUND', `arquivo nao encontrado: ${req.filePath ?? ''}`, {
          resource: req.filePath,
          retryable: false,
        }),
      );
    }
  } else {
    files = await findFiles(
      ctx,
      (rel) => /\.(tsx|jsx)$/.test(rel),
      { maxDepth: 10, ignoreDirs: ['node_modules', '.git', 'dist'], maxResults: 500 },
    );
    files.sort();
  }

  const exports_: Candidate[] = [];
  const usages: Usage[] = [];
  for (const rel of files) {
    const content = await ctx.readFile(rel);
    if (content === null) continue;
    const sf = parseSource(rel, content);
    collectExports(sf, rel, wanted, exports_);
    collectUsages(sf, rel, wanted, usages);
  }

  if (exports_.length === 1) {
    const only = exports_[0];
    if (only === undefined) {
      return ok({ ...UNKNOWN_MAPPING, evidence: ['internal: empty candidate'] });
    }
    return ok(
      toMapping('EXACT', only, [
        `file:${only.file}`,
        `export:${only.exportName}`,
        'named export encontrado via AST (unico no escopo)',
      ]),
    );
  }
  if (exports_.length > 1) {
    const sorted = [...exports_].sort((a, b) => a.file.localeCompare(b.file));
    const first = sorted[0];
    if (first === undefined) {
      return ok({ ...UNKNOWN_MAPPING, evidence: ['internal: empty candidate'] });
    }
    return ok(
      toMapping('PARTIAL', first, [
        `multiplos arquivos exportam '${wanted}' (ambiguo — NAO e EXACT):`,
        ...sorted.map((c) => `file:${c.file} export:${c.exportName}`),
      ]),
    );
  }
  if (usages.length > 0) {
    const first = usages[0];
    if (first === undefined) {
      return ok({ ...UNKNOWN_MAPPING, evidence: ['internal: empty usage'] });
    }
    return ok(
      toMapping('HIGH_CONFIDENCE', { ...first, exportName: null }, [
        `sem export nomeado '${wanted}' no escopo; localizacao aponta USO JSX`,
        `usos: ${usages.length}`,
        ...usages.slice(0, 5).map((u) => `file:${u.file}`),
      ]),
    );
  }

  // -- fallback heuristico: basename do arquivo === componentName
  const byName = files.find((rel) => basename(rel).replace(/\.(tsx|jsx)$/, '') === wanted);
  if (byName !== undefined) {
    return ok({
      ...UNKNOWN_MAPPING,
      file: byName,
      line: 1,
      column: 1,
      confidence: 'PARTIAL',
      evidence: [
        `heuristico por nome de arquivo: ${byName} (sem export/uso AST confirmado)`,
      ],
    });
  }

  return ok({
    ...UNKNOWN_MAPPING,
    evidence: [`nenhum export, uso JSX ou arquivo com basename '${wanted}' no escopo varrido`],
  });
}
