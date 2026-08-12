# NEXO CMS — DOCUMENT INDEX
> "Qual documento contém a resposta para este assunto?" — Resumos fiéis em `.nexo-knowledge/doc-summaries/GROUP-*.md`. Originais em `/mnt/agents/upload/`.

## CONTEXT (o que o Nexo é)
| Assunto | Documento | Resumo |
|---|---|---|
| Identidade, propósito, "o Nexo se adapta ao projeto" | Human Manifest / Manifesto Humano | GROUP-A |
| Visão de produto, ciclo OPEN→PUBLISH, IA como engenheira | Product Vision | GROUP-A |
| 38 princípios de produto/engenharia | Product Principles | GROUP-A |
| 51 Core Invariants + hierarquia de conflitos + checklist K3 | Core Invariants | GROUP-A |
| 34 non-goals (controle de escopo) | Non-Goals | GROUP-A |
| 134 termos oficiais (nomenclatura obrigatória) | Glossary | GROUP-A |
| Requisitos §1–§84, critério geral de aceitação §81 | Product Requirements | GROUP-B |
| Features CORE/EXTENSION/PROVIDER/ADAPTER..., 18 pilares MVP | Feature Map | GROUP-B |
| Prioridades P0–P4 | Feature Priorities | GROUP-B |
| 6 roles (Owner/Admin/Developer/Designer/Editor/Viewer) | User Roles | GROUP-B |
| ~70 jornadas A–BU, regras de ouro de UX/estado | User Journeys | GROUP-B |
| 22 estados, lifecycle multidimensional (Project/Editor/Git/Build/Preview/Deploy) | Project Lifecycle | GROUP-B |
| Workspace, Membership, ownership map, isolamento | Workspace Model | GROUP-B |
| ALLOW/DENY/REQUIRE_APPROVAL/UNKNOWN, default DENY, auditoria | Permission Model | GROUP-B |
| Visão do produto Engine (13 serviços) | Nexo Engine (product view) | GROUP-C |
| Visão da aplicação CMS (UI, Lucide icons, sem emojis) | Nexo CMS Application | GROUP-C |

## ENGINEERING (como construir)
| Assunto | Documento | Resumo |
|---|---|---|
| 8 camadas, fronteiras, "one capability, many consumers", seleção de tecnologia §51, pesquisa externa §52 | ARQUITETURE 01 (01-SYSTEM-ARCHITECTURE) | GROUP-C |
| Scan→detect→model, confidence/support, Project Model/Graph, staleness | NEXO PROJECT INTELIGENCE 02 (02) | GROUP-C |
| Adapter Contract (detect/getIdentity/getVersion/getCapabilities/analyze/validate), catálogo inicial | NEXO CMS ADAPTERS (03) | GROUP-C |
| 17 runtime capabilities, segurança DEFAULT DENY, fs scope, command classification | RUNTIME AND SECURITY (04) | GROUP-D |
| Catálogo de capabilities por domínio, donos autoritativos | NEXO ENGINE (05) | GROUP-D |
| Control Plane, Agent API, discovery/invocation/jobs, erros agent-friendly | CONTROL PLANE AND AGENT API (06) | GROUP-D |
| Editor visual/código, source mapping, change object, save pipeline, conflitos | EDITOR (07) | GROUP-E |
| Component Schema, biblioteca, mídia, asset references | COMPONENT AND MEDIA ENGINE (08) | GROUP-E |
| Design tokens, property source tipada, Responsive Lab, diagnósticos | DESIGN AND RESPONSIVE LAB (09) | GROUP-E |
| Git real, API git.*, operações de risco, aprovações | GIT AND VERSIONING (10) | GROUP-F |
| AI providers, tool contract, modos, Luna, anti-alucinação | AI ENGINE AND LUNA (11) | GROUP-F |
| Integrações, deploy providers, contrato deploy/rollback | INTEGRATIONS AND DEPLOYMENT (12) | GROUP-F |
| Pirâmide de testes, contract tests, fixtures, No-Playwright agent test, No Fake Validation | TESTING AND VALIDATION (13) | GROUP-G |
| 4 fontes de verdade, ~15 entidades, Repository Pattern, SGBD aberto | WORKSPACE AND STORAGE (14) | GROUP-G |

## EXECUTION (como executar)
| Assunto | Documento | Resumo |
|---|---|---|
| Ordem de construção, gates, contratos compartilhados, definição de done | SWARM EXECUTION SPECIFICATION (15) | GROUP-G |
| Correção kernel Luna v3 [REQUER CÓDIGO LEGADO NÃO ENVIADO] | PROMPT_EXECUCAO_KIMI_K3_LUNA_v3 | GROUP-G |
| Guia operacional de interpretação (a instrução desta sessão) | user_pasted_clipboard_...txt | plan.md |
