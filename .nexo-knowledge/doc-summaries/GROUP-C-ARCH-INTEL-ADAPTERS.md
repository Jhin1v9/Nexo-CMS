# GROUP C — ENGINEERING: ARQUITETURA, PROJECT INTELLIGENCE, ADAPTERS, ENGINE, APPLICATION

Escopo: `01-SYSTEM-ARCHITECTURE` (ARQUITETURE 01.md), `02-PROJECT-INTELLIGENCE` (NEXO PROJECT INTELIGENCE 02.md), `03-ADAPTER-SYSTEM` (NEXO CMS ADAPTERS.md), visão de produto do `Nexo Engine` e visão da `Nexo CMS Application`.

---

## 01-SYSTEM-ARCHITECTURE (ARQUITETURE 01.md)

- **Responsabilidade e fronteiras**
  - Faz: define a arquitetura estrutural do Nexo CMS como "plataforma de engenharia programável para projetos web reais"; estabelece 8 camadas conceituais: (1) Experience, (2) Entry Point, (3) Application, (4) Domain, (5) Intelligence/Adapter, (6) Infrastructure, (7) Runtime, (8) External Resource.
  - Fluxo fundamental: `CONSUMER → ENTRY POINT → AUTHENTICATION → AUTHORIZATION/POLICY → APPLICATION CAPABILITY → DOMAIN OPERATION → ADAPTER/PROVIDER/RUNTIME → REAL RESOURCE`.
  - NÃO faz: não define protocolo de API final (delegado a `06-CONTROL-PLANE-AND-AGENT-API.md`); não define storage (delegado a `14-WORKSPACE-AND-STORAGE.md`); não escolhe stack tecnológica nem ferramenta de monorepo (§50, §51); não autoriza seleção arbitrária de tecnologias.
  - NÃO é: editor visual de sites, frontend de CMS, chatbot, substituto de IDE, coleção de ferramentas soltas.

- **Stack e tecnologias mandatórias**
  - **[NÃO ESPECIFICADO NO DOC]** — nenhuma linguagem, runtime, framework, banco de dados ou versão é definida. O doc proíbe explicitamente a escolha arbitrária (§51 "Technology Selection Rule") e exige processo: inspecionar requisitos → identificar opções → verificar documentação oficial atual → verificar compatibilidade → avaliar manutenção/segurança → documentar decisão → só então implementar.
  - Únicas tecnologias nomeadas são **alvos de suporte (projetos dos usuários), não stack do Nexo**: frameworks Next.js, React, Vue, Nuxt, Svelte, SvelteKit, Astro, Vite, HTML/CSS/JS; styling Tailwind, CSS Modules, styled-components, CSS Variables, Plain CSS (§22).
  - Playwright citado apenas como permitido para testes UI/E2E/visual regression — **proibido** como plano de controle interno (§5, §56.4).

- **Estrutura de módulos/pastas** (§50 — proposta, não mandato de ferramenta)
  ```text
  nexo-cms/
  ├── apps/ (cms/, runtime/)
  ├── packages/ (core, project, intelligence, adapters, runtime, components,
  │   media, design, responsive, git, ai, integrations, deployment, security,
  │   control-plane, workspace, shared)
  ├── adapters/
  ├── tests/
  └── docs/
  ```

- **Contratos**
  - Identificadores conceituais de capability (§11): `project.create|import|open|analyze|read|write|refresh|clone|export|archive|remove`; `component.detect|create|read|update|delete|promote|publish`; `media.list|upload|read|update|replace|delete`; `git.status|branch|commit|push|pull|fetch|merge|rebase|stash|revert|reset`; `runtime.command|process|build|test|preview`; `ai.task|plan|execute|validate`; `deployment.preflight|deploy|verify|rollback`. Schemas request/response autoritativos ficam no Control Plane spec.
  - Eventos (§37): `project.created`, `project.updated`, `component.created`, `component.updated`, `git.committed`, `build.completed`, `deployment.completed`, `ai.task.completed` — contratos explícitos obrigatórios.
  - Job mínimo (§38): ID, Type, Owner, Context, Status, Result, Error, Started At, Completed At.
  - Resultado de comando Runtime (§24): Command, Arguments, Exit Code, Stdout, Stderr, Status, Started/Finished At, Process Identifier, Cancellation State.
  - Erros estruturados (§39): ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, UnsupportedError, AdapterError, RuntimeError, ProviderError, BuildError, GitError, DeploymentError.
  - Resultados distinguem: Success / Failure / Partial / Blocked / Pending (§62).
  - Toda capability pública/machine-facing exige: contrato, authn, authz, input schema, output schema, error model, state model, versioning policy (§8).

- **Capabilities expostas**: paridade humano↔máquina (§4, §29) — qualquer operação humana tecnicamente automatizável deve ter equivalente programático; identidades de máquina com identity/authn/authz/permissions/audit/scope próprias (§30).

- **Dependências**
  - Depende de: Human Manifest, Vision, Product Principles, Non-Goals, Glossary, Core Invariants (docs fundacionais); documentos posteriores (06 Control Plane, 14 Workspace/Storage, Testing spec).
  - Quem depende dele: todo o K3 Agent Swarm (§71 — é a fronteira arquitetural de sistema); 02-PI e 03-Adapters mandam ler este doc antes de implementar.

- **Invariantes e regras não-negociáveis**
  - "One domain capability, many authorized consumers" (§73) — proibida duplicação de lógica por consumidor.
  - Direção de dependência proibida: Runtime/Adapter/Infrastructure/Domain/Provider → UI (§13).
  - Browser nunca é dono oculto da lógica nem fronteira de segurança; localhost não é confiança automática (§67, §68).
  - Source Project é a fonte de verdade primária; metadata Nexo nunca sobrescreve silenciosamente (§18, §19, §56.8).
  - Nunca sobrescrever modificações externas silenciosamente; detect→invalidate→refresh→reconcile (§21).
  - Botão escondido/desabilitado nunca é segurança suficiente; autorização em execution boundaries (§31).
  - Secrets nunca em logs/diffs/AI context/erros/audit/previews (§45).
  - Nunca reportar `success: true` em conclusão parcial; nunca alegar atomicidade falsa (§40, §41).
  - Monólito modular aceito; microservices prematuros proibidos (§6, §49).
  - Runtime local e remoto devem ser suportados sem o Domain saber a diferença (§66).
  - Anti-patterns proibidos (§56): UI-owned/AI-owned/CLI-owned business logic; browser-controlled Nexo; framework leakage no Core; runtime leakage; provider leakage (chamada direta OpenAI/Vercel API sem boundary); metadata como fonte de verdade; hidden global state; giant core service.

