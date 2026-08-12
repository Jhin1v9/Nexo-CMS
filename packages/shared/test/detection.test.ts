import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Confidence, Detection, OpStatus, SupportLevel } from '../src/index.js';

describe('Detection<T> (SPEC §2)', () => {
  it('carrega value, confidence e evidence', () => {
    const d: Detection<{ name: string }> = {
      value: { name: 'react' },
      confidence: 'CONFIRMED',
      evidence: ['package.json dependencies.react'],
    };
    expect(d.value?.name).toBe('react');
    expect(d.confidence).toBe('CONFIRMED');
    expect(d.evidence).toHaveLength(1);
  });

  it('incerto -> value null + UNKNOWN, nunca inventado (SPEC §0)', () => {
    const d: Detection<string> = { value: null, confidence: 'UNKNOWN', evidence: [] };
    expect(d.value).toBeNull();
    expect(d.confidence).toBe('UNKNOWN');
  });

  it('tipos literais dos enums de dominio', () => {
    expectTypeOf<Confidence>().toEqualTypeOf<
      'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
    >();
    expectTypeOf<SupportLevel>().toEqualTypeOf<
      'FULLY_SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'DETECTED_BUT_UNSUPPORTED' | 'UNKNOWN' | 'CUSTOM'
    >();
    expectTypeOf<OpStatus>().toEqualTypeOf<'SUCCESS' | 'PARTIAL' | 'FAILED'>();
  });
});
