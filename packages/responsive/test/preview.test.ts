/**
 * responsive.preview (09§27): dev server REAL do projeto via script detectado
 * (nunca assume 'dev'), URL real aguardada por polling HTTP, reuse e stop.
 * Timeout elevado JUSTIFICADO: cold start real do vite.
 */

import { mkdtemp } from 'node:fs/promises';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newOperationId } from '@nexo/shared';

import { createResponsiveService, type ResponsiveService } from '../src/index.js';
import { chromiumAvailable, createFixtureProject, type FixtureProject } from './helpers.js';

const HAS_CHROMIUM = chromiumAvailable(); // preview não usa browser; mantido p/ simetria dos gates
void HAS_CHROMIUM;

describe('responsive.preview (09§27)', () => {
  let fixture: FixtureProject;
  let service: ResponsiveService;
  let mobileId = '';

  beforeAll(async () => {
    fixture = await createFixtureProject();
    const s = createResponsiveService({
      storage: fixture.storage,
      dataDir: fixture.dataDir,
      timeouts: { previewStartupMs: 90_000 },
    });
    if (!s.ok) throw new Error(s.error.message);
    service = s.value;
    const v = service.viewportCreate({ name: 'mobile-test', width: 375, height: 812 });
    if (!v.ok) throw new Error('viewport create failed');
    mobileId = v.value.id;
  }, 60_000);

  afterAll(async () => {
    await service.close(); // encerra dev server — zero processo órfão
    await fixture.cleanup();
  });

  it('sobe o dev server REAL via script detectado e a URL responde', async () => {
    const r = await service.preview({ projectId: fixture.projectId, viewportId: mobileId });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.state).toBe('RUNNING');
    expect(r.value.reused).toBe(false);
    expect(r.value.scriptName).toBe('dev'); // declarado no package.json do fixture
    expect(r.value.pid).toBeGreaterThan(0);
    const res = await fetch(r.value.previewUrl, { signal: AbortSignal.timeout(5_000) });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('root');
  }, 120_000);

  it('reusa o preview existente (09§27 Start/Reuse)', async () => {
    const r = await service.preview({ projectId: fixture.projectId, viewportId: mobileId });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.reused).toBe(true);
  }, 30_000);

  it('projeto sem script de dev -> PREVIEW_SCRIPT_UNKNOWN com scripts disponíveis (nunca assume)', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nexo-nodev-'));
    try {
      await fs.writeFile(
        path.join(root, 'package.json'),
        JSON.stringify({ name: 'no-dev', scripts: { build: 'vite build', test: 'vitest run' } }),
        'utf8',
      );
      const projectId = newOperationId();
      const now = new Date().toISOString();
      fixture.storage.repos.projects.insert({
        id: projectId,
        name: 'no-dev',
        rootPath: root,
        fingerprint: 'x',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      });
      const r = await service.preview({ projectId, viewportId: mobileId });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.details?.['reason']).toBe('PREVIEW_SCRIPT_UNKNOWN');
      expect(r.error.details?.['availableScripts']).toEqual(['build', 'test']);
      expect(String(r.error.details?.['nextAction'])).toContain('dev');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 30_000);

  it('projeto não registrado -> PROJECT_NOT_FOUND com nextAction', async () => {
    const r = await service.preview({ projectId: 'nope', viewportId: mobileId });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
    expect(r.error.details?.['reason']).toBe('PROJECT_NOT_FOUND');
  }, 30_000);

  it('stopPreview encerra o processo de verdade (zero órfão)', async () => {
    const running = await service.preview({ projectId: fixture.projectId, viewportId: mobileId });
    expect(running.ok).toBe(true);
    if (!running.ok) return;
    const url = running.value.previewUrl;
    const stopped = await service.stopPreview(fixture.projectId);
    expect(stopped.ok).toBe(true);
    // Após o stop, a URL NÃO responde mais (prova de encerramento real).
    const after = await fetch(url, { signal: AbortSignal.timeout(3_000) }).then(
      (res) => res.status,
      (e: Error) => `unreachable:${e.message}`,
    );
    expect(String(after)).toContain('unreachable');
  }, 60_000);
});
