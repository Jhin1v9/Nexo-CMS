# GROUP-B — CONTEXT-product — Resumos de Documentos

Grupo: CONTEXT-product (8 documentos lidos integralmente).
Escopo: requisitos de produto, mapa e prioridades de features, papéis, jornadas, ciclo de vida, modelo de workspace e modelo de permissões do NEXO CMS.

---

## Product Requirements

- **Responsabilidade**
  - Contrato funcional de produto do Nexo CMS: define **o que** o sistema deve ser capaz de fazer (84 seções numeradas), sem definir implementação. Referência obrigatória para arquitetura, contratos, adapters, UI, testing e K3 Swarm. Proíbe inventar implementações não especificadas em documentos técnicos posteriores; exige pesquisa de documentação oficial quando o requisito depender de tecnologia externa.

- **Requisitos/features:** o documento não usa IDs formais do tipo REQ-XXX; os requisitos são as seções numeradas 1–84 (nomes fiéis):
  - §3 Requisito fundamental de projeto real — operar sobre o projeto real, nunca sobre cópia abstrata; ciclo: localizar → analisar → representar → aplicar → validar → persistir → refletir na UI.
  - §4 Importação de projeto — fluxo `Select Folder → Scan → Analyze → Detect → Review → Confirm → Open Project`; impedir considerar pasta "compreendida" antes da análise mínima.
  - §5 Descoberta automática de stack — detectar OS/runtime, linguagem, framework, bibliotecas, styling, package manager, build tool, scripts, Git, rotas, sinais de componentes, configurações; com níveis de confiança.
  - §6 Confirmação e edição manual do stack — usuário pode confirmar/corrigir/complementar/substituir; modo de stack personalizado obrigatório.
  - §7 Análise de projeto — profundidade proporcional à operação solicitada.
  - §8 Project Model — representação interna com conceitos universais: Project, Route, Page, Component, Asset, Style, Dependency, Script, Build, Integration, Git, Environment.
  - §9 Editor visual — visualizar, selecionar, inspecionar, modificar, salvar, undo/redo; respeita arquitetura do projeto.
  - §10 Editor de código — abrir/editar/salvar/pesquisar/navegar; código nunca oculto pela tecnologia.
  - §11 Relação visual↔código — `Preview Element → Component → Source File → Relevant Code`.
  - §12 Inspector — apenas propriedades realmente suportadas; não mostrar controles de suporte inexistente.
  - §13 Propriedades editáveis — texto, imagem, link, dimensão, espaçamento, alinhamento, cor, fundo, borda, radius, sombra, tipografia, responsivo, props do componente (conforme estrutura real).
  - §14 Salvamento — operação explícita: transformar → aplicar → confirmar persistência → atualizar estado → refletir UI; falha em qualquer etapa impede apresentar como concluído.
  - §15 Undo/Redo — não substitui Git.
  - §16 Diff — arquivos, linhas +/-, mudanças estruturais, origem, autor, alterações de IA.
  - §17–23 Sistema de componentes — detectar/inspecionar/editar/criar/duplicar/armazenar/versionar/reutilizar; Component Studio (estrutura, código, estilos, props, slots, variants, responsivo, assets, dependências, docs, preview); Component Library com dois níveis `Global Library` / `Project Library`; promoção de componente com análise de dependências (sem copiar dependências de projeto silenciosamente); componentes globais versionados sem atualização automática de consumidores; suporte específico a Carousel (slides, imagem, texto, link, autoplay, velocidade, loop, transição, navegação, paginação, items/viewport, espaçamento, responsivo) persistindo no projeto real; componentes personalizados.
  - §24–27 Media Library — localizar/visualizar/pesquisar/filtrar/substituir/metadados/referências/organizar/upload/remover com segurança; tipos: JPEG, PNG, WebP, AVIF, SVG, GIF, vídeo, PDF, fontes; referências de assets (ex. hero.webp → Home/Hero etc.); aviso antes de excluir asset referenciado; edição de mídia (substituir, crop, resize, conversão, otimização, metadados, alt, focal point).
  - §28–32 Design System — cores, gradients, typography, spacing, radius, shadows, borders, breakpoints, variables, tokens, themes; edição prioriza fonte real (variável compartilhada > valor hardcoded); responsividade (desktop/tablet/mobile/viewport custom); Responsive Lab (largura/altura, presets, overflow, quebra de texto, problemas visuais, comparação); Stress Testing de layout (títulos longos, viewports extremas, imagens grandes, conteúdo inesperado).
  - §33–37 Páginas e conteúdo — localizar/abrir/editar/renomear/configurar/criar/remover páginas; criação usa arquitetura do projeto, sem forçar mudança de tecnologia; conteúdo pode estar em código/arquivos/JSON/Markdown/CMS externo/API/banco — identificar a fonte antes de persistir; edição textual (H1–H3, parágrafos, labels, botões, links, cards, carrossel, FAQ); Blog (posts, título, conteúdo, imagem, slug, metadata, publicação, edição, exclusão, categorias, tags) quando suportado.
  - §38–42 Integrations — HTML, CSS, JS, iframe, scripts, widgets, embeds, APIs, serviços; entradas com nome/tipo/código/localização/dependências/configuração/escopo/estado; WhatsApp (elemento de contato administrável); Google Maps (respeitar APIs/políticas atuais); código externo como entidade distinta do código nativo.
  - §43–47 Runtime — Terminal (executar, saída, erro, exit code, encerrar processos, contexto; regras de segurança); Process Management (dev server, build, testes, scripts); dev local com comando descoberto/configurado (não assumir `npm run dev`); Build (identificar comando, executar, capturar saída/erro, informar sucesso/falha, diagnóstico); Preview claro sobre o estado exibido.
  - §48–50 Git — Git obrigatório ou fluxo explícito de configuração; detectar repository/branch/remotes/working tree/sincronização; operações: init, repository creation, branch creation, checkout, switch, status, add, commit, push, pull, fetch, merge, rebase, stash, reset, revert, cherry-pick, history, diff; operações destrutivas com controles adicionais; integração GitHub (autenticação, org/user, criar/associar repo, branches, push/pull) com consulta à documentação oficial.
  - §51–59 IA — AI Engine desacoplado de providers; AI Engineer (análise, explicação, geração, edição, refatoração, diagnóstico, correção, componentes, páginas, responsividade, erros, validação); modo automático (interpretar→analisar→planejar→modificar→validar→reportar) e modo manual (analisar→explicar→sugerir→diff→aprovação→aplicar→validar); AI Context (stack, adapters, Project Model, Project Graph, arquivos, conteúdo, histórico, Git, erros, docs locais); AI Tools (read/write file, search, project scan, inspect component, run command/build/tests, git diff/status, preview, media) cada uma com permissões e contratos; AI Diff; AI Validation (typecheck, lint, tests, build, preview, adapter checks); Luna como futuro provider/agente sem reimplementação.
  - §60–61 Plugins — podem adicionar adapters, AI providers, components, integrations, tools, deployment providers; permissões explícitas para capacidades sensíveis.
  - §62–65 Workspaces/Roles/Permissões/Audit — Workspace agrupa usuários, projetos, componentes, mídia, configurações, permissões; papéis: Owner, Admin, Developer, Designer, Editor, Viewer (nomes ajustáveis); permissões controlam leitura, edição, Git, terminal, IA, deploy, usuários, componentes, mídia, configurações; auditoria de login, alterações, ações de IA, comandos, Git, deploy, operações administrativas, permissões.
  - §66–68 Deployment — providers: Vercel, Hostinger, SSH, SFTP, FTP, Docker; Preflight (working tree, build, config, variáveis, conexão, destino, permissões, artefatos); Rollback via mecanismo do provider (não cópia improvisada).
  - §69–80 Requisitos transversais — capacidades sensíveis: filesystem, terminal, processos, Git, secrets, ambiente, deploy, AI actions; secrets nunca expostos em UI/logs/prompts/diff/IA/erros; portabilidade (copiar, exportar, versionar, publicar, abrir fora); observabilidade (logs, erros, status, eventos, health checks, performance); testabilidade (unit, integration, adapter, runtime, component, AI, build, e2e, visual regression, recovery); pesquisa técnica obrigatória; compatibilidade baseada em evidência (suporte parcial declarado como parcial); não-alucinação; rastreabilidade de origem (User, AI, Plugin, Manual Edit, Git, System Process); estado explícito (Clean, Dirty, Unsaved, Saving, Saved, Build Running/Failed/Passed, Preview Running, Deploying, Deployed, Error); extensibilidade; evolução incremental de adapters/providers.

