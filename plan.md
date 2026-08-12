# NEXO CMS — plan.md (Execution Blueprint)

## Missão
Construir o Nexo CMS exatamente conforme os 35 documentos de especificação enviados.
Protocolo obrigatório: LER → INDEXAR → ENTENDER → PLANEJAR → IMPLEMENTAR → TESTAR → VALIDAR → INTEGRAR → REVISAR.

## Classificação dos documentos (CONTEXT / ENGINEERING / EXECUTION)

### CONTEXT (o que o Nexo é — intenção, princípios, invariantes, limites, requisitos)
- NEXO CMS — Human Manifest.md / Manifesto Humano do Projeto.md (duplicata PT/EN)
- NEXO CMS — Product Vision.md
- NEXO CMS — Product Principles.md
- NEXO CMS — Core Invariants.md
- NEXO CMS — Non-Goals.md
- NEXO CMS — Glossary.md
- NEXO CMS — Product Requirements.md
- NEXO CMS — Feature Map.md
- NEXO CMS — Feature Priorities.md
- NEXO CMS — User Roles.md
- NEXO CMS — User Journeys.md
- NEXO CMS — Project Lifecycle.md
- NEXO CMS — Workspace Model.md
- NEXO CMS — Permission Model.md
- NEXO CMS — Nexo CMS Application.md (visão da aplicação)
- NEXO CMS — Nexo Engine.md (visão de produto do engine)

### ENGINEERING (como construir)
- ARQUITETURE 01.md (01-SYSTEM-ARCHITECTURE)
- NEXO PROJECT INTELIGENCE 02.md (02-PROJECT-INTELLIGENCE)
- NEXO CMS ADAPTERS.md (03-ADAPTER-SYSTEM)
- NEXO CMS — RUNTIME AND SECURITY.md (04)
- NEXO CMS — NEXO ENGINE.md (05)
- # NEXO CMS — CONTROL PLANE AND AGENT API.md (06)
- NEXO CMS — EDITOR.md (07)
- NEXO CMS — COMPONENT AND MEDIA ENGINE.md (08)
- NEXO CMS — DESIGN AND RESPONSIVE LAB.md (09)
- NEXO CMS — GIT AND VERSIONING.md (10)
- # NEXO CMS — AI ENGINE AND LUNA.md (11)
- NEXO CMS — INTEGRATIONS AND DEPLOYMENT.md (12)
- NEXO CMS  TESTING AND VALIDATION.md (13)
- NEXO CMS — WORKSPACE AND STORAGE.md (14)

### EXECUTION (como organizar e executar)
- NEXO CMS — SWARM EXECUTION SPECIFICATION.md (15)
- PROMPT_EXECUCAO_KIMI_K3_LUNA_v3.md (prompt de correção do kernel Luna v3 — refere código legado NÃO enviado; tratar como especificação de comportamento Luna, não executável sem os arquivos)
- user_pasted_clipboard_...txt (guia operacional de interpretação — a própria instrução desta sessão)

## Estágios

### Stage 0 — Setup (orchestrator)
- plan.md (este arquivo), workspace /mnt/agents/output/nexo-cms, knowledge base .nexo-knowledge/

### Stage 1 — Leitura paralela (explore subagents, somente leitura)
Grupos de leitura → resumos estruturados em .nexo-knowledge/doc-summaries/:
- A: CONTEXT-core (Manifest, Vision, Principles, Invariants, Non-Goals, Glossary)
- B: CONTEXT-product (Requirements, Feature Map, Feature Priorities, Roles, Journeys, Lifecycle, Workspace Model, Permission Model)
- C: ARCH+INTEL+ADAPTERS (ARQUITETURE 01, PROJECT INTELIGENCE 02, ADAPTERS, Nexo Engine/Nexo CMS Application product views)
- D: RUNTIME+ENGINE+CONTROL (RUNTIME AND SECURITY, NEXO ENGINE, CONTROL PLANE AND AGENT API)
- E: EDITOR+COMPONENTS+DESIGN (EDITOR, COMPONENT AND MEDIA ENGINE, DESIGN AND RESPONSIVE LAB)
- F: GIT+AI+INTEGRATIONS (GIT AND VERSIONING, AI ENGINE AND LUNA, INTEGRATIONS AND DEPLOYMENT)
- G: STORAGE+TESTING+EXECUTION (WORKSPACE AND STORAGE, TESTING AND VALIDATION, SWARM EXECUTION SPECIFICATION, PROMPT_EXECUCAO v3)

Cada subagent extrai: responsabilidade do doc, stack/tecnologias, contratos (APIs/tipos), capabilities, dependências, invariantes, acceptance criteria, ordem de implementação, open questions.

### Stage 2 — Síntese (orchestrator)
Gerar em .nexo-knowledge/:
- DOCUMENT-INDEX.md (assunto → documento)
- ARCHITECTURE-MAP.md (camadas, fronteiras, fontes de verdade)
- CAPABILITY-MAP.md (requirement → domain → capability → contract)
- DEPENDENCY-GRAPH.md (ordem de implementação justificada)
- INVARIANTS.md (lista verificável)
- OPEN-QUESTIONS.md
- IMPLEMENTATION-PLAN.md (milestones: FOUNDATION → RUNTIME → STORAGE → SECURITY → ENGINE → PROJECT INTELLIGENCE → ADAPTERS → CONTROL PLANE → GIT → EDITOR → COMPONENTS/MEDIA → DESIGN → AI/LUNA → INTEGRATIONS → DEPLOYMENT → VALIDATION)

### Stage 3 — FOUNDATION (primeiro incremento de código)
Escopo (primeiro ciclo provado): Select Project Folder → Runtime Access → Project Scan → Stack Detection → Project Model → Project Open.
Subagents coder por módulo, validação real (testes + fixture project), sem feature falsa.

### Stage 4+ — Incrementos seguintes (sessões futuras)
Seguir DEPENDENCY-GRAPH e SWARM EXECUTION SPEC.

## Regras permanentes (dos documentos)
- Source Project = verdade do código; Git = verdade do versionamento; Provider = verdade do estado externo.
- UNKNOWN/UNSUPPORTED > inventar. Nunca declarar sucesso sem validação real.
- UI/API/CLI/AI convergem para as mesmas capabilities. AI nunca bypassa Security/Runtime/Engine.
- Sem Playwright como controle interno quando existir capability programática.
- Respeitar a stack do projeto-alvo; adapters conhecem tecnologias; Core é agnóstico.
