/**
 * Adapters de detecção M1 (SPEC §6) — evidence-based, read-only, NUNCA mutam.
 *
 * REGRAS DE CONFIDENCE (documentadas, multi-sinal):
 *  - Dependência declarada em package.json (dependencies/devDependencies) é
 *    declaração explícita do projeto -> CONFIRMED (fonte primária de verdade).
 *  - Arquivo de config específico da tecnologia sem dep declarada -> HIGH
 *    (forte, mas pode ser residual) — exceto tailwind, cujo config isolado é
 *    comumente leftover -> MEDIUM.
 *  - Dep + config concordantes -> CONFIRMED com evidências acumuladas (multi-sinal).
 *  - Sinais fracos isolados (convenção de arquivo como *.vue) -> MEDIUM/LOW.
 *  - Lockfile de package manager -> HIGH; campo `packageManager` do package.json
 *    é declaração explícita -> CONFIRMED (com versão exata).
 *  - Sem nenhum sinal -> value null: o registry NÃO emite detecção
 *    (ausência ≠ UNKNOWN inventado; INVARIANTS #6/#25).
 *
 * Convenção de evidência (strings estáveis, machine-friendly):
 *  - "package.json:dependencies.<nome>@<range>"
 *  - "package.json:devDependencies.<nome>@<range>"
 *  - "package.json:packageManager=<nome>@<versão>"
 *  - "file:<path relativo>"
 *  - "lockfile:<nome do lockfile>"
 *  - "absent:<path relativo>"
 */

import type { Confidence, Detection } from '@nexo/shared';

import { findFiles } from './fs-context.js';
import type {
  Adapter,
  AdapterCapabilityLevel,
  AdapterCategory,
  AdapterDetectionValue,
  DetectionContext,
} from './types.js';

const ADAPTER_VERSION = '0.0.0';

// ---------------------------------------------------------------------------
// helpers de package.json (tolerantes: ausência/JSON inválido -> null)
// ---------------------------------------------------------------------------

interface PackageJsonSignals {
  deps: Record<string, string>;
  devDeps: Record<string, string>;
  packageManager: string | null;
}

function asStringRecord(v: unknown): Record<string, string> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val;
  }
  return out;
}

async function readPackageJsonSignals(ctx: DetectionContext): Promise<PackageJsonSignals | null> {
  const raw = await ctx.readFile('package.json');
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    return {
      deps: asStringRecord(p['dependencies']),
      devDeps: asStringRecord(p['devDependencies']),
      packageManager: typeof p['packageManager'] === 'string' ? p['packageManager'] : null,
    };
  } catch {
    // package.json inválido: adapters são tolerantes; o scanner (intelligence) é estrito
    return null;
  }
}

/** Retorna evidence + range declarado, ou null. */
function declaredDep(
  pkg: PackageJsonSignals | null,
  name: string,
): { evidence: string; range: string } | null {
  if (!pkg) return null;
  if (pkg.deps[name] !== undefined) {
    return { evidence: `package.json:dependencies.${name}@${pkg.deps[name]}`, range: pkg.deps[name] };
  }
  if (pkg.devDeps[name] !== undefined) {
    return {
      evidence: `package.json:devDependencies.${name}@${pkg.devDeps[name]}`,
      range: pkg.devDeps[name],
    };
  }
  return null;
}

async function existingFiles(ctx: DetectionContext, candidates: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const rel of candidates) {
    if (await ctx.exists(rel)) found.push(rel);
  }
  return found;
}

function detection(
  confidence: Confidence,
  evidence: string[],
  version: string | null,
): Detection<AdapterDetectionValue> {
  return { value: { version }, confidence, evidence };
}

const NO_DETECTION: Detection<unknown> = { value: null, confidence: 'UNKNOWN', evidence: [] };

function makeAdapter(opts: {
  id: string;
  name: string;
  category: AdapterCategory;
  capability: AdapterCapabilityLevel;
  detect: (ctx: DetectionContext) => Promise<Detection<unknown>>;
}): Adapter {
  return {
    identity: { id: opts.id, name: opts.name, category: opts.category, adapterVersion: ADAPTER_VERSION },
    detect: opts.detect,
    getCapabilities: () => opts.capability,
  };
}

// ---------------------------------------------------------------------------
// FRAMEWORK adapters — M1: capability READ_ONLY (detecção/leitura, sem escrita)
// ---------------------------------------------------------------------------

interface FrameworkSpec {
  id: string;
  name: string;
  dep: string;
  configCandidates?: string[];
  /** sinal fraco por convenção de arquivo (ex.: *.vue) */
  fileConvention?: { pattern: RegExp; label: string };
}

