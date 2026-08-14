/**
 * Smoke SSR (renderToString, node — sem jsdom) da IssuesTable de /responsive:
 * severity/certainty badges, evidência medida (px), source mapping ausente
 * declarado, suggested fixes marcados como hipóteses (09§36/§59).
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { DiagnosticIssue } from '../../api/hooks';
import { IssuesTable } from './IssuesTable';

const issue: DiagnosticIssue = {
  id: 'i1',
  kind: 'HORIZONTAL_OVERFLOW',
  severity: 'ERROR',
  certainty: 'PotentialIssue',
  viewport: { width: 375, height: 812 },
  element: { selector: 'main > section.card', tagName: 'section', classList: ['card'], textPreview: 'Produto' },
  description: 'Conteúdo excede a largura do viewport',
  evidence: { measurements: { overflowXPx: 48, viewportWidthPx: 375 }, observed: 'scrollWidth maior que clientWidth' },
  suggestedFixes: ['verificar min-width no grid', 'revisar padding fixo'],
};

describe('smoke SSR /responsive', () => {
  it('IssuesTable: severity, certainty, evidência e hipóteses rotuladas', () => {
    const html = renderToString(<IssuesTable issues={[issue]} />);
    expect(html).toContain('ERROR');
    expect(html).toContain('Potencial');
    expect(html).toContain('HORIZONTAL_OVERFLOW');
    expect(html).toContain('overflowXPx: 48px');
    expect(html).toContain('scrollWidth maior que clientWidth');
    expect(html).toContain('Hipóteses de causa (não verificadas');
    expect(html).toContain('verificar min-width no grid');
    // Sem sourceMapping -> declarado, nunca adivinhado (09§50).
    expect(html).toContain('Sem source mapping confiável');
  });

  it('IssuesTable vazia -> EmptyState honesto', () => {
    expect(renderToString(<IssuesTable issues={[]} />)).toContain('Nenhum issue encontrado');
  });
});