- **Modelo de dados/entidades:** Project Model com Project, Route, Page, Component, Asset, Style, Dependency, Script, Build, Integration, Git, Environment (estrutura técnica deferida ao documento de Project Model). Estados explícitos citados: Clean, Dirty, Unsaved, Saving, Saved, Build Running, Build Failed, Build Passed, Preview Running, Deploying, Deployed, Error.

- **Permissões/roles:** papéis Owner/Admin/Developer/Designer/Editor/Viewer; permissões por domínio (leitura, edição, Git, terminal, IA, deploy, usuários, componentes, mídia, configurações); capacidades sensíveis sob permissões e políticas; plugins sem acesso ilimitado.

- **Fluxos críticos:** importação (`Select Folder → Scan → Analyze → Detect → Review → Confirm → Open Project`); salvamento em 5 etapas com falha bloqueante; relação visual→código; IA manual com aprovação via diff; IA automática com validação e reporte.

- **Acceptance criteria:** §81 — área funcional somente quando: (1) comportamento documentado; (2) integrado à arquitetura; (3) atua sobre o projeto real; (4) estados representados; (5) erros tratados; (6) alterações verificáveis; (7) testes existem; (8) nenhuma Core Invariant violada. §83 — produto completo = lista integrada: Project Import, Project Intelligence, Stack Detection, Adapters, Runtime, Visual Editor, Code Editor, Component System, Component Library, Media Library, Design System, Responsive Lab, Git, AI Engine, Luna Integration, Integrations, Pages/Content, Plugins, Workspaces, Security, Testing, Observability, Deployment.

- **Implicações para implementação**
  - Nunca operar sobre cópia abstrata: persistência sempre no projeto real.
  - Nada de suporte "fingido": suporte parcial declarado; detector com confiança; modo custom de stack.
  - Toda capacidade externa (GitHub, deploy, IA, maps) exige consulta a documentação oficial na data da implementação.
  - Undo/Redo ≠ Git; Preview ≠ Production; Project Model ≠ Source Project.
  - Documentação futura de cada requisito deve detalhar entradas, saídas, estados, dependências, permissões, erros, edge cases, validação, contratos, integração, critérios de aceitação (§82).

---

## Feature Map

- **Responsabilidade**
  - Mapa funcional oficial / índice funcional do produto: organiza capacidades por domínio, classificação, dependências e centralidade. Não define implementação; guia o K3 Swarm para localizar feature → domínio → dependências → docs especializados → contratos → invariantes → implementar.

- **Requisitos/features:** classificação conceitual: `CORE`, `EXTENSION`, `PROVIDER`, `ADAPTER`, `TOOL`, `UI CAPABILITY`, `FUTURE`. Domínios e features (classificações fiéis):
  - PROJECT MANAGEMENT (CORE): 4.1 Project Import, 4.2 Project Discovery, 4.3 Stack Detection, 4.4 Manual Stack Configuration, 4.5 Custom Stack (CORE/EXTENSIBLE), 4.6 Project Model, 4.7 Project Graph, 4.8 Project Status.
  - ADAPTER SYSTEM: 5.1 Adapter Engine (CORE); 5.2 Framework Adapters (ADAPTER — Next.js, React, Vue, Nuxt, Svelte, SvelteKit, Astro, Vite, HTML/CSS/JS); 5.3 Styling Adapters (Tailwind, CSS Modules, styled-components, CSS variables); 5.4 Build Adapter; 5.5 Package Manager Adapter (npm, pnpm, yarn, bun); 5.6 Custom Adapter (EXTENSION).
  - RUNTIME (todos CORE): 6.1 Filesystem Access, 6.2 Terminal, 6.3 Process Manager, 6.4 Development Server, 6.5 Build Runner, 6.6 Preview Runtime, 6.7 Runtime Permissions (CORE/SECURITY).
  - VISUAL EDITOR (todos CORE): 7.1 Visual Editor, 7.2 Element Selection, 7.3 Inspector, 7.4 Source Mapping, 7.5 Code Editor, 7.6 Visual/Code Synchronization, 7.7 Undo/Redo, 7.8 Diff.
  - COMPONENT SYSTEM: 8.1 Detection, 8.2 Model, 8.3 Schema (CORE); 8.4 Component Studio (CORE/MAJOR FEATURE); 8.5 Component Library (CORE/MAJOR FEATURE); 8.6 Global Components, 8.7 Project Components, 8.8 Promotion, 8.9 Versioning, 8.10 Compatibility (CORE).
  - BUILT-IN COMPONENTS (CORE COMPONENT): 9.1 Carousel, 9.2 Hero, 9.3 Gallery, 9.4 Button, 9.5 WhatsApp (CORE COMPONENT/INTEGRATION), 9.6 Form, 9.7 FAQ, 9.8 Testimonials, 9.9 Google Maps (CORE COMPONENT/INTEGRATION), 9.10 Video, 9.11 Custom Embed (CORE COMPONENT/TOOL).
  - MEDIA (CORE): 10.1 Media Library, 10.2 Asset Index, 10.3 Asset References, 10.4 Asset Replacement, 10.5 Image Editing, 10.6 Image Optimization, 10.7 Upload.
  - DESIGN SYSTEM (CORE): 11.1 Color, 11.2 Gradient, 11.3 Typography, 11.4 Spacing, 11.5 Radius, 11.6 Shadow, 11.7 Theme Editors.
  - RESPONSIVE LAB: 12.1 Device Presets, 12.2 Custom Viewport, 12.4 Overflow Detection, 12.5 Text Wrapping Detection, 12.6 Responsive Diagnostics (CORE); 12.3 Layout Stress Testing (CORE/MAJOR FEATURE); 12.7 Responsive Fix Assistance (AI-ASSISTED).
  - CONTENT/PAGES: 13.1 Page Explorer, 13.2 Route Explorer, 13.3 Page Creation, 13.4 Content Editor, 13.5 Metadata Editor (CORE); 13.6 Structured Content, 13.7 Blog Management (CORE/CONDITIONAL).
  - INTEGRATIONS: 14.1 HTML, 14.2 CSS, 14.3 JavaScript Injection, 14.4 iframe, 14.5 External Scripts (CORE TOOL); 14.6 Widgets, 14.7 External Services (EXTENSION); 14.8 Integration Library (CORE/EXTENSIBLE).
  - GIT: 15.1 Repository Detection, 15.2 Initialization, 15.5 Branch Management, 15.6 Commit, 15.7 Push/Pull/Fetch, 15.8 Diff/History (CORE); 15.3 GitHub Authentication, 15.4 Repository Creation (INTEGRATION); 15.9 Advanced Git (CORE/ADVANCED — stash, merge, rebase, reset, revert, cherry-pick).
  - AI ENGINE (todos CORE): 16.1 Provider System, 16.2 Context Engine, 16.3 Task Planning, 16.4 Code Generation, 16.5 Code Editing, 16.6 Patch Generation, 16.7 Diff Review, 16.8 Validation, 16.9 Autonomous Mode, 16.10 Manual Mode, 16.11 AI Tools.
  - LUNA (INTEGRATION): 17.1 Provider, 17.2 Tool Bridge, 17.3 Context Bridge, 17.4 Execution Mode.
  - SECURITY (CORE): 18.1 Authentication, 18.2 Authorization, 18.3 Filesystem Permissions, 18.4 Command Permissions, 18.5 AI Permissions, 18.6 Secrets Management, 18.7 Audit Log, 18.8 Dangerous Operation Protection.
  - WORKSPACES: 19.1 Workspace, 19.2 Projects, 19.4 Roles, 19.5 Permissions (CORE); 19.3 Teams (FUTURE/EXTENSIBLE).
  - PLUGINS (EXTENSION): 20.1–20.8 (System, Manifest, Lifecycle, Permissions, Adapter/AI/Component/Integration Plugins).
  - DEPLOYMENT: 21.1 Engine, 21.2 Preflight, 21.3 Build Pipeline, 21.5 Verification (CORE); 21.4 Providers (Vercel, Hostinger, SSH, SFTP, FTP, Docker — contratos próprios); 21.6 Rollback (CORE/PROVIDER-DEPENDENT).
  - OBSERVABILITY (CORE): 22.1 Logging, 22.2 Runtime Logs, 22.3 AI Logs, 22.4 Git Logs, 22.5 Error Tracking, 22.6 Performance Monitoring.
  - TESTING (CORE): 23.1 Unit, 23.2 Integration, 23.3 Adapter, 23.4 Runtime, 23.5 Component, 23.6 AI, 23.7 Build Validation, 23.9 E2E; 23.8 Visual Regression, 23.10 Recovery Testing (CORE/ADVANCED).
  - INTERNAL CONTRACTS: contratos formais para Project, Adapter, Component, AI, Git, Media, Plugin, Deployment, Runtime, Events.