- **Ordem de implementação**
  - Implícita: fronteiras e contratos antes de subsystems; §52 exige pesquisa externa (ordem de fontes: Official Docs → Official Spec → Official Repo → Primary Source → Secondary) antes de codar; §70/§71: agente deve responder 12 perguntas (camada, domínio, contrato, adapter, runtime, identidade, permissão, entry point, resultado, falha, validação, auditoria) antes de implementar.

- **Acceptance criteria / validação** (§54, §55, §72)
  - 20 critérios em §72 (UI sem lógica de domínio; API/CLI sem duplicação; AI opera programaticamente; Playwright não necessário para controle interno; Runtime isolado; framework logic em adapters; providers com boundary; Source Project autoritativo; Git real; authz em execution boundaries; secrets fora de logs/AI context; Jobs para operações longas; falhas parciais explícitas; invalidação de contexto stale; múltiplos consumidores; extensibilidade de adapters/providers; runtime local+remoto; sem microservices prematuros).
  - Propriedades A–J (Domain Independence, Programmatic Control, AI Control, Adapter Isolation, Runtime Isolation, Project Integrity, Security Enforcement, Provider Independence, Failure Visibility, External Change Safety).
  - Testes por fronteira (§57) e contract testing entre subsistemas (§58); fixture projects obrigatórios para validar adapters e PI (§59).

- **[AMBIGUO]/[DESCONHECIDO]**
  - Protocolo de API (HTTP/REST, RPC, GraphQL ou outro) — decisão adiada (§32).
  - Stack de implementação inteira — [NÃO ESPECIFICADO NO DOC].

---

## 02-PROJECT-INTELLIGENCE (NEXO PROJECT INTELIGENCE 02.md)

- **Responsabilidade e fronteiras**
  - Faz: responde "O que é este projeto, como é estruturado, quais tecnologias usa e o que o Nexo pode fazer com segurança?". Pipeline: SELECT SOURCE → VALIDATE LOCATION → SCAN FILESYSTEM → IDENTIFY PROJECT ROOT → DETECT TECHNOLOGIES → VERSIONS → PACKAGE MANAGER → BUILD/DEV/TEST COMMANDS → GIT → ROUTES → PAGES/LAYOUTS → COMPONENTS → STYLES → ASSETS → BUILD PROJECT MODEL → BUILD PROJECT GRAPH → CALCULATE SUPPORT/CONFIDENCE → PERSIST NEXO METADATA → PROJECT READY / REVIEW REQUIRED / PARTIALLY SUPPORTED (§3).
  - NÃO faz: não modifica arquivos, não migra framework, não instala deps, não faz git init, não reescreve config, não gera componentes (discovery é análise, §4); não embute comportamento de adapters (§74: PI descobre, Adapter explica o que fazer); não implementa source map (pertence ao Editor spec, §68); não executa Git mutation durante discovery (§76); não indexa `node_modules` como fonte semântica (§63).

- **Stack e tecnologias mandatórias**
  - Stack do próprio Nexo: **[NÃO ESPECIFICADO NO DOC]**.
  - Tecnologias-alvo de detecção (projetos analisados): Next.js, React, Vue, Nuxt, Svelte, SvelteKit, Astro, Vite, HTML/CSS/JS (§21); styling: Tailwind, CSS Modules, styled-components, Emotion, CSS Variables, Plain CSS, SCSS/Sass, PostCSS, Utility Classes, Inline Styles, Mixed, Unknown (§22); package managers: npm, pnpm, yarn, bun (§18); testes: vitest, jest, playwright, cypress (§25); lint/typecheck: eslint, prettier, tsc, vue-tsc, svelte-check (§26); parsers preferidos: AST, JSON parser, CSS parser, framework parser, manifest parser (regex só para heurística limitada, §67); encoding default UTF-8 (§66).
  - Arquivos-sinal de root (§6): package.json, pnpm-workspace.yaml, yarn.lock, package-lock.json, bun.lock/bun.lockb, vite.config.*, next.config.*, nuxt.config.*, astro.config.*, svelte.config.*, tsconfig.json, jsconfig.json, Cargo.toml, pyproject.toml, composer.json, Gemfile, go.mod, index.html, .git.
  - Indicadores de monorepo (§7): workspaces, pnpm-workspace.yaml, lerna.json, turbo.json, nx.json, múltiplos package.json, apps/, packages/, services/.

- **Estrutura de módulos/pastas**: não especificada para o próprio código; define a estrutura do **Project Model** (§50):
  ```text
  Project ├── Identity ├── Source ├── Stack ├── Adapters ├── Runtime
  ├── Package Manager ├── Build ├── Development ├── Tests ├── Git
  ├── Routes ├── Pages ├── Layouts ├── Components ├── Styles ├── Assets
  ├── Integrations └── Diagnostics
  ```
  (schema de serialização exato fica para contratos futuros de project-model).