function frameworkAdapter(spec: FrameworkSpec): Adapter {
  return makeAdapter({
    id: spec.id,
    name: spec.name,
    category: 'FRAMEWORK',
    capability: 'READ_ONLY',
    async detect(ctx) {
      const pkg = await readPackageJsonSignals(ctx);
      const dep = declaredDep(pkg, spec.dep);
      const configs = spec.configCandidates ? await existingFiles(ctx, spec.configCandidates) : [];

      const evidence: string[] = [];
      if (dep) evidence.push(dep.evidence);
      for (const c of configs) evidence.push(`file:${c}`);

      if (dep) {
        // dep declarada -> CONFIRMED; config concordante reforça evidência (multi-sinal)
        return detection('CONFIRMED', evidence, dep.range);
      }
      if (configs.length > 0) {
        return detection('HIGH', evidence, null);
      }
      if (spec.fileConvention) {
        const files = await findFiles(ctx, (rel) => spec.fileConvention!.pattern.test(rel));
        if (files.length > 0) {
          // convenção de arquivo sem dep/config: sinal fraco -> MEDIUM
          return detection('MEDIUM', files.slice(0, 5).map((f) => `file:${f}`), null);
        }
      }
      return NO_DETECTION;
    },
  });
}

// ---------------------------------------------------------------------------
// STYLING adapters
// ---------------------------------------------------------------------------

const TAILWIND_CONFIGS = [
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
];

// ---------------------------------------------------------------------------
// PACKAGE MANAGER adapters
// ---------------------------------------------------------------------------

interface PmSpec {
  id: string;
  lockfiles: string[];
}

function packageManagerAdapter(spec: PmSpec): Adapter {
  return makeAdapter({
    id: spec.id,
    name: spec.id,
    category: 'PACKAGE_MANAGER',
    capability: 'READ_ONLY',
    async detect(ctx) {
      const pkg = await readPackageJsonSignals(ctx);
      const evidence: string[] = [];
      let version: string | null = null;
      let pmFieldMatch = false;

      if (pkg?.packageManager) {
        const at = pkg.packageManager.lastIndexOf('@');
        const pmName = at > 0 ? pkg.packageManager.slice(0, at) : pkg.packageManager;
        if (pmName === spec.id) {
          pmFieldMatch = true;
          version = at > 0 ? pkg.packageManager.slice(at + 1) : null;
          evidence.push(`package.json:packageManager=${pkg.packageManager}`);
        }
      }
      for (const lf of spec.lockfiles) {
        if (await ctx.exists(lf)) evidence.push(`lockfile:${lf}`);
      }

      const hasLockfile = evidence.some((e) => e.startsWith('lockfile:'));
      if (pmFieldMatch) {
        // campo packageManager é declaração explícita -> CONFIRMED (lockfile concordante reforça)
        return detection('CONFIRMED', evidence, version);
      }
      if (hasLockfile) {
        return detection('HIGH', evidence, null);
      }
      return NO_DETECTION;
    },
  });
}

// ---------------------------------------------------------------------------
// Adapters M1 exportados
// ---------------------------------------------------------------------------

export function createReactAdapter(): Adapter {
  return frameworkAdapter({ id: 'react', name: 'react', dep: 'react' });
}

export function createNextjsAdapter(): Adapter {
  return frameworkAdapter({
    id: 'nextjs',
    name: 'nextjs',
    dep: 'next',
    configCandidates: ['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.cjs'],
  });
}

export function createVueAdapter(): Adapter {
  return frameworkAdapter({
    id: 'vue',
    name: 'vue',
    dep: 'vue',
    fileConvention: { pattern: /\.vue$/, label: 'single-file component' },
  });
}

export function createSvelteAdapter(): Adapter {
  return frameworkAdapter({
    id: 'svelte',
    name: 'svelte',
    dep: 'svelte',
    configCandidates: ['svelte.config.js', 'svelte.config.ts'],
  });
}

export function createAstroAdapter(): Adapter {
  return frameworkAdapter({
    id: 'astro',
    name: 'astro',
    dep: 'astro',
    configCandidates: ['astro.config.mjs', 'astro.config.js', 'astro.config.ts', 'astro.config.mts'],
  });
}

/**
 * html-static: site estático puro = index.html na raiz E ausência de package.json.
 * Se package.json existe, o projeto é de ecossistema JS e este adapter não emite
 * detecção (não classificar app JS como "html estático").
 * Capability UNSUPPORTED no M1 -> support DETECTED_BUT_UNSUPPORTED (o Nexo M1 não
 * tem capability para sites estáticos além de detectá-los; nunca inventar suporte).
 */
export function createHtmlStaticAdapter(): Adapter {
  return makeAdapter({
    id: 'html-static',
    name: 'html-static',
    category: 'FRAMEWORK',
    capability: 'UNSUPPORTED',
    async detect(ctx) {
      const hasIndex = await ctx.exists('index.html');
      const hasPkg = await ctx.exists('package.json');
      if (hasIndex && !hasPkg) {
        return detection('HIGH', ['file:index.html', 'absent:package.json'], null);
      }
      return NO_DETECTION;
    },
  });
}

/**
 * typescript: tsconfig.json + dep typescript concordantes -> CONFIRMED;
 * apenas um dos dois -> HIGH; nenhum -> sem detecção.
 */
