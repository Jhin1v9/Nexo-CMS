# GROUP G — STORAGE, TESTING & EXECUTION (Síntese de Documentos)

**Grupo:** ENGINEERING+EXECUTION
**Documentos cobertos:**
1. `14-WORKSPACE-AND-STORAGE.md` (NEXO CMS — WORKSPACE AND STORAGE) — lido integralmente (1513 linhas)
2. `13-TESTING-AND-VALIDATION.md` (NEXO CMS — TESTING AND VALIDATION) — lido integralmente (2179 linhas)
3. `15-SWARM-EXECUTION-SPEC.md` (NEXO CMS — SWARM EXECUTION SPECIFICATION) — lido integralmente (2033 linhas)
4. `PROMPT_EXECUCAO_KIMI_K3_LUNA_v3.md` — lido integralmente (455 linhas)

---

## NEXO CMS — WORKSPACE AND STORAGE (doc 14)

- **Responsabilidade**
  Define Workspace, registro de projetos (Project Registration), persistência pertencente ao Nexo ("Nexo-owned"), ownership de metadados, fronteiras de storage e ciclo de vida dos dados. É a autoridade sobre o que é dado do Nexo vs. dado de terceiros.

- **Contratos (esquema conceitual de storage)**
  - **Regra central — 4 fontes de verdade SEPARADAS, nunca fundidas:**
    - `NEXO STORAGE` → metadados e estado de aplicação do Nexo
    - `SOURCE PROJECT` → código-fonte e recursos reais do projeto
    - `GIT` → estado de controle de versão
    - `EXTERNAL PROVIDER` → estado do provedor
  - **Entidades persistentes (todas conceituais — campos exatos listados no doc):**
    - `Workspace`: ID, Name, Members, Projects, Shared Resources, Policies, Settings. Identidade estável.
    - `Project Registration`: Project ID, Workspace ID, Source Location, Git Relation, Runtime Relation, Stack, Adapter State, Metadata.
    - `Workspace Member`: Identity, Role/Permissions, Membership Status, Created At.
    - `Machine Identity / AI Agent`: Agent ID, Name, Type, Provider, Owner, Workspace, Status, Permissions, Created At, Last Used At. Lifecycle: `ACTIVE | SUSPENDED | REVOKED | EXPIRED`. Credenciais NUNCA em plaintext como metadado comum.
    - `Library Component` (Workspace-level): Component ID, Version, Schema, Metadata, Compatibility, Dependencies, Source Definition, Status. Distinto de `Project Component` (código real no Source Project).
    - `Media Metadata`: Asset ID, Name, Type, Dimensions, Source, Scope, References, Metadata, Created/Updated At. Origens possíveis: Source Project, Nexo Library, Uploaded Asset, External URL, CDN, Generated Asset, Integration.
    - `AI Task`: Task ID, Workspace, Project, Initiator, Agent, Provider, Model, Mode, Status, Created/Started/Completed At, Operation IDs, Result, Error. Persiste FORA do browser; UI não é autoridade.
    - `Job`: Job ID, Type, Owner, Workspace, Project, Status, Created/Started/Completed At, Result, Error. Retenção configurável, não decidida por módulos individuais.
    - `Audit Event`: Event ID, Actor, Initiator, Workspace, Project, Operation, Resource, Result, Timestamp, Operation ID, Job ID. Estrutura tamper-resistant. SEPARADO de logs de aplicação. Secrets nunca em audit.
    - `Deployment Record`: Deployment ID, Project, Workspace, Environment, Provider, Source Revision, Status, URL, Provider Deployment ID, Initiator, Agent, Started/Completed At.
    - `Integration Record`: Integration ID, Project/Workspace Scope, Type, Provider, Status, Configuration Metadata, Permissions, Created/Updated At. Secrets separados.
    - `Provider Configuration`: Provider, Project, Environment, External ID, Status, Capabilities.
    - `Settings` com escopos explícitos: Platform, Workspace, Project, Environment, User, Provider.
    - `Caches` (derived, com freshness): Project Intelligence, Project Graph, Git Information, Provider Metadata, Capability Discovery, Media Index. Suportam Invalidate/Refresh/Rebuild/Expire.
    - `Project Intelligence Snapshot`: Project Fingerprint, Analysis Version, Adapter Versions (ex.: adapter `nextjs` v2.1.0), Detected Stack, Analysis Timestamp, Model Version.
    - `Search Indexes` (derived data): Projects, Components, Media, Audit, AI Tasks — rebuild possível a partir de dados autoritativos.
  - **Erros de storage estruturados (nomes exatos):** `RecordNotFound`, `ConstraintViolation`, `Conflict`, `ConnectionUnavailable`, `MigrationFailure`, `TransactionFailure`, `PermissionDenied`, `StorageUnavailable`. Application Layer nunca expõe erros crus de DB.
  - **Estados de projeto órfão:** `SOURCE_UNAVAILABLE`, `SOURCE_MOVED`, `SOURCE_DELETED`, `RUNTIME_UNAVAILABLE`, `UNKNOWN`.
  - **Soft deletion:** `ACTIVE | ARCHIVED | DELETED`. Hard deletion explícita, só com política/retenção/dependências resolvidas.
  - **Repositórios conceituais (Repository Pattern):** `WorkspaceRepository`, `ProjectRepository`, `ComponentRepository`, `MediaRepository`, `AITaskRepository`, `JobRepository`, `DeploymentRepository`, `AuditRepository`.
  - **Separação metadata vs Source Project:** Project ID Nexo é estável e NÃO derivado de nome/path/branch; Source Location (Local Path, Remote Runtime Path, VPS Path, Mounted Path, Runtime-specific Resource Identifier) é atualizável sem recriar identidade, verificada via fingerprint (Project Root, Repository Identity, Key Configuration, Git Metadata, Selected File Fingerprints — timestamp único é insuficiente).

- **Estratégia de testes**
  - Exigidos pelo protocolo K3 (seção 80): testar comportamento de deleção e recuperação; verificar que Storage não modifica arquivos do Source Project; testes de migração são MANDATÓRIOS (seção 77).
  - [NÃO ESPECIFICADO]: ferramentas/runner de teste concretos neste doc.

- **Regras de execução do swarm (seção 80 — K3 Swarm Implementation Protocol, 20 itens)**
  Antes de implementar: ler docs 01, 04, 05, 06, 11 e este doc completamente; identificar todas as entidades persistentes; definir ownership/relacionamentos; definir schema versions; definir migrations; definir estratégias de deploy local e remoto; pesquisar documentação oficial da tecnologia de storage escolhida; implementar repository boundaries; implementar isolamento de Workspace; implementar concorrência; implementar backup/restore; testar deleção/recuperação; verificar que Storage não toca Source Project; verificar que dados sensíveis passam pelo modelo de Security.

