/**
 * Viewport Registry (doc 09§24-§26; M3 §3.5 responsive.viewport.create).
 *
 * - Persistência via @nexo/storage (Repository Pattern, migration v3).
 * - Presets (Mobile/Tablet/Laptop/Desktop/WideDesktop) são CONFIGURÁVEIS:
 *   defaults aqui são conveniência do Nexo, nunca verdade universal (09§25/§62).
 *   O consumidor pode substituí-los via ViewportRegistryOptions.presets.
 * - Dimensões arbitrárias são obrigatórias (09§26): qualquer width/height
 *   inteiro > 0 é aceito.
 * - Breakpoints do PROJETO (09§22): detectProjectBreakpoints lê media queries
 *   e tailwind.config REAIS do projeto. Nunca assume 640/768/1024/1280 salvo
 *   se presentes no projeto.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, nexoError, newOperationId, ok, type Result } from '@nexo/shared';
import type { Storage } from '@nexo/storage';

import { responsiveError } from './errors.js';
import { SOURCE_HASH_EXCLUDED_DIRS } from './source-hash.js';
import type {
  ProjectBreakpoints,
  Viewport,
  ViewportCreateInput,
  ViewportOrientation,
  ViewportPreset,
} from './types.js';

/**
 * Defaults de preset (09§25). Marcados como convenção do Nexo — o sistema
 * NUNCA trata presets como verdade universal; create() aceita qualquer
 * dimensão arbitrária (09§26).
 */
export const DEFAULT_VIEWPORT_PRESETS: readonly ViewportPreset[] = [
  { name: 'Mobile', width: 375, height: 812, dpr: 2, orientation: 'Portrait' },
  { name: 'Tablet', width: 768, height: 1024, dpr: 2, orientation: 'Portrait' },
  { name: 'Laptop', width: 1366, height: 768, dpr: 1, orientation: 'Landscape' },
  { name: 'Desktop', width: 1440, height: 900, dpr: 1, orientation: 'Landscape' },
  { name: 'WideDesktop', width: 1920, height: 1080, dpr: 1, orientation: 'Landscape' },
];

export interface ViewportRegistry {
  create(input: ViewportCreateInput): Result<Viewport>;
  list(): Viewport[];
  read(id: string): Result<Viewport>;
  delete(id: string): Result<{ deleted: true; id: string }>;
}

export interface ViewportRegistryOptions {
  /** Presets a semear na criação do registry (default: DEFAULT_VIEWPORT_PRESETS; [] = nenhum). */
  presets?: readonly ViewportPreset[];
  /** Semear presets ausentes (por nome) no storage. Default: true. */
  seedPresets?: boolean;
}

function deriveOrientation(width: number, height: number): ViewportOrientation {
  // Convenção documentada: altura >= largura => Portrait (09§28).
  return height >= width ? 'Portrait' : 'Landscape';
}

