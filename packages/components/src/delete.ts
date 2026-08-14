/**
 * Component Deletion (doc 08§23): ANTES de deletar, inspecionar References,
 * Routes, Pages, Other Components, Assets, Exports, Tests. Referencias ativas
 * => impacto reportado e delete BLOQUEADO ate confirm:true (padrao 08§51 de
 * media; requiresApproval). SEM cascata automatica: deletar com confirm
 * reporta as referencias quebradas, nunca remove nada alem do proprio
 * componente.
 *
 * Scan de referencias (AST, sem regex semantico):
 *  - EXACT: import/export-from/require cujo module specifier RESOLVE para o
 *    arquivo do componente (resolucao relativa real, ext-agnostic; alias
 *    '@/...' -> 'src/...' quando aplicavel).
 *  - HIGH_CONFIDENCE: uso JSX `<Name>` em arquivo que IMPORTA o componente.
 *  - PARTIAL: uso JSX `<Name>` sem import correspondente, ou ocorrencia de
 *    texto fora de codigo — suspeito, NUNCA bloqueia sozinho (reportado).
 * Scan incompleto (arquivos ilegiveis/truncado) => bloqueado: Unknown nunca
 * e tratado como "sem referencias" (M3 §8.8).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { createNodeDetectionContext, findFiles, type DetectionContext } from '@nexo/adapters';
import { err, ok, type Result } from '@nexo/shared';
import ts from 'typescript';

import { detectComponentDirs } from './detect.js';
import { componentError } from './errors.js';
import { guardPath, type ProjectFs } from './project-fs.js';
import type { ComponentRegistry } from './registry.js';
import type { ComponentSchema } from './types.js';

export interface ImpactReference {
  file: string;
  line: number;
  kind: 'import' | 'jsx-usage' | 're-export' | 'text';
  confidence: 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL';
  /** Linha de origem (trim, truncada em 200 chars). */
  context: string;
}

/** Impacto classificado (08§23: References/Routes/Pages/Components/Assets/Exports/Tests). */
export interface ComponentImpact {
  references: ImpactReference[];
  routes: string[];
  pages: string[];
  otherComponents: string[];
  exports: string[];
  tests: string[];
  /** Assets usados PELO componente (potenciais orfaos — reportados, NUNCA deletados). */
  assets: string[];
  scannedFiles: number;
  skippedFiles: number;
  /** false => impacto Unknown — delete bloqueado (nunca tratar como orfao). */
  complete: boolean;
}

export interface DeleteComponentInput {
  componentId: string;
  /** Exigido quando ha referencias ativas (EXACT/HIGH_CONFIDENCE). */
  confirm?: boolean;
}

export interface DeleteComponentOutcome {
  componentId: string;
  deletedFiles: string[];
  removedFromRegistry: boolean;
  impact: ComponentImpact;
  /** Referencias ativas que ficaram quebradas (somente com confirm:true). */
  brokenReferences: ImpactReference[];
  verified: boolean;
}

export interface DeleteDeps {
  fsCtx: ProjectFs;
  registry: ComponentRegistry;
  projectId: string;
}

const CODE_EXTENSIONS = /\.(tsx?|jsx?|mts|cts|mjs|cjs)$/;
const TEXT_EXTENSIONS = /\.(tsx?|jsx?|mts|cts|mjs|cjs|css|scss|less|html?|json|mdx?)$/;
const MAX_RESULTS = 5000;

function truncateContext(line: string): string {
  const t = line.trim();
  return t.length > 200 ? `${t.slice(0, 197)}...` : t;
}

function sourcePathsOf(schema: ComponentSchema): string[] {
  const source = schema.identity.source;
  switch (source.kind) {
    case 'ProjectFile':
      return [source.path];
    case 'MultipleProjectFiles':
      return [...source.paths];
    case 'GeneratedSource':
      return [source.path];
    default:
      return [];
  }
}

/** Normaliza um module specifier para path relativo ao root (sem extensao). */
function resolveSpecifier(importerRel: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) {
    base = `src/${spec.slice(2)}`;
  } else if (spec.startsWith('.')) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(importerRel), spec));
  } else {
    return null; // bare package: nunca resolve para arquivo do projeto
  }
  return base.replace(/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/, '');
}

interface CodeScanHit {
  line: number;
  kind: ImpactReference['kind'];
  confidence: ImpactReference['confidence'];
}

