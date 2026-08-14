/** Helpers puros de /media (node, sem DOM). */

import { describe, expect, it } from 'vitest';

import type { AssetIdentity } from '../../api/hooks';
import {
  fileToBase64,
  formatBytes,
  isPreviewable,
  previewDataUrl,
  referenceConfidenceTone,
  usageLabel,
  usageTone,
} from './helpers';

describe('formatBytes', () => {
  it('formata em unidades binárias', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(25 * 1024 * 1024)).toBe('25.0 MB');
  });
  it('valores inválidos são honestos', () => {
    expect(formatBytes(Number.NaN)).toBe('tamanho desconhecido');
    expect(formatBytes(-1)).toBe('tamanho desconhecido');
  });
});

describe('usage state (08§50 — Unknown NUNCA como Unused)', () => {
  it('Unknown tem tom e rótulo próprios, distintos de Unused', () => {
    expect(usageLabel('Unknown')).toBe('Uso desconhecido');
    expect(usageLabel('Unused')).toBe('Sem referências');
    expect(usageLabel('Unknown')).not.toBe(usageLabel('Unused'));
    expect(usageTone('Unknown')).toBe('warning');
    expect(usageTone('Unused')).toBe('neutral');
  });
});

function asset(partial: Partial<AssetIdentity>): AssetIdentity {
  return {
    id: 'a1',
    type: 'Image',
    source: { origin: 'LocalProject', path: 'src/assets/logo.png' },
    metadata: {
      name: 'logo.png',
      type: 'Image',
      mime: 'image/png',
      size: 10,
      source: { origin: 'LocalProject', path: 'src/assets/logo.png' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      references: [],
    },
    references: [],
    scope: 'Project',
    usage: { state: 'Used', confidence: 'HIGH_CONFIDENCE' },
    ...partial,
  };
}

describe('preview (base64 NUNCA despejado como texto)', () => {
  it('Image/SVG previewáveis; Video não', () => {
    expect(isPreviewable(asset({}))).toBe(true);
    expect(isPreviewable(asset({ type: 'SVG' }))).toBe(true);
    expect(isPreviewable(asset({ type: 'Video' }))).toBe(false);
  });

  it('data URL só com conteúdo incluído', () => {
    expect(previewDataUrl('image/png', 'QUJD')).toBe('data:image/png;base64,QUJD');
    expect(previewDataUrl('image/png', undefined)).toBeUndefined();
    expect(previewDataUrl('image/png', '')).toBeUndefined();
  });
});

describe('fileToBase64', () => {
  it('rejeita arquivo acima do limite ANTES de ler (08§45 Size)', () => {
    const result = fileToBase64({ size: 26 * 1024 * 1024, name: 'big.bin' }, 25 * 1024 * 1024);
    expect('error' in result).toBe(true);
  });
  it('dentro do limite retorna leitor', () => {
    const result = fileToBase64({ size: 10, name: 'ok.png' }, 25 * 1024 * 1024);
    expect('read' in result).toBe(true);
  });
});

describe('referenceConfidenceTone', () => {
  it('PARTIAL marcado como warning, nunca omitido', () => {
    expect(referenceConfidenceTone('HIGH_CONFIDENCE')).toBe('success');
    expect(referenceConfidenceTone('PARTIAL')).toBe('warning');
    expect(referenceConfidenceTone('UNKNOWN')).toBe('neutral');
  });
});