- **Contratos**
  - Confidence (§15): `CONFIRMED | HIGH | MEDIUM | LOW | UNKNOWN` (representação exata implementation-defined).
  - Detection Evidence (§16): Technology + lista de evidências (ex.: "next dependency in package.json", "next.config.js detected", "app/ directory detected").
  - Versões (§17): distingue Declared / Resolved / Installed.
  - Suporte do projeto (§44): `FULLY_SUPPORTED | PARTIALLY_SUPPORTED | DETECTED_BUT_UNSUPPORTED | UNKNOWN | CUSTOM`.
  - Compatibilidade de adapter (§48): `Compatible | Partially Compatible | Conflict | Unsupported | Unknown`.
  - Config automática vs manual (§45/§46): `Detected Value | User Confirmed Value | User Override | Unknown` — persistidas separadamente; override de usuário prevalece até invalidação documentada.
  - Estados do ciclo de análise (§56): `NOT_ANALYZED | SCANNING | ANALYZING | READY | PARTIAL | REVIEW_REQUIRED | FAILED | STALE` (enum interno pode diferir; semântica deve permanecer).
  - Analysis Job (§57): Job ID, Progress (quando mensurável — proibido fingir %), Current Phase, Status, Result, Warnings, Errors.
  - Classificação de arquivos (§13): Source, Configuration, Dependency Manifest, Lockfile, Style, Asset, Documentation, Generated, Test, Build Output, Git Metadata, Unknown; Source vs Generated (§62): Source, Generated, Dependency, Metadata, Build Artifact, Unknown.
  - Tipos de projeto (§43): Web Application, Static Website, Component Library, Monorepo, Package, Backend Service, Full-stack Application, Documentation Site, Unknown (classificação informativa, não limita operações).
  - Project Identity (§51): Nexo Project ID ≠ Source Path ≠ Git Repository ID; inclui Workspace ID e Project Name.
  - Project Fingerprint (§52): Project Root + Key Configuration Hash + File Metadata + Repository Identity + Selected File Hashes — proibido depender só de timestamp.
  - Scanner coleta no mínimo (§9): Path, Type, Size, Extension, Modification Time, Relative Path, Parent, Hash quando requerido.

- **Capabilities expostas**
  - `project.analyze` (conceitual), full re-scan, incremental re-analysis, change detection (filesystem watcher, git status, manual refresh, external command, project reopening, runtime restart), reconciliation, AI context preparation (task-relevant, minimal — nunca dump do repo inteiro, §69/§70).
  - Fluxos nomeados: Project Opening (§79: Load Registration → Check Source Location → Check Fingerprint → Check Git → Determine Staleness → Refresh → Open); Branch Switching (§80); Clone (§81 — nova identidade Nexo, re-detect Git, re-scan, review secrets); Export (§82 — exporta Source Project, não o model interno); Removal (§83 — "Remove from Nexo" ≠ "Delete Source Project").

- **Dependências**
  - Depende de: Runtime (filesystem/command capabilities como fronteira de acesso, §5, §75), Adapters (route/layout detection adapter-driven, §29–31; adapter selection/compatibility §47–48), Git (leitura apenas, §76), persistência Nexo (§77), 01-SYSTEM-ARCHITECTURE e Core Invariants.
  - Quem depende dele: Editor, Engine, AI (contexto), Adapter Manager/Resolution, UI (stack confirmation).

- **Invariantes e regras não-negociáveis**
  - "Observe → Understand → Model → Verify → Then Modify" (§88); nunca tratar projeto desconhecido como conhecido (§1); unknown nunca vira fato assumido silenciosamente.
  - Discovery não-destrutivo por default; erro isolado de um arquivo não aborta o scan (§60); warnings separados de erros fatais (§58/§59).
  - Ambiguidade de root: só seleciona com confiança suficiente, senão pede confirmação (§8); múltiplos package managers = conflito detectado, não seleção silenciosa (§19).
  - Não assumir `npm` por existir package.json; não assumir `npm run build` universal (§18, §23).
  - Secrets (.env, keys, tokens): detectar presença/nomes, nunca colocar valores em model/AI context/logs/audit (§40, §71).
  - Não inventar regras de detecção (§73): regra só com doc oficial, evidência de projeto, source oficial ou fixture validado; marcar incerteza quando houver.
  - Assets remotos ≠ assets locais (§38); symlinks com política explícita, não seguir cegamente (§11); exclusões technology-aware, não por nome comum (§10).

- **Ordem de implementação** (§85): ler este doc → 01-ARCH → Core Invariants → Adapter spec → Runtime spec → inspecionar fixture/projeto real → inspecionar versões instaladas → pesquisar docs oficiais → implementar detecção com evidência → testes positivos/negativos/ambíguos.

- **Acceptance criteria / validação**
  - 22 critérios em §84 (análise sem modificação; root identificado/confirmado; monorepo detectado; stack com evidência+confidence; versões reais; package managers; comandos build/dev/test ou unknown explícito; Git sem mutação; rotas via adapters; componentes com confidence; estilos sem forçar um sistema; assets indexados; Project Model e Graph representam estrutura; unknown/unsupported explícitos; invalidação por mudança externa; full re-scan; incremental; sem vazamento de secrets; AI context estruturado; projeto inalterado após discovery).
  - Categorias de teste obrigatórias (§86): simple project, monorepo, multiple package managers, unknown/known framework, mixed styling, missing/malformed config, missing Git, Git no diretório pai, modificações externas, diretórios gerados, projetos grandes, assets binários, arquivos desconhecidos, custom stack, suporte parcial de adapter, diferenças de versão.
  - Fixtures reais/representativos (§87) que não contradigam comportamento oficial do framework.

- **[AMBIGUO]/[DESCONHECIDO]**
  - Schema de serialização do Project Model — adiado para contratos futuros (§50).
  - Representação exata de confidence e do enum de estados — implementation-defined (§15, §56).
  - Política de symlinks — deve ser definida pela implementação, compatível com OS/Runtime (§11).

---

## 03-ADAPTER-SYSTEM (NEXO CMS ADAPTERS.md)

- **Responsabilidade e fronteiras**
  - Faz: responde "Como o Nexo executa uma operação universal corretamente dentro desta tecnologia específica?". Core entende conceitos (Page, Route, Component, Style, Asset, Build, Project, Dependency); Adapters entendem implementações tecnológicas (§2–3).
  - Responsabilidades possíveis (§4): detection, version compatibility, interpretação de estrutura/rotas/páginas/componentes/estilos/build/dev-server/testes/dependências, criação e modificação de componentes, transformação de source, validação, capability declaration.
  - NÃO faz (§5): não possui users, workspace membership, regras globais de autorização, billing, audit policy, AI policy global, deployment approval, navegação de produto, UI state, permissões de projeto Nexo-wide. Adapter não é autoridade de segurança (§51).

