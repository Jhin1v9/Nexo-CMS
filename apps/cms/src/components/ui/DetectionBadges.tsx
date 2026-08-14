/**
 * DetectionBadges — estado de detecção do projeto (doc 07 §47/§48):
 * support (FULLY_SUPPORTED/PARTIALLY_SUPPORTED/DETECTED_BUT_UNSUPPORTED/
 * UNKNOWN/CUSTOM) + confidence da análise (CONFIRMED/HIGH/MEDIUM/LOW/UNKNOWN).
 * Suporte parcial/desconhecido é SEMPRE visível (Inv. 27, M3 §1).
 */

import { CircleHelp } from 'lucide-react';

import type { DetectionConfidence, SupportLevel } from '../../api/client';
import { Badge, type BadgeTone } from './Badge';

const SUPPORT: Record<SupportLevel, { tone: BadgeTone; label: string }> = {
  FULLY_SUPPORTED: { tone: 'success', label: 'Suportado' },
  PARTIALLY_SUPPORTED: { tone: 'warning', label: 'Parcial' },
  DETECTED_BUT_UNSUPPORTED: { tone: 'danger', label: 'Não suportado' },
  CUSTOM: { tone: 'primary', label: 'Custom' },
  UNKNOWN: { tone: 'neutral', label: 'Suporte desconhecido' },
};

const CONFIDENCE: Record<DetectionConfidence, { tone: BadgeTone; label: string }> = {
  CONFIRMED: { tone: 'success', label: 'Confirmado' },
  HIGH: { tone: 'primary', label: 'Confiança alta' },
  MEDIUM: { tone: 'warning', label: 'Confiança média' },
  LOW: { tone: 'warning', label: 'Confiança baixa' },
  UNKNOWN: { tone: 'neutral', label: 'Confiança desconhecida' },
};

export function SupportBadge({ support }: { support: SupportLevel | undefined }) {
  const s = support !== undefined && support in SUPPORT ? SUPPORT[support as SupportLevel] : SUPPORT.UNKNOWN;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function DetectionConfidenceBadge({ confidence }: { confidence: DetectionConfidence | undefined }) {
  const c =
    confidence !== undefined && confidence in CONFIDENCE
      ? CONFIDENCE[confidence as DetectionConfidence]
      : { tone: 'neutral' as BadgeTone, label: 'Confiança desconhecida' };
  return (
    <Badge tone={c.tone} icon={confidence === 'UNKNOWN' || confidence === undefined ? CircleHelp : undefined}>
      {c.label}
    </Badge>
  );
}
