/**
 * RiskBadge — risco da capability (M3 §3: leituras SAFE; mutações DESTRUCTIVE
 * com REQUIRE_APPROVAL por policy). MODIFYING/CRITICAL cobertos por completude.
 */

import { AlertOctagon, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';

import type { RiskLevel } from '../../api/client';
import { Badge, type BadgeTone } from './Badge';

const RISK: Record<RiskLevel, { tone: BadgeTone; icon: typeof ShieldCheck; label: string }> = {
  SAFE: { tone: 'success', icon: ShieldCheck, label: 'SAFE' },
  MODIFYING: { tone: 'warning', icon: Pencil, label: 'MODIFYING' },
  DESTRUCTIVE: { tone: 'danger', icon: ShieldAlert, label: 'DESTRUCTIVE' },
  CRITICAL: { tone: 'danger', icon: AlertOctagon, label: 'CRITICAL' },
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const r = RISK[risk] ?? RISK.SAFE;
  return (
    <Badge tone={r.tone} icon={r.icon} title={`Risco da capability: ${risk}`}>
      {r.label}
    </Badge>
  );
}
