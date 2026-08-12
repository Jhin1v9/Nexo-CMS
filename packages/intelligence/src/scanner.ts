/**
 * ProjectScanner (SPEC.md §7 — Wave 2C).
 *
 * Regras globais:
 *  - Análise NUNCA escreve no projeto (discovery nunca muta; INVARIANTS).
 *  - Multi-sinal: package.json + lockfile + config files (via adapters M1).
 *  - Sem sinais -> UNKNOWN; nunca inventar (INVARIANTS #6/#25).
 *  - Scripts: apenas os declarados em package.json; NUNCA assumir 'dev'/'build'.
 *  - Git: detecção por filesystem (.git exists + parse de .git/HEAD). Sem spawn
 *    nesta wave — SPEC §7 prevê `git rev-parse --abbrev-ref HEAD` via runtime
 *    executor SAFE na integração (Wave 3); o parse de HEAD é equivalente para
 *    branch anexada e marca detached HEAD como branch null (nunca falsificar git,
 *    INVARIANT #14).
 *
 * Agregação (documentada):
 *  - support: sem tecnologias -> UNKNOWN; todas FULLY_SUPPORTED -> FULLY_SUPPORTED;
 *    qualquer PARTIALLY_SUPPORTED ou DETECTED_BUT_UNSUPPORTED presente ->
 *    PARTIALLY_SUPPORTED (qualquer DETECTED_BUT_UNSUPPORTED => agregado ≤ PARTIAL);
 *    somente se TODAS as detecções forem DETECTED_BUT_UNSUPPORTED -> agregado
 *    DETECTED_BUT_UNSUPPORTED.
 *  - confidence: máximo das confidences das tecnologias detectadas; sem
 *    tecnologias -> UNKNOWN. (Concordância multi-sinal já eleva a confidence no
 *    nível de cada adapter — ver m1-adapters.ts.)
 */

import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { AdapterRegistry, DetectedTechnology, DetectionContext } from '@nexo/adapters';
import { createDefaultAdapterRegistry, createNodeDetectionContext } from '@nexo/adapters';
import type { Confidence, Detection, Result, SupportLevel } from '@nexo/shared';
import { err, newOperationId, nexoError, ok } from '@nexo/shared';

import type { ProjectModel } from './model.js';

export interface ProjectScanner {
  scan(rootAbsPath: string): Promise<Result<ProjectModel>>;
}

export interface ProjectScannerOptions {
  /** Default: createDefaultAdapterRegistry() com todos os adapters M1. */
  registry?: AdapterRegistry;
}

const CONFIDENCE_RANK: Record<Confidence, number> = {
  UNKNOWN: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CONFIRMED: 4,
};

const PACKAGE_MANAGER_NAMES = ['npm', 'pnpm', 'yarn', 'bun'] as const;
type PackageManagerName = (typeof PACKAGE_MANAGER_NAMES)[number];

const ENTRY_CANDIDATES: readonly string[] = [
  'index.html',
  'src/main.ts',
  'src/main.tsx',
  'src/main.js',
  'src/main.jsx',
  'src/index.ts',
  'src/index.tsx',
  'src/index.js',
  'src/index.jsx',
  'app',
  'pages',
];

const CONFIG_CANDIDATES: readonly string[] = [
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'astro.config.mjs',
  'astro.config.js',
  'astro.config.ts',
  'svelte.config.js',
  'svelte.config.ts',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
];

function asStringRecord(v: unknown): Record<string, string> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val;
  }
  return out;
}

/** Extrai padrões de workspaces do package.json (array ou { packages }). */
function workspacePatterns(pkg: Record<string, unknown>): string[] {
  const ws = pkg['workspaces'];
  if (Array.isArray(ws)) return ws.filter((p): p is string => typeof p === 'string');
  if (typeof ws === 'object' && ws !== null) {
    const inner = (ws as Record<string, unknown>)['packages'];
    if (Array.isArray(inner)) return inner.filter((p): p is string => typeof p === 'string');
  }
  return [];
}

/**
 * Expansão de globs SIMPLES de 1 nível ("packages/*" -> subdiretórios de packages/).
 * Padrões sem '*' são aceitos como path literal se existirem. Padrões com mais
 * de um nível de glob são ignorados (sem evidência suficiente — nunca inventar).
 */
