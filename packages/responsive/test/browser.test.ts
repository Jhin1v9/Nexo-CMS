/**
 * Browser layer (09§46-47): capability detection por probes REAIS e erro
 * honesto BROWSER_UNAVAILABLE quando o browser não existe (executor/binário
 * sabotado — nunca fake rendering).
 *
 * JUSTIFICATIVA DE SKIP CONDICIONAL: se o chromium do Playwright não estiver
 * instalado no ambiente (falha de rede no setup), os probes reais são
 * impossíveis e D14 proíbe simular — skip honesto, nunca verde fingido.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { createBrowserManager, type BrowserManager } from '../src/index.js';
import { chromiumAvailable } from './helpers.js';

const HAS_CHROMIUM = chromiumAvailable();

describe('BrowserManager (09§46-47)', () => {
  let manager: BrowserManager | null = null;

  afterEach(async () => {
    await manager?.close();
    manager = null;
  });

  it.skipIf(!HAS_CHROMIUM)(
    'capability detection real: chromium headless expõe todas as capacidades (09§47)',
    async () => {
      manager = createBrowserManager();
      const launched = await manager.launch();
      expect(launched.ok).toBe(true);
      if (!launched.ok) return;
      const caps = launched.value.capabilities;
      expect(caps.engine).toBe('chromium');
      expect(caps.engineVersion.length).toBeGreaterThan(0);
      expect(caps.viewportResize).toBe(true);
      expect(caps.screenshots).toBe(true);
      expect(caps.domInspection).toBe(true);
      expect(caps.boundingBoxes).toBe(true);
      expect(caps.computedStyles).toBe(true);
      expect(caps.consoleLogs).toBe(true);
      expect(caps.network).toBe(true);
    },
    60_000, // launch + probes reais podem ser lentos em CI
  );

  it('binário inexistente -> erro honesto BROWSER_UNAVAILABLE com nextAction (nunca fake)', async () => {
    manager = createBrowserManager({ executablePath: '/definitely/missing/chromium-binary', launchTimeoutMs: 5_000 });
    const launched = await manager.launch();
    expect(launched.ok).toBe(false);
    if (launched.ok) return;
    expect(launched.error.code).toBe('UNSUPPORTED');
    expect(launched.error.details?.['reason']).toBe('BROWSER_UNAVAILABLE');
    expect(String(launched.error.details?.['nextAction'])).toContain('playwright install chromium');
  }, 30_000);

  it.skipIf(!HAS_CHROMIUM)('newPage aplica viewport arbitrário 375x812 e dpr (09§24/§26)', async () => {
    manager = createBrowserManager();
    const launched = await manager.launch();
    expect(launched.ok).toBe(true);
    if (!launched.ok) return;
    const pageResult = await launched.value.newPage({ id: 't', width: 375, height: 812, dpr: 3, orientation: 'Portrait' });
    expect(pageResult.ok).toBe(true);
    if (!pageResult.ok) return;
    const page = pageResult.value;
    await page.goto('about:blank');
    const measured = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }));
    expect(measured).toEqual({ w: 375, h: 812, dpr: 3 });
    await page.context().close();
  }, 60_000);
});
