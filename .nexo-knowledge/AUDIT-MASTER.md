# AUDIT-MASTER.md — Auditoria MASTER COMPLETION (2026-08-14)

Auditoria pós-M3 exigida pela diretiva MASTER COMPLETION §1-2. Método: 3 agentes explore independentes leram todos os doc-summaries + OPEN-QUESTIONS + M3-RESULT + código real. Classificações com evidência documental (doc §).

## CURRENT IMPLEMENTED (validado)

- M1: Control Plane HTTP, project.* (5), runtime.* (3), scope guard, PolicyEngine DEFAULT DENY, audit
- M2: git.* (11 — mínimo doc 10§80 completo), REQUIRE_APPROVAL estruturado
- M3: 37 capabilities (editor 10, component 6, media 7, design 4, theme 2, responsive 8), UI apps/cms completa, canal de aprovação D17, save pipeline, source mapping, publish pipeline 6 checks, Playwright diagnostics
- Total: 56 capabilities, 725 testes + 54 e2e, lint limpo

## REQUIRED NOW (desta execução)

| # | Item | Evidência |
|---|---|---|
| R1 | AI Provider System (registry, models, credentials, streaming/structured/cancellation "where supported", error normalization, timeout, retry bounded, cost metadata) | FM §16.1 CORE; FP §42 P1; doc 11 §5-9 |
| R2 | AI Context Engine (task-specific, freshness FRESH/STALE/PARTIAL/UNKNOWN, provenance, authority order, sem secrets §58) | FM §16.2 CORE; doc 11 §19-25 |
| R3 | AI Tools (contrato 9 campos §27, validação 6 checks §83, error model §32, discovery dinâmica §28-29, geradas das capabilities REAIS — sem tool falsa) | FM §16.11 CORE; FP §41 P1; doc 11 §26-35 |
| R4 | Task Planning + Plan Object + Task Engine (9 estados §45, persistência fora do browser §46, cancelamento §47) | FM §16.3 CORE; doc 11 §36-37, §45-48 |
| R5 | Manual Mode (Request→Analyze→Plan→Propose→Diff→Approval→Execution→Validation; zero mutation antes de approval) | FM §16.10 CORE; FP §39 P1; doc 11 §38 |
| R6 | Code Generation/Editing (hierarquia §42) + Patch Generation + Diff Review (files/before/after/added/removed/modified/taskId/agentId) | FM §16.4-7 CORE; doc 11 §42-44; PR §57 |
| R7 | Validation + anti-alucinação (MODIFY→BUILD→TEST→RE-ANALYZE→VERIFY→REPORT; resultado estruturado é autoridade; "Done." ≠ sucesso) | FM §16.8 CORE; doc 11 §41, §72-75, §99 |
| R8 | Autonomous Mode (Task→Understand→Plan→Execute→Validate→Repair se autorizado→Complete; NUNCA bypassa authorization/policy/secrets/git safety/approval/audit/validation) | FM §16.9 CORE; doc 11 §39-40, §62; master §9 |
| R9 | AI identity / machine identity real (agentId, initiatedBy≠executedBy) | FP §20 P0; doc 11 §13-14; PM §5-6 |
| R10 | AI Logs/Observability (taskId, operationId, agentId, initiator, provider, model, tools, files) + Tool Trace | FM §22.3 CORE; doc 11 §63-64 |
| R11 | Agent Interface genérica (authenticate→authorize→discover→tasks→results; serve qualquer agente, Luna-inclusive) | doc 11 §11-12; M4 plan |
| R12 | Secret Management (Store/Use/Rotate/Revoke/Audit; config ≠ secret material; injeção; redaction; nunca em logs/audit/AI context) | WM §24; RT&SEC §69-71; AI §58-59; gatilho: AI providers |
| R13 | Approval interativo para runtime.command.execute (wire D18c) | RT&SEC §63; D18(c) → M4 |
| R14 | audit.list (consulta paginada de auditoria; desbloqueia Audit UI) | doc 06 §52; Application §65 |
| R15 | AI Testing determinístico (integration sem browser, provider sandbox real local HTTP, fixture tasks) | FM §23.6 CORE; doc 11 §96-98; master §30 |
| R16 | Pesquisa de docs oficiais dos providers ANTES de implementar adapters | doc 11 §100, §84 |

## CORE FUTURE (não nesta execução)

Pages/Content (FM 13.x CORE, fora dos pilares MVP e de M1-M6 — timing OPEN DECISION), Integrations (FP §44 P1 mas DG agenda M5), Deployment (FP §51 P2, M5; capabilities deployment.preflight/deploy/verify documentadas em 12§53), Git avançado (P2, M5), editor visual canvas/edição estruturada de conteúdo/props (FP §30 P1 pendente, M3 congelou escopo), built-in component library (08§35), media optimization/image editing (tensão FM 10.5 CORE vs 08§46 "may"), responsive fix assistance (M4+ AI), audit além de audit.list (logs estruturados FM 22.x), workspace roles/membership completo (CORE; bloqueado por OQ#2 auth).

## EXTENSION / COMMERCIAL-FUTURE / LUNA-DEFERRED / NOT IMPLEMENTED BY DESIGN

- Plugins: EXTENSION P2 (nada REQUIRED NOW); marketplace P4 COMMERCIAL-FUTURE
- SaaS/billing/multi-tenant: P4 COMMERCIAL-FUTURE
- Luna bridges/provider: LUNA-DEFERRED (PR §59 "futuramente"; OQ#8/#10)
- Merge de conflito (D12), force push/resetHard/deleteForce (D3), processamento de imagem M3 (D13), performance diagnostics (09§65 FUTURE): NOT IMPLEMENTED BY DESIGN
- Auth formal (mecanismo): OPEN DECISION OQ#2 — docs proíbem inventar; mantido ator local fail-closed + bind 127.0.0.1
- OTel e WCAG 2.2 formal: ausentes dos docs — não implementar (seria invenção); a11y prática continua (dialogs acessíveis, sem alert, badges com texto)

## OPEN DECISIONS a congelar em M4-CONTRACTS (D20+)

1. Providers do 1º release: OpenAI, Anthropic, Gemini, Kimi, OpenAI-compatible/local (master §4 nomeia)
2. Assinaturas do Provider Contract (doc 11 §6 delega à implementação)
3. Schema/storage de AI task (GROUP-F [NÃO ESPECIFICADO])
4. Retry/timeout provider-level (bounded; master §33 sem retry infinito)
5. Cost metadata "quando suportado" (sem tracking inventado)
6. Design do secret store local (RT&SEC §69 "não plaintext"; sem KMS documentado)
7. Campos de approval além do audit (expiration/scope/reject — docs omitem)
