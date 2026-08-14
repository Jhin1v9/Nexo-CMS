/**
 * DiagnosePanel — responsive.diagnose (09§34-36): botão "Run diagnostics" ->
 * estado running honesto (browser real + dev server, timeout 180s — pode
 * demorar) -> issues table com severity/certainty/evidência medida.
 */

import { useState } from 'react';
import { Stethoscope } from 'lucide-react';

import { useResponsiveDiagnose, type DiagnoseResult, type EditorViewport } from '../../api/hooks';
import { Badge, Button, ErrorState, Field, Input, Spinner } from '../../components/ui';
import { IssuesTable } from './IssuesTable';
import { ViewportPicker } from './ViewportsPanel';

export function DiagnosePanel({ projectId, knownViewports }: { projectId: string; knownViewports: EditorViewport[] }) {
  const diagnose = useResponsiveDiagnose();
  const [viewportId, setViewportId] = useState('');
  const [route, setRoute] = useState('/');
  const [result, setResult] = useState<DiagnoseResult | null>(null);

  const run = () => {
    diagnose.mutate(
      { projectId, viewportId, ...(route.trim().length > 0 ? { route: route.trim() } : {}) },
      { onSuccess: (data) => setResult(data) },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ViewportPicker knownViewports={knownViewports} viewportId={viewportId} onChange={setViewportId} idPrefix="dg" />
        <Field label="Rota" htmlFor="dg-route">
          <Input id="dg-route" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="/" className="font-mono" />
        </Field>
      </div>
      <div>
        <Button variant="primary" onClick={run} disabled={viewportId.length === 0 || diagnose.isPending}>
          <Stethoscope aria-hidden="true" size={14} /> Run diagnostics
        </Button>
      </div>
      {diagnose.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner label="Diagnóstico em execução" /> Executando diagnóstico no browser REAL (09§46) — pode demorar
          (startup do dev server + medições). Timeout do backend: 180s.
        </p>
      ) : null}
      {diagnose.isError ? <ErrorState error={diagnose.error} operation="responsive.diagnose" /> : null}
      {result !== null ? (
        <section aria-label="Resultado do diagnóstico" className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {result.issues.length} issue(s) · viewport {result.viewport.width}×{result.viewport.height} · browser{' '}
            {result.browser.engine} {result.browser.engineVersion} (capacidades detectadas por probes reais — 09§47)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(result.browser.capabilities)
              .filter(([k]) => k !== 'engine' && k !== 'engineVersion')
              .map(([k, v]) => (
                <Badge key={k} tone={v ? 'success' : 'warning'} title={v ? 'capacidade presente' : 'capacidade ausente'}>
                  {k}: {v ? 'sim' : 'não'}
                </Badge>
              ))}
          </div>
          <IssuesTable issues={result.issues} />
        </section>
      ) : null}
    </div>
  );
}