- **Stack e tecnologias mandatórias**
  - Stack do Nexo: **[NÃO ESPECIFICADO NO DOC]** (§12: "a interface exata de linguagem depende do stack escolhido").
  - Framework targets iniciais (§8): Next.js, React, Vue, Nuxt, Svelte, SvelteKit, Astro, Vite, HTML/CSS/JavaScript.
  - Styling (§9): Tailwind CSS, CSS Modules, styled-components, CSS Variables, Plain CSS, SCSS/Sass.
  - Package managers (§11): npm, pnpm, yarn, bun.
  - Set inicial recomendado (§61): frameworks Next.js, React, Vue, Svelte, Astro, HTML/CSS/JS; suporte TypeScript, Tailwind CSS, CSS Modules, styled-components, Plain CSS, npm, pnpm, yarn, bun.
  - Mecanismos de transformação (§37): AST, Parser, Structural Transformation, Framework Compiler API, Targeted Source Transformation — **string replacement proibido como estratégia universal**.

- **Estrutura de módulos/pastas**
  - Categorias de adapter (§7): Framework, Language, Styling, Build, Package Manager, Test, Runtime Adapter — não exige implementação separada por categoria; fronteira definida por responsabilidade.
  - Adapter Registry (§47): built-in, custom e plugin-provided adapters, versões, compatibilidade.

- **Contratos**
  - Adapter Contract base (§12): `detect()`, `getIdentity()`, `getVersion()`, `getCapabilities()`, `analyze()`, `validate()`; capability-specific: `findRoutes()`, `findPages()`, `findComponents()`, `findStyles()`, `createComponent()`, `updateComponent()`, `createPage()`, `updatePage()`, `build()`, `test()`.
  - Adapter Identity (§13): `id, name, category, version, adapterVersion, supportedProjectVersions, capabilities`. Adapter Version ≠ Project Version (§14).
  - Capability Levels (§16): `FULL | PARTIAL | READ_ONLY | EXPERIMENTAL | UNSUPPORTED`.
  - Detection Contract (§17): Detected Technology, Confidence, Evidence, Detected Version, Compatibility.
  - Framework Adapter Contract (§25): `detect, getVersion, findRoutes, findPages, findLayouts, findComponents, createPage, updatePage, createComponent, updateComponent, validate`.
  - Styling Adapter Contract (§26): `detect, getSystem, findStyles, findTokens, findVariables, readStyle, updateStyle, createStyle, validate`.
  - Build Adapter Contract (§27): `detect, getBuildCommand, getDevelopmentCommand, getPreviewCommand, getOutput, validateEnvironment`.
  - Package Manager Adapter Contract (§28): Manager, Version, Lockfile, Install/Add/Remove/Run Script Commands (sintaxe verificada contra versão instalada).
  - Test Adapter Contract (§29): Test Runner, Unit/Integration/E2E Commands, Configuration, Test Discovery; distinguir "tipo de teste não suportado" de "teste inexistente".
  - Adapter Failure states (§42): `AVAILABLE | PARTIAL | UNSUPPORTED | ERROR | INCOMPATIBLE`.
  - Adapter Result (§54): Result (SUCCESS...), Files Changed, Warnings, Diagnostics, ReanalysisRequired; falhas também estruturadas. Diagnostics (§55): `WARNING | ERROR | UNSUPPORTED | CONFLICT | DEPRECATED`.
  - Adapter Transactions (§56): declarar `Atomic | Staged | Best Effort | Partially Recoverable`.
  - Adapter Context (§52–53): invocação sempre com `Workspace → Project → Adapter → Operation`; contexto estruturado mínimo (Project Root, Project Model, Graph, Stack, Version, Configuration, Relevant Files, Runtime Capabilities) — sem estado global irrestrito.

- **Capabilities expostas**
  - Adapter composition (§6): múltiplos adapters simultâneos (ex.: Next.js + TypeScript + Tailwind + pnpm).
  - Adapter Selection (§19): Project Intelligence → Detected Technologies → Compatibility Evaluation → Adapter Resolution → Active Adapter Set; resolução determinística de conflitos (confidence → specificity → user config → compatibility → user input, §20).
  - Manual override (§21): Automatic Detection / User Confirmation / User Override.
  - Custom Adapters (§22–23): para frameworks não suportados/convenções proprietárias; devem implementar os contratos oficiais sem modificar o Core.
  - Capability Negotiation (§50): determinar antes da mutação se o adapter suporta a operação; falhar antes de mutar quando incompatível.
  - Adapter Discovery (§46): metadados ID, Name, Category, Supported Versions, Capabilities, Adapter Version, Status.
  - Plugin-provided adapters (§49): mesmo contrato dos built-ins, sem code path especial no Core.

- **Dependências**
  - Depende de: Project Intelligence (input de seleção), Runtime (execução — adapter descreve o comando, Runtime executa; §30), Security spec (loading: identity, version, contract compatibility, permissions, integrity, dependencies; §48), Git Domain (commit é operação explícita separada, §58).
  - Quem depende dele: Component Domain (§33), Page System (§34), Engine, UI (exibe capabilities reais, §60), AI (via domain capabilities, §59).

- **Invariantes e regras não-negociáveis**
  - Detecção nunca muta (§18): sem rewrite, install, git modification, config migration.
  - Adapter nunca declara capability que não consegue implementar com confiabilidade (§12, §15); nunca executa operação unsupported como se fosse full (§42); nunca assume compatibilidade futura de versão (§43).
  - Adapter não faz bypass de autorização/Runtime/Git; não acessa secrets desnecessariamente; não modifica arquivos fora do escopo do projeto; não instala deps silenciosamente (§51).
  - Styling Preservation Rule (§69): modificar usando a linguagem de estilo existente do projeto; migração (CSS Modules→Tailwind, React→Vue) é operação separada e explícita, nunca efeito colateral (§70).
  - Adapter nunca commita automaticamente (§58); mutação dispara re-análise (§57: Persist → Re-scan → Update Model → Update Graph → Validate).
  - Preservar formatação do projeto (indentação, quotes, semicolons, trailing commas, line width, naming, import ordering; usar tooling do projeto, §38); lint/typecheck do próprio projeto após modificações (§39).
  - Não adicionar dependência sem razão técnica explícita (§40); instalação via Application/Domain → Authorization → Package Manager Adapter → Runtime (§41).
  - No-Hallucination Rule (§74): comportamento incerto → inspecionar projeto → versão instalada → doc oficial → source oficial → fixture → implementar; se persistir dúvida: UNKNOWN/UNSUPPORTED.
  - Pesquisa de documentação oficial obrigatória para comportamento version-dependent (§44–45).
  - Regras por adapter (§62–67): HTML/CSS/JS = baseline honesto (não fingir entender JS arbitrário); React ≠ Next.js (Next.js adapter detém comportamento de framework, React fornece semântica de componente compartilhada); Nuxt > Vue adapter; SvelteKit > Svelte adapter; Astro distingue components e islands; Next.js version-aware, distingue modos de routing conforme detectado.

