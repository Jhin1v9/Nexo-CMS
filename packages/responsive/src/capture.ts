/**
 * Captura renderizada compartilhada (snapshot/compare/diagnose): abre página
 * com viewport aplicado, navega no preview REAL, aguarda settle e mede.
 * Contexto de browser sempre fechado em finally — nada de página órfã.
 */

import type { Page } from 'playwright';

import { err, ok, type Result } from '@nexo/shared';

import type { BrowserSession } from './browser.js';
import { collectDiagnosticIssues, type CollectIssuesOptions } from './diagnose.js';
import { responsiveError } from './errors.js';
import type { DiagnosticIssue, Viewport } from './types.js';

export interface RenderedCapture {
  image: Buffer; // PNG do viewport (não fullPage — a unidade de análise é o viewport)
  issues: DiagnosticIssue[];
}

export interface CaptureOptions {
  collectOptions?: CollectIssuesOptions;
  navigationTimeoutMs?: number;
  /** Settle extra (imagens/fontes) com timeout real. Default 5s best-effort. */
  networkIdleTimeoutMs?: number;
}

export async function captureRenderedPage(
  session: BrowserSession,
  url: string,
  viewport: Viewport,
  opts: CaptureOptions = {},
): Promise<Result<RenderedCapture>> {
  const pageResult = await session.newPage(viewport);
  if (!pageResult.ok) return pageResult;
  const page: Page = pageResult.value;
  try {
    await page.goto(url, {
      waitUntil: 'load',
      timeout: opts.navigationTimeoutMs ?? 30_000,
    });
    await page
      .waitForLoadState('networkidle', { timeout: opts.networkIdleTimeoutMs ?? 5_000 })
      .catch(() => undefined); // dev servers com HMR mantêm socket aberto: best-effort
    // Dois rAF: layout/imagens do primeiro frame assentados sem sleep fixo.
    await page
      .evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      )
      .catch(() => undefined);

    const image = await page.screenshot({ type: 'png', fullPage: false });
    const issues = await collectDiagnosticIssues(page, viewport, opts.collectOptions ?? {});
    if (!issues.ok) return issues;
    return ok({ image, issues: issues.value });
  } catch (cause) {
    return err(
      responsiveError('INTERNAL', 'PREVIEW_NOT_RESPONDING', `falha ao renderizar '${url}' no browser: ${(cause as Error).message}`, {
        resource: url,
        retryable: true,
        details: { cause: (cause as Error).message },
        nextAction: 'verifique se o preview responde manualmente no browser',
      }),
    );
  } finally {
    await page.context().close().catch(() => undefined);
  }
}
