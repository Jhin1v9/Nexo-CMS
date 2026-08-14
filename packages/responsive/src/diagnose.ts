/**
 * Responsive Diagnostics (doc 09§29-§31, §34-§36, §58-§59).
 *
 * Medição REAL no browser (Playwright): toda evidência é geométrica/computada
 * em px CSS no viewport aplicado. Regras:
 * - Comportamento observado (fato: bounding box excede viewport, scrollWidth >
 *   clientWidth, lineCount > 1) é separado da causa inferida (hipótese) — 09§58.
 * - ConfirmedIssue = fato geométrico medido; PotentialIssue = heurística sem
 *   prova de intenção (ex.: wrapping indesejado — 09§36); Unknown = evidência
 *   insuficiente. Falso positivo NUNCA vira fato.
 * - suggestedFixes são HIPÓTESES de inspeção (09§59) — nunca fix cego (09§60).
 * - Vertical: scroll vertical de página é comportamento NORMAL; só reportamos
 *   overflow vertical de elementos FIXED (inalcançáveis por scroll) e clipping
 *   vertical com overflow hidden/clip (decisão documentada).
 */

import type { Page } from 'playwright';

import { newOperationId, ok, type Result } from '@nexo/shared';

import type {
  DiagnosticEvidence,
  DiagnosticIssue,
  DiagnosticKind,
  DiagnosticSeverity,
  ElementRef,
  SourceMapperFn,
  Viewport,
} from './types.js';

/** Tolerância sub-pixel (bordas/arredondamento de layout). */
export const DEFAULT_EPSILON_PX = 1;
/** Teto por kind para não inundar o consumidor (09§34). */
export const DEFAULT_MAX_ISSUES_PER_KIND = 25;

/**
 * Limiares de severidade por impacto mensurável (09§35), em px de overflow:
 * < 8 INFO; < 64 WARNING; <= 50% da largura do viewport ERROR; acima CRITICAL.
 */
export function severityForOverflow(overflowPx: number, viewportWidthPx: number): DiagnosticSeverity {
  if (overflowPx < 8) return 'INFO';
  if (overflowPx < 64) return 'WARNING';
  if (overflowPx <= viewportWidthPx * 0.5) return 'ERROR';
  return 'CRITICAL';
}

// ---------------------------------------------------------------------------
// Tipos do payload bruto coletado dentro da página (serializável)
// ---------------------------------------------------------------------------

interface RawElementMetrics {
  selector: string;
  tagName: string;
  id: string | null;
  classList: string[];
  textPreview: string | null;
  box: { x: number; y: number; width: number; height: number };
  computed: Record<string, string>;
  parentDisplay: string | null;
  overflowRightPx: number;
  overflowLeftPx: number;
  overflowBottomPx: number;
  scrollOverflowXPx: number;
  scrollOverflowYPx: number;
  lineCount: number | null;
  naturalWidth: number | null;
  clientWidthPx: number;
}

interface RawDiagnostics {
  viewportWidthPx: number;
  viewportHeightPx: number;
  docScrollWidthPx: number;
  docClientWidthPx: number;
  elements: RawElementMetrics[];
  truncated: boolean;
}

/**
 * Coletor executado DENTRO da página via page.evaluate. AUTO-CONTIDO por
 * construção (serializado via toString pelo Playwright): constantes vivem no
 * corpo da função — qualquer referência a escopo de módulo quebraria no
 * browser (ReferenceError).
 */