- **Modelo de dados/entidades:** hierarquia de domínios PROJECT (Runtime, Intelligence, Adapters, Git) / EDITOR (Visual, Code, Inspector, Diff) / AI (Providers, Context, Planning, Execution) / COMPONENTS / Media / Design / Responsive / Integrations / Deployment.

- **Permissões/roles:** Security domain lista Authentication, Authorization e permissões específicas de filesystem, comandos e IA como CORE.

- **Fluxos críticos (Dependency Overview, §25):** `Project Import → Project Discovery → Project Model → Adapter System → Runtime → Editor`; Componentes: `Project Model → Component Detection → Component System → Component Studio → Component Library`; IA: `Project Model + Runtime + Adapters + Tools → AI Context → AI Planning → AI Patch → Diff → Validation`; Deploy: `Project → Git/Working Tree → Build → Preflight → Deployment Provider → Verification`.

- **Acceptance criteria / regras:**
  - §26 Pilares do MVP (18): Project Import, Project Intelligence, Stack Detection, Adapter Architecture, Runtime, Visual Editor, Code Editor, Component System, Component Studio, Component Library, Media Library, Design Editing, Responsive Lab, Git, AI Engine, Integrations, Security, Testing.
  - §29 Regra de prioridade funcional: 1. Integridade do projeto, 2. Segurança, 3. Compatibilidade, 4. Persistência real, 5. Git/reversibilidade, 6. Funcionalidade, 7. UX, 8. Otimização, 9. Automação adicional.
  - §28 Não-confusões: Project Model ≠ Source Project; Component Library ≠ Project Components; AI Provider ≠ AI Engine; Runtime ≠ CMS; Adapter ≠ Plugin; Preview ≠ Production.
  - §30 Regra de dependência: nenhuma feature isolada (ex.: Component Studio exige Project Model, Component Model, Adapter, Runtime, Source Mapping; IA não é chatbot desconectado).

- **Implicações para implementação**
  - Toda feature nova precisa: domínio, classificação, dependências, contratos afetados, docs atualizados, testes; Feature Map sempre atualizado.
  - Diferenciais do produto: Universal Project Intelligence, Adapter Architecture, Component Studio, Visual+Code, Nexo AI Engineer, Responsive Lab, Git-Native Workflow, Project Portability.

---

## Feature Priorities

- **Responsabilidade**
  - Define ordem de construção (prioridade de produto e arquitetural), dependências fundamentais e o que NÃO construir cedo. P0–P4 representam dependência e criticidade arquitetural, não backlog de UI.

- **Requisitos/features (níveis fiéis):**
  - Níveis: `P0 — Foundation`, `P1 — Core Product`, `P2 — Advanced Core`, `P3 — Extensions`, `P4 — Future Commercial / Advanced`.
  - Ordem macro (§2): FOUNDATION → PROJECT UNDERSTANDING → DOMAIN CAPABILITIES → AUTHORIZATION → PROGRAMMATIC CONTROL PLANE → RUNTIME → ADAPTERS → GIT → EDITOR → COMPONENTS → MEDIA/DESIGN/RESPONSIVE → AI → INTEGRATIONS → PLUGINS → DEPLOYMENT → ADVANCED FEATURES → COMMERCIAL PLATFORM.
  - **P0**: Runtime Foundation (filesystem, processos, terminal, comandos, ambiente, build, preview, Git); Project Import (sem modificar o projeto); Project Discovery; Stack Detection (confiança, ambiguidade, correção manual, custom); Project Model; Adapter Contract (antes de suporte profundo; Core sem lógica de framework); Security Foundation (identidade, autenticação, autorização, permissões, policies, Runtime permissions, machine identity, auditabilidade, operações perigosas); Domain Capability Model (Project, Component, Media, Git, Runtime, AI, Deployment, Workspace); Programmatic Control Plane (UI/API/CLI/AI/automação como consumidores das mesmas capacidades de domínio); Git Foundation (detectar repo/branch/remotes/alterações, histórico, commits, sync — avançado em P2); Programmatic Git; Runtime e Agent Access (read/write/create/delete file, execute command, start/stop process, run build/tests, inspect output).
  - **P1**: Visual Editor (seleção, inspector, edição, preview, source mapping, save, undo/redo, diff); Code Editor; Component Model; Component Studio; Component Library (global/project, versioning, compatibility, dependencies); Media Library (upload, busca, edição, replace, metadata, references, cleanup); Design Editing (colors, gradients, typography, spacing, radius, shadows, borders, themes, tokens); Responsive Lab (presets, custom viewport, overflow, text wrapping, comparação, diagnóstico); Basic AI Engineer (contexto, file access, planning, análise, geração, patch, diff, validação); Manual AI Mode (`Analyze→Plan→Propose→Diff→Wait for Approval→Apply→Validate`); AI Programmatic Access (mesmos serviços de domínio, sem arquitetura paralela); AI Tool Layer (`project.read/write/analyze`, `file.read/write`, `component.create/update`, `media.list`, `git.status/commit`, `runtime.command/build/test`, `preview.open` — todas com autorização); AI Provider Abstraction (Kimi, Luna, OpenAI, Anthropic, Gemini, Local Models, Custom API — lista aberta); Luna Integration Foundation; Integrations Foundation (HTML, CSS, JS, iframe, scripts, widgets, embeds).
  - **P2**: Advanced Editor (visual regression, advanced source mapping, responsive diagnostics avançado, structural editing, conflict resolution); Advanced Git (merge, rebase, stash, reset, revert, cherry-pick, branch management — controles adicionais); Advanced Component System (promotion, versioning, compatibility checks, dependency analysis, update workflows, migration); Autonomous AI Mode (`Request→Context→Permission→Plan→Execute→Validate→Report`, sem remover authorization/safety/validation/audit/approval); Advanced Agent Orchestration; Plugin System; Deployment Engine (Vercel, Hostinger, SSH, SFTP, FTP, Docker); Deployment Verification; Rollback.
  - **P3**: Advanced Integrations (serviços, marketplace, automações, webhooks); Custom Adapters (via contratos oficiais); Advanced Agent Ecosystem.
  - **P4**: Commercial Platform (SaaS, multi-tenant, plans, billing, quotas, marketplace, enterprise, analytics) — não bloqueia o primeiro produto.

- **Modelo de dados/entidades:** erros programáticos estruturados: Unauthorized, Forbidden, Not Found, Conflict, Invalid Input, Unsupported Operation, Build Failure, Runtime Failure, Provider Failure, Validation Failure, Unknown Project State. Machine identities: Human User, AI Agent, Automation Job, Plugin, Service Identity.

- **Permissões/roles:** Human-Equivalent Agent Capability (IA autorizada pode tudo que humano autorizado pode, via entry points programáticos); No UI-Only Operations; Playwright não é Control Plane; No Artificial Agent Limitations; equivalência de capacidade ≠ equivalência de permissão (§67); aprovação pode diferir entre Human e AI por política (§68); Machine Identity própria para agentes; Agent Authentication (API keys, short-lived tokens, OAuth, service identities, signed requests — a definir); Agent Authorization central (ex.: agent "Kimi Code" + `project.write` + Project "Client A" + Policy Allowed → ALLOW); Capability Discovery; contratos programáticos machine-readable.

- **Fluxos críticos:**
  - Dependências macro (§58): `Runtime → Project Discovery → Project Model → Adapter System → Domain Services → Authorization → Programmatic Control Plane → UI/AI/CLI`.
  - Critério de sucesso do Control Plane (§71): agente autorizado executa `Select Workspace → Create/Open Project → Analyze → Read Source → Modify Source → Run Build → Run Tests → Review Diff → Commit → Push → Deploy → Verify` sem Playwright.
  - Chains: Component (`Project Model → Component Detection → Component Model → Component Services → Component Studio → Component Library → Component Promotion`); AI (`Project Model + Runtime + Adapters + Authorization + Domain Services → AI Context → Planning → Tools → Patch → Diff → Validation → Apply`); Deployment (`Project → Known State → Preflight → Build → Provider → Deployment → Verification`).

- **Acceptance criteria (§73):** arquitetura alinhada quando UI substituível sem destruir domínio; IA opera sem Playwright; CLI usa mesmas capacidades; plugins usam contratos oficiais; automações autorizadas; Git sem UI; Runtime controlável; operações auditáveis; providers substituíveis.

