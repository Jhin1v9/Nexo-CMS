/**
 * ViewportsPanel — responsive.viewport.create (09§24-26): dimensões
 * arbitrárias obrigatórias (09§26). GAP HONESTO: o Control Plane M3 expõe
 * somente viewport.create (M3-CONTRACTS §3.5) — NÃO há capability de
 * listagem/delete de viewports registrados. Esta área mostra os viewports
 * criados NESTA sessão (retorno real do create) e permite informar um id
 * manualmente; nunca finge listar o registry.
 */

import { useState } from 'react';
import { MonitorSmartphone, Plus } from 'lucide-react';

import { useResponsiveViewportCreate } from '../../api/hooks';
import { Badge, Button, ErrorState, Field, Input, Select } from '../../components/ui';
import { viewportLabel, type KnownViewport } from './helpers';

/** Seletor de viewport: conhecidos da sessão OU id manual (gap documentado acima). */
export function ViewportPicker({
  knownViewports,
  viewportId,
  onChange,
  idPrefix,
}: {
  knownViewports: KnownViewport[];
  viewportId: string;
  onChange: (id: string) => void;
  idPrefix: string;
}) {
  const [mode, setMode] = useState<'known' | 'manual'>(knownViewports.length > 0 ? 'known' : 'manual');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2" role="group" aria-label="Origem do viewport">
        <Button size="sm" variant={mode === 'known' ? 'primary' : 'secondary'} onClick={() => setMode('known')} disabled={knownViewports.length === 0}>
          Da sessão ({knownViewports.length})
        </Button>
        <Button size="sm" variant={mode === 'manual' ? 'primary' : 'secondary'} onClick={() => setMode('manual')}>
          Id manual
        </Button>
      </div>
      {mode === 'known' ? (
        <Field label="Viewport" htmlFor={`${idPrefix}-known`}>
          <Select id={`${idPrefix}-known`} value={viewportId} onChange={(e) => onChange(e.target.value)}>
            <option value="">Selecione…</option>
            {knownViewports.map((v) => (
              <option key={v.id} value={v.id}>{viewportLabel(v)}</option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Viewport id" htmlFor={`${idPrefix}-manual`} description="Id de um viewport registrado (registry global, 09§24).">
          <Input id={`${idPrefix}-manual`} value={viewportId} onChange={(e) => onChange(e.target.value)} className="font-mono" />
        </Field>
      )}
      {mode === 'known' && knownViewports.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum viewport criado nesta sessão. Crie abaixo ou informe um id existente (a listagem do registry não é
          exposta pelo Control Plane em M3).
        </p>
      ) : null}
    </div>
  );
}

export function ViewportsPanel({
  projectId,
  knownViewports,
  onCreated,
}: {
  projectId: string;
  knownViewports: KnownViewport[];
  onCreated: (v: KnownViewport) => void;
}) {
  const create = useResponsiveViewportCreate();
  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [dpr, setDpr] = useState('');
  const [orientation, setOrientation] = useState<'Portrait' | 'Landscape' | ''>('');

  const w = Number(width);
  const h = Number(height);
  const d = dpr.trim().length > 0 ? Number(dpr) : undefined;
  const valid = Number.isInteger(w) && w > 0 && Number.isInteger(h) && h > 0 && (d === undefined || (Number.isFinite(d) && d > 0));

  const submit = () => {
    create.mutate(
      {
        projectId,
        ...(name.trim().length > 0 ? { name: name.trim() } : {}),
        width: w,
        height: h,
        ...(d !== undefined ? { dpr: d } : {}),
        ...(orientation !== '' ? { orientation } : {}),
      },
      {
        onSuccess: (v) => {
          onCreated(v);
          setName('');
          setWidth('');
          setHeight('');
          setDpr('');
          setOrientation('');
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Criar viewport">
        <h3 className="mb-2 text-sm font-medium text-foreground">Criar viewport (09§24)</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="Nome (opcional)" htmlFor="vp-name">
            <Input id="vp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mobile S" />
          </Field>
          <Field label="Largura (px CSS)" htmlFor="vp-w" required>
            <Input id="vp-w" inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="375" />
          </Field>
          <Field label="Altura (px CSS)" htmlFor="vp-h" required>
            <Input id="vp-h" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="812" />
          </Field>
          <Field label="DPR (opcional)" htmlFor="vp-dpr">
            <Input id="vp-dpr" inputMode="decimal" value={dpr} onChange={(e) => setDpr(e.target.value)} placeholder="2" />
          </Field>
          <Field label="Orientação" htmlFor="vp-o">
            <Select id="vp-o" value={orientation} onChange={(e) => setOrientation(e.target.value as 'Portrait' | 'Landscape' | '')}>
              <option value="">—</option>
              <option value="Portrait">Portrait</option>
              <option value="Landscape">Landscape</option>
            </Select>
          </Field>
        </div>
        {width.length > 0 && (!Number.isInteger(w) || w <= 0) ? (
          <p role="alert" className="mt-1 text-xs text-danger">Largura deve ser inteiro positivo (px CSS).</p>
        ) : null}
        {height.length > 0 && (!Number.isInteger(h) || h <= 0) ? (
          <p role="alert" className="mt-1 text-xs text-danger">Altura deve ser inteiro positivo (px CSS).</p>
        ) : null}
        <div className="mt-2">
          <Button variant="primary" onClick={submit} disabled={!valid} loading={create.isPending}>
            <Plus aria-hidden="true" size={14} /> Criar viewport
          </Button>
        </div>
        {create.isError ? <div className="mt-2"><ErrorState error={create.error} operation="responsive.viewport.create" /></div> : null}
      </section>

      <section aria-label="Viewports desta sessão">
        <h3 className="mb-2 text-sm font-medium text-foreground">Viewports criados nesta sessão ({knownViewports.length})</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          O registry de viewports é global (09§24), mas o Control Plane M3 não expõe listagem/delete — só o create.
          Esta lista mostra os viewports criados por esta sessão (resposta real do backend).
        </p>
        {knownViewports.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <MonitorSmartphone aria-hidden="true" size={14} /> Nenhum viewport criado nesta sessão.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {knownViewports.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                <span className="font-medium text-foreground">{viewportLabel(v)}</span>
                {v.dpr !== undefined ? <Badge tone="neutral">dpr {v.dpr}</Badge> : null}
                {v.orientation !== undefined ? <Badge tone="neutral">{v.orientation}</Badge> : null}
                {v.isPreset === true ? <Badge tone="primary" title="Originado de preset configurável (09§25) — não confere autoridade">preset</Badge> : null}
                <span className="font-mono text-muted-foreground">{v.id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
