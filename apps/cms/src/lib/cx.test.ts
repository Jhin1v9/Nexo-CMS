/** Testes dos utilitários de apresentação (convenções da CLI, sem emojis). */

import { describe, expect, it } from 'vitest';

import { cx, formatDateTime, shortHash } from './cx';

describe('cx', () => {
  it('filtra falsy e junta com espaço', () => {
    expect(cx('a', false, null, undefined, 'b', '')).toBe('a b');
  });
});

describe('shortHash', () => {
  it('12 chars (convenção apps/cli/src/format.ts)', () => {
    expect(shortHash('0123456789abcdef')).toBe('0123456789ab');
  });
});

describe('formatDateTime', () => {
  it('vazio/null -> placeholder honesto; inválido -> bruto; válido -> string local', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime('não-é-data')).toBe('não-é-data');
    expect(formatDateTime('2026-01-02T03:04:05.000Z').length).toBeGreaterThan(0);
  });
});