/** Scan AST de UM arquivo de codigo procurando referencias ao componente. */
function scanCodeFile(
  rel: string,
  content: string,
  componentName: string,
  componentPathsNoExt: ReadonlySet<string>,
): CodeScanHit[] {
  const kind = /\.(jsx?|mjs|cjs)$/.test(rel) ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const sf = ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true, kind);
  const hits: CodeScanHit[] = [];
  const lineOf = (pos: number): number => ts.getLineAndCharacterOfPosition(sf, pos).line + 1;
  let importsComponent = false;

  const specMatches = (spec: string): boolean => {
    const resolved = resolveSpecifier(rel, spec);
    return resolved !== null && componentPathsNoExt.has(resolved);
  };

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      specMatches(node.moduleSpecifier.text)
    ) {
      importsComponent = true;
      hits.push({
        line: lineOf(node.moduleSpecifier.getStart(sf)),
        kind: ts.isExportDeclaration(node) ? 're-export' : 'import',
        confidence: 'EXACT',
      });
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0]) &&
      specMatches(node.arguments[0].text)
    ) {
      importsComponent = true;
      hits.push({ line: lineOf(node.arguments[0].getStart(sf)), kind: 'import', confidence: 'EXACT' });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // usos JSX <Name ...> — confidence depende de import real no mesmo arquivo
  const visitJsx = (node: ts.Node): void => {
    let tag: string | null = null;
    let pos = 0;
    if (ts.isJsxElement(node)) {
      tag = node.openingElement.tagName.getText(sf);
      pos = node.openingElement.tagName.getStart(sf);
    } else if (ts.isJsxSelfClosingElement(node)) {
      tag = node.tagName.getText(sf);
      pos = node.tagName.getStart(sf);
    }
    if (tag === componentName) {
      hits.push({
        line: lineOf(pos),
        kind: 'jsx-usage',
        confidence: importsComponent ? 'HIGH_CONFIDENCE' : 'PARTIAL',
      });
    }
    ts.forEachChild(node, visitJsx);
  };
  visitJsx(sf);
  return hits;
}

/** Classifica o arquivo referenciador nos buckets de impacto (08§23). */
function classifyReferencingFile(rel: string, kinds: ReadonlySet<ImpactReference['kind']>, componentDirs: readonly string[]): keyof Pick<ComponentImpact, 'tests' | 'pages' | 'routes' | 'exports' | 'otherComponents'> | null {
  if (/\.(test|spec)\.[tj]sx?$/.test(rel) || rel.includes('__tests__/')) return 'tests';
  if (rel.startsWith('pages/') || rel.startsWith('src/pages/')) return 'pages';
  if (
    rel.startsWith('routes/') ||
    rel.startsWith('src/routes/') ||
    rel.startsWith('app/') ||
    rel.startsWith('src/app/')
  ) {
    return 'routes';
  }
  if (/(^|\/)index\.[tj]sx?$/.test(rel) && (kinds.has('re-export') || kinds.has('import'))) {
    return 'exports';
  }
  if (componentDirs.some((d) => rel === d || rel.startsWith(`${d}/`))) return 'otherComponents';
  return null;
}

/** Impact analysis publico (08§23) — usado por delete e disponivel p/ auditoria. */
export async function analyzeComponentImpact(
  fsCtx: ProjectFs,
  schema: ComponentSchema,
  componentDirs?: readonly string[],
): Promise<Result<ComponentImpact>> {
  const ctx: DetectionContext = createNodeDetectionContext(fsCtx.rootAbs);
  const dirs = componentDirs !== undefined ? [...componentDirs] : await detectComponentDirs(fsCtx.rootAbs);
  const ownFiles = new Set(sourcePathsOf(schema));
  const componentPathsNoExt = new Set(
    [...ownFiles].map((p) => p.replace(/\.(tsx?|jsx?)$/, '')),
  );
  const name = schema.identity.name;

  const files = await findFiles(
    ctx,
    (rel) => TEXT_EXTENSIONS.test(rel) && !ownFiles.has(rel),
    { maxDepth: 10, ignoreDirs: ['node_modules', '.git', 'dist'], maxResults: MAX_RESULTS },
  );
  files.sort();

  const references: ImpactReference[] = [];
  let scannedFiles = 0;
  let skippedFiles = files.length >= MAX_RESULTS ? 1 : 0;
  for (const rel of files) {
    const content = await ctx.readFile(rel);
    if (content === null) {
      skippedFiles += 1;
      continue;
    }
    scannedFiles += 1;
    if (CODE_EXTENSIONS.test(rel)) {
      // fast-path textual: sem nome e sem stem de path, nao ha referencia
      const stems = [...componentPathsNoExt].map((p) => p.split('/').pop() ?? '');
      if (!content.includes(name) && !stems.some((s) => s !== '' && content.includes(s))) continue;
      for (const hit of scanCodeFile(rel, content, name, componentPathsNoExt)) {
        references.push({
          file: rel,
          line: hit.line,
          kind: hit.kind,
          confidence: hit.confidence,
          context: truncateContext(content.split('\n')[hit.line - 1] ?? ''),
        });
      }
    } else if (content.includes(name)) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        if ((lines[i] ?? '').includes(name)) {
          references.push({
            file: rel,
            line: i + 1,
            kind: 'text',
            confidence: 'PARTIAL',
            context: truncateContext(lines[i] ?? ''),
          });
        }
      }
    }
  }

  const impact: ComponentImpact = {
    references,
    routes: [],
    pages: [],
    otherComponents: [],
    exports: [],
    tests: [],
    assets: [...schema.assets].sort(),
    scannedFiles,
    skippedFiles,
    complete: skippedFiles === 0,
  };
  const byFile = new Map<string, Set<ImpactReference['kind']>>();
  for (const ref of references) {
    const kinds = byFile.get(ref.file) ?? new Set();
    kinds.add(ref.kind);
    byFile.set(ref.file, kinds);
  }
  for (const [file, kinds] of [...byFile.entries()].sort()) {
    const bucket = classifyReferencingFile(file, kinds, dirs);
    if (bucket !== null && !impact[bucket].includes(file)) impact[bucket].push(file);
  }
  return ok(impact);
}

