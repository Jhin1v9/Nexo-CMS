/**
 * Stress Testing (doc 09§32-§33; D14: conjunto FIXO de perfis, documentados).
 *
 * ISOLAMENTO (09§33): toda mutação é injeção no DOM em runtime via
 * page.evaluate — Temporary Test State / Non-Persistent Rendering. NADA é
 * escrito no Source Project; a página é recarregada ao final (DOM volta ao
 * estado servido) e a integridade é PROVADA por hash da árvore de arquivos
 * antes/depois (source-hash.ts), reportado em sourceIntegrity.
 */

import type { Page } from 'playwright';

import { ok, type Result } from '@nexo/shared';

import { collectDiagnosticIssues, type CollectIssuesOptions } from './diagnose.js';
import { hashSourceTree } from './source-hash.js';
import type {
  SourceIntegrityProof,
  StressProfile,
  StressProfileId,
  StressTestResult,
  Viewport,
} from './types.js';

/**
 * Perfis FIXOS (D14) — parâmetros documentados, sem perfil ad-hoc.
 * extremeViewport não injeta DOM: re-renderiza em viewport extremo (09§32
 * "Small Viewport / Large Viewport"); default = small extremo 240x320.
 */
export const STRESS_PROFILES: Readonly<Record<StressProfileId, StressProfile>> = {
  longHeading: {
    id: 'longHeading',
    description: 'Substitui o texto do primeiro heading (h1-h3) por string de 400 chars (runtime DOM only)',
    params: { length: 400, target: 'h1, h2, h3' },
  },
  longButtonText: {
    id: 'longButtonText',
    description: 'Substitui o texto do primeiro botão por label de 120 chars (runtime DOM only)',
    params: { length: 120, target: 'button, [role="button"]' },
  },
  manyItems: {
    id: 'manyItems',
    description: 'Clona o primeiro item da primeira lista (ul/ol) até 50 itens (runtime DOM only)',
    params: { count: 50, target: 'ul, ol' },
  },
  missingImage: {
    id: 'missingImage',
    description: 'Aponta todas as <img> para um src inexistente e remove srcset (runtime DOM only)',
    params: { missingSrc: '/__nexo_missing_image__.png' },
  },
  extremeViewport: {
    id: 'extremeViewport',
    description: 'Re-renderiza sem injeção de DOM em viewport extremo (default 240x320)',
    params: { width: 240, height: 320 },
  },
};

/**
 * Injeções in-page (auto-contidas para page.evaluate). Retornam string
 * descrevendo a mutação aplicada — ou prefixo 'NO_TARGET:' quando o perfil
 * não se aplica à página (reportado honestamente, nunca fingido).
 */
const INJECTORS: Record<Exclude<StressProfileId, 'extremeViewport'>, (params: Record<string, number | string>) => string> = {
  longHeading(params) {
    const h = document.querySelector('h1, h2, h3');
    if (!h) return 'NO_TARGET:no heading (h1-h3) found on the page';
    const length = Number(params['length'] ?? 400);
    const text = 'Nexo stress heading '.repeat(Math.ceil(length / 20)).slice(0, length);
    h.textContent = text;
    return `heading replaced with ${text.length}-char string (runtime DOM only)`;
  },
  longButtonText(params) {
    const b = document.querySelector('button, [role="button"]');
    if (!b) return 'NO_TARGET:no button found on the page';
    const length = Number(params['length'] ?? 120);
    const text = 'Stress button label '.repeat(Math.ceil(length / 20)).slice(0, length);
    b.textContent = text;
    return `button label replaced with ${text.length}-char string (runtime DOM only)`;
  },
  manyItems(params) {
    const list = document.querySelector('ul, ol');
    if (!list || list.children.length === 0) return 'NO_TARGET:no non-empty list (ul/ol) found on the page';
    const count = Number(params['count'] ?? 50);
    const template = list.children[0]!;
    const current = list.children.length;
    for (let i = current; i < count; i++) {
      const clone = template.cloneNode(true);
      list.appendChild(clone);
    }
    return `list grown from ${current} to ${list.children.length} items (runtime DOM only)`;
  },
  missingImage(params) {
    const src = String(params['missingSrc'] ?? '/__nexo_missing_image__.png');
    const imgs = Array.from(document.querySelectorAll('img'));
    if (imgs.length === 0) return 'NO_TARGET:no <img> found on the page';
    for (const img of imgs) {
      img.removeAttribute('srcset');
      img.setAttribute('src', src);
    }
    return `${imgs.length} image(s) pointed to missing src '${src}' (runtime DOM only)`;
  },
};

/** Aguarda layout assentar sem sleep arbitrário: dois requestAnimationFrame. */
async function settleLayout(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export interface RunStressInput {
  page: Page;
  profile: StressProfileId;
  viewport: Viewport;
  route: string;
  rootPath: string;
  collectOptions?: CollectIssuesOptions;
}

/**
 * Executa UM perfil fixo contra a página já carregada e retorna diagnóstico +
 * prova de zero mutação do Source Project (hash antes/depois — 09§33).
 * A página sai da função RELOADED (DOM restaurado ao estado servido).
 */
export async function runStressProfileOnPage(input: RunStressInput): Promise<Result<StressTestResult>> {
  const profile = STRESS_PROFILES[input.profile];

  const before = await hashSourceTree(input.rootPath);

  let appliedMutation = 'no DOM injection (viewport-only profile)';
  if (input.profile !== 'extremeViewport') {
    appliedMutation = await input.page.evaluate(INJECTORS[input.profile], profile.params);
    await settleLayout(input.page);
    if (input.profile === 'missingImage') {
      // Aguarda as requests 404 das imagens quebradas (best-effort, timeout real).
      await input.page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    }
  }

  const issuesResult = await collectDiagnosticIssues(input.page, input.viewport, input.collectOptions ?? {});
  if (!issuesResult.ok) return issuesResult;

  // Restaura o DOM ao estado servido (Non-Persistent Rendering — 09§33).
  await input.page.reload({ waitUntil: 'load' }).catch(() => undefined);

  const after = await hashSourceTree(input.rootPath);
  const sourceIntegrity: SourceIntegrityProof = {
    beforeHash: before.hash,
    afterHash: after.hash,
    mutated: before.hash !== after.hash,
    scope: {
      hashedFiles: after.hashedFiles,
      excludedDirs: before.excludedDirs,
    },
  };

  const result: StressTestResult = {
    profile: input.profile,
    viewport: input.viewport,
    route: input.route,
    appliedMutation,
    issues: issuesResult.value,
    sourceIntegrity,
  };
  return ok(result);
}
