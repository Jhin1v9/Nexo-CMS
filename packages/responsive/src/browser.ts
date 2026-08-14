/**
 * Browser layer (doc 09§46-§47; D14: Playwright SOMENTE para diagnósticos
 * responsive — nenhuma operação privilegiada depende disto, M3 §8.3).
 *
 * - Chromium headless real via Playwright. Se o browser não estiver
 *   disponível (binário ausente, launch falhou), o erro é HONESTO:
 *   UNSUPPORTED + details.reason = BROWSER_UNAVAILABLE + nextAction.
 *   Nunca fake rendering.
 * - BrowserCapabilityDetection (09§47): cada capacidade é testada por um PROBE
 *   real após o launch — nada é assumido ("Do not assume every browser
 *   environment exposes identical functionality").
 * - Toda operação tem timeout real; close() encerra o browser de verdade.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

import { err, ok, type Result } from '@nexo/shared';

import { responsiveError } from './errors.js';
import type { BrowserCapabilities, Viewport } from './types.js';

export const DEFAULT_BROWSER_LAUNCH_TIMEOUT_MS = 30_000;
export const DEFAULT_NAVIGATION_TIMEOUT_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;

export interface BrowserSession {
  readonly capabilities: BrowserCapabilities;
  /** Página nova com viewport aplicado (width/height/dpr). */
  newPage(viewport: Viewport): Promise<Result<Page>>;
  /** Encerra o browser. Idempotente. */
  close(): Promise<void>;
  isClosed(): boolean;
}

export interface BrowserManagerOptions {
  /** executablePath explícito (default: chromium do Playwright). */
  executablePath?: string;
  launchTimeoutMs?: number;
  navigationTimeoutMs?: number;
}

export interface BrowserManager {
  /** Lança (ou reutiliza) a sessão de browser. BROWSER_UNAVAILABLE se falhar. */
  launch(): Promise<Result<BrowserSession>>;
  close(): Promise<void>;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`probe timeout after ${ms}ms`)), ms)),
  ]);
}

async function probeCapabilities(
  browser: Browser,
  navigationTimeoutMs: number,
): Promise<BrowserCapabilities> {
  const base: BrowserCapabilities = {
    viewportResize: false,
    screenshots: false,
    domInspection: false,
    boundingBoxes: false,
    computedStyles: false,
    consoleLogs: false,
    network: false,
    engine: 'chromium',
    engineVersion: browser.version(),
  };
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(navigationTimeoutMs);
    await withTimeout(page.goto('about:blank'), PROBE_TIMEOUT_MS);

    // Viewport Resize (09§47): aplicar tamanho arbitrário e medir de volta.
    try {
      await withTimeout(page.setViewportSize({ width: 517, height: 389 }), PROBE_TIMEOUT_MS);
      const w = await withTimeout(page.evaluate(() => window.innerWidth), PROBE_TIMEOUT_MS);
      base.viewportResize = w === 517;
    } catch {
      base.viewportResize = false;
    }

    // Screenshots.
    try {
      const buf = await withTimeout(page.screenshot({ type: 'png' }), PROBE_TIMEOUT_MS);
      base.screenshots = buf.length > 0;
    } catch {
      base.screenshots = false;
    }

    // DOM Inspection + Bounding Boxes + Computed Styles.
    try {
      base.domInspection = await withTimeout(
        page.evaluate(() => document.documentElement !== null && typeof document.querySelector === 'function'),
        PROBE_TIMEOUT_MS,
      );
    } catch {
      base.domInspection = false;
    }
    try {
      base.boundingBoxes = await withTimeout(
        page.evaluate(() => {
          const r = document.body.getBoundingClientRect();
          return typeof r.width === 'number' && typeof r.height === 'number';
        }),
        PROBE_TIMEOUT_MS,
      );
    } catch {
      base.boundingBoxes = false;
    }
    try {
      base.computedStyles = await withTimeout(
        page.evaluate(() => typeof getComputedStyle(document.body).display === 'string'),
        PROBE_TIMEOUT_MS,
      );
    } catch {
      base.computedStyles = false;
    }

    // Console Logs: evento real de console capturado pelo listener.
    try {
      base.consoleLogs = await withTimeout(
        new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(false), PROBE_TIMEOUT_MS - 500);
          page.on('console', (msg) => {
            if (msg.text().includes('__nexo_probe__')) {
              clearTimeout(timer);
              resolve(true);
            }
          });
          void page.evaluate(() => console.log('__nexo_probe__'));
        }),
        PROBE_TIMEOUT_MS,
      );
    } catch {
      base.consoleLogs = false;
    }

    // Network Information: sessão CDP real com Network.enable.
    try {
      const cdp = await withTimeout(context.newCDPSession(page), PROBE_TIMEOUT_MS);
      await withTimeout(cdp.send('Network.enable'), PROBE_TIMEOUT_MS);
      await cdp.detach();
      base.network = true;
    } catch {
      base.network = false;
    }
  } catch {
    // Se nem uma página abre, todas as capacidades ficam false (honesto).
  } finally {
    if (context) await context.close().catch(() => undefined);
  }
  return base;
}

