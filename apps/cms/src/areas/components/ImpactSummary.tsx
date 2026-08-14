/**
 * ImpactSummary — impact analysis 08§23 (references/routes/pages/components/
 * exports/tests/assets) exibida ANTES do delete. `complete:false` => impacto
 * Unknown: exibido como bloqueio honesto (nunca tratado como "sem referências").
 */

import { ScanSearch } from 'lucide-react';

import type { ComponentImpact } from '../../api/hooks';
import { Badge } from '../../components/ui';
import { impactBlocks } from './helpers';

export function ImpactSummary({ impact }: { impact: ComponentImpact }) {
  const blocks = impactBlocks(impact);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Scan de impacto: {impact.scannedFiles} arquivo(s) varridos
        {impact.skippedFiles > 0 ? `, ${impact.skippedFiles} não varridos` : ''}.
        {!impact.complete
          ? ' Impacto INCOMPLETO (Unknown) — o delete é bloqueado pelo backend neste caso (M3 §8.8).'
          : ''}
      </p>
      {blocks.length === 0 ? (
        <Badge tone="success" icon={ScanSearch}>
          Nenhuma referência ativa encontrada no scan
        </Badge>
      ) : (
        <dl className="flex flex-col gap-2">
          {blocks.map((b) => (
            <div key={b.label}>
              <dt className="text-xs font-medium text-foreground">{b.label}</dt>
              <dd>
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {b.items.map((item) => (
                    <li key={item} className="font-mono text-xs text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