export function createViewportRegistry(
  storage: Storage,
  opts: ViewportRegistryOptions = {},
): Result<ViewportRegistry> {
  const repo = storage.repos.responsiveViewports;
  const presets = opts.presets ?? DEFAULT_VIEWPORT_PRESETS;
  const seed = opts.seedPresets ?? true;

  if (seed) {
    const existing = new Set(repo.list().map((v) => v.name).filter((n): n is string => n !== null));
    for (const p of presets) {
      if (existing.has(p.name)) continue;
      repo.insert({
        id: newOperationId(),
        name: p.name,
        width: p.width,
        height: p.height,
        dpr: p.dpr ?? null,
        orientation: p.orientation,
        isPreset: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const toViewport = (r: {
    id: string;
    name: string | null;
    width: number;
    height: number;
    dpr: number | null;
    orientation: ViewportOrientation;
    isPreset: boolean;
    createdAt: string;
  }): Viewport => ({
    id: r.id,
    ...(r.name !== null ? { name: r.name } : {}),
    width: r.width,
    height: r.height,
    ...(r.dpr !== null ? { dpr: r.dpr } : {}),
    orientation: r.orientation,
    isPreset: r.isPreset,
    createdAt: r.createdAt,
  });

  return ok({
    create(input) {
      if (!Number.isInteger(input.width) || input.width <= 0 || !Number.isInteger(input.height) || input.height <= 0) {
        return err(
          nexoError('INVALID_INPUT', 'viewport width/height must be positive integers (px CSS)', {
            details: {
              width: input.width,
              height: input.height,
              nextAction: 'forneca width/height inteiros > 0 (dimensoes arbitrarias sao suportadas, doc 09§26)',
            },
          }),
        );
      }
      if (input.dpr !== undefined && (typeof input.dpr !== 'number' || !(input.dpr > 0))) {
        return err(
          nexoError('INVALID_INPUT', 'viewport dpr must be a positive number when provided', {
            details: { dpr: input.dpr, nextAction: 'forneca dpr > 0 ou omita' },
          }),
        );
      }
      const viewport: Viewport = {
        id: newOperationId(),
        ...(input.name !== undefined ? { name: input.name } : {}),
        width: input.width,
        height: input.height,
        ...(input.dpr !== undefined ? { dpr: input.dpr } : {}),
        orientation: input.orientation ?? deriveOrientation(input.width, input.height),
        isPreset: false,
        createdAt: new Date().toISOString(),
      };
      repo.insert({
        id: viewport.id,
        name: viewport.name ?? null,
        width: viewport.width,
        height: viewport.height,
        dpr: viewport.dpr ?? null,
        orientation: viewport.orientation,
        isPreset: false,
        createdAt: viewport.createdAt ?? new Date().toISOString(),
      });
      return ok(viewport);
    },
    list() {
      return repo.list().map(toViewport);
    },
    read(id) {
      const row = repo.getById(id);
      if (!row) {
        return err(
          responsiveError('NOT_FOUND', 'VIEWPORT_NOT_FOUND', `viewport not found: '${id}'`, {
            resource: id,
            nextAction: 'liste viewports (responsive.viewport.create cria novos) e use um id existente',
          }),
        );
      }
      return ok(toViewport(row));
    },
    delete(id) {
      const removed = repo.delete(id);
      if (!removed) {
        return err(
          responsiveError('NOT_FOUND', 'VIEWPORT_NOT_FOUND', `viewport not found: '${id}'`, {
            resource: id,
            nextAction: 'verifique o id com a listagem de viewports',
          }),
        );
      }
      return ok({ deleted: true, id });
    },
  });
}

// ---------------------------------------------------------------------------
// Breakpoint detection (doc 09§22) — somente valores PRESENTES no projeto.
// ---------------------------------------------------------------------------

const BREAKPOINT_SCAN_EXTENSIONS = new Set(['.css', '.scss', '.less']);
const TAILWIND_CONFIG_RE = /^tailwind\.config\.(js|cjs|mjs|ts)$/;
const MEDIA_WIDTH_RE = /@media[^{}]*\((?:min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g;
const MAX_SCAN_FILES = 2_000;
const MAX_SCAN_BYTES = 2 * 1024 * 1024;

async function collectCssLikeFiles(rootAbsPath: string): Promise<{ files: string[]; truncated: boolean }> {
  const files: string[] = [];
  let truncated = false;
  async function walk(dir: string): Promise<void> {
    if (files.length >= MAX_SCAN_FILES) {
      truncated = true;
      return;
    }
    let dirents;
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // diretório ilegível não inventa breakpoints
    }
    for (const d of dirents) {
      if (files.length >= MAX_SCAN_FILES) {
        truncated = true;
        return;
      }
      const abs = path.join(dir, d.name);
      if (d.isDirectory()) {
        if (SOURCE_HASH_EXCLUDED_DIRS.includes(d.name)) continue;
        await walk(abs);
      } else if (d.isFile()) {
        if (BREAKPOINT_SCAN_EXTENSIONS.has(path.extname(d.name)) || TAILWIND_CONFIG_RE.test(d.name)) {
          files.push(abs);
        }
      }
    }
  }
  await walk(rootAbsPath);
  return { files, truncated };
}

/**
 * Detecta breakpoints REAIS do projeto (09§22). Fontes escaneadas:
 * - `@media (min|max-width: Npx)` em arquivos CSS/SCSS/LESS;
 * - pares `chave: 'Npx'` dentro de tailwind.config.* (screens).
 * Valores detectados são ordenados e deduplicados. Se nada for encontrado,
 * breakpoints = Detection UNKNOWN com value null — NUNCA assume defaults.
 */
export async function detectProjectBreakpoints(rootAbsPath: string): Promise<Result<ProjectBreakpoints>> {
  let st;
  try {
    st = await fs.stat(rootAbsPath);
  } catch {
    return err(
      responsiveError('NOT_FOUND', 'PROJECT_NOT_FOUND', `project root not found: '${rootAbsPath}'`, {
        resource: rootAbsPath,
        nextAction: 'verifique o rootPath do projeto',
      }),
    );
  }
  if (!st.isDirectory()) {
    return err(
      responsiveError('INVALID_INPUT', 'PROJECT_NOT_FOUND', `project root is not a directory: '${rootAbsPath}'`, {
        resource: rootAbsPath,
      }),
    );
  }

  const { files, truncated } = await collectCssLikeFiles(rootAbsPath);
  const found = new Set<number>();
  const evidence: string[] = [];

  for (const abs of files) {
    let content: string;
    try {
      const stat = await fs.stat(abs);
      if (stat.size > MAX_SCAN_BYTES) continue;
      content = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }
    const rel = path.relative(rootAbsPath, abs);
    if (TAILWIND_CONFIG_RE.test(path.basename(abs))) {
      const re = /['"]?\w+['"]?\s*:\s*['"](\d+(?:\.\d+)?)px['"]/g;
      let m: RegExpExecArray | null;
      let hit = false;
      while ((m = re.exec(content)) !== null) {
        const px = Number(m[1]);
        if (Number.isFinite(px) && px > 0) {
          found.add(px);
          hit = true;
        }
      }
      if (hit) evidence.push(`${rel} (tailwind screens)`);
      continue;
    }
    MEDIA_WIDTH_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    let hit = false;
    while ((m = MEDIA_WIDTH_RE.exec(content)) !== null) {
      const px = Number(m[1]);
      if (Number.isFinite(px) && px > 0) {
        found.add(px);
        hit = true;
      }
    }
    if (hit) evidence.push(`${rel} (media queries)`);
  }

  const breakpoints = [...found].sort((a, b) => a - b);
  if (breakpoints.length === 0) {
    return ok({
      breakpoints: {
        value: null,
        confidence: 'UNKNOWN',
        evidence: [
          `nenhum breakpoint encontrado em ${files.length} arquivo(s) CSS/config escaneado(s)` +
            (truncated ? ' (scan truncado no limite de arquivos)' : ''),
        ],
      },
      scannedFiles: evidence,
    });
  }
  return ok({
    breakpoints: {
      value: breakpoints,
      confidence: truncated ? 'MEDIUM' : 'HIGH',
      evidence,
    },
    scannedFiles: evidence,
  });
}
