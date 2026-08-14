/**
 * ComparePanel — responsive.compare (09§43, pixelmatch D14): selecionar 2+
 * viewports -> diff % real + caminho da imagem de diff. GAP HONESTO: o
 * Control Plane não serve arquivos estáticos — diffImagePath é um path do
 * filesystem do runtime; exibimos o path como evidência (nunca fingimos a
 * imagem via HTTP).
 */

import { useState } from 'react';
import { Columns2 } from 'lucide-react';

import { useResponsiveCompare, type CompareResult, type EditorViewport } from '../../api/hooks';
import { Badge, Button, ErrorState, Field, Input, Spinner } from '../../components/ui';
import { formatDiffPercentage, viewportLabel } from './helpers';

export function ComparePanel({ projectId, knownViewports }: { projectId: string; knownViewports: EditorViewport[] }) {
  const compare = useResponsiveCompare();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualIds, setManualIds] = useState('');
  const [route, setRoute] = useState('/');
  const [result, setResult] = useState<CompareResult | null>(null);

  const ids = [
    ...selected,
    ...manualIds.split(',').map((s) => s.trim()).filter((s) => s.length > 0),
  ];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = () => {
    compare.mutate(
      { projectId, viewportIds: ids, ...(route.trim().length > 0 ? { route: route.trim() } : {}) },
      { onSuccess: (data) => setResult(data) },
    );
  };

  const nameOf = (id: string) => knownViewports.find((v) => v.id === id);

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-foreground">
          Viewports da sessão (selecione 2+)
        </legend>
        {knownViewports.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum viewport criado nesta sessão — use ids manuais abaixo ou crie viewports na aba Viewports.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {knownViewports.map((v) => (
              <li key={v.id}>
                <label className="inline-flex items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                  {viewportLabel(v)} <span className="font-mono text-muted-foreground">{v.id}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Ids adicionais (separados por vírgula)" htmlFor="cp-ids">
          <Input id="cp-ids" value={manualIds} onChange={(e) => setManualIds(e.target.value)} className="font-mono" />
        </Field>
        <Field label="Rota" htmlFor="cp-route">
          <Input id="cp-route" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="/" className="font-mono" />
        </Field>
      </div>
      <div>
        <Button variant="primary" onClick={run} disabled={ids.length < 2 || compare.isPending}>
          <Columns2 aria-hidden="true" size={14} /> Comparar {ids.length > 0 ? `(${ids.length})` : ''}
        </Button>
      </div>
      {compare.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner label="Comparação em execução" /> Capturando e comparando no browser real (pixelmatch) — pode
          demorar (timeout 180s).
        </p>
      ) : null}
      {compare.isError ? <ErrorState error={compare.error} operation="responsive.compare" /> : null}
      {result !== null ? (
        <section aria-label="Resultado da comparação" className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {result.captures.length} captura(s), {result.diffs.length} par(es) comparado(s) — rota {result.route}.
          </p>
          <ul className="flex flex-col gap-1.5">
            {result.diffs.map((d, i) => (
              <li key={i} className="flex flex-col gap-1 rounded-md border border-border px-3 py-2 text-xs">
                <p className="text-foreground">
                  <span className="font-mono">{nameOf(d.viewportA) !== undefined ? viewportLabel(nameOf(d.viewportA) as EditorViewport) : d.viewportA}</span>
                  {' vs '}
                  <span className="font-mono">{nameOf(d.viewportB) !== undefined ? viewportLabel(nameOf(d.viewportB) as EditorViewport) : d.viewportB}</span>
                  {' — '}
                  <Badge tone={d.diffPercentage === 0 ? 'success' : 'warning'}>{formatDiffPercentage(d.diffPercentage)}</Badge>{' '}
                  ({d.diffPixels} px)
                </p>
                <p className="text-muted-foreground">
                  Região comparada: {d.comparedRegion.width}×{d.comparedRegion.height}
                  {d.fullDimensionsCompared ? '' : ' (dimensões diferem: apenas a interseção top-left foi comparada — documentado, 09§45)'}
                  {' · '}algoritmo {d.algorithm.name} (threshold {d.algorithm.threshold}, AA {d.algorithm.includeAA ? 'incluído' : 'excluído'})
                </p>
                {d.diffImagePath !== undefined ? (
                  <p className="font-mono text-muted-foreground">
                    Imagem de diff gravada pelo runtime em: {d.diffImagePath} (o Control Plane não serve arquivos
                    estáticos em M3 — path exibido como evidência).
                  </p>
                ) : (
                  <p className="text-muted-foreground">Sem imagem de diff para este par.</p>
                )}
              </li>
            ))}
          </ul>
          {result.diffs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum par comparado (selecione 2+ viewports).</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