- **Stack/tecnologias**
  - Banco de dados NÃO mandatado ("This document does not mandate a specific database"). Critérios de avaliação: transações, queries, deploy local/remoto, concorrência, migrations, backup, segurança, complexidade operacional. Suporte a storage local embedded ou localmente hospedado, sem comprometer migração futura para remoto.
  - [NÃO ESPECIFICADO]: SGBD, ORM, formatos de arquivo concretos.

- **Invariantes**
  1. Nexo armazena o que o Nexo possui; Source Project, Git e Providers continuam autoridades sobre seus recursos.
  2. As 4 fontes de verdade nunca se fundem em uma só.
  3. Isolamento de Workspace na fronteira de persistência/query (Workspace A nunca lê B sem mecanismo explícito de sharing) + autorização após retrieval (defense in depth).
  4. Storage não decide autorização (isso é de Security) — apenas persiste relações necessárias.
  5. Storage não modifica Source Project diretamente (mutações via Nexo Engine → Adapter/Runtime → Source Project).
  6. Storage não é Git, não é Deployment Provider, não é autoridade sobre o que a IA "acredita".
  7. Cache não é fonte de verdade; índices são dados derivados reconstruíveis.
  8. Secrets separados de metadados comuns (mecanismo dedicado de credenciais).
  9. Audit ≠ logs; log nunca é registro de auditoria autoritativo.
  10. Remover Project Registration ≠ deletar Source Project (Operação B destrutiva requer autorização explícita).
  11. Referências internas usam identificadores estáveis, não nomes/paths/URLs.
  12. Migrações: explícitas, repetíveis, testadas, recuperáveis; nunca mutação silenciosa no startup.
  13. Restore de Nexo Storage não reescreve Source Projects automaticamente; registros órfãos nunca são deletados automaticamente nem substituídos por recursos fabricados.
  14. Disponibilidade de Storage e de Source Project são estados separados; falhas são explícitas (`StorageUnavailable`), sem fabricar sucesso.
  15. Search respeita autorização (filtrar depois do retrieval não basta se o índice vaza metadados).
  16. Agentes não inventam precedência de configuração localmente — precedência final deve ser documentada pelo subsistema de configuração antes da implementação.
  17. Modelo deve suportar multi-tenancy sem reescrita do modelo de ownership.
  18. Transações para operações multi-registro; se impossível, comportamento de reconciliação definido.
  19. Concorrência: optimistic concurrency ou estratégia apropriada; registros críticos com version numbers.

- **Acceptance criteria / validação (seção 79 — 23 itens)**
  Workspace como fronteira estável; múltiplos Workspaces; Project IDs estáveis; Source Location separada de identidade; metadata separada de Source Project; Git/deployment não substituídos por metadata; estado de IA persistido fora do browser; Jobs sobrevivem a desconexão; machine identities seguras; Component Library versionável; media indexável; audit separado de logs; secrets separados; caches invalidáveis/reconstruíveis; schema versions + migrations; isolamento de Workspace; search com autorização; remoção de projeto não deleta source; falhas de storage explícitas; disponibilidades distinguíveis; deploy local e remoto arquiteturalmente possíveis; persistência evolui sem reescrever Domain.

- **[AMBIGUO]/[NÃO ESPECIFICADO]**
  - [NÃO ESPECIFICADO] SGBD/ORM/formato de arquivo concreto (deliberadamente aberto; exige pesquisa de docs oficiais antes de escolher).
  - [NÃO ESPECIFICADO] Hierarquia de precedência de Settings (exemplo Platform→Workspace→Project→Environment→User dado como "não automaticamente autoritativo"; deve ser documentada antes de implementar).
  - [NÃO ESPECIFICADO] Comportamento de cascade na deleção de Workspace ("must be explicitly defined").
  - [NÃO ESPECIFICADO] Mecanismo concreto de concorrência (optimistic sugerido, decisão da implementação).
  - [NÃO ESPECIFICADO] Objetivos concretos de disaster recovery (RPO/RTO) — "must eventually define".
  - [AMBIGUO] Estratégia exata de fingerprint de projeto ("must use a robust strategy" — detalhes abertos).

---

## NEXO CMS — TESTING AND VALIDATION (doc 13)

- **Responsabilidade**
  Define como a implementação do Nexo CMS deve ser testada, validada e aceita antes de ser considerada completa — tanto o Nexo em si quanto as operações que ele realiza sobre projetos reais. Princípio: provar que o Nexo entende o projeto, modifica as estruturas corretas, preserva a tecnologia do projeto, não corrompe source, produz resultados válidos e permanece controlável por humanos e máquinas.

- **Contratos**
  - Não define storage próprio; define **fronteiras com contract tests obrigatórios** (nomes exatos): `Application ↔ Engine`, `Engine ↔ Adapter`, `Engine ↔ Runtime`, `Engine ↔ Provider`, `AI ↔ Tool System`, `API ↔ Application`, `Plugin ↔ Core`, `Deployment ↔ Provider`, `Git ↔ Provider`. Contract tests verificam Input, Output, Errors, States, Permissions, Version, Async Behavior.
  - **Fixture matrix inicial (nomes exatos):** frameworks `Next.js`, `React`, `Vue`, `Svelte`, `Astro`, `HTML/CSS/JavaScript`; sistemas de estilo `Tailwind`, `CSS Modules`, `styled-components`, `CSS Variables`, `Plain CSS`. Fixtures com versões identificadas (`version: verified project version`) e estruturas reais (não exemplos de 1 arquivo).

