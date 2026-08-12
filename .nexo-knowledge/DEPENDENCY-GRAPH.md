# NEXO CMS — DEPENDENCY GRAPH & ORDEM DE IMPLEMENTAÇÃO

## Ordem oficial (doc 15, Swarm Execution Spec)
```
Tooling → Runtime → Storage → Security → Engine → Project Intelligence →
Adapters → Control Plane → Git → Editor → Components/Media →
Design/Responsive → AI → Integrations/Deployment → Full Validation
```
Dependency Rule: nenhuma feature antes de sua fundação. Mudança de ordem exige justificativa.

## Cadeia de dependências conceitual (guia operacional §11)
Runtime ↓ Security ↓ Storage ↓ Nexo Engine ↓ Project Intelligence ↓ Adapters ↓
Control Plane ↓ Git ↓ Editor ↓ Components/Media ↓ Design/Responsive ↓ AI ↓
Integrations ↓ Deployment ↓ Testing/Validation

## Milestones (incrementos funcionais)

### M1 — FOUNDATION (primeira prova end-to-end)
**Prova:** Select Project Folder → Runtime Access → Project Scan → Stack Detection → Project Model → Project Open.
Escopo:
1. Tooling/scaffold monorepo (stack conforme STACK-DECISION.md)
2. packages/runtime: filesystem scope guard + command.execute (classificação) + process básico
3. packages/security: authorization boundary (ALLOW/DENY/REQUIRE_APPROVAL/UNKNOWN, default DENY) + audit events
4. packages/storage: metadata store + Repository Pattern + entidades M1 (Workspace, Project Registration, Job, Audit Event, PI Snapshot)
5. packages/intelligence: scanner, root detection, stack detection (confidence/support), Project Model
6. packages/adapters: Adapter Contract + detecção inicial (package.json/frameworks/PM/styling básico)
7. packages/control-plane: capability registry + discovery + invoke + jobs
8. apps/runtime: serviço expondo o Control Plane (HTTP local)
9. Testes: unit + contract + fixture project real (React+Vite+Tailwind e HTML/CSS/JS) + No-Playwright agent test (curl/CLI)
10. CLI mínimo (segundo consumer da mesma capability — prova "one capability, many consumers")

### M2 — Git Foundation (P0)
`git.status|diff|history|branch.*|commit|push|pull|fetch` via Runtime; alto risco com aprovação.

### M3 — Editor core + Components/Media + Design/Responsive (P1)
Save pipeline real, source mapping, component schema, media, tokens, viewports.

### M4 — AI básica manual (P1) → AI autônoma (P2)
Tool contract, providers, ai.task, diff approval.

### M5 — Integrations/Deployment (P2) + Git avançado
Preflight→Deploy→Verify, rollback.

### M6 — Full Validation (doc 13): pirâmide completa, fixtures, security suite, agent parity.

## Regras de paralelismo (doc 15)
- Paralelo só com contratos estáveis/frozen. Fork privado de contrato proibido.
- M1 internamente: runtime/security/storage em paralelo após contratos de tipos compartilhados (packages/shared + packages/core) congelados.