- **Ordem de implementação** (§61, §73)
  - Priorizar set inicial (Next.js, React, Vue, Svelte, Astro, HTML/CSS/JS + TS/Tailwind/CSS Modules/styled-components/Plain CSS + npm/pnpm/yarn/bun); tecnologias adicionais só após contratos validados.
  - Protocolo K3 (15 passos): ler docs (este + 01 + 02) → identificar tecnologia e versão reais → inspecionar projeto/deps/config → doc oficial da versão → definir evidências e capabilities → implementar apenas o verificável → fixtures → validar positivo/negativo → validar mutações → validar não-bypass de Security/Runtime → registrar limitações.

- **Acceptance criteria / validação**
  - 17 critérios (§72): isolamento do Core, coexistência de categorias, sem duplicação de conhecimento tecnológico, capabilities explícitas, unsupported explícito, compatibilidade por versão real, override manual, custom adapters sem mudar Core, uso de Runtime e Security, re-análise pós-mutação, sem auto-commit, preservação de styling, sem adivinhação de comportamento, pesquisa de docs, fixtures, AI via domain capabilities.
  - Adapter Test Matrix (§71): Detection, Version Detection, Compatibility, Project Scan, Routes, Pages, Components, Styles, Assets, Build, Dev Server, Tests, Component Creation/Update, Page Creation, Validation, Failure Conditions — com exemplos válidos e inválidos.

- **[AMBIGUO]/[DESCONHECIDO]**
  - Linguagem/assinatura exata das interfaces — adiada ("depende do stack escolhido", §12).
  - Mecanismo de segurança de loading — definido no Security spec (§48).

---

## Nexo Engine (visão de produto)

- **Responsabilidade e fronteiras**
  - Faz: núcleo lógico — "O que o Nexo sabe fazer com um projeto?"; concentra capacidades de domínio e base comum para UI, API, CLI, AI Agents, automações, plugins, integrações, jobs.
  - NÃO é (§1, §4–9): UI (sem dependência de React da UI, DOM, cliques, Playwright interno); Runtime (não executa `fs.writeFile`, `child_process.spawn`, processo git, network request diretamente); Adapter (sem conhecimento profundo de Next.js/Vue/Tailwind etc.); AI Engine (Engine funciona sem provider de IA; AI Engine usa o Engine, não o contrário); Storage (coordena comportamento, não persiste); Deployment (coordena preflight/build/deploy/verification/rollback via componentes).

- **Stack e tecnologias mandatórias**: **[NÃO ESPECIFICADO NO DOC]** (doc conceitual; menciona apenas `fs.writeFile`/`child_process.spawn` como exemplos do que o Engine NÃO deve chamar — implica ambiente Node.js como contexto, mas não decide stack).

- **Estrutura de módulos/pastas**: serviços modulares com responsabilidade única (§66): `ProjectService`, `ComponentService`, `MediaService`, `GitService`, `DeploymentService` (exemplos; estrutura final depende de necessidades reais). Domínios conceituais (§11): Project, Project Intelligence, Component, Media, Design, Responsive, Git, Runtime, AI, Integration, Workspace, Deployment, Plugin, Audit.

- **Contratos**
  - Capacidades Project (§12): `project.create|import|open|read|update|analyze|clone|export|archive|remove|refresh`.
  - Git (§23): `git.status|init|branch|commit|push|pull|fetch|merge|rebase|stash|reset|revert|cherryPick|history|diff` (conjunto final no Git spec).
  - Runtime capabilities (§25): `filesystem.read|write|delete`, `process.start|stop`, `command.execute`, `build.run`, `preview.start`.
  - Providers via contratos (§29): AI, Deployment, Git Remote, Storage, Authentication — sem autoridade sobre o domínio.
  - Context Freshness (§16): `FRESH | STALE | UNKNOWN | INVALID`.
  - Jobs (§38): Job ID, Type, Owner, Context, Status, Progress, Started/Completed At, Result, Error.
  - Eventos (§39): `project.created|updated`, `component.created|updated`, `git.committed`, `build.completed`, `deployment.completed`, `ai.task.completed` — payloads por contrato.
  - Erros (§41): ValidationError, AuthorizationError, NotFoundError, ConflictError, UnsupportedError, AdapterError, RuntimeError, ProviderError, BuildError, GitError, DeploymentError (nomes finais em Error Contracts).
  - Commands/Queries opcionais (§35–36): `CreateProjectCommand`, `UpdateComponentCommand`, etc.; `GetProject`, `GetProjectStatus`, `GetComponent`, `GetGitStatus`, `GetCapabilities` — apenas se houver benefício real.
  - Audit context (§48): Actor, Project, Workspace, Operation, Resource, Result, Timestamp.

- **Capabilities expostas**: operações de domínio consistentes, regras centrais, validação de contexto, invariantes, integração com adapters/Runtime/providers, estados explícitos, erros estruturados, execução auditável, composição de operações (§10). Fluxos: Component Operation (§19: Resolve Project → Component → Adapter → Validate → Transform → Persist → Re-analyze → Validate Result); Deployment (§28); validação pré-condição (§43) e pós-operação (§44: Write → Read Back → Parse → Build/Test → Confirm).

- **Dependências**
  - Depende de: Runtime (capacidades, não implementações — §26), Adapters (seleção por stack/versão/config/compatibilidade/estado, §54), Project Intelligence (freshness), Providers, Security (autorização antes de filesystem write/command/git mutation/deploy/secret access, §33).
  - Quem depende dele: UI, API, CLI, AI Engine, automações, plugins, jobs.