- **Implicações para implementação**
  - Nunca começar pela interface; domínio primeiro, consumidores convergem para o mesmo Domain Service.
  - §74 Não priorizar cedo: marketplace, billing, planos, efeitos visuais periféricos, componentes decorativos em massa, automações sem contratos.
  - Regra de risco (§77): filesystem, terminal, Git, AI write, secrets, deployment, rollback recebem engenharia/validação antes de automação ampla.
  - Agente antes de implementar: identificar prioridade e dependências, consultar docs/invariantes/contratos/Security, verificar entry point programático e consumo por AI/CLI, pesquisar fontes externas, implementar, validar, documentar decisões (§80).

---

## User Roles

- **Responsabilidade**
  - Define papéis de usuário (funções do produto, não implementação de auth), capacidades esperadas e limites de autoridade. Transformação em permissões concretas deferida a `17-security/`, `18-workspaces-users/`, `24-api-contracts/`.

- **Requisitos/features:**
  - Cadeia fundamental: `IDENTIDADE → ROLE → PERMISSIONS → RESOURCE ACCESS → OPERATION`; Role sozinha não é autorização.
  - Papéis oficiais iniciais: **Owner, Admin, Developer, Designer, Editor, Viewer**; arquitetura deve admitir novos papéis e Custom Roles futuras (ex.: "Content Manager" com `project.read`, `content.write`, `media.write`, `blog.write`, `deployment.read`).
  - Permissões por domínio (exemplos conceituais fiéis): `project.read/write`; `files.read/write/delete`; `terminal.execute`, `process.manage`; `git.read/commit/push/branch/merge/rebase/reset`; `component.read/write/publish`; `media.read/write/delete`; `ai.use/execute/approve/autonomous`; `integration.read/write`; `deployment.read/execute/rollback`; `workspace.read/write`; `users.read/write`; `settings.read/write`.
  - Granularidades específicas: AI Permissions (`ai.read_context`, `ai.modify_files`, `ai.run_commands`, `ai.git_commit`, `ai.git_push`, `ai.deploy`); Terminal (`terminal.read_output`, `terminal.execute_safe`, `terminal.execute`, `terminal.admin`); Git (Read, Commit, Push, Branch, Merge, Rebase, Reset, Force Push — destrutivas com proteção); Deployment (`deployment.read/preview/execute/production.execute/rollback`); Componentes (`component.project.write`, `component.global.write`, `component.global.publish`); Integrações (`integration.read/write/credentials.write/execute`); Secrets separados de configuração de integração; auditoria controlável.
  - Approval Model: permissão ≠ execução imediata (ex.: Developer → Create Production Deployment → Approval Required → Admin/Owner → Deploy).
  - User Identity única e independente de Role; Multiple Roles (ex.: Developer + Designer) sem duplicar usuário; Workspace Membership explícita (Role varia por Workspace); Project Membership (Project A → Write, B → Read, C → No Access); Least Privilege; Human Authority + Agent Identity (`Requested by: Abner / Executed by: Nexo AI / Provider Kimi / Action: Modify Hero.tsx`); Role Defaults seguros; Role Changes auditadas; User Removal preserva histórico; Ownership Transfer como operação crítica.
  - Contexto mínimo de autorização: WHO / WHAT / WHERE / ON WHAT / IN WHICH ENVIRONMENT / WITH WHICH PROVIDER / UNDER WHICH POLICY (ex.: Developer, Deploy, Workspace Nexo, Junior Reformas, Production, Hostinger, "Production requires approval" → REQUIRE APPROVAL).

- **Modelo de dados/entidades:** User (identidade única), Role, Permission, Workspace Membership, Project Membership, Policy. Hierarquia conceitual (não substituta de autorização): Owner → Admin → Developer → Designer/Editor → Viewer.

- **Permissões/roles (matriz resumida fiel):**
  - **Owner**: autoridade máxima do Workspace (workspace, usuários, roles, projetos, permissões, configurações, integrações, providers, billing futuro, componentes globais, plugins, políticas); NÃO é bypass absoluto de segurança.
  - **Admin**: administrador operacional (usuários, projetos, permissões dentro de limites, componentes globais, mídia compartilhada, integrações, logs, configs operacionais); restrições sobre ownership, billing, transferência, ações exclusivas de Owner; papel administrativo, não "Developer com poderes extras".
  - **Developer**: código, editor visual, terminal, comandos, builds, servidores, Git (branch/commit/push/pull), AI Engineer, componentes, assets, Responsive Lab, deploys permitidos; terminal/secrets/deploy/destrutivos seguem políticas; sem autoridade administrativa automática.
  - **Designer**: Visual Editor, cores, gradients, tipografia, spacing, radius, shadows, assets, componentes, Component Studio, Responsive Lab, layouts, previews; por padrão sem terminal irrestrito, secrets, autoridade administrativa, deploy irrestrito, Git destrutivo.
  - **Editor**: textos, títulos, descrições, links, imagens, carrosséis, conteúdo, blog, metadados, Media Library, preview, salvar; por padrão sem terminal, código irrestrito, Git avançado, secrets, deploy, administração; UX simplificada (não precisa conhecer Git/terminal/framework/package manager).
  - **Viewer**: somente leitura genuína (projetos, preview, componentes, Media Library, Git status, histórico permitido); não pode modificar nem indiretamente via IA/terminal/plugins/integrações.

- **Fluxos críticos:** exemplos de decisão (Developer + `project.files.write` + Project A + Development → ALLOW; Developer + `deployment.production.execute` + Production → MAY REQUIRE ADDITIONAL POLICY).

- **Acceptance criteria (§59):** sistema deve: distinguir usuários; associar a Workspaces; atribuir Roles; limitar por projeto; controlar permissões por capacidade; diferenciar ambientes; controlar IA, terminal, Git, deploy, recursos sensíveis; registrar mudanças; impedir acesso indevido mesmo com UI contornada (13 itens).

- **Implicações para implementação**
  - Proibido `if role === "developer"` como autorização; verificar permissão + recurso + ambiente + política.
  - API/Runtime validam autorização — esconder botão/terminal na UI é insuficiente (§48–49).
  - IA não herda permissões do usuário; não eleva privilégios (bloquear, informar, solicitar humano); User Access ≠ AI Access ≠ Plugin Access.
  - Não define tecnologia (banco, JWT, OAuth, sessões, RBAC/ABAC, middleware, policy engine) — decisão deferida a 17-security/18-workspaces-users/24-api-contracts/16-storage.

---

## User Journeys

- **Responsabilidade**
  - Define os fluxos operacionais esperados (comportamento, não implementação de UI) para todos os tipos de usuário; referência para Product, UX, arquitetura, runtime, editor, Git, AI, adapters, segurança, testes e agentes.