- **Estratégia de testes**
  - **Pirâmide de validação (ordem exata, base→topo):** Unit Tests → Adapter Tests → Domain Tests → Contract Tests → Integration Tests → E2E / Real Project. Nenhum nível isolado é suficiente.
  - **Tipos exigidos (seções 4–90):**
    - Unit: lógica isolada, determinísticos, sem Internet (path validation, project detection, capability/schema/permission evaluation, design token parsing, git result parsing, state transitions).
    - Domain: capacidades reais (`project.create`, `project.analyze`, `component.create`, `media.replace`, `git.commit`, `runtime.build`, `deployment.preflight`) verificando Input/Preconditions/Authorization/Execution/Result/State Change/Error/Audit.
    - Application: casos de uso completos sem mockar fronteiras de domínio importantes.
    - Contract + API Contract: toda capability do Control Plane testada (valid/invalid/unauthorized/forbidden/conflict/success/failure; jobs: Created/Running/Completed/Failed/Cancelled).
    - Schema validation automática (missing field, invalid type/enum/format, unexpected structure, nested object).
    - Security (mandatórios): Authentication, Authorization, Path Traversal, Symlink Escape, Command Injection, Cross-Project/Cross-Workspace Access, Secret Exposure, Privilege Escalation (agent/plugin), Credential Revocation.
    - Authorization: Allowed/Denied/Requires Approval/Wrong Workspace/Wrong Project/Wrong Environment/Expired/Revoked — mesmas regras em qualquer entry point.
    - Human/AI Parity: UI e AI Tool devem produzir comportamento equivalente na mesma capability (falha se o caminho AI usa implementação separada).
    - **No-Playwright Control Plane Test:** ao menos 1 teste completo de agente externo operando o Nexo SEM Playwright/browser UI/DOM scraping/screenshot (Authenticate → Discover → Open Project → Analyze → Modify → Build → Test → Commit).
    - Fixture tests por fixture: Detection, Version Detection, Project Model, Project Graph, Adapter Selection, Route/Component/Style/Asset/Build Detection, Source Modification, Validation.
    - Project Scan: Simple, Monorepo, Nested, Unknown, Partially Supported, Custom, Large, Malformed, No Git, Git Repository, Repository Subdirectory.
    - Detection: true positives E false positives; evidência real (pasta `components/` não implica que tudo dentro é componente); detecção ambígua (ex.: `package-lock.json` + `pnpm-lock.yaml`) → Resolved/Conflict/Manual Confirmation determinístico; tecnologia desconhecida → `UNKNOWN` ou `DETECTED_BUT_UNSUPPORTED` (sem fabricar compatibilidade).
    - Source Preservation / Framework Preservation / Styling Preservation (ex.: mudar cor de botão em projeto CSS Modules não introduz Tailwind).
    - Source Transformation (syntax, structure, imports, exports, formatting, semantics), Re-Analysis, Build Validation (exit code + resultado), Test/Lint/Typecheck do projeto.
    - Editor (capability-level: Selection, Source Mapping, Inspector, Edit, Save, Undo/Redo, Diff, Conflict, Preview, External Change), Visual Editor contra source real, Code Editor (open/edit/save/read-back/diff/conflito), Inspector, Source Mapping (exact/multiple/partial/unknown/nested/shared), Diff, Undo/Redo.
    - Component (CRUD, Duplicate, Promote, Publish, Version, Compatibility, Dependencies), Media (Upload/Read/Search/Replace/Delete/Reference Detection/Optimization/Metadata/External/Security), Design (Color/Gradient/Typography/Spacing/Radius/Border/Shadow/Token/Theme), Responsive (viewport, overflow, wrapping, breakage, stress, comparison; fixture 375px com overflow conhecido; repair loop diagnose→modify→render→diagnose; stress content não persiste no Source Project).
    - Git: repos temporários reais (Status, Diff, Branch, Commit, Push, Pull, Fetch, Merge, Rebase, Stash, Revert, Reset, Conflict); conflito real deve retornar `CONFLICT` com arquivos afetados, nunca `SUCCESS` com conflito aberto; external change detection.
    - Runtime: Filesystem, Process, Command, Build, Test, Preview, Timeout, Cancellation, Output, Resource Limit. Filesystem security: `../` traversal, absolute path escape, symlink fora do projeto, projeto/Workspace não autorizado, delete fora de escopo — toda operação não autorizada rejeitada. Command security: argument/shell injection, unauthorized/sensitive command, working directory escape, environment leakage.
    - Secret Leakage: secrets não aparecem em Logs, Errors, AI Context, Diffs, Audit, Terminal Output, API Responses.
    - AI: separar comportamento determinístico de modelo; NUNCA usar LLM live como único teste de Authorization/Tool Security/File Safety/Git Safety; AI Tool tests (valid/invalid/unauthorized/unsupported/failure/success/structured result); Hallucination Safety; Completion Verification (modelo diz sucesso + build falha → AI Task = FAILED; claim textual nunca sobrepõe validação real); Autonomous (denied/approval/retry/cancellation/partial failure/external change/success); Luna Integration via Control Plane programático.
    - Integrations/Deployment: activation/config/auth/execution/failure/removal/credential protection; preflight/build/deploy/status/verify/failure/retry/unknown/rollback; deploy ≠ sucesso sem verificação do alvo real; não mockar todo provider — testes realistas onde viável.
    - E2E real project, Multi-Stack E2E (fixtures primários), Cross-Stack (mesma capability, representação por adapter), Full Platform Acceptance (Workspace→Import→Analyze→...→Deploy Preview→Verify) + versão programática equivalente, Agent E2E sem UI.
    - Data Integrity (consistência metadata vs source/git/deployment/model após branch switch, external edit, restarts, mutações), Crash Recovery (sem false success/false clean/hidden partial mutation), Restart, Concurrency (human+AI, AI+IDE externo, build+mutation, git+save), Performance (tamanhos realistas), Large Project, Resource Exhaustion (disk full, memory, hangs, network, provider down, output gigante → falha segura e estado explícito), Network Failure (Completed/Failed/Unknown), Browser Disconnect (task server-side continua; reconnect recupera estado).
    - Regression: todo bug corrigido (parser, adapter, segurança, corrupção, AI tool, deployment) gera teste de regressão.
    - Snapshot (schemas, project models, diagnostics, structured results, UI) — nunca substitui asserções comportamentais. Visual regression separado de correção de source.
  - **Cobertura/qualidade:** [NÃO ESPECIFICADO] percentuais numéricos de cobertura — o doc exige completude por categoria/gate, não métrica de %.
  - **Ferramentas nomeadas:** Playwright (apenas citado como PROIBIDO para controle do Nexo / Agent Gate). [NÃO ESPECIFICADO]: test runner, framework de teste, ferramenta de cobertura concretos.
  - Determinismo: evitar Current Time, Random IDs, Internet, Provider Availability, AI Nondeterminism, Machine-Specific Paths; AI stubs/mocks determinísticos para testes de plataforma; live model em suíte separada. Naming descritivo (bom: `component-create-preserves-tailwind-project`).
  - Isolamento de ambiente: Unit/Integration/Fixture/E2E/External Provider/Security/Performance separados; nunca produção real em testes; dados de teste: Temporary Projects, Fixtures, Temporary Repositories, Sandbox Providers; secrets de teste Dedicated/Rotatable/Scoped/Non-Production.
  - Research Requirement: testes dependentes de tecnologia externa baseados em documentação oficial atual + versão instalada.
  - **No Fake Validation:** HTTP 200, processo iniciado, botão clicado, "model said done", arquivo existe, screenshot — insuficientes. Validar a condição real de sucesso.

- **Regras de execução do swarm (seção 99 — protocolo de 15 passos antes de declarar subsistema completo)**
  Ler spec do subsistema; identificar acceptance criteria; implementar unit/contract/integration tests; adicionar/atualizar fixtures; rodar workflow real-project afetado; rodar security tests; rodar testes programáticos/agent; rodar E2E; verificar ausência de dependência UI-only; verificar integridade do Source Project; verificar Git state; registrar falhas e limitações; nunca marcar completo só porque compila.

- **Stack/tecnologias**
  Fixtures: Next.js, React, Vue, Svelte, Astro, HTML/CSS/JS; Tailwind, CSS Modules, styled-components, CSS Variables, Plain CSS. Git real. Browser/renderização real para Responsive. Playwright explicitamente proibido como plano de controle. [NÃO ESPECIFICADO] runner/framework de testes.