- **Invariantes e regras não-negociáveis**
  - Programmatic Parity (§68) e Agent Capability (§69): mesma capacidade para UI/AI/CLI; IA nunca via DOM/Playwright quando existe capacidade programática.
  - Autorização antes da execução, não depois (§33); conflitos nunca resolvidos silenciosamente (§42); falha parcial nunca reportada como SUCCESS (§46); idempotência favorecida para create/publish/deploy/jobs/webhooks (§47).
  - Não criar Mega-Engine (§65), nem abstração antecipada (§64), nem camadas sem consumidor/contrato/motivo; Core pequeno e estável (§63).
  - Não assumir Git clean sem verificar (§58); não prosseguir com contexto stale em operações complexas (§16, §56); Engine não depende de internet em runtime para saber como framework funciona (§60).
  - Falha de provider não pode destruir estado local do projeto (§30).

- **Ordem de implementação** (§77): ler este doc → Core Architecture → identificar domínio → doc do domínio → Core Invariants → Security/Permissions → contratos afetados → entry points programáticos → estados/erros → pesquisa externa. Mudanças arquiteturais devem ser registradas, nunca silenciosas.

- **Acceptance criteria / validação** (§78): 20 critérios — boundaries claras, sem dependência de UI/Playwright, acesso programático e por IA, authorization, adapters/Runtime usados corretamente, Source Project preservado, integrações Git/Component/Media/AI/Deployment, estados, erros, partial failure, auditoria, testes de domínio, extensibilidade. Testes de domínio para cenários: Permission denied, Project not found, Adapter unavailable, Runtime failure, External modification, Success, Partial failure (§73); fixtures para operações de stack (§74).

- **[AMBIGUO]/[DESCONHECIDO]**: nomes técnicos finais de erros (Error Contracts), implementação de Jobs (Job/Runtime spec), uso de commands/queries (opcional).

---

## Nexo CMS Application (visão da aplicação)

- **Responsabilidade e fronteiras**
  - Faz: camada de experiência — interface principal, ambiente visual de trabalho, navegação entre projetos, inspeção de estados, editor visual, acesso visual a código, Component Studio, Media Library, Git UI, AI UI, configuração, aprovações, observabilidade para o usuário.
  - NÃO faz (§4): não é fonte única de lógica de domínio; não implementa Runtime; não compreende frameworks diretamente; não implementa lógica de adapters; não executa comandos de sistema; não implementa providers; não é mecanismo exclusivo de controle; não substitui Engine, Git ou projeto real. Consome capacidades, não as reinventa (§5).

- **Stack e tecnologias mandatórias**
  - **Única tecnologia nomeada como decisão de UI**: **Lucide** para iconografia (ou ícones próprios / SVGs personalizados) — emojis/símbolos textuais proibidos como ícones (§53).
  - Restante da stack UI (framework, biblioteca de componentes): **[NÃO ESPECIFICADO NO DOC]** — §56 diz que Button/Modal/Dialog/Dropdown/Tabs/Panel/Inspector/Tree/Table/Toast/Command Palette "devem utilizar uma biblioteca ou sistema consistente definido posteriormente"; Design System do Nexo define valores concretos de cor (§54); navegação final definida por spec de UI/UX (§20).

- **Estrutura de módulos/pastas**: não física; navegação conceitual (§20): Project → Overview, Pages, Components, Media, Design, Responsive, Git, AI, Integrations, Terminal, Preview, Deploy, Settings.

- **Contratos**
  - Estados da aplicação (§12): `Loading, Ready, Saving, Saved, Unsaved, Validating, Building, Previewing, Deploying, Error, Conflict, Blocked` — devem representar operações reais; nunca mostrar `Saved` antes da persistência real.
  - Estado visual ≠ estado do projeto (§13): Selected Element/Open Panel/Viewport/Active Tab ≠ Project/Git/Deployment/Source State.
  - AI Activity states (§33): `Requested, Planning, Executing, Validating, Waiting Approval, Completed, Failed, Cancelled` — progresso derivado do estado real, nunca inventado.
  - Stack Confirmation (§47): `Detected, Confirmed, Manual, Unknown, Unsupported, Partial`.
  - Provider status (§68): `Available, Unavailable, Not Configured, Unauthorized, Error`.
  - Settings por escopo (§66): User / Workspace / Project / Environment / Provider; Data Ownership (§67): Global / Workspace / Project / External Provider.
  - Linguagem visual (§54): tokens semânticos Primary, Surface, Background, Border, Text, Muted, Success, Warning, Error, Info.
  - Roles de UI (§51): Owner, Admin, Developer, Designer, Editor, Viewer — comportamento depende de permissões efetivas.

- **Capabilities expostas**: Editor Visual (seleção, Inspector dinâmico baseado em capabilities reais — §15–17), Code View (arquivos reais, diff, §18), Visual↔Code via Source Mapping quando confiável (§19), File View + Semantic View alternáveis (§22–24), Component Studio/Library, Media Library com "Used By" (§27–28), Design Editor, Responsive Lab, Git UI completa, AI UI manual/autônoma com aprovação (§32–35), Agent Access admin (§36), Capability Explorer futuro (§38), Terminal UI, Process Manager, Preview, Diff central, Approval flow, Conflict UI, Import wizard (Select Folder → Scan → Analysis → Review → Confirm, §46), Command Palette, atalhos, acessibilidade, notificações, Audit UI.

- **Dependências**
  - Depende de: Nexo Engine (via Application Services/APIs internas), Project Model/Intelligence (UI não constrói segunda lógica de detecção, §77), Adapters (controles derivam de capability data real), Runtime (via serviços, nunca acesso direto a OS no frontend, §78), Authorization (§50, §71), Source Project e Git reais (§79–80).
  - Quem depende dele: usuários humanos (consumidor exclusivamente humano; acesso programático existe independentemente da UI, §70).

- **Invariantes e regras não-negociáveis**
  - UI permission checks NÃO substituem backend/API authorization (§50); UI e API usam o mesmo authorization model (§71); UI e AI usam as mesmas Domain Capabilities (§72).
  - UI reflete estado real: sem progresso inventado, sem `Deployed` antes da confirmação, sem `Saved` antes da persistência, sem histórico Git fictício (§12, §33, §80–82).
  - Conflitos: apresentar origem/versões/diferença/opções; nunca descartar mudanças silenciosamente (§45).
  - Recuperação de estado após reload/restart a partir de fontes confiáveis, não memória local (§73–74).
  - Não fabricar controle fictício para propriedade não determinável (§15); erros com operação/estado/motivo/impacto/recuperação — proibido "Something went wrong" genérico quando há informação (§44).
  - Command Palette não contorna autorização (§57); Terminal UI não excede permissões (§39).
  - Acessibilidade (§59): keyboard nav, focus management, semântica, screen readers, contraste, labels, reduced motion. Sem complexidade decorativa (§60).