- **Requisitos/features:** jornadas nomeadas A–BU (seleção fiel):
  - **A** Primeiro acesso (`Open Nexo → Authenticate → Resolve user → Load Workspaces → Select Workspace → Load accessible Projects → Project Dashboard`).
  - **B** Criar/conectar Workspace (auditável; valida nome; registra criador; não cria usuários automaticamente).
  - **C** Importar projeto local (`New Project → Select Folder → Filesystem Access → Project Scanner → Stack Detection → Git Detection → Build Detection → Project Analysis → Analysis Summary → User Review → Open Project`); tela de análise mostra Project, Path, Detected Stack, Framework, Language, Styling, Package Manager, Build/Dev Command, Git Status, Confidence, Warnings, Unsupported Areas.
  - **D** Corrigir stack (config manual confirmada prevalece; origem registrada; reversível).
  - **E** Abrir projeto conhecido (verifica mudanças: arquivos, dependências, branch, Git, config; não assume modelo atualizado).
  - **F** Iniciar dev (`Open Project → Start Development → Resolve Command → Validate Environment → Start Process → Monitor Output → Detect Ready State → Open Preview`; comando nunca assumido como `npm run dev`).
  - **G** Preview (informa projeto, ambiente, estado, viewport, alterações salvas/não salvas, versão/commit).
  - **H** Selecionar elemento visual (`Preview → Select Element → Resolve Element → Identify Component/Node → Resolve Source → Open Inspector`; informa quando Source Mapping não é confiável).
  - **I** Editar texto (identificar fonte real; não salvar só no editor; diff; falha de persistência = erro).
  - **J** Editar código (arquivo real; reanálise de áreas afetadas; alterações externas invalidam estado).
  - **K** Editar propriedade de componente (`... → Save → Adapter Transform → Persist → Validate`).
  - **L** Criar componente (Component Studio: identidade, estrutura, props, variants, responsivo, assets, preview, validar, salvar).
  - **M** Salvar componente no projeto (resolve adapter, gera/modifica source, valida dependências; impedir "salvo" sem código real atualizado).
  - **N** Publicar na biblioteca global (promote → dependências → compatibilidade → metadata → versão → publish; não publicar imports privados, assets inacessíveis, APIs proprietárias, configs específicas, secrets).
  - **O** Inserir componente (compatibilidade verificada; incompatível = bloqueado ou classificado).
  - **P** Editar carrossel (slides, imagens, ordem, texto, links, autoplay, velocidade, transição, loop, navigation, pagination, items/viewport).
  - **Q** Substituir imagem (Media Library; preserva relação imagem↔componente). **R** Adicionar mídia (upload → validar → processar → armazenar → indexar).
  - **S** Editar design (preferir fonte real: variável CSS compartilhada > cor hardcoded).
  - **T** Responsividade; **U** Stress test (cenários: Long Title, Long Button, Long Paragraph, Narrow/Wide Viewport, Large Image, Multiple Items, Unexpected Content; conteúdo de teste ≠ conteúdo real).
  - **V** Corrigir com IA (`Identify Problem → Ask AI → Context → Analyze → Plan → Patch → Diff → Validate → Preview → Approve/Reject → Apply`).
  - **W** IA manual (não aplica antes de aprovação); **X** IA automática (permission check + validação + rastreabilidade mantidos); **Y** IA com incerteza (classifica, pede informação ou fallback explicitamente seguro; não inventa estrutura).
  - **Z** Terminal (permission check, risk evaluation, stream, exit code, registro); **AA** Comando bloqueado (Denied → Explain → Do Not Execute).
  - **AB** Git status; **AC** Commit (review, mensagem, validar working tree, stage, commit, verificar); **AD** Commit+Push (se push falha: `Commit: SUCCESS / Push: FAILED`, nunca sucesso total); **AE** Criar repo GitHub (consultar docs oficiais); **AF** Criar branch; **AG** Git perigoso (reset, force push, rebase, remoção de branch, checkout sobre alterações: Risk Detection → Show Impact → Require Confirmation → Execute → Verify → Audit).
  - **AH** Criar página (convenções do projeto; atualiza Project Model); **AI** Editar conteúdo (origem: código/arquivo/JSON/Markdown/API/banco/serviço — não assumir única origem); **AJ** Integração; **AK** Plugin (revisar permissões; sem elevação sem consentimento).
  - **AL** Deploy (`Open Deploy → Select Environment → Select Provider → Preflight → Build → Review → Deploy → Verify → Report`); **AM** Deploy bloqueado (preflight failure → stop → explain → do not deploy); **AN** Rollback (histórico → versão → review → confirm → rollback → verify → audit; estratégia do provider).
  - **AO** Adicionar usuário; **AP** Alterar Role (review impact → confirm → apply → audit); **AQ** Acesso específico a projeto; **AR** Permissão insuficiente (Denied → Explain Missing Permission → Do Not Execute; frontend insuficiente).
  - **AS** Alteração externa (detect → compare → identify → invalidate stale → refresh → notify; nunca sobrescrever silenciosamente); **AT** Conflito com estado não salvo (preservar, mostrar opções: compare/reload/merge/discard/keep local — definido por Change Tracking e Conflict Model); **AU** Falha no salvamento (não marcar salvo; manter estado recuperável; oferecer recovery); **AV** Falha em operação de IA (capturar estado, mostrar parcial, preservar projeto, retry/review/revert).
  - **AW** Atualizar Project Intelligence (re-scan parcial, update model/graph, invalidar cache); **AX** Reabrir após checkout (não mostrar dados da branch anterior); **AY** Atualização de componente global (sem update automático silencioso; diff preview); **AZ** Exportar (utilizável fora do Nexo); **BA** Clonar (sem compartilhar secrets, identidade Git, dados exclusivos, configs privadas); **BB/BC** Configurar/trocar provider de IA; **BD** Usar Luna (bridge, permissões); **BE** Pesquisa técnica pela IA (fontes oficiais, validar versão; não preencher lacuna com suposição); **BF/BG** Componente externo / integração reutilizável; **BH** Revisão antes de commit; **BI** Estado inconsistente (stop unsafe → report → refresh/re-scan → rebuild → resume); **BJ/BK** Viewer/Editor bloqueados; **BL** Deploy produção com aprovação; **BM** Auditoria (filtros: data, usuário, projeto, ação, provider, resultado); **BN** Recuperar projeto (Git, unsaved, last known good, opções); **BO** Encerrar projeto (unsaved/processos: Save/Discard/Cancel); **BP** Stack não suportado (explain → manual config → custom adapter → Restricted Project Mode ou Cancel; não fingir suporte); **BQ** Suporte parcial (mostrar áreas suportadas/não suportadas); **BR/BS** Novo adapter + Fixture Projects (scan → detect → edit → build → test → validate); **BT** Edição externa como fluxo válido.
  - **BU** Ciclo principal: `OPEN PROJECT → UNDERSTAND → RUN → PREVIEW → EDIT → VALIDATE → REVIEW → COMMIT → PUSH → DEPLOY → VERIFY` (IA participa em UNDERSTAND/EDIT/VALIDATE/REVIEW sem quebrar segurança).

- **Modelo de dados/entidades:** estados de operação visíveis: pending, running, success, failed, blocked, partially completed.

- **Permissões/roles:** regras gerais (§2): permissões antes de expor operações; IA respeita permissões efetivas; operações críticas respeitam permissões; jornadas AR/BJ/BK/BL demonstram enforcement server-side.

- **Fluxos críticos:** as jornadas C (importação), F (dev), H/I (seleção/edição), AC/AD (Git), AL/AM (deploy) são espinha dorsal; ver SÍNTESE.

- **Acceptance criteria (§78):** jornada correta quando: etapas presentes; permissões verificadas; operações reais sobre o projeto; estados atualizados; falhas representadas; alterações rastreáveis; operações críticas protegidas; respeita adapters e Core Invariants; testes aprovados (10 itens). Regras transversais: contexto (Workspace/Project/Environment/Branch/Provider), estado, recuperação, rastreabilidade, transparência.

- **Implicações para implementação**
  - UI nunca mostra sucesso antes da conclusão real; desconhecimento representado explicitamente.
  - Análise não modifica projeto, não instala dependências sem autorização, não converte projeto.
  - Cada jornada exige consulta a Product Requirements, Product Principles, Core Invariants, doc da feature, arquitetura, contratos, segurança, testes e docs externas.

---

## Project Lifecycle

- **Responsabilidade**
  - Modelo operacional do ciclo de vida de um projeto: estados, transições, operações e condições da descoberta à remoção. Não presume uniformidade de ambientes/frameworks/comandos.

