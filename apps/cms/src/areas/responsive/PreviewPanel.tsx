/**
 * PreviewPanel — responsive.preview (09§27): preview via runtime REAL do
 * projeto (dev server de verdade). iframe da URL real rotulado com o estado
 * (STARTING/RUNNING/FAILED/STOPPED). Operação longa (startup real) — o estado
 * pending é mostrado honestamente, sem progresso simulado.
 */

import { useState } from 'react';
import { Play } from 'lucide-react';

import { useResponsivePreview, type EditorViewport, type ResponsivePreviewOutput } from '../../api/hooks';
import { Badge, Button, ErrorState, Field, Input, Spinner } from '../../components/ui';
import { previewStateTone } from './helpers';
import { ViewportPicker } from './ViewportsPanel';

export function PreviewPanel({ projectId, knownViewports }: { projectId: string; knownViewports: EditorViewport[] }) {
  const preview = useResponsivePreview();
  const [viewportId, setViewportId] = useState('');
  const [route, setRoute] = useState('/');
  const [info, setInfo] = useState<ResponsivePreviewOutput | null>(null);

  const run = () => {
    preview.mutate(
      { projectId, viewportId, ...(route.trim().length > 0 ? { route: route.trim() } : {}) },
      { onSuccess: (data) => setInfo(data) },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ViewportPicker knownViewports={knownViewports} viewportId={viewportId} onChange={setViewportId} idPrefix="pv" />
        <Field label="Rota" htmlFor="pv-route">
          <Input id="pv-route" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="/" className="font-mono" />
        </Field>
      </div>
      <div>
        <Button variant="primary" onClick={run} disabled={viewportId.length === 0 || preview.isPending}>
          <Play aria-hidden="true" size={14} /> Iniciar preview
        </Button>
      </div>
      {preview.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner label="Subindo preview" /> Subindo o dev server REAL do projeto — pode demorar (09§27). Sem
          progresso simulado.
        </p>
      ) : null}
      {preview.isError ? <ErrorState error={preview.error} operation="responsive.preview" /> : null}
      {info !== null ? (
        <section aria-label="Preview" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={previewStateTone(info.state)}>{info.state}</Badge>
            <span className="text-muted-foreground">
              {info.previewUrl} · script <span className="font-mono">{info.scriptName}</span>
              {info.reused ? ' · reutilizado' : ''}
              {info.pid !== undefined ? ` · pid ${info.pid}` : ''} · viewport {info.viewport.width}×{info.viewport.height}
            </span>
          </div>
          {info.state === 'RUNNING' ? (
            <iframe
              src={info.previewUrl}
              title={`Preview ${info.route} — ${info.viewport.width}×${info.viewport.height}`}
              style={{ width: info.viewport.width, height: info.viewport.height, maxWidth: '100%' }}
              className="rounded-md border border-border bg-background"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              O iframe só é montado com o preview RUNNING (estado atual: {info.state}).
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