- **Ordem de implementação** (§90): consultar Core System Architecture, Nexo Engine, Product Requirements, Feature Map, User Journeys, Core Invariants, User Roles, Permission Model, Design System, UI/UX, API Contracts, Runtime → doc oficial atual → verificar compatibilidade de versão → implementar.

- **Acceptance criteria / validação** (§89): 20 critérios — sem lógica exclusiva de UI, usa Engine, respeita Authorization/Project Model/Adapters/Runtime, possui editor visual + code editor + Component Studio + Media Library + Design controls + Responsive Lab + Git UI + AI UI, reflete estados reais, aprovação, conflitos, preserva Source Project, paridade programática, sem Playwright para operações internas.

- **[AMBIGUO]/[DESCONHECIDO]**: framework/biblioteca de UI do próprio Nexo, design tokens concretos, estrutura final de navegação — todos adiados para specs de Design System/UI-UX.

---

# SÍNTESE DO GRUPO

## (1) Diagrama textual das camadas com fronteiras

```text
CONSUMERS (Human, Kimi Code, Codex, Luna, Local AI, CLI, Automation, Plugin, External Integration)
    ↓
[1] EXPERIENCE LAYER — Nexo CMS Application (UI humana; NÃO contém lógica de domínio;
    NÃO toca filesystem/OS/Git/secrets/providers diretamente; NÃO é fronteira de segurança)
    ↓
[2] ENTRY POINT LAYER — Web UI, HTTP API, Agent API, CLI, SDK, Internal Commands, Jobs,
    Webhooks, Plugin API (cada capability pública: contrato+authn+authz+schemas+error model+
    state model+versioning; protocolo exato em 06-CONTROL-PLANE-AND-AGENT-API.md)
    ↓  Authentication → Authorization/Policy (ANTES de qualquer execução privilegiada)
[3] APPLICATION LAYER — use cases (CreateProject, ImportProject, AnalyzeProject, RunBuild,
    DeployProject...); sem lógica framework-specific
    ↓
[4] DOMAIN LAYER = NEXO ENGINE — capabilities autoritativas únicas
    (Project, Project Intelligence, Component, Media, Design, Responsive, Git, Runtime,
     AI, Integration, Workspace, Deployment, Plugin, Audit, Security, Storage)
    ↓
[5] INTELLIGENCE/ADAPTER LAYER — Project Intelligence (scan→detection→model, read-only)
    + Adapters (framework/styling/build/pkg-manager/test; traduzem conceitos universais)
    + Providers (AI, Deployment, Git Remote, Auth, Storage — contratos, substituíveis)
    ↓
[6-7] INFRASTRUCTURE + RUNTIME LAYER — filesystem, processos, comandos, dev server,
    build, test, preview (local OU remoto; Domain não sabe a diferença; Runtime executa,
    nunca decide se deve executar)
    ↓
[8] EXTERNAL RESOURCE LAYER — Source Project (verdade primária), Git repo, OS,
    deployment provider, AI provider, Nexo Storage, integrações

Dependências proibidas: Runtime→UI, Adapter→UI, Infrastructure→UI, Domain→UI, Provider→UI.
Regra definidora: "One domain capability, many authorized consumers."
```

## (2) Stack completa decidida nos docs (lista exata)

**Decidido:**
- **Lucide** (ou ícones próprios/SVGs personalizados) para iconografia da UI do Nexo — único componente de stack explicitamente nomeado para o próprio produto.
- **Playwright** permitido apenas para testes UI/E2E/visual-regression; proibido como plano de controle.
- Parsers estruturados (AST/JSON/CSS/framework/manifest parsers) como estratégia de análise/transformação; regex só como heurística limitada; string replacement proibido como estratégia universal de edição.
- UTF-8 como encoding default esperado.
- Arquitetura: monólito modular aceito inicialmente; microservices proibidos sem justificativa.

**NÃO decidido (todos os docs):** linguagem, runtime (Node.js é apenas contexto implícito via `child_process`), framework backend/frontend, banco de dados, ORM, ferramenta de monorepo, protocolo de API (REST/RPC/GraphQL), biblioteca de componentes UI, design tokens concretos, sistema de jobs/eventos concreto. **[NÃO ESPECIFICADO NO DOC]** — §51 do doc 01 exige processo formal de seleção com pesquisa de documentação oficial antes de qualquer escolha.

**Tecnologias-alvo suportadas (projetos dos usuários, não stack do Nexo):**
- Frameworks: Next.js, React, Vue, Nuxt, Svelte, SvelteKit, Astro, Vite, HTML/CSS/JS.
- Set inicial priorizado (§61 adapters): Next.js, React, Vue, Svelte, Astro, HTML/CSS/JS + TypeScript, Tailwind CSS, CSS Modules, styled-components, Plain CSS + npm, pnpm, yarn, bun.
- Styling detecção adicional: Emotion, CSS Variables, SCSS/Sass, PostCSS, Inline Styles, Mixed.
- Testes: vitest, jest, playwright, cypress. Lint/typecheck: eslint, prettier, tsc, vue-tsc, svelte-check.

## (3) Pipeline de Project Intelligence (scan→detection→model) com contratos