- **Invariantes**
  1. Feature completa ≠ UI renderiza; completa = capability funciona via interfaces de domínio e programáticas.
  2. Mutação de source que não builda = falha (salvo estado intermediário explicitamente permitido).
  3. Validação real conectada à realidade: Real Source Project, Real Runtime, Real Adapter, Real Git, Real Build, Real Browser, Real Provider, Real Programmatic Agent.
  4. Claim do modelo nunca sobrepõe validação real; deploy só é sucesso após verificação do alvo.
  5. Screenshot correto não prova source correto.
  6. Snapshot não substitui asserção comportamental.
  7. LLM não é o único verificador do próprio comportamento (AI Gate determinístico).
  8. Loop de engenharia: BUILD → TEST → OBSERVE → VALIDATE → FIX → TEST AGAIN.

- **Acceptance criteria / validação**
  - **Acceptance Gates (seção 91):** Implementation → Unit → Contract → Integration → Fixture → Security → E2E (gates exatos dependem do risco do subsistema).
  - **Definition of Done (seção 92):** Capability works + Programmatic path works + Authorization works + Errors work + Tests pass + Real project validation passes + No known corruption path remains.
  - **Required Test Artifacts (seção 93):** Tests, Fixtures, Expected Results, Failure Cases, Compatibility Matrix, Known Limitations — associados ao subsistema.
  - **Final Validation Workflow (seção 97):** Lint → Typecheck → Unit → Contract → Security → Adapter Fixture → Integration → Real Project E2E → AI Agent E2E → Visual Regression → Build → Deployment Validation. Falhas param o release gate apropriado.
  - **Release Criteria (seção 98):** release instável se houver: Critical Security Failures, Source Corruption Bugs, Unauthorized Access Paths, Broken Programmatic Capabilities, Data-Loss Bugs, False Deployment Success, False Validation Success. Limitações não-críticas documentadas explicitamente.

- **[AMBIGUO]/[NÃO ESPECIFICADO]**
  - [NÃO ESPECIFICADO] Ferramentas/runners de teste, % de cobertura, orçamentos de performance concretos ("realistic project sizes").
  - [NÃO ESPECIFICADO] Gates exatos por subsistema ("depend on subsystem risk").
  - [AMBIGUO] Tamanho-alvo do fixture "large project" ("should reflect realistic Nexo client projects").

---

## NEXO CMS — SWARM EXECUTION SPECIFICATION (doc 15)

- **Responsabilidade**
  Documento final de controle de implementação / contrato de execução dos agentes. Define como o K3 Agent Swarm (Kimi Code, Codex, Luna, equipe Nexo Digital) deve ler, raciocinar, planejar, implementar, validar e montar o Nexo CMS. Os documentos anteriores NÃO são sugestões opcionais — coletivamente são o contrato de implementação.

- **Contratos**
  - Conjunto documental autoritativo: `01-SYSTEM-ARCHITECTURE` … `15-SWARM-EXECUTION-SPEC` (15 docs) + Human Manifest e docs de fundação de produto (intenção de produto).
  - **Hierarquia de autoridade (ordem exata):** 1. Explicit user/project constraints → 2. Core Invariants → 3. System Architecture → 4. Relevant Technical Specification → 5. Contracts and schemas → 6. Verified external documentation → 7. Existing implementation → 8. Agent assumptions (mais fraca). Assunção de agente NUNCA sobrepõe requisito explícito.
  - Shared Contract Rule: contrato compartilhado → Freeze → Consumers Implement. Mudança de contrato: parar de depender de comportamento não documentado → identificar problema → propor menor mudança → checar specs afetadas → atualizar contrato autoritativo → notificar dependentes → revalidar consumidores. Proibido fork privado silencioso.
  - Logging estruturado com contexto: `operationId`, `jobId`, `projectId`, `workspaceId`, `actorId`, `agentId`. Logs sem secrets. Audit ≠ debug logs.
  - Decision Records (Decision, Reason, Alternatives Considered, Evidence, Impact, Affected Documents) e Research Records (Technology, Version, Source, Finding, Decision).

- **Estratégia de testes** (delegada ao doc 13; este doc adiciona gates operacionais — ver abaixo)

