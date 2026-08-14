/**
 * ApprovalDialog — diálogo de aprovação REAL para mutações DESTRUCTIVE
 * (decisão D17 + doc 10 §16/§47; doc 07 §43: "A UI deve exibir impacto
 * suficiente para permitir decisão informada").
 *
 * Ao confirmar, o chamador re-invoca a capability com
 * `approval: { approver: ator atual, justification? }` no envelope de invoke:
 * REQUIRE_APPROVAL + approval válido EXECUTA de verdade, e o audit event
 * registra requestedBy/approvedBy/at/operation/resource/result (Permission
 * Model §65). Aprovação é POR INVOCAÇÃO — sem grant permanente.
 */

import { ShieldAlert } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { RiskBadge } from './RiskBadge';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Textarea } from './Field';

export interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título da operação (ex.: 'Criar branch'). */
  title: string;
  /** Capability que será invocada (ex.: 'git.branch.create'). */
  capabilityId: string;
  /** Resumo do impacto/entrada — informação para decisão (07 §43). */
  children: ReactNode;
  confirmLabel?: string;
  /** Recebe a justificativa opcional digitada (vai para auditoria, D17). */
  onConfirm: (justification?: string) => void;
  /** Mutation em andamento (feedback real, 07 §61). */
  loading?: boolean;
}

export function ApprovalDialog({
  open,
  onOpenChange,
  title,
  capabilityId,
  children,
  confirmLabel = 'Aprovar e executar',
  onConfirm,
  loading = false,
}: ApprovalDialogProps) {
  const justificationId = useId();
  const [justification, setJustification] = useState('');

  const close = (next: boolean) => {
    if (!next) setJustification('');
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={
        <span className="inline-flex items-center gap-2">
          <ShieldAlert aria-hidden="true" size={18} className="text-danger" />
          {title}
        </span>
      }
      description={
        <span className="inline-flex items-center gap-2">
          Operação destrutiva via capability <code className="font-mono text-xs">{capabilityId}</code>
          <RiskBadge risk="DESTRUCTIVE" />
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const trimmed = justification.trim();
              onConfirm(trimmed.length > 0 ? trimmed : undefined);
            }}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
        {children}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <label htmlFor={justificationId} className="text-xs font-medium text-foreground">
          Justificativa (opcional)
        </label>
        <Textarea
          id={justificationId}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Motivo da aprovação — registrado em auditoria"
          className="min-h-14"
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Ao aprovar, a operação é executada de verdade pelo Control Plane e a aprovação fica registrada em
        auditoria (quem aprovou, quando, operação e resultado). A aprovação vale somente para esta execução.
      </p>
    </Dialog>
  );
}
