/**
 * Smoke SSR (renderToString, node — sem jsdom) dos componentes puros de
 * /media: MediaGrid (cards com tipo/tamanho/usage) e UsageBadge (Unknown
 * NUNCA como Unused — 08§50).
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { AssetIdentity } from '../../api/hooks';
import { MediaGrid, UsageBadge } from './MediaGrid';

function asset(usage: AssetIdentity['usage']['state']): AssetIdentity {
  return {
    id: `id-${usage}`,
    type: 'Image',
    source: { origin: 'LocalProject', path: 'src/assets/logo.png' },
    metadata: {
      name: `logo-${usage}.png`,
      type: 'Image',
      mime: 'image/png',
      size: 2048,
      source: { origin: 'LocalProject', path: 'src/assets/logo.png' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      references: [],
    },
    references: [],
    scope: 'Project',
    usage: { state: usage, confidence: usage === 'Unknown' ? 'UNKNOWN' : 'HIGH_CONFIDENCE' },
  };
}

describe('smoke SSR /media', () => {
  it('MediaGrid: cards com tipo, nome, tamanho e usage state', () => {
    const html = renderToString(<MediaGrid assets={[asset('Used'), asset('Unknown')]} selectedId={null} onSelect={() => undefined} />);
    expect(html).toContain('Image');
    expect(html).toContain('logo-Used.png');
    expect(html).toContain('2.0 KB');
    expect(html).toContain('Em uso');
    // Unknown NUNCA renderizado como "Sem referências" (Unused).
    expect(html).toContain('Uso desconhecido');
  });

  it('MediaGrid vazia -> EmptyState honesto', () => {
    const html = renderToString(<MediaGrid assets={[]} selectedId={null} onSelect={() => undefined} />);
    expect(html).toContain('Nenhum asset');
  });

  it('UsageBadge: rótulos textuais (cor nunca é o único canal)', () => {
    expect(renderToString(<UsageBadge asset={asset('Unused')} />)).toContain('Sem referências');
    expect(renderToString(<UsageBadge asset={asset('Unknown')} />)).toContain('Uso desconhecido');
    expect(renderToString(<UsageBadge asset={asset('External')} />)).toContain('Externo');
  });
});