- **Regras de execução do swarm**
  - **Decomposição/papéis:** Architecture, Runtime, Storage, Security, Project Intelligence, Adapter, Engine, Control Plane, Editor, Component, Media, Design, Responsive, Git, AI, Integration, Deployment, Testing, Reviewer Agents. Toda tarefa tem Owner, Dependencies, Inputs, Expected Outputs, Validation, Acceptance Criteria. Nenhuma tarefa sem owner.
  - **Ordem de fundação (recomendada):** 1. Repository/Tooling → 2. Runtime → 3. Storage → 4. Security → 5. Core Domain/Engine → 6. Project Intelligence → 7. Adapter System → 8. Control Plane → 9. Git → 10. Editor → 11. Components/Media → 12. Design/Responsive → 13. AI → 14. Integrations/Deployment → 15. Full Validation.
  - **Grafo de integração:** Runtime → Storage → Security → Nexo Engine → Project Intelligence → Adapters → Control Plane → Git → Editor → Components/Media → Design/Responsive → AI → Integrations → Deployment. Paralelo apenas quando contratos estáveis.
  - **5 Vertical Slices (milestones):** (1) Select Project Folder → Runtime Access → Scan → Stack Detection → Project Model → Open → UI Display; (2) Select → Adapter → Read Component → Representação → Modify → Write Source → Re-analyze → Build; (3) Authenticate Agent → Discover → Read → Modify → Build → Test → Git Status (sem UI automation); (4) AI Task → Context → Plan → Tool Call → Source Modification → Validation → Diff → Result; (5) Project → Preflight → Build → Deploy → Verify → Deployment Record.
  - **Dependency Rule:** feature nunca antes de sua fundação (Editor requer Project Intelligence + Engine + Adapters + Runtime).
  - **Parallel Work:** só tarefas sem dependência de contratos inacabados (seguro: fixtures + UI design system + test infra; inseguro: Control Plane + mudança simultânea de contratos do Engine).
  - **Gates:** Architecture Review Gate (mudanças em Domain Boundaries, Security, Runtime, Adapters, Control Plane, Public API, AI Permissions, Storage Schema, Deployment, Provider Contracts exigem reviewer); Source Integrity Gate (arquivos esperados, nenhum inesperado, source parseável, estrutura válida, git diff correto); Build Gate (build falho visível; write bem-sucedido ≠ sucesso); Git Gate (status+diff após mutações); External Change Gate (não sobrescrever mudanças externas silenciosamente); AI Gate (caminho determinístico não-AI provando Authorization/Tool Security/Source Mutation/Validation/Rollback); Agent Gate (capability machine-facing testável sem browser, sem Playwright); Security Gate (sem acesso FS/comando não autorizado, cross-workspace, secret leakage, AI/plugin bypass, production deploy bypass); Provider Gate (auth/success/failure/unknown/credential failure tests); Deployment Gate (distinguir Submitted/Running/Succeeded/Failed/Unknown); Completion Gate (Implementation → Tests → Review → Fixture Validation → Security Validation → Contract Validation → Integration).
  - **Merge Discipline:** Typecheck, Tests, Lint, Contract Validation, Architecture Review, Conflict Resolution (conforme risco).
  - **Incrementos contínuos:** Build Small → Validate → Integrate → Expand (não "build tudo e integrar uma vez").
  - **Regras de anti-invenção:** nunca implementar por "seria útil"/"é comum em CMS"/"o framework costuma assim"; requisito só vem de specs, instrução explícita, consequência necessária de requisito, ou comportamento externo verificado. Nunca inventar convenções de framework, endpoints, nomes de config, APIs de pacote, comandos CLI, comportamento de provider/deployment.
  - **Research:** permissão e dever de usar Internet; fontes em ordem: Official Documentation → Official API Reference → Official Specification → Official Repository → Primary Technical Source; artigos secundários só para orientação. Sequência: Identify Technology → Version → Inspect Project → Official Docs → API/Spec → Repo → Fixture → Implement → Test. Version Verification: installed vs declared vs lockfile.
  - **Existing Repository First:** inspecionar estrutura, package manager, runtime, framework, dependências, config, scripts, testes, source existentes antes de criar código. Preservar trabalho existente; não reescrever por preferência estética.
  - **Coding standards:** clareza, contratos explícitos, tipos fortes (sem `any`/untyped JSON/stringly-typed salvo necessidade), módulos pequenos, determinismo, testabilidade, error handling, observabilidade. Proibidos módulos gigantes (`NexoService`, `ProjectManager`, `UniversalHandler`, `AIManager`, `CMSManager`) e componentes UI que acumulam Data Loading+Git+Runtime+AI+Mutation+Auth+Rendering.
  - **Input/Output validation em todas as fronteiras** (HTTP, CLI, AI, Plugin, User, Filesystem, Provider, Webhook; respostas de AI/Git/Deployment providers, filesystem, browser).
  - **Erros:** Caught, Classified, Contextualized, Logged Safely, Returned Structurally; nunca engolir erro para manter UI; sem silent fallback de Unsupported→Guess; `UNKNOWN` é estado aceitável e preferível a confiança fabricada.
  - **Dependências:** verificar Existing Equivalent, Project Requirement, Security, Maintenance, License, Compatibility, Bundle/Runtime Cost antes de adicionar.
  - **Ambiguity Rule:** se seguro, menor implementação reversível; se afeta Architecture/Security/Source Integrity/Public API/Data Model/Provider Integration → pesquisar ou Decision Record antes de prosseguir; nunca adivinhar silenciosamente.
  - **Spec vs Implementação:** determinar qual é mais novo, se diferença é intencional, checar docs relacionados, preservar constraints explícitos, atualizar fonte autoritativa, não aceitar inconsistência silenciosamente.
  - **Comunicação do swarm:** agentes paralelos comunicam Contract Changes, Blocked Dependencies, Unexpected Findings, Security Issues, Provider Limitations, Architecture Conflicts, Test Failures. Proibido esconder blocker com workaround privado.
  - **Ambiente de dev reproduzível:** Runtime Version, Package Manager, Install/Dev/Build/Test commands, Lint/Typecheck, Environment Variables documentados. Nunca commitar API Keys/Passwords/Tokens/Private Keys/Provider Secrets.
  - **Documentation Synchronization:** código ↔ spec sincronizados; sem dump de manuais externos no repo.
  - **Auditorias finais:** Final Integration Test (workflow completo com fixture realista + equivalente programático), Final Agent Test (sem browser), Full AI Engineering Test (task → inspect → plan → modify → build → test → diagnose → repair → re-test → diff → commit quando autorizado), Final Swarm Checklist (24 itens), Final Review Agent (drift, lógica duplicada, bypasses, features falsas, contratos quebrados, risco de corrupção, entry points programáticos faltantes, testes faltantes, assunções de provider, AI privilege escalation), Final Real-Project Audit, Final Programmatic Audit (API/CLI/AI Tool — UI não secretamente requerida), Final Security Audit (8 verificações), Final Documentation Audit (Owner, Contract, Security, Error Model, Test, Validation por capability).
  - **Regras de commit:** [NÃO ESPECIFICADO] formato/ granularidade de commits neste doc (apenas "Commit when authorized" nos fluxos e Merge Discipline acima).

- **Stack/tecnologias**
  [NÃO ESPECIFICADO] deliberadamente: UI framework, Runtime technology, browser/rendering tech, storage — escolhidos pelo Swarm com pesquisa de docs oficiais e documentados; localhost inicial (Browser → Local Nexo Server → Runtime → Local Project) e remoto (Browser/Agent → Nexo Server → Remote Runtime → Project) com Domain independente da localização física; browser nunca recebe autoridade direta de SO. Security before convenience; local-first ≠ security-free (Identity, Authorization, Scoped Runtime, Secret Protection, Audit mesmo em localhost).

- **Invariantes (o que o Swarm NUNCA deve fazer — seção 74)**
  Inventar APIs faltantes; assumir comportamento de framework não suportado; reescrever o projeto inteiro desnecessariamente; substituir styling system sem instrução; usar Playwright como control plane interno; criar funcionalidade UI-only quando acesso programático é requerido; dar a IA acesso irrestrito a filesystem; dar a plugins acesso irrestrito a runtime; armazenar secrets em metadata normal; marcar operação como sucesso porque o modelo disse; marcar deploy bem-sucedido antes de verificação real; deletar source projects ao remover metadata Nexo; sobrescrever mudanças externas silenciosamente; esconder funcionalidade não suportada atrás de controle de UI falso; duplicar lógica de negócio para UI/CLI/AI; introduzir dependências sem justificativa técnica; transformar comportamento desconhecido em palpite.
  - **Regra mestra:** otimizar **correctness over speed of apparent progress**; feature que não modifica o projeto real, não respeita a stack, não é acessível via API, não é testável, bypassa segurança, inventa comportamento ou falha silenciosamente = NÃO implementada.
  - **Master Execution Rule:** documentos lidos como sistema conectado (ex.: AI Component Creation requer AI Engine + Control Plane + Nexo Engine + Component Engine + Adapter System + Project Intelligence + Runtime + Security + Testing).
  - Drift detection: framework logic no Core, UI virando business logic, AI bypassando Domain, Runtime bypassando Security, Storage virando source of truth, provider logic no Domain, capacidades duplicadas — corrigir cedo.

- **Acceptance criteria / validação**
  - **Definition of Complete (seção 73):** Architecture + Real Capabilities + Real Project Modification + Adapter Support + Runtime + Security + Programmatic Control + AI + Git + Validation funcionando como sistema coerente. NÃO completo quando "a interface parece pronta".
  - **Final Product Definition (seção 88):** loop DISCOVER → UNDERSTAND → MODEL → EDIT → VALIDATE → VERSION → DEPLOY → VERIFY, utilizável por Human, AI, Kimi, Codex, Luna, Local AI, CLI, Automation com as mesmas capacidades conforme permissões.
  - **Resultado correto (seção 89):** REAL IMPLEMENTATION + REAL PROJECT + REAL SOURCE + REAL VALIDATION + REAL PROGRAMMATIC CONTROL.