async function expandPackageRoots(ctx: DetectionContext, patterns: string[]): Promise<string[]> {
  const roots: string[] = [];
  for (const pattern of patterns) {
    const star = pattern.indexOf('*');
    if (star === -1) {
      if (await ctx.exists(pattern)) roots.push(pattern);
      continue;
    }
    const prefix = pattern.slice(0, star).replace(/\/$/, '');
    const rest = pattern.slice(star + 1);
    if (rest !== '' && rest !== '/') continue; // glob de mais de 1 nível: fora do M1
    const entries = await ctx.listDir(prefix === '' ? undefined : prefix);
    for (const e of entries) {
      if (e.kind === 'dir' && e.name !== 'node_modules' && !e.name.startsWith('.')) {
        roots.push(prefix === '' ? e.name : `${prefix}/${e.name}`);
      }
    }
  }
  return [...new Set(roots)].sort();
}

function aggregateSupport(technologies: DetectedTechnology[]): SupportLevel {
  if (technologies.length === 0) return 'UNKNOWN';
  const levels = new Set(technologies.map((t) => t.support));
  if (levels.size === 1 && levels.has('FULLY_SUPPORTED')) return 'FULLY_SUPPORTED';
  if (levels.has('FULLY_SUPPORTED') || levels.has('PARTIALLY_SUPPORTED')) {
    // qualquer DETECTED_BUT_UNSUPPORTED cai aqui: agregado ≤ PARTIALLY_SUPPORTED
    return 'PARTIALLY_SUPPORTED';
  }
  if (levels.has('DETECTED_BUT_UNSUPPORTED')) return 'DETECTED_BUT_UNSUPPORTED';
  if (levels.has('CUSTOM')) return 'CUSTOM';
  return 'UNKNOWN';
}

function aggregateConfidence(technologies: DetectedTechnology[]): Confidence {
  let best: Confidence = 'UNKNOWN';
  for (const t of technologies) {
    if (CONFIDENCE_RANK[t.confidence] > CONFIDENCE_RANK[best]) best = t.confidence;
  }
  return best;
}

/** Parse read-only de .git/HEAD: "ref: refs/heads/<branch>" ou hash (detached). */
async function detectGit(
  ctx: DetectionContext,
): Promise<Detection<{ isRepo: boolean; branch: string | null }>> {
  const hasGitDir = await ctx.exists('.git');
  if (!hasGitDir) {
    return {
      value: { isRepo: false, branch: null },
      confidence: 'CONFIRMED',
      evidence: ['absent:.git'],
    };
  }
  const evidence = ['file:.git'];
  const head = await ctx.readFile('.git/HEAD');
  let branch: string | null = null;
  if (head !== null) {
    const m = /^ref: refs\/heads\/(.+)$/m.exec(head.trim());
    if (m && m[1]) {
      branch = m[1].trim();
      evidence.push('git:HEAD ref refs/heads/' + branch);
    } else if (/^[0-9a-f]{40}$/i.test(head.trim())) {
      evidence.push('git:HEAD detached');
    } else {
      evidence.push('git:HEAD unparsed');
    }
  } else {
    // .git pode ser arquivo "gitdir:" (worktree/submódulo) — branch via executor na Wave 3
    evidence.push('git:HEAD unreadable');
  }
  return { value: { isRepo: true, branch }, confidence: 'CONFIRMED', evidence };
}

