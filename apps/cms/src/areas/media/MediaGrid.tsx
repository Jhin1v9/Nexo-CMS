/**
 * MediaGrid — cards da media library (media.list, 08§42): tipo (Badge), nome,
 * tamanho, usage state (Badge — Unknown NUNCA como Unused, 08§50) e origem.
 */

import { Image as ImageIcon } from 'lucide-react';

import type { AssetIdentity } from '../../api/hooks';
import { Badge, EmptyState } from '../../components/ui';
import { assetTypeTone, formatBytes, originLabel, usageLabel, usageTone } from './helpers';

export function UsageBadge({ asset }: { asset: AssetIdentity }) {
  return (
    <Badge
      tone={usageTone(asset.usage.state)}
      title={
        asset.usage.state === 'Unknown'
          ? 'O scan de referências não cobriu o projeto por completo — desconhecido não significa sem uso (08§50).'
          : asset.usage.scannedAt !== undefined
            ? `Último scan: ${asset.usage.scannedAt}`
            : undefined
      }
    >
      {usageLabel(asset.usage.state)}
    </Badge>
  );
}

export interface MediaGridProps {
  assets: AssetIdentity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MediaGrid({ assets, selectedId, onSelect }: MediaGridProps) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Nenhum asset na library"
        description="Nenhum asset corresponde ao filtro atual. Faça upload (media.upload) ou ajuste a busca/filtros."
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Media library">
      {assets.map((asset) => (
        <li key={asset.id}>
          <button
            type="button"
            onClick={() => onSelect(asset.id)}
            aria-pressed={asset.id === selectedId}
            className={`flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              asset.id === selectedId ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge tone={assetTypeTone(asset.type)}>{asset.type}</Badge>
              <UsageBadge asset={asset} />
            </div>
            <p className="truncate text-sm font-medium text-foreground">{asset.metadata.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(asset.metadata.size)} · {originLabel(asset.source.origin)}
              {asset.dimensions !== undefined ? ` · ${asset.dimensions.width}×${asset.dimensions.height}` : ''}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