function collectRawDiagnostics(opts: { epsilonPx: number }): RawDiagnostics {
  const MAX_WALK_ELEMENTS = 3_000;
  const WRAP_SELECTOR = 'button, [role="button"], nav a, h1, h2, h3, h4, h5, h6';
  // [chave do payload, propriedade CSS kebab-case]
  const COMPUTED_PROPS: Array<[string, string]> = [
    ['display', 'display'],
    ['position', 'position'],
    ['overflowX', 'overflow-x'],
    ['overflowY', 'overflow-y'],
    ['whiteSpace', 'white-space'],
    ['width', 'width'],
    ['height', 'height'],
    ['fontSize', 'font-size'],
    ['lineHeight', 'line-height'],
    ['boxSizing', 'box-sizing'],
  ];
  const eps = opts.epsilonPx;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const doc = document.documentElement;

  const buildSelector = (el: Element): string => {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node !== document.body && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      const cls = Array.from(node.classList)
        .slice(0, 2)
        .map((c) => `.${CSS.escape(c)}`)
        .join('');
      part += cls;
      if (!cls && node.parentElement) {
        const sameTag = Array.from(node.parentElement.children).filter((c) => c.tagName === node!.tagName);
        if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  const countTextLines = (el: Element): number | null => {
    try {
      const range = document.createRange();
      const tops = new Set<number>();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode()) !== null) {
        if (!(n.textContent ?? '').trim()) continue;
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) tops.add(Math.round(r.top));
      }
      range.detach();
      return tops.size;
    } catch {
      return null;
    }
  };

  const isVisible = (el: Element, rect: DOMRect, cs: CSSStyleDeclaration): boolean =>
    rect.width > 0 && rect.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';

  const elements: RawElementMetrics[] = [];
  const all = document.querySelectorAll('*');
  let truncated = false;

  for (let i = 0; i < all.length; i++) {
    if (i >= MAX_WALK_ELEMENTS) {
      truncated = true;
      break;
    }
    const el = all[i]!;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!isVisible(el, rect, cs)) continue;

    const scrollOverflowX = el.scrollWidth - el.clientWidth;
    const scrollOverflowY = el.scrollHeight - el.clientHeight;
    const overflowRight = rect.right - vw;
    const overflowLeft = -rect.left;
    const overflowBottom = rect.bottom - vh;

    const isWrapCandidate = el.matches(WRAP_SELECTOR);
    const clipping =
      (cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.overflowY === 'hidden' || cs.overflowY === 'clip') &&
      (scrollOverflowX > eps || scrollOverflowY > eps);
    const textOverflow =
      (cs.whiteSpace === 'nowrap' || cs.whiteSpace === 'pre') && scrollOverflowX > eps && cs.overflowX === 'visible';
    const beyondViewportX = overflowRight > eps || overflowLeft > eps;
    const fixedBeyondBottom = cs.position === 'fixed' && overflowBottom > eps;

    let lineCount: number | null = null;
    if (isWrapCandidate) {
      lineCount = countTextLines(el);
    }
    const wrapped = isWrapCandidate && lineCount !== null && lineCount >= 2;

    if (!(beyondViewportX || fixedBeyondBottom || clipping || textOverflow || wrapped)) continue;

    const computed: Record<string, string> = {};
    for (const [key, cssProp] of COMPUTED_PROPS) {
      computed[key] = cs.getPropertyValue(cssProp);
    }

    elements.push({
      selector: buildSelector(el),
      tagName: el.tagName.toLowerCase(),
      id: el.id || null,
      classList: Array.from(el.classList).slice(0, 8),
      textPreview: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || null,
      box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      computed,
      parentDisplay: el.parentElement ? getComputedStyle(el.parentElement).display : null,
      overflowRightPx: Math.max(0, overflowRight),
      overflowLeftPx: Math.max(0, overflowLeft),
      overflowBottomPx: Math.max(0, overflowBottom),
      scrollOverflowXPx: Math.max(0, scrollOverflowX),
      scrollOverflowYPx: Math.max(0, scrollOverflowY),
      lineCount,
      naturalWidth: el instanceof HTMLImageElement ? el.naturalWidth : null,
      clientWidthPx: el.clientWidth,
    });
  }

  return {
    viewportWidthPx: vw,
    viewportHeightPx: vh,
    docScrollWidthPx: doc.scrollWidth,
    docClientWidthPx: doc.clientWidth,
    elements,
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Classificação Node-side: comportamento observado vs causa inferida (09§58)
// ---------------------------------------------------------------------------

function toElementRef(raw: RawElementMetrics): ElementRef {
  return {
    selector: raw.selector,
    tagName: raw.tagName,
    ...(raw.id !== null ? { id: raw.id } : {}),
    classList: raw.classList,
    ...(raw.textPreview !== null ? { textPreview: raw.textPreview } : {}),
  };
}

function baseEvidence(raw: RawElementMetrics, observed: string, measurements: Record<string, number>): DiagnosticEvidence {
  return { measurements, computedStyles: raw.computed, observed };
}

function overflowHypotheses(raw: RawElementMetrics, viewportWidthPx: number): string[] {
  const h: string[] = [];
  const widthPx = Number.parseFloat(raw.computed['width'] ?? '');
  if (Number.isFinite(widthPx) && widthPx > viewportWidthPx) {
    h.push(`fixed width (${raw.computed['width']}) larger than viewport (${viewportWidthPx}px)`);
  }
  if (raw.scrollOverflowXPx > 0 && (raw.computed['whiteSpace'] === 'nowrap' || raw.computed['whiteSpace'] === 'pre')) {
    h.push('unbreakable content (white-space nowrap/pre)');
  }
  if (raw.parentDisplay?.includes('flex')) h.push('overflowing flex child (parent display: flex)');
  if (raw.parentDisplay?.includes('grid')) h.push('grid track minimum width (parent display: grid)');
  if (raw.naturalWidth !== null && raw.naturalWidth > raw.clientWidthPx) {
    h.push(`image intrinsic size (${raw.naturalWidth}px) larger than rendered box`);
  }
  if (h.length === 0) h.push('cause not determined from computed styles — inspect element source');
  return h;
}

function classifyOverflowKind(raw: RawElementMetrics, viewportWidthPx: number): DiagnosticKind {
  if (raw.tagName === 'img' && raw.naturalWidth !== null && raw.naturalWidth > raw.clientWidthPx) {
    return 'IMAGE_INTRINSIC_OVERFLOW';
  }
  if (raw.computed['position'] === 'fixed') return 'FIXED_ELEMENT_OVERFLOW';
  if (raw.computed['position'] === 'absolute') return 'ABSOLUTE_OVERFLOW';
  const widthPx = Number.parseFloat(raw.computed['width'] ?? '');
  if (
    raw.scrollOverflowXPx > 0 &&
    (raw.computed['whiteSpace'] === 'nowrap' || raw.computed['whiteSpace'] === 'pre') &&
    (!Number.isFinite(widthPx) || widthPx <= viewportWidthPx)
  ) {
    return 'UNBREAKABLE_TEXT';
  }
  if (raw.parentDisplay?.includes('flex')) return 'BROKEN_FLEX';
  if (raw.parentDisplay?.includes('grid')) return 'BROKEN_GRID';
  return 'HORIZONTAL_OVERFLOW';
}

export interface CollectIssuesOptions {
  epsilonPx?: number;
  maxIssuesPerKind?: number;
  /** Mapper DOM→source opcional (09§37/§50). Ausente = sourceMapping omitido. */
  sourceMapper?: SourceMapperFn;
}

/**
 * Mede a página REAL no viewport aplicado e retorna DiagnosticIssue[] com
 * evidência mensurável. Não navega nem altera a página — quem chama controla
 * o ciclo de vida (preview/stress/compare/snapshot).
 */
export async function collectDiagnosticIssues(
  page: Page,
  viewport: Viewport,
  opts: CollectIssuesOptions = {},
): Promise<Result<DiagnosticIssue[]>> {
  const epsilonPx = opts.epsilonPx ?? DEFAULT_EPSILON_PX;
  const maxPerKind = opts.maxIssuesPerKind ?? DEFAULT_MAX_ISSUES_PER_KIND;

  const raw = (await page.evaluate(collectRawDiagnostics, { epsilonPx })) as RawDiagnostics;

  const issues: DiagnosticIssue[] = [];
  const vpDims = { width: raw.viewportWidthPx, height: raw.viewportHeightPx };

  const pushIssue = (
    kind: DiagnosticKind,
    severity: DiagnosticSeverity,
    certainty: DiagnosticIssue['certainty'],
    el: ElementRef,
    description: string,
    evidence: DiagnosticEvidence,
    suggestedFixes?: string[],
  ): void => {
    const mapped = opts.sourceMapper?.(el) ?? null;
    issues.push({
      id: newOperationId(),
      kind,
      severity,
      certainty,
      viewport: vpDims,
      element: el,
      ...(mapped !== null ? { sourceMapping: mapped } : {}),
      description,
      evidence,
      ...(suggestedFixes !== undefined && suggestedFixes.length > 0 ? { suggestedFixes } : {}),
    });
  };

  for (const el of raw.elements) {
    const ref = toElementRef(el);
    const overflowXPx = Math.max(el.overflowRightPx, el.overflowLeftPx);
    const beyondX = overflowXPx > epsilonPx;

    if (beyondX) {
      const kind = classifyOverflowKind(el, raw.viewportWidthPx);
      const hypotheses = overflowHypotheses(el, raw.viewportWidthPx).map((x) => `Hypothesis (unverified): ${x}`);
      pushIssue(
        kind,
        severityForOverflow(overflowXPx, raw.viewportWidthPx),
        'ConfirmedIssue', // fato geométrico: a box excede o viewport — medido
        ref,
        `${kind === 'HORIZONTAL_OVERFLOW' ? 'Horizontal overflow' : kind.toLowerCase().replace(/_/g, ' ')}: element extends ${overflowXPx.toFixed(1)}px beyond the ${raw.viewportWidthPx}px-wide viewport (observed geometry)`,
        baseEvidence(
          el,
          `bounding box {x:${el.box.x.toFixed(1)}, width:${el.box.width.toFixed(1)}} exceeds viewport width ${raw.viewportWidthPx}px by ${overflowXPx.toFixed(1)}px`,
          {
            overflowXPx: Number(overflowXPx.toFixed(2)),
            elementRightPx: Number((el.box.x + el.box.width).toFixed(2)),
            viewportWidthPx: raw.viewportWidthPx,
            documentScrollWidthPx: raw.docScrollWidthPx,
          },
        ),
        [...hypotheses, `Suggested inspection: ${el.selector}`],
      );
    }

    if (el.computed['position'] === 'fixed' && el.overflowBottomPx > epsilonPx) {
      pushIssue(
        'FIXED_ELEMENT_OVERFLOW',
        severityForOverflow(el.overflowBottomPx, raw.viewportHeightPx),
        'ConfirmedIssue',
        ref,
        `Fixed element extends ${el.overflowBottomPx.toFixed(1)}px below the ${raw.viewportHeightPx}px-tall viewport and cannot be reached by scrolling (observed geometry)`,
        baseEvidence(el, `fixed element bottom exceeds viewport height by ${el.overflowBottomPx.toFixed(1)}px`, {
          overflowYPx: Number(el.overflowBottomPx.toFixed(2)),
          viewportHeightPx: raw.viewportHeightPx,
        }),
        ['Hypothesis (unverified): fixed-position element taller than viewport', `Suggested inspection: ${el.selector}`],
      );
    }

    const clippingX = el.scrollOverflowXPx > epsilonPx && (el.computed['overflowX'] === 'hidden' || el.computed['overflowX'] === 'clip');
    const clippingY = el.scrollOverflowYPx > epsilonPx && (el.computed['overflowY'] === 'hidden' || el.computed['overflowY'] === 'clip');
    if ((clippingX || clippingY) && !beyondX) {
      // Clipping pode ser design intencional (carrossel etc.) -> PotentialIssue (09§36).
      pushIssue(
        'CONTENT_CLIPPING',
        el.textPreview !== null ? 'WARNING' : 'INFO',
        'PotentialIssue',
        ref,
        `Content clipped: scrollable content exceeds the visible box by ${Math.max(clippingX ? el.scrollOverflowXPx : 0, clippingY ? el.scrollOverflowYPx : 0).toFixed(1)}px with overflow ${el.computed['overflowX']}/${el.computed['overflowY']} (may be intentional)`,
        baseEvidence(el, 'scroll size exceeds client size while overflow is hidden/clip', {
          scrollOverflowXPx: Number(el.scrollOverflowXPx.toFixed(2)),
          scrollOverflowYPx: Number(el.scrollOverflowYPx.toFixed(2)),
          clientWidthPx: el.clientWidthPx,
        }),
        ['Hypothesis (unverified): container clips overflowing content', `Suggested inspection: ${el.selector}`],
      );
    }

    const textOverflow =
      (el.computed['whiteSpace'] === 'nowrap' || el.computed['whiteSpace'] === 'pre') &&
      el.scrollOverflowXPx > epsilonPx &&
      el.computed['overflowX'] === 'visible';
    if (textOverflow && !beyondX) {
      pushIssue(
        'TEXT_OVERFLOW',
        severityForOverflow(el.scrollOverflowXPx, raw.viewportWidthPx),
        'ConfirmedIssue', // texto escapa da box — medido (scrollWidth > clientWidth)
        ref,
        `Text overflows its container by ${el.scrollOverflowXPx.toFixed(1)}px (white-space: ${el.computed['whiteSpace']}, overflow visible)`,
        baseEvidence(el, 'scrollWidth exceeds clientWidth with nowrap/pre and visible overflow', {
          scrollOverflowXPx: Number(el.scrollOverflowXPx.toFixed(2)),
          clientWidthPx: el.clientWidthPx,
        }),
        ['Hypothesis (unverified): unbreakable text in a narrow container', `Suggested inspection: ${el.selector}`],
      );
    }

    if (el.lineCount !== null) {
      const isHeading = /^h[1-6]$/.test(el.tagName);
      const threshold = isHeading ? 3 : 2; // 09§31: heading 3a linha; botão/nav 2a linha
      if (el.lineCount >= threshold) {
        pushIssue(
          'UNWANTED_WRAPPING',
          el.lineCount >= threshold + 1 ? 'WARNING' : 'INFO',
          'PotentialIssue', // intenção de layout não é provável pelo browser (09§36)
          ref,
          `Text wraps into ${el.lineCount} lines in ${el.tagName} (threshold for this element kind: ${threshold}) — possibly unwanted wrapping`,
          baseEvidence(el, `text occupies ${el.lineCount} rendered lines`, {
            lineCount: el.lineCount,
            elementHeightPx: Number(el.box.height.toFixed(2)),
            viewportWidthPx: raw.viewportWidthPx,
          }),
          [
            'Hypothesis (unverified): container too narrow for the label',
            'Hypothesis (unverified): missing white-space/min-width rule',
            `Suggested inspection: ${el.selector}`,
          ],
        );
      }
    }
  }

  // Teto por kind, mantendo os piores (maior evidência) primeiro.
  const byKind = new Map<DiagnosticKind, DiagnosticIssue[]>();
  for (const issue of issues) {
    const list = byKind.get(issue.kind) ?? [];
    list.push(issue);
    byKind.set(issue.kind, list);
  }
  const capped: DiagnosticIssue[] = [];
  for (const list of byKind.values()) {
    list.sort(
      (a, b) =>
        (b.evidence.measurements['overflowXPx'] ?? b.evidence.measurements['scrollOverflowXPx'] ?? 0) -
        (a.evidence.measurements['overflowXPx'] ?? a.evidence.measurements['scrollOverflowXPx'] ?? 0),
    );
    capped.push(...list.slice(0, maxPerKind));
  }

  return ok(capped);
}