class PlaywrightBrowserSession implements BrowserSession {
  private closed = false;

  constructor(
    private readonly browser: Browser,
    readonly capabilities: BrowserCapabilities,
    private readonly navigationTimeoutMs: number,
  ) {}

  async newPage(viewport: Viewport): Promise<Result<Page>> {
    if (this.closed) {
      return err(
        responsiveError('INTERNAL', 'BROWSER_UNAVAILABLE', 'browser session is closed', {
          retryable: true,
          nextAction: 'lance uma nova sessao de browser',
        }),
      );
    }
    try {
      const context = await this.browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        ...(viewport.dpr !== undefined ? { deviceScaleFactor: viewport.dpr } : {}),
      });
      const page = await context.newPage();
      page.setDefaultTimeout(this.navigationTimeoutMs);
      page.setDefaultNavigationTimeout(this.navigationTimeoutMs);
      return ok(page);
    } catch (cause) {
      return err(
        responsiveError('INTERNAL', 'BROWSER_UNAVAILABLE', `failed to create page: ${(cause as Error).message}`, {
          retryable: true,
          details: { cause: (cause as Error).message },
        }),
      );
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.browser.close().catch(() => undefined);
  }

  isClosed(): boolean {
    return this.closed;
  }
}

export function createBrowserManager(opts: BrowserManagerOptions = {}): BrowserManager {
  const launchTimeoutMs = opts.launchTimeoutMs ?? DEFAULT_BROWSER_LAUNCH_TIMEOUT_MS;
  const navigationTimeoutMs = opts.navigationTimeoutMs ?? DEFAULT_NAVIGATION_TIMEOUT_MS;
  let session: BrowserSession | null = null;

  return {
    async launch() {
      if (session && !session.isClosed()) return ok(session);
      let browser: Browser;
      try {
        browser = await chromium.launch({
          headless: true,
          timeout: launchTimeoutMs,
          ...(opts.executablePath !== undefined ? { executablePath: opts.executablePath } : {}),
        });
      } catch (cause) {
        return err(
          responsiveError('UNSUPPORTED', 'BROWSER_UNAVAILABLE', `chromium launch failed: ${(cause as Error).message}`, {
            retryable: true,
            nextAction: "instale o browser de diagnostico: 'pnpm exec playwright install chromium' (D14: Playwright somente para responsive diagnostics)",
            details: { cause: (cause as Error).message },
          }),
        );
      }
      const capabilities = await probeCapabilities(browser, navigationTimeoutMs);
      session = new PlaywrightBrowserSession(browser, capabilities, navigationTimeoutMs);
      return ok(session);
    },
    async close() {
      if (session) await session.close();
      session = null;
    },
  };
}
