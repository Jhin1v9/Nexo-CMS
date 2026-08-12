/**
 * Convergência de tipos de auditoria (Wave 3, tarefa de integração #1).
 *
 * @nexo/security é a FONTE CANÔNICA de AuditEvent/AuditSink (SPEC §3).
 * @nexo/storage espelha os mesmos shapes localmente (packages/storage/src/types.ts)
 * para não criar dependência cruzada entre branches da Wave 2. Os shapes são
 * estruturalmente idênticos (mesmos campos, Actor/ExecutionContext de @nexo/core,
 * Decision/AuditDecision com a mesma união de literais, OpStatus de @nexo/shared).
 *
 * Esta função adaptadora TIPADA (sem casts) é a prova compilada da
 * compatibilidade estrutural: se os shapes divergirem, tsc falha aqui.
 */

import type { AuditEvent as SecurityAuditEvent, AuditSink as SecurityAuditSink } from '@nexo/security';
import type { AuditEvent as StorageAuditEvent, AuditSink as StorageAuditSink } from '@nexo/storage';

/** Adapta o AuditEvent canônico (security) para o espelho do storage. */
export function toStorageAuditEvent(e: SecurityAuditEvent): StorageAuditEvent {
  // Construção campo a campo (sem `as`): qualquer divergência estrutural
  // entre os dois shapes vira erro de compilação nesta função.
  const out: StorageAuditEvent = {
    id: e.id,
    who: e.who,
    what: e.what,
    context: e.context,
    result: e.result,
    at: e.at,
  };
  if (e.resource !== undefined) out.resource = e.resource;
  if (e.decision !== undefined) out.decision = e.decision;
  if (e.details !== undefined) out.details = e.details;
  return out;
}

/**
 * Adapta um AuditSink do storage (ex.: AuditRepository) para o contrato
 * canônico AuditSink de @nexo/security — usado ao injetar o sink no
 * PolicyEngine, no ControlPlane e no CommandExecutor.
 */
export function asSecurityAuditSink(storageSink: StorageAuditSink): SecurityAuditSink {
  return {
    record(e: SecurityAuditEvent): void {
      storageSink.record(toStorageAuditEvent(e));
    },
  };
}