export function createTypescriptAdapter(): Adapter {
  return makeAdapter({
    id: 'typescript',
    name: 'typescript',
    category: 'BUILD',
    capability: 'READ_ONLY',
    async detect(ctx) {
      const pkg = await readPackageJsonSignals(ctx);
      const dep = declaredDep(pkg, 'typescript');
      const hasTsconfig = await ctx.exists('tsconfig.json');

      const evidence: string[] = [];
      if (hasTsconfig) evidence.push('file:tsconfig.json');
      if (dep) evidence.push(dep.evidence);

      if (hasTsconfig && dep) return detection('CONFIRMED', evidence, dep.range);
      if (hasTsconfig || dep) return detection('HIGH', evidence, dep?.range ?? null);
      return NO_DETECTION;
    },
  });
}

/**
 * tailwind: dep + config -> CONFIRMED; só dep -> HIGH; só config -> MEDIUM
 * (tailwind.config.* isolado é frequentemente leftover de template).
 */
export function createTailwindAdapter(): Adapter {
  return makeAdapter({
    id: 'tailwind',
    name: 'tailwind',
    category: 'STYLING',
    capability: 'READ_ONLY',
    async detect(ctx) {
      const pkg = await readPackageJsonSignals(ctx);
      const dep = declaredDep(pkg, 'tailwindcss');
      const configs = await existingFiles(ctx, TAILWIND_CONFIGS);

      const evidence: string[] = [];
      if (dep) evidence.push(dep.evidence);
      for (const c of configs) evidence.push(`file:${c}`);

      if (dep && configs.length > 0) return detection('CONFIRMED', evidence, dep.range);
      if (dep) return detection('HIGH', evidence, dep.range);
      if (configs.length > 0) return detection('MEDIUM', evidence, null);
      return NO_DETECTION;
    },
  });
}

/**
 * css-modules: ≥1 arquivo *.module.css (busca rasa, max depth 3, ignora
 * node_modules/.git). A convenção de nome `.module.css` é explícita -> HIGH.
 */
export function createCssModulesAdapter(): Adapter {
  return makeAdapter({
    id: 'css-modules',
    name: 'css-modules',
    category: 'STYLING',
    capability: 'READ_ONLY',
    async detect(ctx) {
      const files = await findFiles(ctx, (rel) => rel.endsWith('.module.css'));
      if (files.length === 0) return NO_DETECTION;
      return detection('HIGH', files.slice(0, 5).map((f) => `file:${f}`), null);
    },
  });
}

export function createStyledComponentsAdapter(): Adapter {
  return makeAdapter({
    id: 'styled-components',
    name: 'styled-components',
    category: 'STYLING',
    capability: 'READ_ONLY',
    async detect(ctx) {
      const pkg = await readPackageJsonSignals(ctx);
      const dep = declaredDep(pkg, 'styled-components');
      if (dep) return detection('CONFIRMED', [dep.evidence], dep.range);
      return NO_DETECTION;
    },
  });
}

/**
 * plain-css: ≥1 arquivo *.css não-module. Sinal fraco (css pode ser artefato
 * de build/vendor) -> MEDIUM com evidência dos arquivos encontrados.
 */
export function createPlainCssAdapter(): Adapter {
  return makeAdapter({
    id: 'plain-css',
    name: 'plain-css',
    category: 'STYLING',
    capability: 'READ_ONLY',
    async detect(ctx) {
      const files = await findFiles(
        ctx,
        (rel) => rel.endsWith('.css') && !rel.endsWith('.module.css'),
      );
      if (files.length === 0) return NO_DETECTION;
      return detection('MEDIUM', files.slice(0, 5).map((f) => `file:${f}`), null);
    },
  });
}

export function createNpmAdapter(): Adapter {
  return packageManagerAdapter({ id: 'npm', lockfiles: ['package-lock.json'] });
}

export function createPnpmAdapter(): Adapter {
  return packageManagerAdapter({ id: 'pnpm', lockfiles: ['pnpm-lock.yaml'] });
}

export function createYarnAdapter(): Adapter {
  return packageManagerAdapter({ id: 'yarn', lockfiles: ['yarn.lock'] });
}

export function createBunAdapter(): Adapter {
  return packageManagerAdapter({ id: 'bun', lockfiles: ['bun.lock', 'bun.lockb'] });
}

/** Todos os adapters de detecção M1 (ordem estável de registro). */
export function createM1Adapters(): Adapter[] {
  return [
    createReactAdapter(),
    createNextjsAdapter(),
    createVueAdapter(),
    createSvelteAdapter(),
    createAstroAdapter(),
    createHtmlStaticAdapter(),
    createTypescriptAdapter(),
    createTailwindAdapter(),
    createCssModulesAdapter(),
    createStyledComponentsAdapter(),
    createPlainCssAdapter(),
    createNpmAdapter(),
    createPnpmAdapter(),
    createYarnAdapter(),
    createBunAdapter(),
  ];
}