- **Requisitos/features:**
  - Ciclo central: `DISCOVER → IMPORT → ANALYZE → REGISTER → INITIALIZE → DEVELOP → EDIT → VALIDATE → VERSION → PUBLISH → MAINTAIN → UPDATE → ARCHIVE/EXPORT/REMOVE`.
  - **Estados conceituais do projeto** (fiéis): DISCOVERING, IMPORTING, ANALYZING, REVIEW_REQUIRED, READY, ACTIVE, DIRTY, VALIDATING, BUILDING, PREVIEWING, COMMIT_PENDING, COMMITTED, PUSHING, SYNCED, DEPLOYING, DEPLOYED, DEGRADED, ERROR, RECOVERY_REQUIRED, ARCHIVED, EXPORTED, REMOVED.
  - REVIEW_REQUIRED: stack ambíguo, build incerto, estrutura desconhecida, Git não configurado, adapter parcial, config manual — incertezas nunca escondidas. READY ≠ tudo conhecido (contexto suficiente para capacidades suportadas). DIRTY considera filesystem, não-salvos, working tree, editor. PUSHING distingue Commit Success+Push Failed. DEGRADED visível (adapter parcial, análise incompleta, preview indisponível etc.). REMOVED: "Remove from Nexo" ≠ "Delete Source Project" (riscos e confirmações diferentes).
  - Ciclo inicial mínimo: `Candidate Folder → Discover → Import → Analyze → Review if Needed → Ready`.
  - Descoberta não destrutiva: não reestruturar, não instalar dependências, não alterar código/Git automaticamente.
  - Registro do projeto (conceitual): Project Identity, Workspace, Runtime, Source Location, Git Identity, Detected Stack, Adapter State, Project Status.
  - Inicialização: index, cache, metadata, adapter state, preview config, Git info — metadata do Nexo, não substitui arquivos.
  - Ciclos: desenvolvimento (`Open → Run → Preview → Edit → Validate → Review`); alteração visual (`Select → Inspect → Edit → Preview → Persist → Validate`); alteração de código (`Open File → Edit → Save → Update Project Intelligence → Validate Affected Areas → Refresh Preview`); alteração IA (`Request → Context → Permission → Plan → Patch → Diff → Validation → Apply`); alteração externa (`Detect → Invalidate → Refresh → Update state`).
  - Conflito de estado: não sobrescrever/descartar/escolher silenciosamente.
  - Validação em momentos: After Edit, After AI Patch, Before Commit, Before Push, Before Deploy, After Deploy.
  - Versionamento: `Change → Review → Validate → Commit → Verify`; commit é mudança real no Git. Sync remoto separa local commit / push / remote state.
  - Deploy: `Known Project State → Preflight → Build → Deploy → Verification`. Manutenção contínua. Dependências: não atualizar automaticamente por versão nova. Migração de framework (React→Vue, CSS Modules→Tailwind) é jornada especial, não edição simples.
  - Mudança de branch: checkout → filesystem changes → refresh → re-analyze → refresh Git → refresh preview.
  - Clonagem: nova identidade, revisão de Git/secrets/integrations/deploy; não compartilhar identidade, secrets, metadata privada, remote incorreto.
  - Exportação utilizável fora do Nexo; arquivos temporários do Nexo não são parte automática.
  - Remoção: `Remove from Nexo → Confirm Scope → Detach Nexo Metadata → Project Remains`; exclusão física é operação separada.
  - **Lifecycle multidimensional (§52):** eixos independentes — Project: ACTIVE; Editor: UNSAVED; Git: DIRTY; Build: NOT RUN; Preview: RUNNING; Deployment: PRODUCTION VERSION X. Proibido enumeração única simplista. Saved ≠ Committed; Dirty Editor ≠ Dirty Git; Preview ≠ Deploy.
  - **Lifecycles secundários:** Inteligência (`Unknown → Detected → Analyzed → Modeled → Updated → Stale → Re-analyzed`); Adapter (Available, Detected, Loaded, Supported, Partial, Unavailable, Error, Updated); Componente (Discovered, Draft, Project, Validated, Published, Versioned, Deprecated, Removed); AI Task (Requested, Contextualizing, Planning, Waiting Approval, Executing, Validating, Succeeded, Failed, Partially Completed, Cancelled, Rolled Back); Deployment (Requested, Preflight, Building, Deploying, Verifying, Succeeded, Failed, Rolled Back).
  - Operações interrompidas (User Cancel, Process/Runtime/Network/Provider Failure): identificar estado resultante; nunca converter interrupção em sucesso.
  - Fechamento: verificar unsaved, processos, AI tasks, Git, deploys, uploads. Reabertura: verificar filesystem, Git, processos, config, Project Model, preview, mudanças externas.
  - Falha externa (GitHub/Vercel/Hostinger/AI provider/filesystem/rede indisponíveis): preservar estado local. Runtime restart: `Runtime Down → Up → Discover Active Projects → Restore Metadata → Check Filesystem → Check Git → Reconcile State`.
  - **Source of truth (§63):** `Source Project → Git/Remote State → External Provider State → Nexo Project Model → Nexo Cache → UI State`. Reconciliação explícita entre Filesystem/Git/Project Model/Editor/Preview/Deployment.

- **Modelo de dados/entidades:** Project (com identidade, workspace, runtime, source location, Git identity, stack, adapter state, status); estados conforme listas acima.

- **Permissões/roles:** modificações somente com ação específica e autorização apropriada (§27).

- **Fluxos críticos:** ciclo inicial de importação; ciclo de edição; versionamento; deploy; recuperação contextual (sem estratégia universal).

- **Acceptance criteria (§65):** 12 itens — identificar projetos novos; analisar existentes; registrar; detectar mudanças; representar estados; diferenciar estados de editor/Git/build/deployment; recuperar de falhas; impedir operações inseguras em estados inválidos; reanalisar contexto obsoleto; preservar projeto real; permitir exportação; permitir remoção do Nexo sem exclusão do projeto.

- **Implicações para implementação**
  - Implementar eixos de estado independentes; UI nunca autoridade sobre o projeto real.
  - Transição não especificada não deve ser inventada: consultar docs/contratos/decisões/fontes (§66).

---

## Workspace Model

- **Responsabilidade**
  - Modelo conceitual de Workspace: unidade organizacional que agrupa usuários, projetos, componentes, recursos compartilhados, configurações, permissões, integrações, providers e políticas. Suporta inicialmente equipe interna (Nexo Digital) e depois organizações independentes (multi-tenant futuro). Não define banco, schema, autenticação ou multi-tenancy técnico.

- **Requisitos/features:**
  - Estrutura: `Workspace → Members, Projects, Component Library, Media Resources, Integrations, AI Providers, Deployment Providers, Plugins, Policies, Settings, Audit`.
  - Workspace ≠ Project (um Workspace, vários Projects; Project com identidade própria); Workspace ≠ filesystem (não é pasta, repo Git, diretório VPS, bucket, hospedagem).
  - **Identidade:** ID estável (≠ nome), Name, Slug/Identifier, Created At, Created By, State. Estados: ACTIVE, SUSPENDED, ARCHIVED, DELETING, DELETED (ampliables). SUSPENDED não perde dados; DELETED é estado lógico (retenção/exclusão física no Storage).
  - **Owner:** todo Workspace tem ao menos um Owner; sistema não permite estado sem Owner quando obrigatório.
  - **Membros:** `User → Workspace Membership → Role, Permissions, Status, Project Scope`; membership explícita (não inferida por URL). Membership Status: INVITED, ACTIVE, SUSPENDED, REMOVED. Convites: `Owner/Admin → Invite User → Define Role → Optional Project Scope → Send → Accept → Membership ACTIVE`, auditáveis.
  - **Project Scope:** granularidade por projeto (A → Developer, B → Viewer, C → No Access).
  - **Recursos compartilhados:** Global Components, Integration Definitions, AI Providers, Deployment Providers, Plugins, Design Resources, Media Resources, Templates — cada um com política própria.
  - Global Component Library pertence ao Workspace; Project Components pertencem ao projeto e não são publicados globalmente automaticamente; promoção considera dependências, assets, compatibilidade, tecnologia, secrets, imports, configurações, versão.
  - Media: `Workspace Media` vs `Project Media` — níveis não misturados.
  - AI Providers no Workspace (ex.: Kimi, Luna, Custom Provider); projetos usam conforme permissões. **Secrets:** separação obrigatória entre Provider Configuration e Secret Material.
  - Deployment Providers compartilhados (Vercel, Hostinger, SSH); projetos selecionam quais usar.
  - **Project Binding:** `Project → Workspace ID, Runtime, Source Location, Git, Configuration`; projeto não pertence a múltiplos Workspaces sem regra explícita. Transferência entre Workspaces é operação sensível (verifica autorização, componentes, integrações, providers, secrets, políticas, usuários, histórico, Git, referências). Transfer ≠ Clone (mesma entidade vs nova entidade). Clone: nova identidade, revisão de Git/secrets/integrations, nova config de deploy.
  - **Workspace Policies:** ex. "Production deploy requires approval", "AI autonomous mode disabled", "Force push disabled", "External scripts require approval", "Plugin installation restricted". Hierarquia conceitual: `Platform Safety → Workspace Policy → Project Policy → Environment Policy → User Permission → Operation` (ordem definitiva no Security/Permission Model — não inventar).
  - Projects Dashboard: nome, status, stack, branch, Git state, environment, último update, problemas, provider, estado; apenas projetos acessíveis.
  - Runtime independente do Workspace (Project A → Runtime Local, B → VPS, C → Remote). Git: identidade por projeto; sem repo único obrigatório por Workspace.
  - Audit do Workspace: criação, alteração, convite, remoção, role change, projeto, transferência, secrets, provider, plugin, deployment policy, operações críticas.
  - **Isolamento:** Project A não lê secrets de Project B; Global Component compartilhável, Project Component não; caches não vazam entre Workspaces; erro de autorização não pode permitir acesso cross-Workspace (validado em testes de segurança); compartilhamento entre Workspaces sempre explícito e auditável.
  - Plugins de Workspace não recebem acesso automático a projetos. IA no Workspace: providers/models permitidos, modo automático, ferramentas, limites, políticas, internet, terminal; contexto de IA com escopo claro (Workspace, Project, Environment, User, Permissions, Policies) — não recebe tudo automaticamente.
  - Contexto explícito: Editor opera em Workspace selecionado; Deploy sempre com `Workspace + Project + Environment + Provider + Target`; switching recalcula projetos, recursos, permissões, providers, configurações.
  - **Resource ownership:** Project → Workspace; Global Component → Workspace; Project Component → Project; Workspace Provider → Workspace; Project Integration → Project; User → Platform Identity; Membership → Workspace.
  - Templates ≠ projetos (origem reutilizável vs instância real). Component Library global = patrimônio do Workspace (identidade, versões, dependências, compatibilidade, ownership, permissões, auditoria).
  - Onboarding: `Create Workspace → Configure Identity → Invite Team → Configure Providers → Configure Policies → Create/Import Project` (sem exigir tudo imediatamente).
  - Deleção crítica (impacto em projetos, componentes, mídia, integrações, providers, membros, auditoria, configs; não apaga Source Projects sem confirmação específica); archive como alternativa menos destrutiva; recovery via Storage/retenção.
  - SaaS futuro: `Organization → Workspace(s) → Users/Projects/Resources`; billing associável sem contaminar identidade; quotas futuras (projetos, storage, usuários, IA, deployments, componentes) fora da arquitetura fundamental. Jobs assíncronos carregam contexto de Workspace; logs/eventos com contexto (Workspace, Project, User, Action, Resource, Result, Timestamp).

