/**
 * responsive.stressTest (09§32-33; D14 perfis fixos): injeção no DOM em
 * runtime, NUNCA persistida. Prova de zero mutação: hash sha256 da árvore do
 * Source Project antes/depois DEVE ser idêntico (sourceIntegrity).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createResponsiveService, STRESS_PROFILES, type ResponsiveService } from '../src/index.js';
import { chromiumAvailable, createFixtureProject, type FixtureProject } from './helpers.js';

const HAS_CHROMIUM = chromiumAvailable();

describe('responsive.stressTest (09§32-33, D14)', () => {
  let fixture: FixtureProject;
  let service: ResponsiveService;
  let vp375 = '';

  beforeAll(async () => {
    fixture = await createFixtureProject();
    const s = createResponsiveService({
      storage: fixture.storage,
      dataDir: fixture.dataDir,
      timeouts: { previewStartupMs: 90_000 },
    });
    if (!s.ok) throw new Error(s.error.message);
    service = s.value;
    const v = service.viewportCreate({ name: 'stress-375', width: 375, height: 812 });
    if (!v.ok) throw new Error('viewport create failed');
    vp375 = v.value.id;
  }, 60_000);

  afterAll(async () => {
    await service.close();
    await fixture.cleanup();
  });

  it('perfis são FIXOS e documentados (D14): exatamente os 5 do contrato', () => {
    expect(Object.keys(STRESS_PROFILES).sort()).toEqual(
      ['extremeViewport', 'longButtonText', 'longHeading', 'manyItems', 'missingImage'].sort(),
    );
    for (const p of Object.values(STRESS_PROFILES)) {
      expect(p.description.length).toBeGreaterThan(0);
      expect(Object.keys(p.params).length).toBeGreaterThan(0);
    }
  });

  it.skipIf(!HAS_CHROMIUM)(
    'longButtonText: wrapping forçado detectado E zero mutação no Source Project (09§33)',
    async () => {
      const r = await service.stressTest({ projectId: fixture.projectId, viewportId: vp375, profile: 'longButtonText' });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.appliedMutation).toContain('button');
      // Prova empírica: hash da árvore do fixture ANTES == DEPOIS.
      expect(r.value.sourceIntegrity.mutated).toBe(false);
      expect(r.value.sourceIntegrity.beforeHash).toBe(r.value.sourceIntegrity.afterHash);
      expect(r.value.sourceIntegrity.scope.hashedFiles).toBeGreaterThan(0);
      // 120 chars num botão de 140px -> muitas linhas (detectável).
      const wrap = r.value.issues.find((i) => i.kind === 'UNWANTED_WRAPPING' && i.element.tagName === 'button');
      expect(wrap).toBeDefined();
      if (wrap) expect(wrap.evidence.measurements['lineCount']).toBeGreaterThanOrEqual(2);
    },
    180_000,
  );

  it.skipIf(!HAS_CHROMIUM)(
    'missingImage: injeção runtime-only + integridade do fixture intacta (hash idêntico)',
    async () => {
      const r = await service.stressTest({ projectId: fixture.projectId, viewportId: vp375, profile: 'missingImage' });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.appliedMutation).toContain('image');
      expect(r.value.sourceIntegrity.mutated).toBe(false);
      expect(r.value.sourceIntegrity.beforeHash).toBe(r.value.sourceIntegrity.afterHash);
    },
    180_000,
  );

  it.skipIf(!HAS_CHROMIUM)(
    'extremeViewport (240x320): overflow maior que no viewport base + zero mutação',
    async () => {
      const r = await service.stressTest({ projectId: fixture.projectId, viewportId: vp375, profile: 'extremeViewport' });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.appliedMutation).toContain('no DOM injection');
      expect(r.value.sourceIntegrity.mutated).toBe(false);
      const overflow = r.value.issues.find((i) => i.element.selector.includes('wide-fixed'));
      expect(overflow).toBeDefined();
      if (!overflow) return;
      // 500px fixos em viewport 240px -> 260px de overflow (tolerância 3px).
      expect(overflow.evidence.measurements['overflowXPx']).toBeGreaterThanOrEqual(255);
      expect(overflow.evidence.measurements['overflowXPx']).toBeLessThanOrEqual(265);
      expect(overflow.viewport).toEqual({ width: 240, height: 320 });
    },
    180_000,
  );

  it('perfil desconhecido -> INVALID_INPUT com perfis disponíveis (nunca inventa)', async () => {
    const r = await service.stressTest({
      projectId: fixture.projectId,
      viewportId: vp375,
      profile: 'randomChaos' as never,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
    expect(r.error.details?.['availableProfiles']).toEqual(expect.arrayContaining(['longHeading', 'extremeViewport']));
  }, 30_000);
});
