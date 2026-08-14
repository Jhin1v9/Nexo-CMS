/**
 * Component Publish / Promotion (doc 08§25 — pipeline canonico):
 *   Project Component -> Dependency Analysis -> Compatibility Analysis ->
 *   Remove/Resolve Private References -> Review Metadata -> Version -> Publish.
 * Validacao §74 COMPLETA (Source Integrity, Dependency Resolution, No Secret
 * Leakage, No Private Project References, Schema Validity, Compatibility).
 *
 * Regras duras:
 *  - Global Component NUNCA com dependencia oculta (08§65): imports locais
 *    fora dos diretorios de componentes compartilhados = PRIVATE REFERENCES
 *    (ex.: '../../utils/private') => BLOQUEADO com diagnostico (M3 nao
 *    reescreve o componente para resolver — 08§25 "Remove/Resolve" e acao do
 *    autor; nao resolvivel automaticamente => bloqueia, nunca adivinha).
 *  - No Secret Leakage: scan por padroes de segredo (SECRET_PATTERNS,
 *    documentados abaixo) no source E nas dependencias locais transitivas.
 *  - 'Published' SOMENTE apos todas as verificacoes §74 passarem + escrita
 *    no registry verificada por re-leitura (No Fake Success, M3 §8.4).
 *  - Project Component != Library Component (08§87): publish cria NOVA
 *    identidade no escopo Library (linhagem via metadata.publishedFrom).
 *  - Library e serializavel e nao depende de arquivo do projeto (08§62):
 *    o version record carrega SNAPSHOT do source + hash (08§26).
 *  - Versionamento semver simples (08§26): primeiro publish '1.0.0';
 *    re-publish da mesma linhagem bumpa patch; version explicita deve ser
 *    maior que a ultima; colisao de nome com OUTRA linhagem => CONFLICT
 *    (08§79 duplication prevention). Migration workflows (08§71) = M4+ (D11).
 */

import { createHash } from 'node:crypto';

import type { DetectedTechnology } from '@nexo/adapters';
import { createNodeDetectionContext, type DetectionContext } from '@nexo/adapters';
import { err, ok, type Result } from '@nexo/shared';
import ts from 'typescript';

import { detectComponentDirs } from './detect.js';
import { componentError, type ComponentErrorKind } from './errors.js';
import { guardPath, type ProjectFs } from './project-fs.js';
import type { ComponentRegistry, RegisteredComponent } from './registry.js';
import type {
  CompatibilityResult,
  ComponentDependency,
  ComponentSchema,
  ComponentVersion,
  Portability,
  PublishCheck,
  PublishValidation,
} from './types.js';

export interface PublishInput {
  componentId: string;
  /** semver explicito (maior que a ultima versao da linhagem); default: bump. */
  version?: string;
  /** Descricao das mudancas (08§26 Changes). */
  changes?: string[];
}

export interface PublishOutcome {
  libraryComponentId: string;
  version: string;
  validation: PublishValidation;
  compatibility: CompatibilityResult;
  portability: Portability;
  dependencies: ComponentDependency[];
  status: 'Published';
}

export interface PublishDeps {
  fsCtx: ProjectFs;
  registry: ComponentRegistry;
  projectId: string;
  technologies: readonly DetectedTechnology[];
}

/**
 * Padroes de segredo (08§65/§74 — documentados, determinísticos):
 *  - process.env.VAR / import.meta.env.VAR (env var especifica de projeto);
 *  - AWS access key id (AKIA...); blocos PEM de chave privada;
 *  - chaves estilo OpenAI (sk-...), GitHub PAT (ghp_...), Slack (xox[baprs]-);
 *  - atribuicao de credencial literal (apiKey/secret/token/password = '...'
 *    com 8+ chars).
 */
export const SECRET_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'process.env.<VAR>', re: /\bprocess\.env\.[A-Z_][A-Z0-9_]*/ },
  { name: 'import.meta.env.<VAR>', re: /\bimport\.meta\.env\.[A-Z_][A-Z0-9_]*/ },
  { name: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'private-key-block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'openai-style-key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'github-pat', re: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    name: 'credential-literal',
    re: /(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|secret|password)\s*[:=]\s*['"][^'"]{8,}['"]/i,
  },
];