- **Modelo de dados/entidades:** Workspace (ID, Name, Slug, Created At/By, State); Membership (Role, Permissions, Status, Project Scope); Project Binding (Workspace ID, Runtime, Source Location, Git, Configuration); ownership map acima.

- **Permissões/roles:** roles por Workspace; Project Scope; políticas por Workspace com hierarquia de precedência conceitual; isolamento cross-Workspace/cross-Project obrigatório.

- **Fluxos críticos:** criação/onboarding; convite; importação associada a Workspace; promoção de componente; transferência vs clone; switching.

- **Acceptance criteria (§68):** 16 itens — criar/identificar Workspaces; membros; Roles; restringir acesso; associar projetos; compartilhar recursos explicitamente; isolar projetos e secrets; controlar providers; aplicar políticas; auditoria; múltiplos Runtimes; switching; preparar SaaS; impedir vazamento entre Workspaces.

- **Implicações para implementação**
  - Fronteira organizacional com isolamento real; toda operação em recurso Workspace-scoped determina o Workspace.
  - Decisões de tecnologia (multi-tenancy, auth, banco, autorização): não presumir; verificar docs; pesquisar; registrar decisão.

---

## Permission Model

- **Responsabilidade**
  - Modelo conceitual de autorização: como decidir se uma identidade pode executar uma operação sobre um recurso/projeto/ambiente/Workspace. Não pressupõe RBAC/ABAC/ACL/policy engine/JWT/middleware/banco específicos.

- **Requisitos/features:**
  - Estrutura: `Identity → Membership → Role → Effective Permissions → Resource Scope → Environment → Policy → Operation → Authorization Decision`.
  - **Decisões explícitas:** `ALLOW`, `DENY`, `REQUIRE_APPROVAL`, `UNKNOWN`. UNKNOWN ≠ ALLOW (bloqueia até haver contexto). Default Deny (§17); Explicit Allow; Explicit Deny (precedência definida na Security Architecture — não inventar).
  - **Identidade:** humana, agente de IA, processo autorizado, operação interna; nunca "sem autor". Human Initiator + Agent Identity distintos (`Requested By: User A / Executed By: Nexo AI / Kimi / Action: Modify Hero.tsx`).
  - **Permission:** operações, não páginas de UI (ex.: `project.read/write`, `files.read/write`, `terminal.execute`, `git.commit/push`, `deployment.execute`, `ai.execute`).
  - **Resource:** Workspace, Project, File, Component, Asset, Integration, Branch, Repository, Deployment, Environment, Provider, Secret.
  - **Scopes:** Workspace (`workspace.members.read/write`, `workspace.settings.write` — não implica acesso a todos os projetos); Project (A: write=ALLOW, B: write=DENY); Environment (Development/Preview/Staging/Production; ex.: `deployment.execute`: Dev→ALLOW, Production→REQUIRE_APPROVAL); Provider (Vercel→ALLOW, Production SSH→DENY). Escopo sempre explícito.
  - **Effective Permissions:** Role + Explicit Permissions + Workspace Membership + Project Access + Policies + Resource Scope.
  - Least Privilege (filesystem, terminal, Git, secrets, AI, plugins, deployment).
  - **Approval:** distingue "Permission to Request" de "Permission to Execute"; exemplos: production deployment, force push, reset de branch, secrets, plugin privilegiado, IA autônoma de alto impacto.
  - **Domínios de permissão:** `workspace.* project.* files.* terminal.* process.* git.* component.* media.* integration.* ai.* deployment.* plugin.* user.* audit.* settings.*` (nomenclatura congelada nos contratos).
  - Listas fiéis: Project (`project.read/write/create/clone/export/archive/remove/settings.read/settings.write`); Filesystem (`files.read/write/create/delete/rename/move`); Terminal (`terminal.read/execute/execute_sensitive/manage_processes`); Process (`process.read/start/stop/restart/inspect`); Git (`git.read/init/branch.create/branch.switch/commit/push/pull/fetch/merge/rebase/stash/revert/reset/cherry_pick`); **Force Push separado** (`git.push` ≠ `git.force_push`); **Repository creation separada** (`git.repository.create`, pode depender de GitHub); Componentes (`component.project.read/write`, `component.global.read/write/publish/update`, `component.promote` — promoção com autorização própria); Media (`media.read/upload/write/replace/delete/global.read/global.write`; exclusão de asset referenciado pode exigir confirmação extra); Integrations (`integration.read/create/write/delete/execute/credentials.read/credentials.write` — config ≠ secrets); Secrets (`secret.exists/use/write/read` — usar ≠ visualizar valor); AI (`ai.use/read_context/read_files/write_files/create_components/create_pages/run_commands/run_tests/run_build/git_commit/git_push/deploy/autonomous`); Plugins (`plugin.read_project/write_project/execute_command/access_network/access_secrets/create_component`); Deployment (`deployment.read/configure/preview/execute/production.execute/rollback`).
  - **AI Delegation:** avalia User Permission + AI Permission + Project Policy + Operation Risk; IA não recebe permissões do usuário automaticamente (`terminal.execute` do usuário ≠ `ai.run_commands`); `ai.autonomous` não remove filesystem/command/Git/deployment policies nem approvals.
  - Plugins não herdam privilégios do usuário instalador.
  - **Policies:** Workspace (Disable Autonomous AI, Disable Force Push, Require Production Approval, Restrict Plugin Installation, Restrict External Scripts); Project (mais restritiva que Workspace prevalece quando definido); Policy Context: Identity, Workspace, Project, Environment, Resource, Provider, Operation, Risk, Time, Policy. Time-Based Permissions preparadas (futuro).
  - Cross-Workspace e Cross-Project sempre explícitos. Herança de permissões somente se explicitamente definida (Workspace → Project → Resource).
  - **Enforcement:** API valida no backend; Runtime valida comandos/writes/deletes/processos/Git/deploy; UI e IA convergem para o mesmo mecanismo (sem bypass de AI Git/terminal/deploy); `POST /protected-operation` rejeitado mesmo se recurso oculto na UI.
  - **Revogação:** permissões removidas deixam de autorizar; considerar sessões, caches, tokens, jobs; comportamento de long-running jobs após revogação a definir (Security/Jobs Model — não assumir); background AI jobs com identidade, contexto, permissões, política de revogação, resultado auditável; permission cache com escopo/expiração/revogação.
  - **Erros/negações:** explicar o suficiente (bloqueado, capacidade faltante, aprovação, política) sem expor detalhes sensíveis; erro de autorização nunca modifica recurso (sem write/Git change/deploy).
  - **Auditoria:** Who, What, Resource, Context, Decision, Result, Time (+ Approval, Policy, Provider, Environment quando aplicável); approvals registram solicitante, aprovador, quando, operação, recurso, resultado; mudanças de Role/grant/revoke/access/policy auditadas.
  - **Authorization Engine:** ponto único claro (`Authorization Context → Authorization Engine → Decision`); Policy Engine independente de UI, determinística; tecnologia decidida posteriormente com pesquisa.
  - Security over convenience; sem confiança por localização (localhost/VPS não implicam autorização); sem confiança por ferramenta (UI/terminal/IA/plugin/API/processo interno respeitam contratos).

- **Modelo de dados/entidades:** Identity (human/agent/process/internal), Permission, Resource (+scope), Role, Policy, Authorization Decision (ALLOW/DENY/REQUIRE_APPROVAL/UNKNOWN), Approval, Audit Event.

