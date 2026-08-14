/**
 * Visual Comparison (doc 09§43/§45; D14: image-diff = pixelmatch).
 *
 * - Screenshots REAIS por viewport (browser de verdade, 09§46).
 * - Diff: pixelmatch (threshold 0.1, includeAA false — escolha documentada por
 *   confiabilidade/performance, 09§45). pixelmatch exige dimensões iguais:
 *   viewports de tamanhos diferentes são comparados na REGIÃO DE INTERSEÇÃO
 *   top-left (crop via pngjs), com comparedRegion e fullDimensionsCompared
 *   reportados — nunca resize aproximado apresentado como verdade.
 * - diffImagePath só existe quando diffPixels > 0 (não gera artefato vazio).
 */

import { mkdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import { newOperationId, ok, type Result } from '@nexo/shared';

import { captureRenderedPage } from './capture.js';
import type { BrowserSession } from './browser.js';
import type { CollectIssuesOptions } from './diagnose.js';
import type { CompareResult, Viewport, ViewportCapture, ViewportPairDiff } from './types.js';

/** Threshold do pixelmatch (0..1): sensibilidade de cor por pixel. Documentado (09§45). */
export const PIXELMATCH_THRESHOLD = 0.1;
/** Anti-aliasing NÃO conta como diff (includeAA false): reduz ruído de fontes. */
export const PIXELMATCH_INCLUDE_AA = false;

/** Crop top-left de um PNG para (width x height) — região de interseção. */
function cropPng(png: PNG, width: number, height: number): PNG {
  const out = new PNG({ width, height });
  PNG.bitblt(png, out, 0, 0, width, height, 0, 0);
  return out;
}

export interface DiffImagesResult {
  diffPixels: number;
  diffPercentage: number; // 0..100 sobre a região comparada
  comparedRegion: { width: number; height: number };
  fullDimensionsCompared: boolean;
  diffImage: PNG | null; // presente quando diffPixels > 0
}

/** Diff pixelmatch entre dois buffers PNG (crop para interseção quando necessário). */
export function diffPngBuffers(a: Buffer, b: Buffer): DiffImagesResult {
  const imgA = PNG.sync.read(a);
  const imgB = PNG.sync.read(b);
  const width = Math.min(imgA.width, imgB.width);
  const height = Math.min(imgA.height, imgB.height);
  const fullDimensionsCompared = imgA.width === imgB.width && imgA.height === imgB.height;
  const cropA = fullDimensionsCompared ? imgA : cropPng(imgA, width, height);
  const cropB = fullDimensionsCompared ? imgB : cropPng(imgB, width, height);
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(cropA.data, cropB.data, diff.data, width, height, {
    threshold: PIXELMATCH_THRESHOLD,
    includeAA: PIXELMATCH_INCLUDE_AA,
  });
  const total = width * height;
  return {
    diffPixels,
    diffPercentage: total > 0 ? Number(((diffPixels / total) * 100).toFixed(4)) : 0,
    comparedRegion: { width, height },
    fullDimensionsCompared,
    diffImage: diffPixels > 0 ? diff : null,
  };
}

export interface CompareInput {
  projectId: string;
  route: string;
  previewUrl: string;
  viewports: Viewport[];
  session: BrowserSession;
  /** Diretório para artefatos (captures + diff images). */
  artifactsDir: string;
  collectOptions?: CollectIssuesOptions;
}

/**
 * Compara N viewports (09§43): captura cada um no preview real e gera diffs
 * pareados (pixelmatch). Retorna também os diagnósticos por viewport
 * (comparação estrutural equivalente — útil quando dimensões diferem).
 */
export async function compareViewports(input: CompareInput): Promise<Result<CompareResult>> {
  const runId = newOperationId();
  const runDir = path.join(input.artifactsDir, 'compare', runId);
  mkdirSync(runDir, { recursive: true });

  const captures: ViewportCapture[] = [];
  const images = new Map<string, Buffer>();

  for (const viewport of input.viewports) {
    const capture = await captureRenderedPage(input.session, input.previewUrl, viewport, {
      collectOptions: input.collectOptions,
    });
    if (!capture.ok) return capture;
    const imagePath = path.join(runDir, `${viewport.id}.png`);
    await fs.writeFile(imagePath, capture.value.image);
    images.set(viewport.id, capture.value.image);
    captures.push({ viewport, imagePath, issues: capture.value.issues });
  }

  const diffs: ViewportPairDiff[] = [];
  for (let i = 0; i < captures.length; i++) {
    for (let j = i + 1; j < captures.length; j++) {
      const a = captures[i]!;
      const b = captures[j]!;
      const bufA = images.get(a.viewport.id)!;
      const bufB = images.get(b.viewport.id)!;
      const diff = diffPngBuffers(bufA, bufB);
      let diffImagePath: string | undefined;
      if (diff.diffImage !== null) {
        diffImagePath = path.join(runDir, `diff-${a.viewport.id}-${b.viewport.id}.png`);
        await fs.writeFile(diffImagePath, PNG.sync.write(diff.diffImage));
      }
      diffs.push({
        viewportA: a.viewport.id,
        viewportB: b.viewport.id,
        diffPixels: diff.diffPixels,
        diffPercentage: diff.diffPercentage,
        comparedRegion: diff.comparedRegion,
        fullDimensionsCompared: diff.fullDimensionsCompared,
        ...(diffImagePath !== undefined ? { diffImagePath } : {}),
        algorithm: { name: 'pixelmatch', threshold: PIXELMATCH_THRESHOLD, includeAA: PIXELMATCH_INCLUDE_AA },
      });
    }
  }

  return ok({ projectId: input.projectId, route: input.route, captures, diffs });
}