function pass(detail: string): PublishCheck {
  return { pass: true, detail };
}
function fail(detail: string): PublishCheck {
  return { pass: false, detail };
}

function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function isValidSemver(v: string): boolean {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v);
}

/** Comparacao semver numerica simples (a>b => 1; a<b => -1; igual => 0). */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

function bumpPatch(v: string): string {
  const parts = v.split('.').map(Number);
  return `${parts[0] ?? 0}.${parts[1] ?? 0}.${(parts[2] ?? 0) + 1}`;
}

/** Resolve specifier relativo/alias para arquivo existente (ext-agnostic). */
async function resolveLocalImport(
  ctx: DetectionContext,
  importerRel: string,
  spec: string,
): Promise<string | null> {
  let base: string;
  if (spec.startsWith('@/')) {
    base = `src/${spec.slice(2)}`;
  } else if (spec.startsWith('.')) {
    const importerDir = importerRel.split('/').slice(0, -1).join('/');
    const joined = importerDir === '' ? spec : `${importerDir}/${spec}`;
    // normalizacao POSIX simples (segmentos .. e .)
    const segments: string[] = [];
    for (const seg of joined.split('/')) {
      if (seg === '' || seg === '.') continue;
      if (seg === '..') segments.pop();
      else segments.push(seg);
    }
    base = segments.join('/');
  } else {
    return null;
  }
  const candidates = [
    `${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`,
    `${base}/index.tsx`, `${base}/index.ts`, `${base}/index.jsx`, `${base}/index.js`,
    base,
  ];
  for (const candidate of candidates) {
    if (await ctx.exists(candidate)) return candidate;
  }
  return null;
}

function packageNameOf(spec: string): string {
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split('/')[0] ?? spec;
}

interface DependencyAnalysis {
  dependencies: ComponentDependency[];
  /** Imports locais fora dos diretorios de componentes compartilhados (08§25). */
  privateReferences: Array<{ specifier: string; resolved: string | null }>;
  /** Imports locais que nao resolvem para arquivo existente. */
  unresolved: string[];
  /** Conteudos dos arquivos locais dependentes (transitivo) p/ secret scan. */
  localDepContents: Array<{ file: string; content: string }>;
}

