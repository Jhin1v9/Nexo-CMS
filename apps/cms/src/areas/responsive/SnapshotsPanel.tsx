/**
 * SnapshotsPanel — responsive.snapshot (09§44): captura snapshot visual com
 * prova de integridade do source. Snapshots NÃO são o Source Project — a
 * galeria mostra metadata real + imagePath (o Control Plane não serve o
 * binário via HTTP em M3; path exibido como evidência, nunca fingido).
 */

import { useState } from 'react';
import { Camera } from 'lucide-react';

import { useResponsiveSnapshot, type EditorViewport, type ResponsiveSnapshot } from '../../api/hooks';
import { Badge, Button, EmptyState, ErrorState, Field, Input, Spinner } from '../../components/ui';
import { viewportLabel } from './helpers';
import { ViewportPicker } from './ViewportsPanel';

export function SnapshotsPanel({ projectId, knownViewports }: { projectId: string; knownViewports: EditorViewport[] }) {
  const snapshot = useResponsiveSnapshot();
  const [viewportId, setViewportId] = useState('');
  const [route, setRoute] = useState('/');
  const [gallery, setGallery] = useState<ResponsiveSnapshot[]>([]);

  const run = () => {
    snapshot.mutate(
      { projectId, viewportId, ...(route.trim().length > 0 ? { route: route.trim() } : {}) },
      { onSuccess: (data) => setGallery((g) => [data, ...g]) },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground" role="note">
        Snapshot ≠ Source Project (09§44): é uma captura de render com referência de estado observada. A galeria
        abaixo cobre os snapshots capturados NESTA sessão (não há capability de listagem em M3).
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ViewportPicker knownViewports={knownViewports} viewportId={viewportId} onChange={setViewportId} idPrefix="sn" />
        <Field label="Rota" htmlFor="sn-route">
          <Input id="sn-route" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="/" className="font-mono" />
        </Field>
      </div>
      <div>
        <Button variant="primary" onClick={run} disabled={viewportId.length === 0 || snapshot.isPending}>
          <Camera aria-hidden="true" size={14} /> Capturar snapshot
        </Button>
      </div>
      {snapshot.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner label="Capturando snapshot" /> Capturando no browser real — pode demorar (timeout 180s).
        </p>
      ) : null}
      {snapshot.isError ? <ErrorState error={snapshot.error} operation="responsive.snapshot" /> : null}

      <section aria-label="Galeria de snapshots da sessão">
        {gallery.length === 0 ? (
          <EmptyState icon={Camera} title="Nenhum snapshot nesta sessão" description="Capture um snapshot para vê-lo aqui com a metadata real." />
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {gallery.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{viewportLabel(s.viewport)}</Badge>
                  <span className="font-mono text-muted-foreground">{s.route}</span>
                  <Badge tone="neutral">{s.diagnostics.length} issue(s)</Badge>
                </div>
                <p className="text-muted-foreground">Capturado em {s.timestamp} · sourceState {s.sourceState}</p>
                <p className="font-mono text-muted-foreground">
                  Imagem gravada pelo runtime em: {s.imagePath} (binário não servido via HTTP em M3).
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