- **Permissões/roles:** ver listas acima; pergunta central: "Esta identidade está autorizada a executar esta operação, sobre este recurso, neste contexto e neste ambiente?" — nunca depende apenas de quem é o usuário.

- **Fluxos críticos:** delegação IA (User + AI permissions + policy + risk); aprovação de produção; negação sem efeito colateral.

- **Acceptance criteria (§74):** 18 itens — identificar autor; verificar Role, permissões efetivas, escopo, Project, Environment, Policy; decisão explícita; bloquear não autorizado; diferenciar AI de humano; controlar terminal, Git, deploy, secrets, plugins; registrar operações; mesmo modelo independente da origem; default deny.

- **Implicações para implementação**
  - Autorização centralizada e determinística; regras não espalhadas; precedência Allow/Deny e jobs revogados são decisões abertas da Security Architecture [ponto a definir — não inventar].
  - Pesquisa obrigatória para OAuth/OIDC, GitHub auth, browser security, filesystem/process isolation, sandboxing, secret management, policy engines, session management.

---

# SÍNTESE DO GRUPO

## 1. MVP / primeira release (conforme Feature Priorities + Feature Map)

**P0 — Foundation (construir primeiro, nesta ordem de dependência):**
1. Runtime Foundation (filesystem, processos, terminal, comandos, ambiente, build, preview, Git básico).
2. Project Import (seleção de pasta; sem modificar o projeto).
3. Project Discovery + Stack Detection (confiança, ambiguidade, correção manual, custom stack).
4. Project Model (conceitos universais sem destruir particularidades).
5. Adapter Contract (antes de suporte profundo; Core sem lógica de framework).
6. Security Foundation (identidade, auth, autorização, permissões, policies, Runtime permissions, machine identity, auditoria, operações perigosas).
7. Domain Capability Model (Project, Component, Media, Git, Runtime, AI, Deployment, Workspace).
8. Programmatic Control Plane (UI/API/CLI/AI/automação convergindo para os mesmos Domain Services; sem UI-only operations; Playwright não é control plane).
9. Git Foundation + Programmatic Git; Runtime acessível a agentes autorizados.

**P1 — Core Product:** Visual Editor, Code Editor, Component Model/Studio/Library, Media Library, Design Editing, Responsive Lab, Basic AI Engineer + Manual AI Mode, AI Programmatic Access + Tool Layer + Provider Abstraction, Luna Integration Foundation, Integrations Foundation.

**P2 (não no primeiro incremento):** editor avançado, Git avançado, component system avançado, IA autônoma, plugins, deployment engine/verification/rollback. **P3/P4:** integrations avançadas, custom adapters, SaaS/billing/marketplace — explicitamente fora do primeiro produto.

Pilares do MVP (Feature Map §26, 18 itens): Project Import, Project Intelligence, Stack Detection, Adapter Architecture, Runtime, Visual Editor, Code Editor, Component System, Component Studio, Component Library, Media Library, Design Editing, Responsive Lab, Git, AI Engine, Integrations, Security, Testing. Prioridade em conflito: integridade do projeto > segurança > compatibilidade > persistência real > Git/reversibilidade > funcionalidade > UX > otimização > automação.

## 2. Modelo de Workspace/Project e persistência

- **Workspace**: fronteira organizacional (ID estável, Name, Slug, Created At/By, State: ACTIVE/SUSPENDED/ARCHIVED/DELETING/DELETED); contém Members (Membership: Role, Permissions, Status INVITED/ACTIVE/SUSPENDED/REMOVED, Project Scope), Projects, Global Component Library, Media, Integrations, AI/Deployment Providers, Plugins, Policies, Settings, Audit. ≠ filesystem, ≠ projeto; suporta múltiplos Runtimes (local/VPS/remoto).
- **Project**: entidade própria vinculada a um Workspace (Project Binding: Workspace ID, Runtime, Source Location, Git, Configuration); identidade Git própria; estados de lifecycle multidimensionais (Project/Editor/Git/Build/Preview/Deployment independentes).
- **Persistência**: fonte de verdade = Source Project real (`Source Project → Git/Remote → Provider State → Project Model → Cache → UI`); metadata do Nexo (index, cache, adapter state, preview config) nunca substitui arquivos; "Remove from Nexo" ≠ "Delete Source Project"; salvamento em 5 etapas com falha bloqueante; commit é operação Git real (Saved ≠ Committed).
- **Ownership**: Project→Workspace; Global Component→Workspace; Project Component→Project; Workspace Provider→Workspace; Project Integration→Project; User→Platform Identity; Membership→Workspace.

## 3. Modelo de permissões em 10 bullets

1. Cadeia: Identity → Membership → Role → Effective Permissions → Resource Scope → Environment → Policy → Operation → Decision; Role sozinha nunca autoriza.
2. Decisões explícitas: ALLOW / DENY / REQUIRE_APPROVAL / UNKNOWN; **default DENY**; UNKNOWN ≠ ALLOW.
3. Roles iniciais: Owner, Admin, Developer, Designer, Editor, Viewer (hierarquia apenas conceitual); Custom Roles futuras sem alterar o Core.
4. Permissões por domínio: `workspace.* project.* files.* terminal.* process.* git.* component.* media.* integration.* ai.* deployment.* plugin.* user.* audit.* settings.*`.
5. Escopo explícito: Workspace, Project, Environment (Dev/Preview/Staging/Production), Provider — permissão no Project A não vale para o B.
6. Operações de alto risco separadas: `git.force_push` ≠ `git.push`; `git.repository.create`; `deployment.production.execute`; `component.promote`; secrets (`secret.use` ≠ `secret.read`); integration config ≠ credentials.
7. Approval Model distingue "permission to request" de "permission to execute" (ex.: deploy de produção exige aprovação de Admin/Owner).
8. IA tem permissões próprias (`ai.*`), não herda do usuário; modo autônomo (`ai.autonomous`) não remove policies nem approvals; IA nunca eleva privilégios; identidade de agente separada (Requested By vs Executed By).
9. Enforcement no ponto de execução: API backend e Runtime validam; esconder botão/terminal na UI não é segurança; UI e IA convergem para o mesmo mecanismo sem bypass; negação nunca modifica recurso.
10. Auditoria obrigatória de toda operação sensível (Who/What/Resource/Context/Decision/Result/Time + Approval/Policy/Provider/Environment); revogação efetiva (sessões, caches, tokens, jobs — comportamento de jobs longos ainda em aberto na Security Architecture).

## 4. Os 5 fluxos mais críticos para o primeiro incremento (Select Folder → Scan → Detection → Model → Open)

1. **Select Folder / Import (Jornada C; PR §4; Lifecycle IMPORTING)** — `New Project → Select Folder → Filesystem Access → Project Scanner`; importação não modifica o projeto, não instala dependências, não converte; associa projeto a um Workspace e a um Runtime; cria Project Identity.
2. **Scan / Project Discovery (P0; Lifecycle DISCOVERING/ANALYZING)** — Project Scanner + File System Intelligence indexam estrutura, arquivos relevantes, dependências, rotas, componentes, assets, scripts, Git; análise preferencialmente não destrutiva; profundidade proporcional à operação.
3. **Detection (Stack/Git/Build Detection; P0)** — detecta linguagem, framework, styling, package manager, build tool, scripts, Git, rotas, componentes, configs **com níveis de confiança**; Git Detection (repo, branch, remotes, working tree, sync); Build/Dev command Detection (nunca assumir `npm run dev`); comando de dev/build vem da detecção ou configuração.
4. **Review → Confirm → Model (Jornadas C/D; Lifecycle REVIEW_REQUIRED → READY)** — Analysis Summary exibida (Project, Path, Stack, Framework, Language, Styling, Package Manager, Build/Dev Command, Git Status, Confidence, Warnings, Unsupported Areas); usuário confirma/corrige/complementa (modo custom; manual confirmado prevalece; reversível); desconhecimento explícito; REVIEW_REQUIRED quando ambíguo; stack não suportado → explain + manual config + custom adapter + Restricted Mode ou Cancel (nunca fingir suporte); então constrói/registra o **Project Model** (Project, Route, Page, Component, Asset, Style, Dependency, Script, Build, Integration, Git, Environment) e inicializa metadata (index, cache, adapter state, preview config).
5. **Open Project (Jornadas C/E; Lifecycle READY/ACTIVE)** — projeto aberto como Project Workspace com estado inicial de compreensão; reabertura verifica filesystem/Git/processos/config/Project Model/mudanças externas e reanalisa só o necessário (Refresh Required Intelligence); tudo executável também programaticamente via Control Plane (mesma Domain Capability para UI/AI/CLI), com autorização e auditoria em cada etapa.