/** Dependency Analysis (08§19/§25): imports do arquivo, transitivo p/ locais. */
async function analyzeDependencies(
  ctx: DetectionContext,
  entryRel: string,
  entryContent: string,
  componentDirs: readonly string[],
  declaredPackages: ReadonlySet<string>,
  registry: ComponentRegistry,
  projectId: string,
): Promise<DependencyAnalysis> {
  const dependencies: ComponentDependency[] = [];
  const privateReferences: DependencyAnalysis['privateReferences'] = [];
  const unresolved: string[] = [];
  const localDepContents: DependencyAnalysis['localDepContents'] = [];
  const visited = new Set<string>([entryRel]);
  const queue: Array<{ rel: string; content: string }> = [{ rel: entryRel, content: entryContent }];
  const seenDeps = new Set<string>();

  const pushDep = (dep: ComponentDependency): void => {
    const key = `${dep.kind}:${dep.name}`;
    if (!seenDeps.has(key)) {
      seenDeps.add(key);
      dependencies.push(dep);
    }
  };

  while (queue.length > 0) {
    const item = queue.shift();
    if (item === undefined) break;
    const kind = item.rel.endsWith('.jsx') || item.rel.endsWith('.js') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
    const sf = ts.createSourceFile(item.rel, item.content, ts.ScriptTarget.Latest, true, kind);
    const specs: string[] = [];
    const visit = (node: ts.Node): void => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        specs.push(node.moduleSpecifier.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    for (const spec of specs) {
      if (!spec.startsWith('.') && !spec.startsWith('@/')) {
        const pkg = packageNameOf(spec);
        pushDep({ kind: 'package', name: pkg, declared: declaredPackages.has(pkg) });
        continue;
      }
      const resolved = await resolveLocalImport(ctx, item.rel, spec);
      if (resolved === null) {
        // CSS/asset side-effect imports nao resolvem como modulo TS
        if (/\.(css|scss|less|png|jpe?g|gif|webp|svg|avif|mp4|webm|woff2?|pdf)$/i.test(spec)) {
          pushDep({ kind: 'asset', name: spec, declared: true });
          continue;
        }
        unresolved.push(spec);
        continue;
      }
      const underShared = componentDirs.some(
        (d) => resolved === d || resolved.startsWith(`${d}/`),
      );
      if (underShared) {
        pushDep({
          kind: 'component',
          name: resolved,
          declared: registry.findBySourcePath(projectId, resolved) !== null,
        });
      } else {
        privateReferences.push({ specifier: spec, resolved });
      }
      if (!visited.has(resolved)) {
        visited.add(resolved);
        const content = await ctx.readFile(resolved);
        if (content !== null) {
          localDepContents.push({ file: resolved, content });
          queue.push({ rel: resolved, content });
        }
      }
    }
  }
  return { dependencies, privateReferences, unresolved, localDepContents };
}

function sourcePathForPublish(schema: ComponentSchema): string | null {
  const source = schema.identity.source;
  if (source.kind === 'ProjectFile') return source.path;
  if (source.kind === 'GeneratedSource') return source.path;
  return null;
}

export async function publishComponent(
  deps: PublishDeps,
  input: PublishInput,
): Promise<Result<PublishOutcome>> {
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
  if (schema.identity.scope !== 'Project') {
    return err(
      componentError(
        'InvalidDefinition',
        `component.publish promove Project Component -> Library (08§25); scope atual '${schema.identity.scope}'`,
        { resource: input.componentId },
      ),
    );
  }
  const rel = sourcePathForPublish(schema);
  if (rel === null) {
    return err(
      componentError(
        'UnsupportedSourceKind',
        `publish exige source em arquivo unico do projeto; kind '${schema.identity.source.kind}' nao suportado nesta wave (honesto)`,
        { resource: input.componentId },
      ),
    );
  }
  const guarded = await guardPath(deps.fsCtx, rel);
  if (!guarded.ok) return err(guarded.error);

  const ctx = createNodeDetectionContext(deps.fsCtx.rootAbs);
  const componentDirs = await detectComponentDirs(deps.fsCtx.rootAbs);

  // -- 1. Source Integrity (§74): arquivo existe + re-parse limpo -------------
  let content: string | null = null;
  try {
    content = await ctx.readFile(rel) ?? null;
  } catch {
    content = null;
  }
  let sourceIntegrity: PublishCheck;
  if (content === null) {
    sourceIntegrity = fail(`arquivo-fonte '${rel}' ilegivel/ausente`);
  } else {
    const sfKind = rel.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
    const sf = ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true, sfKind);
    const parseDiagnostics =
      (sf as ts.SourceFile & { readonly parseDiagnostics?: readonly ts.Diagnostic[] })
        .parseDiagnostics ?? [];
    sourceIntegrity =
      parseDiagnostics.length === 0
        ? pass(`'${rel}' existe e re-parseia sem erros (${content.length} bytes)`)
        : fail(`'${rel}' tem ${parseDiagnostics.length} erro(s) de parse`);
  }
  if (!sourceIntegrity.pass || content === null) {
    const validation: PublishValidation = {
      sourceIntegrity,
      dependencyResolution: fail('nao avaliado — source integrity falhou'),
      noSecretLeakage: fail('nao avaliado — source integrity falhou'),
      noPrivateReferences: fail('nao avaliado — source integrity falhou'),
      schemaValidity: fail('nao avaliado — source integrity falhou'),
      compatibility: fail('nao avaliado — source integrity falhou'),
    };
    return err(
      componentError('PublishValidationFailed', 'Publish bloqueado: Source Integrity falhou (§74)', {
        resource: rel,
        details: { publishValidation: validation },
      }),
    );
  }

  // -- 2. Dependency Analysis (08§19/§25) -------------------------------------
  const pkgRaw = await ctx.readFile('package.json');
  const declaredPackages = new Set<string>();
  if (pkgRaw !== null) {
    try {
      const pkg = JSON.parse(pkgRaw) as Record<string, unknown>;
      for (const field of ['dependencies', 'peerDependencies', 'devDependencies'] as const) {
        const depsField = pkg[field];
        if (typeof depsField === 'object' && depsField !== null && !Array.isArray(depsField)) {
          for (const name of Object.keys(depsField as Record<string, unknown>)) declaredPackages.add(name);
        }
      }
    } catch {
      // package.json invalido ja e erro do scanner; aqui nao inventamos deps
    }
  }
  const analysis = await analyzeDependencies(
    ctx,
    rel,
    content,
    componentDirs,
    declaredPackages,
    deps.registry,
    deps.projectId,
  );

  const undeclaredPackages = analysis.dependencies.filter((d) => d.kind === 'package' && !d.declared);
  const dependencyResolution: PublishCheck =
    analysis.unresolved.length > 0 || undeclaredPackages.length > 0
      ? fail(
          [
            ...analysis.unresolved.map((s) => `import nao resolvido: '${s}'`),
            ...undeclaredPackages.map((d) => `pacote nao declarado em package.json: '${d.name}'`),
          ].join('; '),
        )
      : pass(`${analysis.dependencies.length} dependencia(s) resolvidas e declaradas`);
  const noPrivateReferences: PublishCheck =
    analysis.privateReferences.length > 0
      ? fail(
          analysis.privateReferences
            .map((r) => `'${r.specifier}' -> ${r.resolved ?? 'fora dos dirs compartilhados'}`)
            .join('; '),
        )
      : pass('nenhuma referencia privada de projeto (08§65)');

  // -- 3. No Secret Leakage (§74 — source + deps locais transitivas) ----------
  const secretFindings: string[] = [];
  const scanTargets = [{ file: rel, content }, ...analysis.localDepContents];
  for (const target of scanTargets) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.re.test(target.content)) {
        secretFindings.push(`${target.file}: ${pattern.name}`);
      }
    }
  }
  const noSecretLeakage: PublishCheck =
    secretFindings.length === 0
      ? pass(`nenhum padrao de segredo em ${scanTargets.length} arquivo(s) (padroes: ${SECRET_PATTERNS.map((p) => p.name).join(', ')})`)
      : fail(secretFindings.join('; '));

  // -- 4. Compatibility Analysis (08§16 — framework/styling do projeto) -------
  const hasReact = deps.technologies.some((t) => t.technology === 'react');
  const stylingTechs = deps.technologies.filter((t) => t.category === 'STYLING').map((t) => t.technology);
  const compatibility: CompatibilityResult = hasReact ? 'COMPATIBLE' : 'UNKNOWN';
  const compatibilityCheck: PublishCheck = hasReact
    ? pass(`componente React+TSX; library M3 alvo React+TSX (styling: ${stylingTechs.join(', ') || 'nenhum detectado'})`)
    : fail('framework do projeto nao confirmado como React — compatibilidade UNKNOWN (nunca adivinhada)');

  // -- 5. Schema Validity (§74) ------------------------------------------------
  const schemaProblems: string[] = [];
  if (!/^[A-Z][A-Za-z0-9]*$/.test(schema.identity.name)) schemaProblems.push('nome fora de PascalCase');
  for (const p of schema.props) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p.name)) schemaProblems.push(`prop '${p.name}' invalido`);
  }
  const schemaValidity: PublishCheck =
    schemaProblems.length === 0 ? pass('schema valido (M3-CONTRACTS §7)') : fail(schemaProblems.join('; '));

  const validation: PublishValidation = {
    sourceIntegrity,
    dependencyResolution,
    noSecretLeakage,
    noPrivateReferences,
    schemaValidity,
    compatibility: compatibilityCheck,
  };

  // -- Remove/Resolve Private References: nao resolvivel => BLOQUEIA ----------
  if (!noPrivateReferences.pass) {
    const kind: ComponentErrorKind = 'PublishBlockedPrivateReferences';
    return err(
      componentError(
        kind,
        `Publish bloqueado: referencias privadas de projeto (08§25 — Global Component nunca com dependencia oculta, 08§65): ${noPrivateReferences.detail}`,
        { resource: rel, details: { publishValidation: validation } },
      ),
    );
  }
  if (!noSecretLeakage.pass) {
    return err(
      componentError(
        'PublishBlockedSecretLeakage',
        `Publish bloqueado: possivel vazamento de segredo (08§74 No Secret Leakage): ${noSecretLeakage.detail}`,
        { resource: rel, details: { publishValidation: validation } },
      ),
    );
  }
  if (!dependencyResolution.pass || !schemaValidity.pass || !compatibilityCheck.pass) {
    return err(
      componentError(
        'PublishValidationFailed',
        'Publish bloqueado: validacao §74 falhou (ver details.publishValidation)',
        { resource: rel, details: { publishValidation: validation } },
      ),
    );
  }

  // -- Review Metadata + Duplication prevention (08§79) ------------------------
  const existingLine = deps.registry.findByName(null, 'Library', schema.identity.name);
  let lineage: RegisteredComponent | null = null;
  if (existingLine !== null) {
    if (existingLine.schema.metadata['publishedFrom'] !== schema.identity.id) {
      return err(
        componentError(
          'DuplicateComponent',
          `Library ja tem componente '${schema.identity.name}' de OUTRA linhagem (08§79 — reuse em vez de duplicar)`,
          { resource: schema.identity.name, details: { existingId: existingLine.schema.identity.id } },
        ),
      );
    }
    lineage = existingLine;
  }

  // -- Version (semver simples; 08§26) -----------------------------------------
  const existingVersions = lineage !== null ? deps.registry.versions(lineage.schema.identity.id) : [];
  const latest = existingVersions[existingVersions.length - 1];
  let version: string;
  if (input.version !== undefined) {
    if (!isValidSemver(input.version)) {
      return err(
        componentError('InvalidDefinition', `version nao e semver MAJOR.MINOR.PATCH: '${input.version}'`, {
          resource: input.version,
        }),
      );
    }
    if (latest !== undefined && compareSemver(input.version, latest.version) <= 0) {
      return err(
        componentError(
          'InvalidDefinition',
          `version '${input.version}' deve ser maior que a ultima publicada '${latest.version}' (08§26 — nunca regredir silenciosamente)`,
          { resource: input.version },
        ),
      );
    }
    version = input.version;
  } else {
    version = latest !== undefined ? bumpPatch(latest.version) : '1.0.0';
  }

  // -- Portability (08§63) ------------------------------------------------------
  const hasComponentDeps = analysis.dependencies.some((d) => d.kind === 'component');
  const hasAssetDeps = analysis.dependencies.some((d) => d.kind === 'asset');
  const portability: Portability =
    hasComponentDeps || hasAssetDeps ? 'PartiallyPortable' : 'Portable';

  // -- Publish: nova identidade Library + version record (08§26/§62/§87) ------
  const now = new Date().toISOString();
  const libraryComponentId = lineage?.schema.identity.id ?? crypto.randomUUID();
  const librarySchema: ComponentSchema = {
    ...structuredClone(schema),
    identity: {
      id: libraryComponentId,
      name: schema.identity.name,
      scope: 'Library',
      source: { kind: 'LibraryPackage', packageName: '@nexo/library', version },
      version,
    },
    metadata: {
      ...structuredClone(schema.metadata),
      class: 'NexoLibraryComponent',
      publishedFrom: schema.identity.id,
      publishedFromPath: rel,
      portability,
      compatibility,
      framework: 'react',
      updatedAt: now,
      ...(lineage === null ? { createdAt: now } : {}),
    },
  };
  const versionRecord: ComponentVersion = {
    id: crypto.randomUUID(),
    componentId: libraryComponentId,
    version,
    source: { path: rel, contentHash: sha256Hex(content), snapshot: content },
    dependencies: analysis.dependencies,
    compatibility,
    changes: input.changes ?? [],
    publishedAt: now,
  };

  deps.registry.upsert(null, librarySchema);
  deps.registry.addVersion(versionRecord);

  // -- Verify (No Fake Success): registry re-lido, version record persistido ---
  const persisted = deps.registry.getById(libraryComponentId);
  const persistedVersions = deps.registry.versions(libraryComponentId);
  const versionPersisted = persistedVersions.some(
    (v) => v.version === version && v.source.contentHash === versionRecord.source.contentHash,
  );
  if (
    persisted === null ||
    persisted.schema.identity.scope !== 'Library' ||
    persisted.schema.identity.version !== version ||
    !versionPersisted
  ) {
    return err(
      componentError('VerificationFailed', 'Verificacao pos-publish falhou (registry/version record)', {
        resource: libraryComponentId,
      }),
    );
  }

  return ok({
    libraryComponentId,
    version,
    validation,
    compatibility,
    portability,
    dependencies: analysis.dependencies,
    status: 'Published',
  });
}