export async function deleteComponent(
  deps: DeleteDeps,
  input: DeleteComponentInput,
): Promise<Result<DeleteComponentOutcome>> {
  const registered = deps.registry.getById(input.componentId);
  if (
    registered === null ||
    (registered.projectId !== null && registered.projectId !== deps.projectId)
  ) {
    return err(
      componentError('ComponentNotFound', `Componente nao encontrado: '${input.componentId}'`, {
        resource: input.componentId,
      }),
    );
  }
  const schema = registered.schema;

  // Library Component: remocao do registry apenas — NUNCA toca projetos
  // (08§69: remover da library nao remove copias instaladas).
  if (schema.identity.scope === 'Library') {
    const removed = deps.registry.remove(schema.identity.id);
    return ok({
      componentId: schema.identity.id,
      deletedFiles: [],
      removedFromRegistry: removed,
      impact: {
        references: [], routes: [], pages: [], otherComponents: [], exports: [], tests: [],
        assets: [...schema.assets].sort(), scannedFiles: 0, skippedFiles: 0, complete: true,
      },
      brokenReferences: [],
      verified: removed,
    });
  }

  // -- Impact analysis OBRIGATORIA (08§23) ------------------------------------
  const impactResult = await analyzeComponentImpact(deps.fsCtx, schema);
  if (!impactResult.ok) return err(impactResult.error);
  const impact = impactResult.value;

  if (!impact.complete) {
    return err(
      componentError(
        'DeleteBlockedImpactUnknown',
        `Delete bloqueado: scan de impacto incompleto (${impact.skippedFiles} arquivo(s) nao varridos); impacto Unknown nunca e tratado como "sem referencias" (M3 §8.8)`,
        {
          resource: schema.identity.name,
          details: { scannedFiles: impact.scannedFiles, skippedFiles: impact.skippedFiles },
        },
      ),
    );
  }

  const activeRefs = impact.references.filter(
    (r) => r.confidence === 'EXACT' || r.confidence === 'HIGH_CONFIDENCE',
  );
  if (activeRefs.length > 0 && input.confirm !== true) {
    return err(
      componentError(
        'DeleteBlockedByReferences',
        `Delete bloqueado: ${activeRefs.length} referencia(s) ativa(s) a '${schema.identity.name}' (08§23 — sem cascata automatica). Reenvie com confirm:true; as referencias quebradas serao reportadas.`,
        {
          resource: schema.identity.name,
          details: {
            referenceCount: activeRefs.length,
            impact: {
              routes: impact.routes,
              pages: impact.pages,
              otherComponents: impact.otherComponents,
              exports: impact.exports,
              tests: impact.tests,
              assets: impact.assets,
            },
            references: activeRefs.map((r) => ({ file: r.file, line: r.line, kind: r.kind })),
          },
        },
      ),
    );
  }

  // -- Delete real dos arquivos-fonte (sem cascata — 08§23) -------------------
  const deletedFiles: string[] = [];
  for (const rel of sourcePathsOf(schema)) {
    const guarded = await guardPath(deps.fsCtx, rel);
    if (!guarded.ok) return err(guarded.error);
    try {
      await fs.unlink(guarded.value);
    } catch (e) {
      const cause = e as NodeJS.ErrnoException;
      if (cause.code !== 'ENOENT') {
        return err(
          componentError('PersistenceFailed', `Falha ao deletar '${rel}': ${cause.message}`, {
            resource: rel,
          }),
        );
      }
    }
    const stillThere = await fs.stat(guarded.value).then(() => true, () => false);
    if (stillThere) {
      return err(
        componentError('VerificationFailed', `Verificacao pos-delete falhou: '${rel}' ainda existe`, {
          resource: rel,
        }),
      );
    }
    deletedFiles.push(rel);
  }
  const removedFromRegistry = deps.registry.remove(schema.identity.id);
  const stillRegistered = deps.registry.getById(schema.identity.id);
  const verified = removedFromRegistry && stillRegistered === null;

  return ok({
    componentId: schema.identity.id,
    deletedFiles,
    removedFromRegistry,
    impact,
    brokenReferences: input.confirm === true ? activeRefs : [],
    verified,
  });
}
