/**
 * MediaPage (/projects/$projectId/media) — doc 08§41-58 + Media Library (§59-61).
 * Auto-gateada por media.list. Grid de AssetIdentity + busca (media.search) +
 * upload + detail. Usage state sempre com confidence (Unknown != Unused).
 */

import { useState } from 'react';
import { Image as ImageIcon, Search, Upload } from 'lucide-react';

import { useMediaList, useMediaSearch, type AssetType, type UsageState } from '../../api/hooks';
import { Badge, Button, EmptyState, ErrorState, Field, Input, Select, Spinner } from '../../components/ui';
import { CapabilityArea } from '../stubs/CapabilityArea';
import { MediaGrid } from './MediaGrid';
import { MediaDetailDialog } from './MediaDetailDialog';
import { UploadAssetDialog } from './UploadAssetDialog';
import { usageLabel } from './helpers';

const TYPE_OPTIONS: (AssetType | 'all')[] = ['all', 'Image', 'SVG', 'Video', 'Audio', 'Font', 'PDF', 'Document', 'Other'];
const USAGE_OPTIONS: (UsageState | 'all')[] = ['all', 'Used', 'Unused', 'Unknown', 'External', 'Generated'];

function MediaBody({ projectId }: { projectId: string }) {
  const [type, setType] = useState<AssetType | 'all'>('all');
  const [usage, setUsage] = useState<UsageState | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filter = {
    ...(type !== 'all' ? { type } : {}),
    ...(usage !== 'all' ? { usageState: usage } : {}),
  };
  const list = useMediaList(projectId, Object.keys(filter).length > 0 ? filter : undefined);
  const search = useMediaSearch(projectId, query.trim());
  const searching = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Buscar" htmlFor="media-search" className="min-w-56">
          <Input
            id="media-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="nome, tipo ou referência"
          />
        </Field>
        <Field label="Tipo" htmlFor="media-type">
          <Select id="media-type" value={type} onChange={(e) => setType(e.target.value as AssetType | 'all')}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t === 'all' ? 'Todos' : t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Uso" htmlFor="media-usage">
          <Select id="media-usage" value={usage} onChange={(e) => setUsage(e.target.value as UsageState | 'all')}>
            {USAGE_OPTIONS.map((u) => (
              <option key={u} value={u}>{u === 'all' ? 'Todos' : usageLabel(u)}</option>
            ))}
          </Select>
        </Field>
        <div className="ml-auto">
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            <Upload aria-hidden="true" size={14} /> Upload
          </Button>
        </div>
      </div>

      {searching ? (
        search.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner label="Buscando" /> Buscando…
          </p>
        ) : search.isError ? (
          <ErrorState error={search.error} operation="media.search" />
        ) : (
          <section aria-label="Resultados da busca">
            <p className="mb-2 text-xs text-muted-foreground">
              {search.data?.length ?? 0} resultado(s) para “{query.trim()}” (media.search — nome/tipo/referência).
            </p>
            {(search.data ?? []).length === 0 ? (
              <EmptyState icon={Search} title="Sem resultados" description="Nenhum asset corresponde à busca." />
            ) : (
              <ul className="flex flex-col gap-2">
                {(search.data ?? []).map((m) => (
                  <li key={m.asset.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.asset.id)}
                      className="flex w-full flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <span className="text-sm font-medium text-foreground">{m.asset.metadata.name}</span>
                      {m.matchedOn.map((mo, i) => (
                        <Badge key={i} tone="neutral" title={`Match em ${mo.field}`}>
                          {mo.field}: {mo.value}
                        </Badge>
                      ))}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      ) : list.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner label="Carregando media library" /> Carregando media library…
        </p>
      ) : list.isError ? (
        <ErrorState
          error={list.error}
          operation="media.list"
          action={<Button variant="secondary" onClick={() => void list.refetch()}>Tentar novamente</Button>}
        />
      ) : (
        <MediaGrid assets={list.data ?? []} selectedId={selectedId} onSelect={setSelectedId} />
      )}

      <UploadAssetDialog projectId={projectId} open={uploadOpen} onOpenChange={setUploadOpen} />
      {selectedId !== null ? (
        <MediaDetailDialog
          projectId={projectId}
          assetId={selectedId}
          open={selectedId !== null}
          onOpenChange={(o) => {
            if (!o) setSelectedId(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** Assinatura para o wiring do router: `<MediaPage projectId={projectId} />`. */
export function MediaPage({ projectId }: { projectId: string }) {
  return (
    <CapabilityArea
      title="Media"
      icon={ImageIcon}
      requires={['media.list', 'media.read', 'media.search', 'media.upload', 'media.update', 'media.replace', 'media.delete']}
    >
      <MediaBody projectId={projectId} />
    </CapabilityArea>
  );
}