- **[AMBIGUO]/[NÃO ESPECIFICADO]**
  - [NÃO ESPECIFICADO] Stack concreta (UI, runtime, DB, browser automation) — decisão delegada com pesquisa obrigatória.
  - [NÃO ESPECIFICADO] Número exato de agentes; política de commits (mensagens, granularidade, branches).
  - [AMBIGUO] Sequência exata de fundação "pode mudar quando dependência técnica exigir".

---

## PROMPT_EXECUCAO_KIMI_K3_LUNA_v3.md

- **Responsabilidade**
  Prompt de execução (modo Plan → Act) instruindo o Kimi K3 a implementar correções arquiteturais no **kernel Luna v3.0** — sistema de orquestração entre frontend web (Luna-Mirror), extensão Chrome (luna-extension) e backend Node.js (luna-soul + luna-tools + kimi-bridge) que se comunica com a API Kimi Web.
  - **[REQUER CÓDIGO LEGADO NÃO ENVIADO — não executável nesta sessão].** Os arquivos referenciados (`kimi-bridge.cjs`, `luna-soul.cjs`, `luna-tools.cjs`, `luna-tool-guard.cjs`, `stream-text-cursor.cjs`, `luna-extension/injected.js`, `ChatArea.svelte`, `ToolCard.svelte`, `luna-chat-routes.js`) NÃO foram fornecidos; o prompt contém até referências a linhas específicas (ex.: `luna-soul.cjs:2903`, `kimi-bridge.cjs:9268-9309`, `ChatArea.svelte:762`, `ToolCard.svelte:56`) que não podem ser verificadas.

- **Arquitetura Luna especificada**
  `[Usuário] → [Luna-Mirror Frontend] → [Kimi Web API] → [Kimi K3 Modelo]`; em paralelo `[luna-extension Chrome] → [kimi-bridge.cjs] ←→ [luna-soul.cjs] ←→ [luna-tools.cjs] → [PC Linux Real]`.
  - `kimi-bridge.cjs`: bridge extensão↔backend; gerencia stream, interceptor de rede, cursor de texto.
  - `luna-extension/injected.js`: injetado na página Kimi Web; detecta fim de stream, extrai DOM, repara JSON.
  - `luna-soul.cjs`: orquestrador (mensagens, contexto, classificação thinking/response, execução de tools).
  - `luna-tools.cjs`: tools nativas (file ops, shell, git, search).
  - `luna-tool-guard.cjs`: validação de parâmetros, idempotência, segurança.
  - `stream-text-cursor.cjs`: cursor do texto renderizado no DOM da Kimi.
  - `ChatArea.svelte` / `ToolCard.svelte`: frontend.

- **Problemas diagnosticados**
  - **P0 (críticos):** (1) stream truncado + texto stale (fim detectado por heurística: botão Stop sumiu/inatividade 3s; "rabo" do turno N vaza no turno N+1); (2) gitStatus buraco negro (resultado não encaminhado ao chat); (3) card de confirmação fantasma após deleteFile; (4) vazamento de thinking ao usuário; (5) writeFile eager execution no frontend antes do JSON do agente.
  - **P1 (altos):** (6) viewDirectory vazio no frontend; (7) searchFiles falha com glob (`*.txt` como regex no rg); (8) grep mostra "undefined resultado(s)"; (9) replaceInFile com schema inconsistente (`old_string` vs `old` vs `oldStr` vs `oldString`); (10) truncamento de 4000 chars em outputs longos.

- **Fases de correção (12 commits na ordem dada)**
  - **FASE 1 — Fundação:** 1.1 isolamento de turno no interceptor (cada turno com handler próprio; `page.off('response', handlerN)`; `WeakMap<turnId,{buffer,handler}>`); 1.2 fonte única de verdade `cursor.committed` no `stream_end` (DOM/interceptor só fallback; correção exata em `luna-soul.cjs:2903`: `fullResponse = cursor?.committed || event.response || fullResponse`); 1.3 detecção de fim de stream por consenso de 3 sinais (primário SSE `data: [DONE]`; secundário mutação DOM Stop→Enviar com debounce ≥500ms; terciário inatividade 5s; aceito com ≥2 sinais; remover polling 80ms, usar MutationObserver); 1.4 eliminar drain loop pós-conclusão (flag `isTurnClosed`; deltas atrasados descartados silenciosamente); 1.5 separação thinking/response com delimitadores `<thinking>`/`<response>` (bridge descarta thinking; se `<response>` ausente → rejeitar turno e pedir reformatação).
  - **FASE 2 — Robustez:** 2.1 fallback universal de serialização (`stdout||output||text||content||_serializeStructuredResult(result)` com `safeKeys` whitelist); 2.2 interface unificada `ToolResult {success, text?, data?, error?}` (text obrigatório para tools com output legível; refatorar grep/viewDirectory/gitStatus/searchFiles/searchWeb); 2.3 máquina de estados de confirmação `IDLE → CONFIRMATION_REQUIRED → CONFIRMED → EXECUTING → COMPLETED` (→IDLE; `CONFIRMATION_REQUIRED→CANCELLED`; toolId em COMPLETED rejeita `confirmation_required` stale; limpar confirmationId/Message no action_end live).
  - **FASE 3 — Polimento:** 3.1 renderização de tools por introspecção de campos (stdout/output/content → entries → modified → results → JSON genérico); 3.2 idempotência por semântica (`TOOL_SEMANTICS` registry + `READONLY_COMMANDS` Set para executeShell; TTL: read-only=0, mutante=60s, escrita=0+confirmação); 3.3 aliases centralizados de parâmetros (`normalizeToolParams`; canonical `old`/`new`; aplicar UMA vez no entry point); 3.4 dedup de mensagens por UUID v4 client-generated (não conteúdo+janela 5s).
  - **Checklists por fase:** fornecidos (Fase 1: 6 itens; Fase 2: 6 itens; Fase 3: 5 itens) — todos verificáveis por invariante lógico.

- **Regras de execução (CRITICAL CONSTRAINTS — não negociáveis)**
  Nenhum remendo/patch/workaround — cada correção elimina a CAUSA-RAIZ; cada correção verificável por INVARIANTE LÓGICO (não teste empírico); cada correção SIMPLIFICA (menos linhas/estado/branches); NÃO aumentar timeouts/caps/debounces; NÃO adicionar camadas de indireção; NÃO tomar decisões não solicitadas — executar EXATAMENTE o especificado; ambiguidade → PARAR e pedir esclarecimento. Modo Plan: gerar `.plan.md` (subtarefas, arquivos, funções, invariantes, testes de regressão por commit). Modo Act: UM commit por vez → checklist da fase → testes de regressão → próximo. Notas finais: correção >50 linhas novas → revisar; novo módulo/dependência → revisar; não verificável por invariante → provavelmente remendo. K3: incluir thinking history completo entre turns; rejeitar proatividade fora do plano.