```text
SELECT SOURCE → VALIDATE LOCATION → SCAN FILESYSTEM (via Runtime; coleta Path/Type/Size/
Extension/MTime/RelativePath/Parent/Hash; exclusões technology-aware; symlink policy explícita;
respeita .gitignore etc. conforme a operação)
→ IDENTIFY PROJECT ROOT (múltiplos sinais: package.json, configs, lockfiles, .git...;
  ambiguidade → confiança insuficiente → pede confirmação; monorepo → hierarquia preservada)
→ DETECT TECHNOLOGIES (múltiplas evidências; regras extensíveis; adapter-driven para rotas/layouts)
→ DETECT VERSIONS (Declared/Resolved/Installed)
→ DETECT PACKAGE MANAGER (lockfile signals; conflito = detectado, nunca seleção silenciosa)
→ DETECT BUILD/DEV/TEST COMMANDS (de evidência do projeto; nunca assume npm run build)
→ DETECT GIT (estado real, sem mutação)
→ DETECT ROUTES/PAGES/LAYOUTS (via Adapters)
→ DETECT COMPONENTS (com confidence + evidence; diretório components/ é evidência, não prova)
→ DETECT STYLES (múltiplos sistemas suportados; tokens preservados no formato original)
→ DETECT ASSETS (locais vs remotos distintos; referências no Graph)
→ BUILD PROJECT MODEL (Identity/Source/Stack/Adapters/Runtime/PackageManager/Build/
  Development/Tests/Git/Routes/Pages/Layouts/Components/Styles/Assets/Integrations/Diagnostics)
→ BUILD PROJECT GRAPH (Route→Page→Component→Asset; Component→Style→Token; Component→Dep→Component)
→ CALCULATE SUPPORT/CONFIDENCE (CONFIRMED/HIGH/MEDIUM/LOW/UNKNOWN;
  FULLY_SUPPORTED/PARTIALLY_SUPPORTED/DETECTED_BUT_UNSUPPORTED/UNKNOWN/CUSTOM)
→ PERSIST NEXO METADATA (snapshot com metadados de staleness; separado de overrides do usuário)
→ PROJECT READY / REVIEW_REQUIRED / PARTIALLY SUPPORTED
```

Contratos-chave: confidence `CONFIRMED|HIGH|MEDIUM|LOW|UNKNOWN`; evidence list por detecção; lifecycle `NOT_ANALYZED|SCANNING|ANALYZING|READY|PARTIAL|REVIEW_REQUIRED|FAILED|STALE`; fingerprint (root + config hash + file metadata + repo identity + file hashes); detected vs user-confirmed vs user-override; análise incremental + full re-scan; AI context minimal/task-relevant; secrets detectados mas nunca expostos. Princípio final: "Observe → Understand → Model → Verify → Then Modify".

## (4) Catálogo de Adapters

**Categorias:** Framework, Language, Styling, Build, Package Manager, Test, Runtime (combináveis; fronteira por responsabilidade).

**Suporte inicial recomendado:**
- Frameworks: Next.js (version-aware, modos de routing), React (semântica de componente compartilhada; ≠ Next.js), Vue (Nuxt delega ao adapter Nuxt), Svelte (SvelteKit delega ao adapter SvelteKit), Astro (components vs islands), HTML/CSS/JS (baseline honesto).
- Linguagem: TypeScript.
- Styling: Tailwind CSS, CSS Modules, styled-components, Plain CSS (+ CSS Variables, SCSS/Sass na detecção).
- Package Managers: npm, pnpm, yarn, bun.

**Contrato do Adapter:**
- Base: `detect(), getIdentity(), getVersion(), getCapabilities(), analyze(), validate()` + capability-specific (`findRoutes/findPages/findComponents/findStyles/createComponent/updateComponent/createPage/updatePage/build/test`).
- Framework: + `findLayouts`. Styling: `getSystem, findTokens, findVariables, readStyle, updateStyle, createStyle`. Build: `getBuildCommand, getDevelopmentCommand, getPreviewCommand, getOutput, validateEnvironment`. Package Manager: Manager/Version/Lockfile/Install/Add/Remove/RunScript. Test: Runner/Unit/Integration/E2E/Config/Discovery.
- Identity: `id, name, category, version, adapterVersion, supportedProjectVersions, capabilities`.
- Capability levels: `FULL|PARTIAL|READ_ONLY|EXPERIMENTAL|UNSUPPORTED`; failure states: `AVAILABLE|PARTIAL|UNSUPPORTED|ERROR|INCOMPATIBLE`; transactions: `Atomic|Staged|Best Effort|Partially Recoverable`; diagnostics: `WARNING|ERROR|UNSUPPORTED|CONFLICT|DEPRECATED`; result: Result/FilesChanged/Warnings/Diagnostics/ReanalysisRequired.
- Regras: detecção nunca muta; nunca commita (Git Domain o faz); mutação → re-análise; nunca bypassa Runtime/Security; contexto mínimo por invocação (`Workspace→Project→Adapter→Operation`); preserva styling e formatação do projeto; migração ≠ edição; custom/plugin adapters implementam o mesmo contrato sem tocar o Core; No-Hallucination Rule (incerto → UNKNOWN/UNSUPPORTED).

## (5) Fontes de verdade por tipo de dado

| Tipo de dado | Fonte de verdade |
|---|---|
| Código-fonte, assets, config, estrutura do projeto | **Source Project** (filesystem real via Runtime) — primário e autoritativo |
| Estado Git (branch, working tree, remotes, HEAD) | **Git real** (nunca aproximação por metadata; UI nunca mantém histórico fictício) |
| Project Model / Project Graph / índices | **Informação derivada** — pode ficar stale; sujeita a invalidation/refresh/re-scan/reconciliation |
| Metadata Nexo (registro de projeto, detected stack, adapter state, registries, cache, audit, snapshots, preferências) | **Nexo Storage** — pertence ao Nexo; nunca sobrescreve silenciosamente o Source Project |
| Detecção de stack/versões/comandos | Evidência do projeto (manifests, lockfiles, configs, versões instaladas); override confirmado do usuário prevalece sobre detecção automática até invalidação documentada |
| Comportamento de framework/ferramenta | **Documentação oficial atual da versão instalada** (Official Docs → Spec → Repo → Primary Source) — nunca memória desatualizada do agente |
| Capabilities de adapter | Declaração explícita do adapter (levels FULL/PARTIAL/etc.) — UI/AI derivam estado disso |
| Permissões/autorização | Security/Authorization Layer em execution boundaries — nunca a UI |
| Estado de operações (jobs, build, deploy, AI tasks) | Estado real do Job/Provider — UI nunca inventa progresso ou conclusão |
| Schemas request/response de capabilities | 06-CONTROL-PLANE-AND-AGENT-API.md (adiado) |
| Secrets | Isolados de metadata; utilizáveis sem leitura do valor bruto; nunca em logs/diffs/AI context/erros |
