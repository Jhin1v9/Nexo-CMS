/**
 * Snapshot visual (doc 09§44; M3 §3.5 responsive.snapshot).
 *
 * Persiste: imagem PNG em <dataDir>/snapshots/<id>.png + metadata via
 * @nexo/storage (migration v3). Snapshots NÃO são o Source Project (09§44):
 * sourceState é apenas uma referência observada (hash da árvore de arquivos),
 * sem autoridade sobre o projeto.
 */

import { mkdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { newOperationId, ok, type Result } from '@nexo/shared';
import type { Storage } from '@nexo/storage';

import { captureRenderedPage, type CaptureOptions } from './capture.js';
import type { BrowserSession } from './browser.js';
import { hashSourceTree } from './source-hash.js';
import type { Snapshot, Viewport } from './types.js';

export interface SnapshotInput {
  projectId: string;
  route: string;
  previewUrl: string;
  viewport: Viewport;
  rootPath: string;
  session: BrowserSession;
  storage: Storage;
  dataDir: string;
  captureOptions?: CaptureOptions;
}

export async function captureSnapshot(input: SnapshotInput): Promise<Result<Snapshot>> {
  const capture = await captureRenderedPage(input.session, input.previewUrl, input.viewport, input.captureOptions ?? {});
  if (!capture.ok) return capture;

  const id = newOperationId();
  const snapshotsDir = path.join(input.dataDir, 'snapshots');
  mkdirSync(snapshotsDir, { recursive: true });
  const imagePath = path.join(snapshotsDir, `${id}.png`);
  await fs.writeFile(imagePath, capture.value.image);

  // Referência de estado do source (09§44 "Source State"): hash da árvore.
  // NÃO é fingerprint de Project Intelligence nem autoridade sobre o projeto.
  const tree = await hashSourceTree(input.rootPath);
  const sourceState = `tree-sha256:${tree.hash.slice(0, 16)}${tree.truncated ? ' (truncated)' : ''}`;

  const timestamp = new Date().toISOString();
  const snapshot: Snapshot = {
    id,
    project: input.projectId,
    viewport: input.viewport,
    route: input.route,
    sourceState,
    timestamp,
    previewRef: input.previewUrl,
    imagePath,
    diagnostics: capture.value.issues,
  };

  input.storage.repos.responsiveSnapshots.insert({
    id,
    projectId: input.projectId,
    viewportId: input.viewport.id,
    route: input.route,
    sourceState,
    previewRef: input.previewUrl,
    imagePath,
    diagnosticsJson: JSON.stringify(capture.value.issues),
    createdAt: timestamp,
  });

  return ok(snapshot);
}
