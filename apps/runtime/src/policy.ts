/**
 * Grants M1 do ator local (SPEC.md §3/§9) — configurados via código no bootstrap.
 *
 * Modelo M1 (documentado; auth formal é milestone futuro — OPEN QUESTION #2,
 * NÃO inventar OAuth): o ator chega pelo header `x-nexo-actor`. Somente o
 * ator local `cli:local` tem grants; qualquer outro id cai em DEFAULT DENY
 * (SPEC §3).
 *
 * Wave 5 (FIX 2 — MEDIUM): header AUSENTE/VAZIO não assume mais `cli:local`
 * (fail-open). O ator vira `anonymous:unknown` (kind SYSTEM, zero grants ->
 * DEFAULT DENY). A CLI oficial SEMPRE envia `x-nexo-actor: cli:local`
 * explicitamente (override via env NEXO_ACTOR — apps/cli/src/client.ts).
 *
 * Grants do ator local:
 *  - `project.*` (import/open/read/list/refresh) -> ALLOW
 *  - `runtime.filesystem.read`, `runtime.filesystem.list` -> ALLOW
 *  - `runtime.command.execute` -> ALLOW APENAS para classificação SAFE:
 *    a capability reclassifica o comando no handler — RESTRICTED/UNKNOWN ->
 *    REQUIRE_APPROVAL via política estática `*.execute_sensitive` do
 *    PolicyEngine; BLOCKED/DANGEROUS -> COMMAND_BLOCKED pelo executor (SPEC §4).
 *  - Qualquer outra permissão -> DEFAULT DENY (sem grant).
 */

import type { AuditSink } from '@nexo/security';
import { createPolicyEngine, type PolicyEngine } from '@nexo/security';

/** Ator local M1 — único com grants. Deve vir EXPLICITAMENTE no header. */
export const LOCAL_ACTOR_ID = 'cli:local';

/**
 * Ator fail-closed quando o header x-nexo-actor está ausente/vazio (Wave 5
 * FIX 2): kind SYSTEM, zero grants -> DEFAULT DENY em tudo (SPEC §3).
 */
export const ANONYMOUS_ACTOR = { kind: 'SYSTEM', id: 'anonymous:unknown' } as const;

/** Permissão "sensível" usada pela política para comandos não-SAFE. */
export const SENSITIVE_COMMAND_PERMISSION = 'runtime.command.execute_sensitive';

/** Grants explícitos M1 do ator local (match exato no PolicyEngine). */
export const M1_LOCAL_GRANTS: readonly string[] = [
  'project.import',
  'project.open',
  'project.read',
  'project.list',
  'project.refresh',
  'runtime.filesystem.read',
  'runtime.filesystem.list',
  // ALLOW somente para SAFE — ver docstring do módulo e capabilities/runtime.ts.
  'runtime.command.execute',
  // Grant existe APENAS para que a regra estática '*.execute_sensitive' do
  // PolicyEngine escalone para REQUIRE_APPROVAL (nunca vira ALLOW — a política
  // estática força approval mesmo com grant, SPEC §3). Sem este grant o
  // resultado seria DENY (DEFAULT DENY), perdendo o caminho de aprovação.
  SENSITIVE_COMMAND_PERMISSION,
];

export function createM1PolicyEngine(audit: AuditSink): PolicyEngine {
  return createPolicyEngine({
    grants: { [LOCAL_ACTOR_ID]: M1_LOCAL_GRANTS },
    // Sem riscos DESTRUCTIVE/CRITICAL mapeados no M1: a aprovação de comandos
    // não-SAFE é forçada pela regra estática '*.execute_sensitive' do PolicyEngine.
    audit,
  });
}
