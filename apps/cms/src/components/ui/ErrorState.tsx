/**
 * ErrorState — erro estruturado do Control Plane (doc 07 §44/§83): operação,
 * motivo, impacto e recuperação. Mostra `details.nextAction` quando presente;
 * NUNCA "Something went wrong" genérico quando há informação útil.
 */

import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { ControlPlaneError, nextActionOf, type ControlPlaneErrorShape } from '../../api/client';
import { Badge } from './Badge';

export interface ErrorStateProps {
  error: ControlPlaneError | ControlPlaneErrorShape | Error | unknown;
  /** Contexto da operação (ex.: 'git.status'). */
  operation?: string;
  /** Ação de recuperação (ex.: botão "Tentar novamente" / "Re-scan"). */
  action?: ReactNode;
}

function toShape(error: unknown): ControlPlaneErrorShape {
  if (error instanceof ControlPlaneError) return error.shape;
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    return error as ControlPlaneErrorShape;
  }
  return {
    code: 'INTERNAL',
    message: error instanceof Error ? error.message : String(error),
    retryable: false,
  };
}

export function ErrorState({ error, operation, action }: ErrorStateProps) {
  const shape = toShape(error);
  const nextAction = nextActionOf(shape);
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <AlertCircle aria-hidden="true" size={16} className="shrink-0 text-danger" />
        <p className="text-sm font-medium text-foreground">
          {operation !== undefined ? `Falha em ${operation}` : 'Operação falhou'}
        </p>
        <Badge tone="danger">{shape.code}</Badge>
        {shape.requiresApproval === true ? <Badge tone="warning">requer aprovação</Badge> : null}
        {shape.retryable ? <Badge tone="neutral">recuperável</Badge> : null}
      </div>
      <p className="text-sm text-foreground">{shape.message}</p>
      {nextAction !== undefined ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Próxima ação sugerida: </span>
          {nextAction}
        </p>
      ) : null}
      {shape.operationId !== undefined ? (
        <p className="text-xs text-muted-foreground">operationId: {shape.operationId}</p>
      ) : null}
      {action !== undefined ? <div className="mt-1 flex gap-2">{action}</div> : null}
    </div>
  );
}
