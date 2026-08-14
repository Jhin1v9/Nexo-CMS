/**
 * TokensPanel — tokens agrupados por tipo (09§51) com origem file:line,
 * swatches de cor reais (o valor verbatim vira background do swatch quando
 * previewável; o TEXTO exibido é sempre o valor exato do source — 09§10).
 * token.update via dialog com aprovação D17; impact report (09§79) exibido
 * no resultado verificado (o backend não expõe dry-run — honesto).
 */

import { useState } from 'react';

import { currentActorId } from '../../api/client';
import {
  useDesignTokenUpdate,
  type DesignModel,
  type DesignTokenInfo,
  type DesignTokenUpdateResult,
} from '../../api/hooks';
import { ApprovalDialog, Badge, Button, Dialog, EmptyState, ErrorState, Field, Input } from '../../components/ui';
import { Palette } from 'lucide-react';
import { isColorPreviewable, nonEmptyTokenGroups, TOKEN_GROUP_META } from './helpers';

function TokenRow({ token, onEdit }: { token: DesignTokenInfo; onEdit: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
      {token.type === 'Color' ? (
        <span
          aria-hidden="true"
          className="inline-block h-5 w-5 shrink-0 rounded border border-border"
          style={isColorPreviewable(token.value) ? { backgroundColor: token.value } : undefined}
          title={isColorPreviewable(token.value) ? `Preview de ${token.value}` : 'Valor não previewável como cor'}
        />
      ) : null}
      <span className="font-mono text-xs font-medium text-foreground">{token.tokenRef}</span>
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{token.value}</code>
      <Badge tone="neutral">{token.representation}</Badge>
      <span className="font-mono text-xs text-muted-foreground">
        {token.source.file}:{token.source.line}
      </span>
      <span className="ml-auto">
        <Button size="sm" variant="secondary" onClick={onEdit} aria-label={`Editar token ${token.tokenRef}`}>
          Editar
        </Button>
      </span>
    </li>
  );
}

function TokenUpdateDialog({
  projectId,
  token,
  open,
  onOpenChange,
}: {
  projectId: string;
  token: DesignTokenInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useDesignTokenUpdate();
  const [value, setValue] = useState(token.value);
  const [approving, setApproving] = useState(false);
  const [result, setResult] = useState<DesignTokenUpdateResult | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setValue(token.value);
      setApproving(false);
      setResult(null);
      update.reset();
    }
    onOpenChange(next);
  };

  const submit = (justification?: string) => {
    update.mutate(
      {
        projectId,
        tokenRef: token.tokenRef,
        value,
        approval: { approver: currentActorId(), ...(justification ? { justification } : {}) },
      },
      {
        onSuccess: (data) => {
          setApproving(false);
          setResult(data);
        },
        onError: () => setApproving(false),
      },
    );
  };

  return (
    <>
      <Dialog
        open={open && !approving}
        onOpenChange={close}
        title={`Editar token ${token.tokenRef}`}
        description="design.token.update — edita a FONTE do token (09§8) preservando a representação (09§10). Nunca desanexa sem intenção explícita (09§56)."
        footer={
          result === null ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
              <Button variant="primary" onClick={() => { update.reset(); setApproving(true); }} disabled={value.trim().length === 0}>
                Aplicar na fonte
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => close(false)}>Fechar</Button>
            </div>
          )
        }
      >
        {result !== null ? (
          <div className="flex flex-col gap-3" role="status">
            <p className="text-sm text-foreground">
              <Badge tone="success">Verificado</Badge>{' '}
              <span className="font-mono">{result.previousValue}</span> → <span className="font-mono">{result.value}</span>{' '}
              em <span className="font-mono">{result.file}:{result.line}</span> ({result.representation}).
            </p>
            <div className="rounded-md border border-border px-3 py-2">
              <h4 className="text-xs font-medium text-foreground">
                Impact report (09§79): {result.impact.usagesCount} uso(s) em {result.impact.affectedFiles.length} arquivo(s)
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {result.impact.scannedFiles} arquivo(s) varridos · componentes afetados: {result.impact.affectedComponents.length} ·
                páginas: {result.impact.affectedPages.length} · tokens dependentes: {result.impact.affectedTokens.length}.
              </p>
              {result.impact.notes.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {result.impact.notes.map((n, i) => (
                    <li key={i} className="text-xs text-muted-foreground">{n}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            {result.filesChanged.length > 0 ? (
              <ul className="flex flex-col gap-0.5">
                {result.filesChanged.map((f) => (
                  <li key={f} className="font-mono text-xs text-muted-foreground">{f}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Valor atual (verbatim): <code className="rounded bg-muted px-1 py-0.5 font-mono">{token.value}</code> em{' '}
              <span className="font-mono">{token.source.file}:{token.source.line}</span>.
            </p>
            <Field label="Novo valor (verbatim — sem conversão)" htmlFor="tu-value" required>
              <Input id="tu-value" value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
            {update.isError ? <ErrorState error={update.error} operation="design.token.update" /> : null}
          </div>
        )}
      </Dialog>

      <ApprovalDialog
        open={approving}
        onOpenChange={(o) => setApproving(o)}
        title={`Editar token ${token.tokenRef}`}
        capabilityId="design.token.update"
        confirmLabel="Aprovar e editar fonte"
        loading={update.isPending}
        onConfirm={(j) => submit(j)}
      >
        <p className="text-sm text-foreground">
          Escreve <span className="font-mono">{value}</span> na fonte do token{' '}
          <span className="font-mono">{token.tokenRef}</span> ({token.source.file}:{token.source.line}). O backend
          retorna o impact report real (usos contados no source, 09§79) e verifica a escrita.
        </p>
      </ApprovalDialog>
    </>
  );
}

export function TokensPanel({ projectId, model }: { projectId: string; model: DesignModel }) {
  const [editing, setEditing] = useState<DesignTokenInfo | null>(null);
  const groups = nonEmptyTokenGroups(model.tokens);

  if (model.tokensTotal === 0) {
    return (
      <EmptyState
        icon={Palette}
        title="Nenhum design token detectado"
        description="Nenhum token encontrado nos mecanismos suportados (Tailwind v4/v3, CSS variables). Sem sinais reais, nada é inventado (09§51)."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {model.tokensTotal} token(s) detectados, com origem exata (arquivo:linha). Valores exibidos verbatim (09§10).
      </p>
      {groups.map((key) => (
        <section key={key} aria-label={`Tokens ${TOKEN_GROUP_META[key].label}`}>
          <h3 className="text-sm font-medium text-foreground">
            {TOKEN_GROUP_META[key].label} <Badge tone="neutral">{model.tokens[key].length}</Badge>
          </h3>
          <p className="mb-1.5 text-xs text-muted-foreground">{TOKEN_GROUP_META[key].description}</p>
          <ul className="flex flex-col gap-1.5">
            {model.tokens[key].map((t) => (
              <TokenRow key={`${t.tokenRef}-${t.source.file}:${t.source.line}`} token={t} onEdit={() => setEditing(t)} />
            ))}
          </ul>
        </section>
      ))}
      {editing !== null ? (
        <TokenUpdateDialog
          projectId={projectId}
          token={editing}
          open={editing !== null}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
