/** Helpers puros de /responsive (node, sem DOM). */

import { describe, expect, it } from 'vitest';

import type { DiagnosticIssue } from '../../api/hooks';
import {
  certaintyLabel,
  formatDiffPercentage,
  severityRank,
  severityTone,
  sortIssuesBySeverity,
  viewportLabel,
} from './helpers';

function issue(id: string, severity: DiagnosticIssue['severity']): DiagnosticIssue {
  return {
    id,
    kind: 'HORIZONTAL_OVERFLOW',
    severity,
    certainty: 'ConfirmedIssue',
    viewport: { width: 375, height: 812 },
    element: { selector: 'div.x', tagName: 'div', classList: ['x'] },
    description: id,
    evidence: { measurements: { overflowXPx: 12 }, observed: id },
  };
}

describe('severity order', () => {
  it('CRITICAL > ERROR > WARNING > INFO', () => {
    expect(severityRank('CRITICAL')).toBeGreaterThan(severityRank('ERROR'));
    expect(severityRank('ERROR')).toBeGreaterThan(severityRank('WARNING'));
    expect(severityRank('WARNING')).toBeGreaterThan(severityRank('INFO'));
  });
  it('sortIssuesBySeverity ordena desc sem mutar o input', () => {
    const input = [issue('info', 'INFO'), issue('crit', 'CRITICAL'), issue('warn', 'WARNING')];
    const sorted = sortIssuesBySeverity(input);
    expect(sorted.map((i) => i.id)).toEqual(['crit', 'warn', 'info']);
    expect(input.map((i) => i.id)).toEqual(['info', 'crit', 'warn']);
  });
  it('tons: ERROR/CRITICAL danger, WARNING warning, INFO neutral', () => {
    expect(severityTone('CRITICAL')).toBe('danger');
    expect(severityTone('INFO')).toBe('neutral');
  });
});

describe('certaintyLabel (09§36 — incerteza visível)', () => {
  it('rotula os três estados', () => {
    expect(certaintyLabel('ConfirmedIssue')).toBe('Confirmado');
    expect(certaintyLabel('PotentialIssue')).toBe('Potencial');
    expect(certaintyLabel('Unknown')).toBe('Desconhecido');
  });
});

describe('viewportLabel / formatDiffPercentage', () => {
  it('nome quando presente, senão dimensões', () => {
    expect(viewportLabel({ id: 'v1', name: 'Mobile', width: 375, height: 812 })).toBe('Mobile (375×812)');
    expect(viewportLabel({ id: 'v2', width: 1280, height: 800 })).toBe('1280×800');
  });
  it('percentual com 2 casas (região comparada — 09§45)', () => {
    expect(formatDiffPercentage(0)).toBe('0.00%');
    expect(formatDiffPercentage(3.4567)).toBe('3.46%');
  });
});
