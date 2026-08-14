/**
 * EditorPreviewPanel — preview do runtime REAL do projeto (07§45-48, 09§27;
 * Inv. 12: preview rotulado). NUNCA renderer aproximado.
 *
 * - responsive.preview inicia/reutiliza o dev server REAL (script do
 *   package.json detectado pelo backend) e retorna a URL real, embutida num
 *   iframe rotulado com viewport/rota/script (evidência, não suposição).
 * - Erros classificados (PREVIEW_SCRIPT_UNKNOWN, UNSUPPORTED, timeouts…) são
 *   exibidos via ErrorState com code/nextAction (07§48).
 * - Viewports: NÃO há capability de listagem no M3 (§3.5 tem apenas
 *   viewport.create) — os presets semeados no backend não são enumeráveis.
 *   Por isso o painel cria viewports reais via responsive.viewport.create
 *   (SAFE) e oferece seleção dos criados nesta sessão + entrada manual de id.
 *   DESVIO documentado; quando existir listagem, passa a consumi-la.
 */

import { MonitorPlay, Plus } from 'lucide-react';
import { useId, useState } from 'react';

import { useResponsivePreview, useResponsiveViewportCreate, useCapability } from '../../api/hooks';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
import { useEditorStore } from './editorStore';

function CreateViewportForm({ projectId }: { projectId: string }) {
  const create = useResponsiveViewportCreate();
  const addSessionViewport = useEditorStore((s) => s.addSessionViewport);
  const nameId = useId();
  const widthId = useId();
  const heightId = useId();
  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  const w = Number.parseInt(width, 10);
  const h = Number.parseInt(height, 10);
  const valid = Number.isInteger(w) && w > 0 && Number.isInteger(h) && h > 0;

  return (
    <form
      aria-label="Criar viewport"
      className="flex flex-col gap-2 rounded-md border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        create.mutate(
          {
            projectId,
            ...(name.trim().length > 0 ? { name: name.trim() } : {}),
            width: w,
            height: h,
            ...(w >= h ? { orientation: 'Landscape' as const } : { orientation: 'Portrait' as const }),
          },
          { onSuccess: (viewport) => addSessionViewport(viewport) },
        );
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        <Field label="Nome" htmlFor={nameId}>
          <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mobile" />
        </Field>
        <Field label="Largura (px)" htmlFor={widthId} required>
          <Input
            id={widthId}
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            inputMode="numeric"
            placeholder="375"
          />
        </Field>
        <Field label="Altura (px)" htmlFor={heightId} required>
          <Input
            id={heightId}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            inputMode="numeric"
            placeholder="812"
          />
        </Field>
      </div>
      {create.isError ? <ErrorState error={create.error} operation="responsive.viewport.create" /> : null}
      <div>
        <Button type="submit" size="sm" variant="secondary" disabled={!valid} loading={create.isPending}>
          <Plus aria-hidden="true" size={14} />
          Criar viewport
        </Button>
      </div>
    </form>
  );
}

