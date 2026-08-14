/**
 * DeleteComponentDialog — component.delete (08§23): impact analysis
 * OBRIGATÓRIA exibida ANTES da confirmação final. Fluxo real:
 * 1) ApprovalDialog inicial (aviso: o backend varre o impacto antes).
 * 2) DeleteBlockedByReferences -> o impacto retornado em error.details é
 *    exibido; só então um segundo ApprovalDialog reenvia com confirm:true.
 * 3) DeleteBlockedImpactUnknown -> bloqueio explicado, SEM caminho de bypass.
 * O resultado real (deletedFiles/brokenReferences/verified) é exibido.
 */

import { useState } from 'react';

import { currentActorId } from '../../api/client';
import { useComponentDelete, type ComponentSchema, type DeleteComponentOutcome } from '../../api/hooks';
import { ApprovalDialog, Badge, Button, Dialog, ErrorState } from '../../components/ui';
import { ImpactSummary } from './ImpactSummary';
import { blockedImpactFromError, type BlockedImpact } from './helpers';

export function BlockedImpactView({ impact }: { impact: BlockedImpact }) {
  const groups: [string, string[]][] = [
    [`Rotas (${impact.routes.length})`, impact.routes],
    [`Páginas (${impact.pages.length})`, impact.pages],
    [`Outros componentes (${impact.otherComponents.length})`, impact.otherComponents],
    [`Exports (${impact.exports.length})`, impact.exports],
    [`Testes (${impact.tests.length})`, impact.tests],
    [`Assets usados — reportados, nunca deletados (${impact.assets.length})`, impact.assets],
  ];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">
        Referências ativas encontradas: {impact.referenceCount}
      </p>
      <ul className="flex max-h-32 flex-col gap-0.5 overflow-auto">
        {impact.references.map((r, i) => (
          <li key={i} className="font-mono text-xs text-muted-foreground">
            {r.file}:{r.line} <Badge tone="neutral">{r.kind}</Badge>
          </li>
        ))}
      </ul>
      {groups
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => (
          <div key={label}>
            <p className="text-xs font-medium text-foreground">{label}</p>
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item} className="font-mono text-xs text-muted-foreground">{item}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

export interface DeleteComponentDialogProps {
  projectId: string;
  schema: ComponentSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteComponentDialog({ projectId, schema, open, onOpenChange, onDeleted }: DeleteComponentDialogProps) {
  const del = useComponentDelete();
  const [approving, setApproving] = useState(false);
  const [confirmingRefs, setConfirmingRefs] = useState(false);
  const [outcome, setOutcome] = useState<DeleteComponentOutcome | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setApproving(false);
      setConfirmingRefs(false);
      setOutcome(null);
      del.reset();
    }
    onOpenChange(next);
  };

  const run = (confirm: boolean, justification?: string) => {
    del.mutate(
      {
        projectId,
        componentId: schema.identity.id,
        ...(confirm ? { confirm: true } : {}),
        approval: { approver: currentActorId(), ...(justification ? { justification } : {}) },
      },
      {
        onSuccess: (data) => {
          setApproving(false);
          setConfirmingRefs(false);
          setOutcome(data);
        },
        onError: (error) => {
          setApproving(false);
          const blocked = blockedImpactFromError(error);
          if (blocked?.kind === 'blocked') setConfirmingRefs(true);
        },
      },
    );
  };

  const blocked = del.isError ? blockedImpactFromError(del.error) : null;

  return (
    <>
      <Dialog
        open={open && !approving && !confirmingRefs}
        onOpenChange={close}
        title={`Delete '${schema.identity.name}'`}
        className="max-w-2xl"
        footer={
          outcome === null ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
              <Button variant="danger" onClick={() => { del.reset(); setApproving(true); }}>
                Iniciar delete
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => { close(false); onDeleted(); }}>Fechar</Button>
            </div>
          )
        }
      >
        {outcome !== null ? (
          <div className="flex flex-col gap-3" role="status">
            <p className="text-sm text-foreground">
              <Badge tone={outcome.verified ? 'success' : 'warning'}>
                {outcome.verified ? 'Deletado e verificado' : 'Deletado (verificação pendente)'}
              </Badge>{' '}
              {outcome.removedFromRegistry ? 'Removido do registry.' : 'Registry não alterado.'}
            </p>
            <ImpactSummary impact={outcome.impact} />
            {outcome.deletedFiles.length > 0 ? (
              <div>
                <h4 className="text-xs font-medium text-foreground">Arquivos deletados ({outcome.deletedFiles.length})</h4>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {outcome.deletedFiles.map((f) => (
                    <li key={f} className="font-mono text-xs text-muted-foreground">{f}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum arquivo local deletado (ex.: Library Component — 08§69).</p>
            )}
            {outcome.brokenReferences.length > 0 ? (
              <div role="alert">
                <h4 className="text-xs font-medium text-danger">
                  Referências quebradas ({outcome.brokenReferences.length})
                </h4>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {outcome.brokenReferences.map((r, i) => (
                    <li key={i} className="font-mono text-xs text-danger">{r.file}:{r.line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">
              O backend executa a impact analysis 08§23 (references/routes/pages/components/exports/tests/assets)
              ANTES de deletar. Se houver referências ativas, elas serão listadas aqui para decisão explícita —
              sem cascata silenciosa.
            </p>
            {del.isError && blocked === null ? <ErrorState error={del.error} operation="component.delete" /> : null}
            {blocked?.kind === 'unknown-impact' ? (
              <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2">
                <p className="text-sm font-medium text-danger">Delete bloqueado: impacto Unknown</p>
                <p className="text-xs text-muted-foreground">
                  O scan não cobriu todos os arquivos ({blocked.skippedFiles} de{' '}
                  {blocked.scannedFiles + blocked.skippedFiles} não varridos). Impacto Unknown nunca é tratado como
                  "sem referências" (M3 §8.8). Reduza exclusões ou revise o projeto e tente novamente.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </Dialog>

      <ApprovalDialog
        open={approving}
        onOpenChange={(o) => setApproving(o)}
        title={`Delete '${schema.identity.name}'`}
        capabilityId="component.delete"
        confirmLabel="Aprovar e deletar"
        loading={del.isPending}
        onConfirm={(j) => run(false, j)}
      >
        <p className="text-sm text-foreground">
          Solicita o delete de <span className="font-medium">{schema.identity.name}</span> (escopo{' '}
          {schema.identity.scope}). Com referências ativas, o backend bloqueia e exige uma segunda confirmação com o
          impacto visível.
        </p>
      </ApprovalDialog>

      <ApprovalDialog
        open={confirmingRefs}
        onOpenChange={(o) => setConfirmingRefs(o)}
        title={`Confirmar delete com referências ativas`}
        capabilityId="component.delete"
        confirmLabel="Confirmar delete (referências quebrarão)"
        loading={del.isPending}
        onConfirm={(j) => run(true, j)}
      >
        {blocked?.kind === 'blocked' ? <BlockedImpactView impact={blocked.impact} /> : null}
      </ApprovalDialog>
    </>
  );
}
