# NEXO CMS — IMPLEMENTATION PLAN (living)

## Status legend: IMPLEMENTED | IN PROGRESS | BLOCKED | NOT STARTED | FAILED VALIDATION

### M1 — FOUNDATION (IN PROGRESS)
Prova: Select Folder → Runtime Access → Scan → Stack Detection → Project Model → Project Open (API + CLI, mesma capability).

| Wave | Escopo | Status | Evidência |
|---|---|---|---|
| 0 | Docs lidos (35/35), knowledge base, SPEC.md, STACK-DECISION | IMPLEMENTED | .nexo-knowledge/, commit f18eb2b |
| 1 | Scaffold pnpm monorepo + @nexo/shared + @nexo/core | IMPLEMENTED | ddbeea7; 12 testes verdes |
| 2A | @nexo/security (authorization boundary, audit) + @nexo/runtime (scoped fs, command executor, process registry) | IMPLEMENTED | 5ceb638; 59 testes |
| 2B | @nexo/storage (better-sqlite3 ^12.11.1, 5 repos, migrations) | IMPLEMENTED | c2a6d64; 28 testes |
| 2C | @nexo/adapters (15 detection adapters) + @nexo/intelligence (scanner, ProjectModel, fingerprint) | IMPLEMENTED | a41727d; 52 testes |
| 3 | @nexo/control-plane + apps/runtime (Hono) + apps/cli | IMPLEMENTED | e2f672e; 159 testes totais + smoke E2E |
| 4 | Verificação independente: fixtures root + 28 e2e no-playwright + security probes | IMPLEMENTED | f6ef63a; 8/8 AC §12 PASS; 1 vuln HIGH encontrada |
| 5 | Fix wave: args scope guard (HIGH), ator explícito fail-closed, bins dist, fingerprint estáticos, CLI parse | IMPLEMENTED | 90c56f1; gate final main: build 10/10, typecheck 10/10, 204 unit + 36 e2e verdes, lint 0/0, smoke dist real |

**M1 — FOUNDATION: VALIDADO (2026-08-12).** Próximo: M2 Git Foundation.

### M2 — Git Foundation (VALIDADO — 2026-08-14)
git.status/diff/history/branch.*/commit/push/pull/fetch via Runtime; alto risco com REQUIRE_APPROVAL. Lib git: DECIDIDA (D2 — git CLI real via @nexo/runtime CommandExecutor, ver STACK-DECISION.md). Nomenclatura: D3 (camelCase doc 10). Docs: 10-GIT, 04, 05, 06, 13.

| Wave | Escopo | Status | Evidência |
|---|---|---|---|
| 0 | Decisão lib git (Q4) + contratos congelados (capabilities/permissões/schemas) | IMPLEMENTED | STACK-DECISION D2, OPEN-QUESTIONS D3/D4/D5 |
| 1 | packages/git (GitService, parsers, errors, redaction) + unit tests repos reais | IMPLEMENTED | 88 testes verdes, repos git reais em tmpdir, bare remotes |
| 2 | apps/runtime capabilities git (11) + policy (read ALLOW / mutação REQUIRE_APPROVAL) + apps/cli comandos git:* | IMPLEMENTED | 19 testes app + 8 testes CLI verdes |
| 3 | e2e git flow (15) + security probes (injeção path/flag/shell, fail-closed) | IMPLEMENTED | 51/51 e2e verdes |
| 4 | Gate final + verificação independente | IMPLEMENTED | build 11/11, typecheck 11/11, lint 0/0, 313 unit + 51 e2e, smoke dist real: health/capabilities/import/status/diff/history/branch.list 200, 7 mutações 422, sem header 403, inexistente 404, repo intacto pós-probes |

**M2 — GIT FOUNDATION: VALIDADO (2026-08-14).** Leituras git operam contra o repo real via HTTP/CLI; mutações ficam atrás de REQUIRE_APPROVAL estruturado (fluxo de aprovação humana = milestone futuro, Open Question #2); permissões de força reservadas sem grant (git.forcePush/resetHard/branch.deleteForce → DEFAULT DENY; uso de force retorna UNSUPPORTED apontando a capability reservada). Próximo: M3 Editor core + Components/Media + Design/Responsive.

### M3 — Editor core + Components/Media + Design/Responsive (VALIDADO 2026-08-14, commit 4dafd87) — P1

Concluído: 37 capabilities (M3-CONTRACTS.md + emenda D19), UI apps/cms completa, canal de aprovação D17, 725 testes + 54 e2e verdes, revisão independente APROVADO. Detalhes: M3-RESULT.md. Riscos aceitos: approval sem auth de aprovador (OQ#2), env propagado a filhos, deps de diagnóstico como devDependencies (D16).
Docs: 07, 08, 09 + 01–06. Save pipeline real, source mapping, component schema, tokens, viewports. UI (apps/cms React+Vite) entra aqui.

### M4 — AI básica manual → autônoma (NOT STARTED) — P1/P2
Docs: 11 + 06. Tool contract, AI providers, ai.task, diff approval. Luna via Agent Interface.

### M5 — Integrations/Deployment + Git avançado (NOT STARTED) — P2
Docs: 12, 10. Preflight→Deploy→Verify, rollback.

### M6 — Full Validation (NOT STARTED)
Doc 13: pirâmide completa, fixture matrix 6×5, security suite, agent parity, gates.

## Próximas ações imediatas
1. Merge waves 2A/2B/2C após validação individual.
2. Wave 3 (control-plane + apps) — integração das tipagens fracas (AuditSink, ProjectModel json).
3. Wave 4 (testes e2e + acceptance criteria M1 §12 da SPEC).
4. Relatório de validação M1 contra §12 da SPEC.
