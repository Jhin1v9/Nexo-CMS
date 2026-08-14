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
 *  - M2 (Git, doc 10 + decisão D3): leituras `git.status`, `git.diff`,
 *    `git.history`, `git.branch.list` -> ALLOW (risk SAFE). As 7 mutações
 *    (`git.branch.create`, `git.branch.switch`, `git.branch.delete`,
 *    `git.commit`, `git.push`, `git.pull`, `git.fetch`) têm grant MAS risk
 *    DESTRUCTIVE no PolicyEngine -> REQUIRE_APPROVAL mesmo com grant
 *    (handoff M2 + doc 10 §16/§47: branch.switch incluído por risco de perda
 *    de dados). O gate é do Control Plane: REQUIRE_APPROVAL short-circuita
 *    ANTES de qualquer execução git (SPEC §8 short-circuit).
 *  - Permissões git RESERVADAS (decisão D3, doc 10 §70/§80) — SEM grant e SEM
 *    capability em M2, DEFAULT DENY permanente: `git.forcePush`,
 *    `git.resetHard`, `git.branch.deleteForce`. Force em push/delete retorna
 *    UNSUPPORTED apontando a capability reservada (regra no @nexo/git).
 *  - Qualquer outra permissão -> DEFAULT DENY (sem grant).
 */

import type { RiskLevel } from '@nexo/core';
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

/** Leituras git M2 (doc 10): ALLOW com grant (risk SAFE). */
export const GIT_READ_PERMISSIONS: readonly string[] = [
  'git.status',
  'git.diff',
  'git.history',
  'git.branch.list',
];

/**
 * Mutações git M2 (doc 10 + handoff M2): grant existe, mas o risk DESTRUCTIVE
 * no PolicyEngine força REQUIRE_APPROVAL mesmo com grant — o Control Plane
 * short-circuita ANTES de qualquer execução git (SPEC §8). branch.switch está
 * incluído (doc 10 §16/§47: risco de perda de dados).
 */
export const GIT_MUTATION_PERMISSIONS: readonly string[] = [
  'git.branch.create',
  'git.branch.switch',
  'git.branch.delete',
  'git.commit',
  'git.push',
  'git.pull',
  'git.fetch',
];

/**
 * Permissões git RESERVADAS (decisão D3, doc 10 §70/§80): SEM grant e SEM
 * capability em M2 -> DEFAULT DENY permanente. Documentadas aqui para que
 * ninguém "invente" grant silenciosamente (regra das OPEN QUESTIONS).
 */
export const GIT_RESERVED_PERMISSIONS: readonly string[] = [
  'git.forcePush',
  'git.resetHard',
  'git.branch.deleteForce',
];

/** Riscos estáticos git M2 para o PolicyEngine (leitura SAFE, mutação DESTRUCTIVE). */
export const GIT_PERMISSION_RISKS: Record<string, RiskLevel> = {
  ...Object.fromEntries(GIT_READ_PERMISSIONS.map((p) => [p, 'SAFE' as const])),
  ...Object.fromEntries(GIT_MUTATION_PERMISSIONS.map((p) => [p, 'DESTRUCTIVE' as const])),
};

export function createM1PolicyEngine(audit: AuditSink): PolicyEngine {
  return createPolicyEngine({
    grants: { [LOCAL_ACTOR_ID]: [...M1_LOCAL_GRANTS, ...GIT_READ_PERMISSIONS, ...GIT_MUTATION_PERMISSIONS] },
    // M2: risks populados — mutações git DESTRUCTIVE -> REQUIRE_APPROVAL mesmo
    // com grant (mecanismo do PolicyEngine). A aprovação de comandos não-SAFE
    // segue forçada pela regra estática '*.execute_sensitive'.
    risks: GIT_PERMISSION_RISKS,
    audit,
  });
}
