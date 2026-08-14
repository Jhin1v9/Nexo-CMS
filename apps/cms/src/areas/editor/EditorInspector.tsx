/**
 * EditorInspector — seleção + source mapping (07§10-15).
 *
 * editor.selection.read por route+nodeRef -> Selection Model com confidence
 * REAL (EXACT | HIGH_CONFIDENCE | PARTIAL | UNKNOWN — nunca apresentado como
 * exato, 07§12). PARTIAL/UNKNOWN -> alternativas seguras do backend (07§15):
 * abrir source da página, usar Code View. Quando há sourceFile mapeado, o
 * botão abre o arquivo real na Code View.
 */

import { Crosshair, FileCode } from 'lucide-react';
import { useId, useState } from 'react';

import { useEditorSelection, type EditorSelectionOutput } from '../../api/hooks';
import {
  Button,
  ConfidenceBadge,
  EmptyState,
  ErrorState,
  Field,
  GuardedButton,
  Input,
} from '../../components/ui';
import { useEditorStore } from './editorStore';

function SelectionResult({
  selection,
  onOpenSource,
}: {
  selection: EditorSelectionOutput;
  onOpenSource: (filePath: string) => void;
}) {
  if (selection.confidence === 'UNKNOWN') {
    return (
      <div className="flex flex-col gap-3">
        <EmptyState
          icon={Crosshair}
          title="Mapeamento desconhecido (UNKNOWN)"
          description="O source mapping não conseguiu identificar a origem com segurança (07§15). Nada será adivinhado — use uma das alternativas seguras."
        />
        {selection.alternatives !== undefined && selection.alternatives.length > 0 ? (
          <div>
            <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
              Alternativas seguras (07§15)
            </h4>
            <ul className="list-inside list-disc text-xs text-foreground">
              {selection.alternatives.map((alt) => (
                <li key={alt}>{alt}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <ConfidenceBadge confidence={selection.confidence} />
        {selection.confidence === 'PARTIAL' ? (
          <span className="text-xs text-muted-foreground">
            Mapeamento parcial — confirme antes de editar (07§12).
          </span>
        ) : null}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {selection.component !== undefined ? (
          <>
            <dt className="text-muted-foreground">Componente</dt>
            <dd className="font-medium text-foreground">{selection.component}</dd>
          </>
        ) : null}
        {selection.route !== undefined ? (
          <>
            <dt className="text-muted-foreground">Rota</dt>
            <dd className="font-mono text-foreground">{selection.route}</dd>
          </>
        ) : null}
        {selection.nodeRef !== undefined ? (
          <>
            <dt className="text-muted-foreground">Node</dt>
            <dd className="font-mono text-foreground">{selection.nodeRef}</dd>
          </>
        ) : null}
        {selection.sourceFile !== undefined ? (
          <>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-mono text-foreground">
              {selection.sourceFile}
              {selection.sourceLocation !== undefined
                ? `:${String(selection.sourceLocation.line)}:${String(selection.sourceLocation.column)}`
                : ''}
            </dd>
          </>
        ) : null}
      </dl>
      {selection.sourceFile !== undefined ? (
        <div>
          <Button size="sm" variant="secondary" onClick={() => onOpenSource(selection.sourceFile ?? '')}>
            <FileCode aria-hidden="true" size={14} />
            Abrir source na Code View
          </Button>
        </div>
      ) : null}
      {selection.alternatives !== undefined && selection.alternatives.length > 0 ? (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
            Alternativas seguras (07§15)
          </h4>
          <ul className="list-inside list-disc text-xs text-foreground">
            {selection.alternatives.map((alt) => (
              <li key={alt}>{alt}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function EditorInspector({
  projectId,
  onOpenSource,
}: {
  projectId: string;
  onOpenSource: (filePath: string) => void;
}) {
  const selection = useEditorSelection();
  const routeId = useId();
  const nodeRefId = useId();
  const previewRoute = useEditorStore((s) => s.previewRoute);
  const [route, setRoute] = useState('');
  const [nodeRef, setNodeRef] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <form
        aria-label="Ler seleção por source mapping"
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const r = route.trim().length > 0 ? route.trim() : previewRoute;
          selection.mutate({
            projectId,
            ...(r.length > 0 ? { route: r } : {}),
            ...(nodeRef.trim().length > 0 ? { nodeRef: nodeRef.trim() } : {}),
          });
        }}
      >
        <Field
          label="Rota"
          htmlFor={routeId}
          description={`Vazio usa a rota do preview ('${previewRoute}').`}
        >
          <Input
            id={routeId}
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="/"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        </Field>
        <Field
          label="Node ref (componente ou arquivo)"
          htmlFor={nodeRefId}
          description="Ex.: 'Hero' ou 'src/components/Hero.tsx'. Vazio retorna UNKNOWN com alternativas (07§15)."
        >
          <Input
            id={nodeRefId}
            value={nodeRef}
            onChange={(e) => setNodeRef(e.target.value)}
            placeholder="Hero"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        </Field>
        <div>
          <GuardedButton
            capabilityId="editor.selection.read"
            type="submit"
            variant="primary"
            size="sm"
            loading={selection.isPending}
          >
            <Crosshair aria-hidden="true" size={14} />
            Ler seleção
          </GuardedButton>
        </div>
      </form>

      {selection.isError ? <ErrorState error={selection.error} operation="editor.selection.read" /> : null}
      {selection.data !== undefined ? (
        <SelectionResult selection={selection.data} onOpenSource={onOpenSource} />
      ) : null}
    </div>
  );
}
