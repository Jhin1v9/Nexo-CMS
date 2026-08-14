/**
 * responsive.diagnose (09§29-31, §34-36, §58): browser REAL contra o preview
 * do fixture React+Vite. Evidência em px; certeza ConfirmedIssue para fatos
 * geométricos e PotentialIssue para heurísticas (09§36).
 *
 * Timeouts elevados JUSTIFICADOS: vite cold start + chromium real.
 * Skip condicional: somente sem chromium instalado (D14 proíbe fake).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createBrowserManager, createResponsiveService, type DiagnoseResult, type ResponsiveService } from '../src/index.js';
import { chromiumAvailable, createFixtureProject, type FixtureProject } from './helpers.js';

const HAS_CHROMIUM = chromiumAvailable();

describe('responsive.diagnose (09§29-36)', () => {
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
    const a = service.viewportCreate({ name: 'arbitrary-375', width: 375, height: 812, dpr: 2 });
    const b = service.viewportCreate({ name: 'arbitrary-1366', width: 1366, height: 768 });
    if (!a.ok || !b.ok) throw new Error('viewport create failed');
    vp375 = a.value.id;
    vp1366 = b.value.id;
  }, 60_000);

  afterAll(async () => {
    await service.close();
    await fixture.cleanup();
  });

  it.skipIf(!HAS_CHROMIUM)(
    'detecta overflow horizontal do div 500px no viewport 375px com evidência em px (09§30)',
    async () => {
      const r = await service.diagnose({ projectId: fixture.projectId, viewportId: vp375 });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.browser.engine).toBe('chromium');
      const overflow = r.value.issues.find(
        (i) =>
          (i.kind === 'HORIZONTAL_OVERFLOW' || i.kind === 'BROKEN_FLEX' || i.kind === 'BROKEN_GRID') &&
          i.element.selector.includes('wide-fixed'),
      );
      expect(overflow).toBeDefined();
      if (!overflow) return;
      // 500px fixos - 375px viewport = 125px (body margin 0; tolerância 3px).
      expect(overflow.evidence.measurements['overflowXPx']).toBeGreaterThanOrEqual(120);
      expect(overflow.evidence.measurements['overflowXPx']).toBeLessThanOrEqual(130);
      expect(overflow.certainty).toBe('ConfirmedIssue');
      expect(['WARNING', 'ERROR', 'CRITICAL']).toContain(overflow.severity);
      expect(overflow.viewport).toEqual({ width: 375, height: 812 });
      // Causa inferida apresentada como HIPÓTESE (09§58-59), nunca como fato.
      expect(overflow.suggestedFixes?.some((s) => s.startsWith('Hypothesis (unverified)'))).toBe(true);
      expect(overflow.suggestedFixes?.some((s) => s.includes('fixed width'))).toBe(true);
    },
    180_000,
  );

  it.skipIf(!HAS_CHROMIUM)(
    'detecta unwanted wrapping no botão com texto longo forçado (09§31) como PotentialIssue',
    async () => {
      const r = await service.diagnose({ projectId: fixture.projectId, viewportId: vp375 });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const wrap = r.value.issues.find((i) => i.kind === 'UNWANTED_WRAPPING' && i.element.selector.includes('nav-action'));
      expect(wrap).toBeDefined();
      if (!wrap) return;
      expect(wrap.evidence.measurements['lineCount']).toBeGreaterThanOrEqual(2);
      expect(wrap.certainty).toBe('PotentialIssue'); // intenção não provável (09§36)
      expect(wrap.element.tagName).toBe('button');
    },
    180_000,
  );

  it.skipIf(!HAS_CHROMIUM)(
    'viewport-dependente (09§29): sem overflow do wide-fixed em 1366x768',
    async () => {
      const r: import('@nexo/shared').Result<DiagnoseResult> = await service.diagnose({
        projectId: fixture.projectId,
        viewportId: vp1366,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const overflow = r.value.issues.find(
        (i) => i.element.selector.includes('wide-fixed') && (i.evidence.measurements['overflowXPx'] ?? 0) > 1,
      );
      expect(overflow).toBeUndefined();
    },
    180_000,
  );

  it('browser indisponível -> erro honesto BROWSER_UNAVAILABLE (executor sabotado; nunca fake)', async () => {
    const sabotaged = createResponsiveService({
      storage: fixture.storage,
      dataDir: fixture.dataDir,
      browserManager: createBrowserManager({ executablePath: '/definitely/missing/chromium', launchTimeoutMs: 5_000 }),
      timeouts: { previewStartupMs: 90_000 },
    });
    expect(sabotaged.ok).toBe(true);
    if (!sabotaged.ok) return;
    try {
      const r = await sabotaged.value.diagnose({ projectId: fixture.projectId, viewportId: vp375 });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.details?.['reason']).toBe('BROWSER_UNAVAILABLE');
      expect(String(r.error.details?.['nextAction'])).toContain('playwright install chromium');
    } finally {
      await sabotaged.value.close();
    }
  }, 180_000);
});