export function createProjectScanner(opts: ProjectScannerOptions = {}): ProjectScanner {
  const registry = opts.registry ?? createDefaultAdapterRegistry();

  return {
    async scan(rootAbsPath: string): Promise<Result<ProjectModel>> {
      // 1. validação de input
      if (typeof rootAbsPath !== 'string' || rootAbsPath.trim() === '') {
        return err(
          nexoError('INVALID_INPUT', 'rootAbsPath deve ser uma string não vazia', {
            retryable: false,
          }),
        );
      }
      const root = resolve(rootAbsPath);
      let st: Awaited<ReturnType<typeof stat>>;
      try {
        st = await stat(root);
      } catch {
        return err(
          nexoError('NOT_FOUND', `diretório não encontrado: ${root}`, {
            resource: root,
            retryable: false,
          }),
        );
      }
      if (!st.isDirectory()) {
        return err(
          nexoError('INVALID_INPUT', `path não é um diretório: ${root}`, {
            resource: root,
            retryable: false,
          }),
        );
      }

      const ctx = createNodeDetectionContext(root);

      // 2. package.json (scanner é estrito: JSON inválido -> INVALID_INPUT)
      let pkg: Record<string, unknown> | null = null;
      const rawPkg = await ctx.readFile('package.json');
      if (rawPkg !== null) {
        try {
          const parsed: unknown = JSON.parse(rawPkg);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            throw new Error('package.json não é um objeto JSON');
          }
          pkg = parsed as Record<string, unknown>;
        } catch (e) {
          return err(
            nexoError('INVALID_INPUT', `package.json inválido em ${root}: ${(e as Error).message}`, {
              resource: `${root}/package.json`,
              retryable: false,
            }),
          );
        }
      }

      // 3. root detection (monorepo-aware via workspaces field)
      let rootDetection: Detection<{ isMonorepo: boolean; packageRoots: string[] }>;
      if (pkg === null) {
        rootDetection = { value: null, confidence: 'UNKNOWN', evidence: ['absent:package.json'] };
      } else {
        const patterns = workspacePatterns(pkg);
        if (patterns.length > 0) {
          const packageRoots = await expandPackageRoots(ctx, patterns);
          rootDetection = {
            value: { isMonorepo: true, packageRoots },
            confidence: 'CONFIRMED',
            evidence: [
              `package.json:workspaces=[${patterns.join(', ')}]`,
              ...packageRoots.map((r) => `dir:${r}`),
            ],
          };
        } else {
          rootDetection = {
            value: { isMonorepo: false, packageRoots: ['.'] },
            confidence: 'HIGH',
            evidence: ['package.json:workspaces absent'],
          };
        }
      }

      // 4. stack detection via adapters M1 (multi-sinal, evidence-based)
      const technologies = await registry.detectAll(ctx);

      // 5. package manager agregado (maior confidence entre PACKAGE_MANAGER)
      let packageManager: Detection<{ name: PackageManagerName; version: string | null }> = {
        value: null,
        confidence: 'UNKNOWN',
        evidence: [],
      };
      const pmTechs = technologies
        .filter(
          (t): t is DetectedTechnology & { technology: PackageManagerName } =>
            t.category === 'PACKAGE_MANAGER' &&
            (PACKAGE_MANAGER_NAMES as readonly string[]).includes(t.technology),
        )
        .sort((a, b) => CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence]);
      const pmTop = pmTechs[0];
      if (pmTop) {
        packageManager = {
          value: { name: pmTop.technology, version: pmTop.version },
          confidence: pmTop.confidence,
          evidence: [...pmTop.evidence],
        };
      }

      // 6. scripts — somente os declarados; NUNCA assumir dev/build
      let scripts: Detection<Record<string, string>>;
      if (pkg !== null && pkg['scripts'] !== undefined) {
        const declared = asStringRecord(pkg['scripts']);
        scripts = {
          value: declared,
          confidence: 'CONFIRMED',
          evidence: [`package.json:scripts (${Object.keys(declared).length} declarados)`],
        };
      } else if (pkg !== null) {
        scripts = { value: null, confidence: 'UNKNOWN', evidence: ['package.json:scripts absent'] };
      } else {
        scripts = { value: null, confidence: 'UNKNOWN', evidence: ['absent:package.json'] };
      }

      // 7. git (fs-only nesta wave; executor SAFE na integração Wave 3)
      const git = await detectGit(ctx);

      // 8. estrutura (entry/config/top-level; ignore node_modules/.git)
      const entryFiles: string[] = [];
      for (const rel of ENTRY_CANDIDATES) {
        if (await ctx.exists(rel)) entryFiles.push(rel);
      }
      const configFiles: string[] = [];
      for (const rel of CONFIG_CANDIDATES) {
        if (await ctx.exists(rel)) configFiles.push(rel);
      }
      const topLevelDirs = (await ctx.listDir())
        .filter((e) => e.kind === 'dir' && e.name !== 'node_modules' && e.name !== '.git')
        .map((e) => e.name)
        .sort();

      const model: ProjectModel = {
        projectId: newOperationId(), // id de análise; id estável do projeto é do storage (SPEC §5)
        rootPath: root,
        analyzedAt: new Date().toISOString(),
        analysisVersion: 1,
        root: rootDetection,
        technologies,
        packageManager,
        scripts,
        git,
        structure: { entryFiles, configFiles, topLevelDirs },
        support: aggregateSupport(technologies),
        confidence: aggregateConfidence(technologies),
      };
      return ok(model);
    },
  };
}
