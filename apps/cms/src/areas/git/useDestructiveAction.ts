/**
 * useDestructiveAction — fluxo de aprovação REAL para mutações DESTRUCTIVE
 * (decisão D17, OPEN-QUESTIONS.md): clique -> ApprovalDialog (impacto visível,
 * 07 §43) -> re-invoca a capability com `approval: { approver, justification? }`
 * no envelope. REQUIRE_APPROVAL + approval válido EXECUTA de verdade no
 * Control Plane, com auditoria (quem aprovou, quando, operação, resultado).
 * O resultado real (sucesso/erro) é exibido — nunca fake success (M3 §8.4).
 */

import { useState } from 'react';

import { currentActorId, withApproval } from '../../api/client';
import { useGitMutation } from '../../api/hooks';

export interface DestructiveAction<TInput extends { projectId: string }, TOutput = Record<string, unknown>> {
  mutation: ReturnType<typeof useGitMutation<TInput, TOutput>>;
  /** Input aguardando confirmação no diálogo (null = diálogo fechado). */
  pending: TInput | null;
  /** Abre o diálogo de aprovação com o input a executar. */
  request: (input: TInput) => void;
  /** Cancela (fecha sem executar — nunca descarta silenciosamente). */
  cancel: () => void;
  /**
   * Confirma: re-invoca com approval { approver: ator atual, justification? }
   * (chamado pelo botão do ApprovalDialog).
   */
  confirm: (justification?: string) => void;
}

export function useDestructiveAction<TInput extends { projectId: string }, TOutput = Record<string, unknown>>(
  capabilityId: string,
  opts?: { onSuccess?: (data: TOutput) => void; approver?: string },
): DestructiveAction<TInput, TOutput> {
  const mutation = useGitMutation<TInput, TOutput>(capabilityId);
  const [pending, setPending] = useState<TInput | null>(null);

  return {
    mutation,
    pending,
    request: (input) => {
      mutation.reset();
      setPending(input);
    },
    cancel: () => setPending(null),
    confirm: (justification) => {
      if (pending === null) return;
      const approved = withApproval(pending, {
        approver: opts?.approver ?? currentActorId(),
        ...(justification !== undefined ? { justification } : {}),
      }) as TInput;
      mutation.mutate(approved, {
        onSuccess: (data) => {
          setPending(null);
          opts?.onSuccess?.(data);
        },
      });
    },
  };
}