export function EditorPreviewPanel({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const preview = useResponsivePreview();
  const previewCap = useCapability('responsive.preview');
  const createCap = useCapability('responsive.viewport.create');

  const routeId = useId();
  const viewportId = useId();
  const manualId = useId();
  const previewRoute = useEditorStore((s) => s.previewRoute);
  const setPreviewRoute = useEditorStore((s) => s.setPreviewRoute);
  const sessionViewports = useEditorStore((s) => s.sessionViewports);
  const activeViewportId = useEditorStore((s) => s.activeViewportId);
  const setActiveViewportId = useEditorStore((s) => s.setActiveViewportId);
  const [manualViewportId, setManualViewportId] = useState('');

  const effectiveViewportId = manualViewportId.trim().length > 0 ? manualViewportId.trim() : activeViewportId;

  // Gate honesto: capability de preview ausente no discovery (07§56/Inv. 27).
  if (previewCap.availability !== undefined && previewCap.availability.kind === 'missing') {
    return (
      <EmptyState
        icon={MonitorPlay}
        title="Preview indisponível: capability pendente"
        description="'responsive.preview' não consta no discovery do Control Plane. O Editor nunca simula um preview — ele usa o runtime real do projeto (07§45)."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <form
        aria-label="Configurar preview"
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (effectiveViewportId === null || effectiveViewportId.length === 0) return;
          const route = previewRoute.trim();
          preview.mutate({
            projectId,
            viewportId: effectiveViewportId,
            ...(route.length > 0 ? { route } : {}),
          });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rota" htmlFor={routeId}>
            <Input
              id={routeId}
              value={previewRoute}
              onChange={(e) => setPreviewRoute(e.target.value)}
              placeholder="/"
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-xs"
            />
          </Field>
          <Field
            label="Viewport (desta sessão)"
            htmlFor={viewportId}
            description="Sem capability de listagem no M3 — crie abaixo ou informe um id conhecido."
          >
            <Select
              id={viewportId}
              value={activeViewportId ?? ''}
              onChange={(e) => setActiveViewportId(e.target.value === '' ? null : e.target.value)}
            >
              <option value="">(nenhum selecionado)</option>
              {sessionViewports.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name ?? v.id} — {v.width}x{v.height}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Ou viewport id conhecido" htmlFor={manualId}>
          <Input
            id={manualId}
            value={manualViewportId}
            onChange={(e) => setManualViewportId(e.target.value)}
            placeholder="id de viewport registrado"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        </Field>
        {createCap.availability !== undefined && createCap.availability.kind !== 'missing' && !compact ? (
          <CreateViewportForm projectId={projectId} />
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={effectiveViewportId === null || effectiveViewportId.length === 0}
            loading={preview.isPending}
          >
            <MonitorPlay aria-hidden="true" size={14} />
            Iniciar preview
          </Button>
          {preview.isPending ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner label="Iniciando runtime real" /> Subindo o dev server real do projeto (pode levar até
              alguns minutos)…
            </span>
          ) : null}
        </div>
      </form>

      {preview.isError ? (
        <ErrorState
          error={preview.error}
          operation="responsive.preview"
          action={
            effectiveViewportId !== null && effectiveViewportId.length > 0 ? (
              <Button size="sm" onClick={() => preview.mutate(preview.variables ?? { projectId, viewportId: effectiveViewportId })}>
                Tentar novamente
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {preview.data !== undefined ? (
        <section
          aria-label="Preview do projeto"
          className="flex min-h-0 flex-1 flex-col gap-2 rounded-md border border-border p-3"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={preview.data.state === 'RUNNING' ? 'success' : preview.data.state === 'FAILED' ? 'danger' : 'warning'}>
              {preview.data.state}
            </Badge>
            {preview.data.reused ? <Badge tone="neutral">reutilizado (09§27)</Badge> : null}
            <span className="text-muted-foreground">
              Preview REAL — dev server <code className="font-mono">{preview.data.scriptName}</code> · viewport{' '}
              {preview.data.viewport.name ?? preview.data.viewport.id} ({preview.data.viewport.width}x
              {preview.data.viewport.height}) · rota {preview.data.route}
            </span>
            <a
              href={preview.data.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-primary underline"
            >
              {preview.data.previewUrl}
            </a>
          </div>
          {preview.data.state === 'RUNNING' ? (
            <iframe
              src={preview.data.previewUrl}
              title={`Preview real do projeto (${preview.data.viewport.name ?? preview.data.viewport.id}, rota ${preview.data.route})`}
              className="min-h-96 flex-1 rounded-md border border-border bg-background"
            />
          ) : (
            <p role="status" className="text-xs text-muted-foreground">
              O preview não está RUNNING (estado real: {preview.data.state}). O iframe só é renderizado com o
              runtime no ar.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
