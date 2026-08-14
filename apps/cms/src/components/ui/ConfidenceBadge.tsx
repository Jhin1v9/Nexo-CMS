/**
 * ConfidenceBadge — confidence de Source Mapping M3 (07§12/§13, M3 §5):
 * EXACT | HIGH_CONFIDENCE | PARTIAL | UNKNOWN. Mapping incerto NUNCA é
 * apresentado como exato; UNKNOWN é explícito, não omitido.
 */

import { CircleHelp, Crosshair, ScanSearch, TriangleAlert } from 'lucide-react';

import { Badge, type BadgeTone } from './Badge';

export type MappingConfidence = 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN';

const CONFIDENCE: Record<MappingConfidence, { tone: BadgeTone; icon: typeof Crosshair; label: string }> = {
  EXACT: { tone: 'success', icon: Crosshair, label: 'EXACT' },
  HIGH_CONFIDENCE: { tone: 'primary', icon: ScanSearch, label: 'HIGH CONFIDENCE' },
  PARTIAL: { tone: 'warning', icon: TriangleAlert, label: 'PARTIAL' },
  UNKNOWN: { tone: 'neutral', icon: CircleHelp, label: 'UNKNOWN' },
};

export function ConfidenceBadge({ confidence }: { confidence: MappingConfidence }) {
  const c = CONFIDENCE[confidence] ?? CONFIDENCE.UNKNOWN;
  return (
    <Badge tone={c.tone} icon={c.icon} title={`Confidence do mapeamento: ${confidence}`}>
      {c.label}
    </Badge>
  );
}