- **Stack/tecnologias**
  Node.js (CommonJS `.cjs`), Chrome Extension (injected.js, MutationObserver), Svelte (ChatArea/ToolCard), Puppeteer-style page API (`page.on/off('response')`), SSE da Kimi Web API, `rg` (ripgrep), WeakMap, UUID v4. Frontend Luna-Mirror.

- **Invariantes (verbatim):**
  "O interceptor do turno N nunca escreve no buffer do turno N+1." / "O texto final de um turno é sempre `cursor.committed` no momento do término." / "O fim de stream é confirmado por consenso de múltiplas fontes independentes." / "Após `stream_end`, o turno é imutável." / "O usuário nunca vê texto que não esteja dentro de `<response>`." / "Toda tool que retorna um objeto não-vazio produz feedback legível." / "Toda tool retorna `result.text` como fonte primária de feedback." / "Um toolId nunca volta de COMPLETED para CONFIRMATION_REQUIRED." / "O frontend renderiza qualquer tool result com pelo menos um campo conhecido." / "Uma tool read-only nunca é pulada por cache de idempotência." / "Todo alias conhecido de parâmetro é normalizado antes da validação." / "Duas mensagens com o mesmo UUID são a mesma mensagem."

- **Acceptance criteria / validação**
  Checklists por fase (acima) + ordem de 12 commits fixa + verificação por invariante lógico + testes de regressão por commit no modo Act.
  - **[REQUER CÓDIGO LEGADO NÃO ENVIADO — não executável nesta sessão]**: nenhuma das correções pode ser aplicada ou validada sem os arquivos legados.

- **[AMBIGUO]/[NÃO ESPECIFICADO]**
  - [NÃO ESPECIFICADO] Como o P1.7 (searchFiles glob vs regex no rg) e P1.10 (truncamento 4000 chars) são corrigidos — listados no diagnóstico mas sem fase de implementação correspondente explícita (3.x cobre parcialmente: 2.2 refatora searchFiles; truncamento não tem correção especificada — possivelmente intencional dado o constraint "NÃO aumente caps de caracteres").
  - [AMBIGUO] Relação deste kernel Luna legado com o "Luna" do NEXO CMS (doc 11) — o prompt é de um sistema anterior/independente (Luna-Mirror/Kimi Web), não do Nexo propriamente.

---

# SÍNTESE DO GRUPO

## 1. Esquema de storage completo (consolidado do doc 14)

**Princípio supremo:** 4 fontes de verdade separadas e nunca fundidas — `NEXO STORAGE` (metadados/estado do Nexo), `SOURCE PROJECT` (código real), `GIT` (versionamento), `EXTERNAL PROVIDER` (estado do provedor). "Nexo stores what Nexo owns."

**Entidades persistentes (todas com schema versioning quando evoluíveis incompativelmente):**

| Entidade | Campos-chave | Notas |
|---|---|---|
| Workspace | ID (estável), Name, Members, Projects, Shared Resources, Policies, Settings | Fronteira organizacional primária; multi-tenancy obrigatório |
| Workspace Member | Identity, Role/Permissions, Membership Status, Created At | Roles definidas por Security |
| Project Registration | Project ID, Workspace ID, Source Location, Git Relation, Runtime Relation, Stack, Adapter State, Metadata | Project ID NÃO derivado de nome/path/branch |
| Machine Identity / AI Agent | Agent ID, Name, Type, Provider, Owner, Workspace, Status, Permissions, Created/Last Used At | Lifecycle ACTIVE/SUSPENDED/REVOKED/EXPIRED; credenciais via secure credential mechanism |
| Library Component | Component ID, Version, Schema, Metadata, Compatibility, Dependencies, Source Definition, Status | ≠ Project Component (source real) |
| Media Metadata | Asset ID, Name, Type, Dimensions, Source, Scope, References, Metadata, timestamps | Source ∈ {Source Project, Nexo Library, Uploaded, External URL, CDN, Generated, Integration} |
| AI Task | Task ID, Workspace, Project, Initiator, Agent, Provider, Model, Mode, Status, timestamps, Operation IDs, Result, Error | Persiste fora do browser; reconstruível após restart/disconnect |
| Job | Job ID, Type, Owner, Workspace, Project, Status, timestamps, Result, Error | Retenção configurável e centralizada |
| Audit Event | Event ID, Actor, Initiator, Workspace, Project, Operation, Resource, Result, Timestamp, Operation ID, Job ID | Tamper-resistant; ≠ logs; sem secrets |
| Deployment Record | Deployment ID, Project, Workspace, Environment, Provider, Source Revision, Status, URL, Provider Deployment ID, Initiator, Agent, timestamps | Provider continua autoridade |
| Integration Record | Integration ID, Scope, Type, Provider, Status, Configuration Metadata, Permissions, timestamps | Secrets separados |
| Provider Configuration | Provider, Project, Environment, External ID, Status, Capabilities | Credenciais só criptografadas/secret storage dedicado |
| Settings | valor + Scope ∈ {Platform, Workspace, Project, Environment, User, Provider} | Precedência documentada pelo subsistema de config |
| Caches | Project Intelligence, Project Graph, Git Info, Provider Metadata, Capability Discovery, Media Index + freshness | Derived; Invalidate/Refresh/Rebuild/Expire |
| Project Intelligence Snapshot | Project Fingerprint, Analysis Version, Adapter Versions, Detected Stack, Analysis Timestamp, Model Version | Detecta análise stale |
| Search Indexes | Projects, Components, Media, Audit, AI Tasks | Derived; rebuildable; respeitam autorização |

**Mecanismos transversais:** Repository Pattern (8 repositórios nomeados); erros estruturados (RecordNotFound, ConstraintViolation, Conflict, ConnectionUnavailable, MigrationFailure, TransactionFailure, PermissionDenied, StorageUnavailable); soft delete (ACTIVE/ARCHIVED/DELETED) + hard delete explícito; estados de órfão (SOURCE_UNAVAILABLE/MOVED/DELETED, RUNTIME_UNAVAILABLE, UNKNOWN); optimistic concurrency + version numbers; transações multi-registro; migrations explícitas/repetíveis/testadas/recuperáveis; backup/restore de dados Nexo-owned (nunca reescreve Source Project no restore); fingerprint de projeto para verificar identidade após move. SGBD: [NÃO ESPECIFICADO] — escolha exige pesquisa de docs oficiais; deve suportar local e remoto.

## 2. Pirâmide de testes exigida (doc 13)

