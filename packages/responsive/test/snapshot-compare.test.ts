/**
 * responsive.snapshot (09§44) + responsive.compare (09§43; pixelmatch D14).
 * Snapshot persiste imagem REAL + metadata via storage; snapshots NÃO são o
 * Source Project. Compare entre 2 viewports retorna diff mensurável.
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createResponsiveService, PIXELMATCH_THRESHOLD, type ResponsiveService } from '../src/index.js';
import { chromiumAvailable, createFixtureProject, type FixtureProject } from './helpers.js';

const HAS_CHROMIUM = chromiumAvailable();
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('responsive.snapshot + responsive.compare (09§43-44)', () => {
  let fixture: FixtureProject;
  let service: ResponsiveService;
  let vp375 = '';
  let vp1366 = '';

  beforeAll(async () => {
    fixture = await createFixtureProject();
    const s = createResponsiveService({
      storage: fixture.storage,
      dataDir: fixture.dataDir,
      timeouts: { previewStartupMs: 90_000 },
    });
    if (!s.ok) throw new Error(s.error.message);
    service = s.value;
    const a = service.viewportCreate({ name: 'snap-375', width: 375, height: 812 });
    const b = service.viewportCreate({ name: 'snap-1366', width: 1366, height: 768 });
    if (!a.ok || !b.ok) throw new Error('viewport create failed');
    vp375 = a.value.id;
    vp1366 = b.value.id;
  }, 60_000);

  afterAll(async () => {
    await service.close();
    await fixture.cleanup();
  });

  it.skipIf(!HAS_CHROMIUM)(
    'snapshot salva PNG real + metadata via storage; NÃO é Source Project (09§44)',
    async () => {
      const r = await service.snapshot({ projectId: fixture.projectId, viewportId: vp375 });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const snap = r.value;
      expect(snap.project).toBe(fixture.projectId);
      expect(snap.viewport.width).toBe(375);
      expect(snap.previewRef).toMatch(/^http:\/\/localhost:\d+\//);
      expect(snap.sourceState).toContain('tree-sha256:');

      // Imagem REAL no disco (magic bytes PNG).
      expect(existsSync(snap.imagePath)).toBe(true);
      const bytes = await fs.readFile(snap.imagePath);
      expect(bytes.subarray(0, 4)).toEqual(PNG_MAGIC);
      expect(bytes.length).toBeGreaterThan(1_000);

      // Metadata persistida via storage (Repository Pattern).
      const row = fixture.storage.repos.responsiveSnapshots.getById(snap.id);
      expect(row).not.toBeNull();
      expect(row?.imagePath).toBe(snap.imagePath);
      expect(Array.isArray(snap.diagnostics)).toBe(true);
      // O fixture tem overflow proposital em 375px — o snapshot registra isso.
      expect(snap.diagnostics.some((d) => d.element.selector.includes('wide-fixed'))).toBe(true);
    },
    180_000,
  );

  it.skipIf(!HAS_CHROMIUM)(
    'compare entre 375x812 e 1366x768 retorna diff mensurável (pixelmatch documentado)',
    async () => {
      const r = await service.compare({ projectId: fixture.projectId, viewportIds: [vp375, vp1366] });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.captures).toHaveLength(2);
      for (const c of r.value.captures) {
        expect(existsSync(c.imagePath)).toBe(true);
      }
      expect(r.value.diffs).toHaveLength(1);
      const diff = r.value.diffs[0]!;
      expect(diff.algorithm).toEqual({ name: 'pixelmatch', threshold: PIXELMATCH_THRESHOLD, includeAA: false });
      // Dimensões diferentes -> interseção top-left 375x768, reportada honestamente.
      expect(diff.fullDimensionsCompared).toBe(false);
      expect(diff.comparedRegion).toEqual({ width: 375, height: 768 });
      expect(diff.diffPixels).toBeGreaterThan(0);
      expect(diff.diffPercentage).toBeGreaterThan(0);
      expect(diff.diffImagePath).toBeDefined();
      if (diff.diffImagePath) expect(existsSync(diff.diffImagePath)).toBe(true);
    },
    180_000,
  );

  it.skipIf(!HAS_CHROMIUM)(
    'compare com o MESMO viewport 2x (mesma renderização) -> diff baixo (sanidade do diff)',
    async () => {
      const a = service.viewportCreate({ name: 'same-a', width: 800, height: 600 });
      const b = service.viewportCreate({ name: 'same-b', width: 800, height: 600 });
      if (!a.ok || !b.ok) throw new Error('viewport create failed');
      const r = await service.compare({ projectId: fixture.projectId, viewportIds: [a.value.id, b.value.id] });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const diff = r.value.diffs[0]!;
      expect(diff.fullDimensionsCompared).toBe(true);
      // Mesma página estática no mesmo tamanho: sem animação -> diff ~0.
      expect(diff.diffPercentage).toBeLessThan(2);
    },
    180_000,
  );
});