```
        E2E / REAL PROJECT          ← full platform + agent E2E sem UI + multi-stack
             ▲
        Integration Tests           ← providers realistas, deployment, Luna via Control Plane
             ▲
        Contract Tests              ← 9 fronteiras nomeadas; API contract por capability
             ▲
        Domain Tests                ← capabilities reais com auth/error/audit
             ▲
        Adapter Tests               ← fixtures reais versionados por framework/estilo
             ▲
        Unit Tests                  ← determinísticos, sem Internet
```
Transversais e obrigatórios: Security tests; Authorization matrix (8 casos); Human/AI Parity; No-Playwright Control Plane test; Source/Framework/Styling Preservation; Re-Analysis após mutação; Build Validation; Git com repos reais; Secret Leakage; Crash Recovery; Concurrency; Network/Resource Failure (Completed/Failed/Unknown); Regression por bug; determinismo (stubs de IA; live LLM em suíte separada); No Fake Validation (HTTP 200 ≠ sucesso).

## 3. REGRAS OPERACIONAIS DO SWARM (15-20 bullets — fiéis ao doc 15)

1. Os 15 documentos + fundações de produto são o contrato de implementação; nenhum doc é lido isoladamente quando a capability cruza subsistemas (Master Execution Rule).
2. Hierarquia de autoridade: constraints explícitos do usuário > Core Invariants > System Architecture > Spec técnica relevante > Contratos/schemas > Docs externas verificadas > Implementação existente > Assunções do agente (nunca sobrepõem requisito explícito).
3. Nunca inventar requisitos, APIs, convenções de framework, endpoints, nomes de config, APIs de pacotes, CLIs ou comportamento de provider — requisito só vem de spec, instrução explícita, consequência necessária ou comportamento externo verificado.
4. Pesquisa obrigatória antes de implementar tecnologia externa: Identify → Version → Inspect Project → Official Docs → API/Spec → Repo oficial → Fixture → Implement → Test; verificar installed vs declared vs lockfile; registrar Research Records.
5. Existing Repository First: inspecionar estrutura/package manager/runtime/framework/deps/config/scripts/testes/source antes de codar; preservar código existente; menor mudança possível.
6. Fundação antes de features, na ordem: Tooling → Runtime → Storage → Security → Engine → Project Intelligence → Adapters → Control Plane → Git → Editor → Components/Media → Design/Responsive → AI → Integrations/Deployment → Full Validation; Dependency Rule proíbe feature antes de suas dependências.
7. Validar via 5 vertical slices sequenciais (project open; edit→build; agent sem UI; AI task; deploy→verify) antes de expandir — Build Small → Validate → Integrate → Expand.
8. Toda tarefa tem Owner, Dependencies, Inputs, Expected Outputs, Validation, Acceptance Criteria; papéis alinhados à arquitetura (19 roles nomeados).
9. Paralelismo só entre tarefas sem dependência de contratos inacabados; contrato compartilhado é congelado antes dos consumidores; mudança de contrato segue protocolo de 7 passos e nunca fork privado.
10. Padrões de código: clareza, contratos explícitos, tipos fortes (sem `any`/stringly-typed), módulos pequenos, determinismo, error handling estruturado, observabilidade; proibidos módulos/componentes gigantes cross-domain.
11. Validar TODO input (HTTP/CLI/AI/Plugin/User/Filesystem/Provider/Webhook) e TODO output externo nas fronteiras; erros Caught/Classified/Contextualized/Logged/Structural; nunca engolir erro; sem silent fallback Unsupported→Guess; `UNKNOWN` > confiança fabricada.
12. Dependências novas exigem justificativa (equivalente existente, requisito, segurança, manutenção, licença, compatibilidade, custo); escolhas significativas documentadas (Decision Records); docs ↔ código sincronizados; sem dump de manuais externos.
13. Gates obrigatórios por risco: Architecture Review, Source Integrity, Build, Git (status+diff), External Change, AI (caminho determinístico), Agent (sem browser/Playwright), Security, Provider, Deployment (5 estados distinguíveis), Completion.
14. Merge discipline: Typecheck + Tests + Lint + Contract Validation + Architecture Review + Conflict Resolution antes de merge.
15. Ambiguidade que afeta Architecture/Security/Source Integrity/Public API/Data Model/Provider Integration → pesquisar ou Decision Record; nunca adivinhar; blocker nunca escondido por workaround privado — comunicar ao swarm.
16. Security before convenience, mesmo em localhost: Identity, Authorization, Scoped Runtime, Secret Protection, Audit; nunca commitar secrets; IA/plugins nunca com acesso irrestrito; browser nunca com autoridade direta de SO.
17. Nunca: marcar sucesso por claim do modelo, deploy sem verificação real, deletar source ao remover metadata, sobrescrever mudanças externas silenciosamente, UI falsa escondendo funcionalidade não suportada, lógica duplicada UI/CLI/AI, Playwright como control plane.
18. Correctness over speed of apparent progress; feature sem real modification/API access/testes/segurança = não implementada; detector contínuo de architecture drift (7 padrões nomeados) com correção precoce.
19. Auditorias finais obrigatórias antes de "pronto": Integration Test completo (humano + programático), Agent Test sem browser, Full AI Engineering Test, checklist de 24 itens, Review Agent comportamental, Real-Project Audit, Programmatic Audit (API/CLI/AI), Security Audit (8 checks), Documentation Audit (Owner/Contract/Security/Error Model/Test/Validation por capability).

## 4. Definição de done e gates de qualidade (consolidado)

- **Feature done (doc 13 §92):** Capability works + Programmatic path works + Authorization works + Errors work + Tests pass + Real project validation passes + No known corruption path remains. (UI funcionar NÃO é done; compilar NÃO é done.)
- **Subsistema done:** Acceptance Gates na sequência Implementation → Unit → Contract → Integration → Fixture → Security → E2E + protocolo K3 de 15 passos + artefatos obrigatórios (Tests, Fixtures, Expected Results, Failure Cases, Compatibility Matrix, Known Limitations).
- **Feature pronta para integração (doc 15 §49):** Implementation → Tests → Review → Fixture Validation → Security Validation → Contract Validation → Integration.
- **Release estável (doc 13 §98):** zero Critical Security Failures, Source Corruption Bugs, Unauthorized Access Paths, Broken Programmatic Capabilities, Data-Loss Bugs, False Deployment Success, False Validation Success; limitações não-críticas documentadas.
- **Produto completo (doc 15 §73/§88):** Architecture + Real Capabilities + Real Project Modification + Adapters + Runtime + Security + Programmatic Control + AI + Git + Validation coerentes; loop DISCOVER→UNDERSTAND→MODEL→EDIT→VALIDATE→VERSION→DEPLOY→VERIFY utilizável igualmente por Human/AI/Kimi/Codex/Luna/CLI/Automation conforme permissões.
- **Pipeline final de validação (doc 13 §97):** Lint → Typecheck → Unit → Contract → Security → Adapter Fixture → Integration → Real Project E2E → AI Agent E2E → Visual Regression → Build → Deployment Validation; falha para o release gate correspondente.
- **PROMPT LUNA:** "done" = cada um dos 12 commits com checklist de fase verificado por invariante lógico + regressão, UM commit por vez — **[REQUER CÓDIGO LEGADO NÃO ENVIADO — não executável nesta sessão]**.
