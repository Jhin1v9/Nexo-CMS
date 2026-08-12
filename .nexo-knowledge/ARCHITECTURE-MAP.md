# NEXO CMS — ARCHITECTURE MAP

## Identidade
Plataforma universal de engenharia/gerenciamento de projetos web. Entra em projetos reais existentes, compreende, opera e persiste de verdade. Não é CMS tradicional, não é framework, não impõe stack.

## As 8 camadas conceituais (doc 01)
```
Experience (UI do CMS — apps/cms)
  ↓ (dependência só desce; UI nunca é fonte de lógica)
Entry Point (Control Plane / Agent API / CLI / futuros)
  ↓
Application (orquestração de casos de uso)
  ↓
Domain = Nexo Engine (13 serviços, um dono autoritativo por capability)
  ↓
Intelligence / Adapters (Project Intelligence + Framework/Styling/Build/PM/Test adapters)
  ↓
Infrastructure / Runtime (filesystem, processos, comandos, build, preview)
  ↓
External Resources (Source Project, Git repo/remotes, providers, SO)
```
Regra: "One domain capability, many authorized consumers" — UI, API, CLI, AI, automações convergem para a MESMA capability. Duplicação de lógica por consumidor é proibida. Monólito modular aceito; microservices prematuros proibidos.

## Fontes de verdade (nunca fundidas)
1. **Source Project** → autoridade do código
2. **Git** → autoridade do versionamento
3. **Provider real** → autoridade do estado externo (deploy etc.)
4. **Nexo Storage** → autoridade apenas do metadata do Nexo
Project Model/Graph são derivados, sujeitos a staleness (detect → invalidate → refresh → reconcile).

## Domínios do Nexo Engine (doc 05) — 13 serviços
ProjectService, ProjectIntelligenceService, ComponentService, MediaService, DesignService, ResponsiveService, GitService, RuntimeService, AIService, IntegrationService, DeploymentService, WorkspaceService, PluginService.
Invariantes: sem efeitos colaterais ocultos; resultados parciais explícitos (PARTIAL); eventos só após transição real; sem "NexoService" gigante.

## Runtime (doc 04) — 17 capabilities
`filesystem.{read,write,create,delete,rename,move}`, `process.{list,start,stop,restart,inspect}`, `command.execute`, `build.run`, `test.run`, `preview.{start,stop}`.
Capability Contract obrigatório: Operation ID, Input/Result/Error Schemas, Authorization, Policy, Execution Context, Cancellation, Timeout, Audit.

## Segurança (docs 04 + Permission Model)
`DEFAULT DENY + EXPLICIT CAPABILITY + EXPLICIT SCOPE + POLICY + AUDIT`.
- Decisões: ALLOW / DENY / REQUIRE_APPROVAL / UNKNOWN (UNKNOWN ≠ ALLOW).
- Enforcement no ponto de execução (nunca só na UI). localhost ≠ confiança.
- Filesystem scope = Project Root; rejeita `../`, absolute escape, symlink escape.
- Comandos: args estruturados (anti-injection), classificação SAFE/RESTRICTED/DANGEROUS/BLOCKED/UNKNOWN, cwd explícito.
- IA não bypassa nada; permissões de IA são próprias (`ai.*`), não herdadas do humano; `initiatedBy` ≠ `executedBy`.
- Auditoria obrigatória: Who/What/Resource/Context/Decision/Result/Time.

## Control Plane / Agent API (doc 06)
- Expõe capabilities de domínio (nunca ações de UI; proibido `click.deploy`).
- Discovery: `GET capabilities` → mapa capability → allowed/denied por contexto.
- Invocação: `POST capability` → resultado sync ou Job ID → `GET Job`; `job.cancel`; progresso nunca fabricado.
- Erros agent-friendly: `code, message, operationId, resource, retryable, requiresApproval, requiredCapability, details`; códigos NOT_FOUND, CONFLICT, STALE_CONTEXT, UNSUPPORTED, REQUIRE_APPROVAL.
- Playwright proibido como controle interno (apenas testes E2E).

## Adapters (doc 03)
Contrato: `detect / getIdentity / getVersion / getCapabilities / analyze / validate` (+ métodos por categoria).
Capability levels: FULL | PARTIAL | READ_ONLY | EXPERIMENTAL | UNSUPPORTED.
Estados: AVAILABLE | PARTIAL | UNSUPPORTED | ERROR | INCOMPATIBLE.
Catálogo inicial: Next.js, React, Vue, Svelte, Astro, HTML/CSS/JS (frameworks); TypeScript; Tailwind, CSS Modules, styled-components, Plain CSS (styling); npm/pnpm/yarn/bun (PM).
Regras: detecção nunca muta; adapter nunca commita; string replacement proibido como estratégia universal; incerto → UNKNOWN/UNSUPPORTED.

## Project Intelligence (doc 02)
Pipeline: scan → root detection (multi-sinal, monorepo-aware) → stack/version/PM/commands/git detection → routes/pages/components/styles/assets (via adapters) → Project Model + Project Graph → confidence/support → persist metadata.
Confidence: CONFIRMED | HIGH | MEDIUM | LOW | UNKNOWN.
Suporte: FULLY_SUPPORTED | PARTIALLY_SUPPORTED | DETECTED_BUT_UNSUPPORTED | UNKNOWN | CUSTOM.
Discovery é NÃO-DESTRUTIVO (nunca instala deps, nunca git init, nunca reescreve). "Observe → Understand → Model → Verify → Then Modify".

## Storage (doc 14)
"Nexo stores what Nexo owns." ~15 entidades: Workspace, Project Registration, Machine Identity/Agent, Library Component, Media Metadata, AI Task, Job, Audit Event, Deployment Record, Integration, Provider Config, Settings, Caches, PI Snapshot, Search Indexes.
Project ID estável, NÃO derivado de nome/path/branch. Secrets separados de metadata. SGBD: decisão do Swarm (Repository Pattern obrigatório — 8 repositórios nomeados).

## Estrutura de pastas proposta (doc 01, não mandatória — adotada)
```
nexo-cms/
  apps/{cms,runtime}
  packages/{core,project,intelligence,adapters,runtime,components,media,design,
            responsive,git,ai,integrations,deployment,security,control-plane,
            workspace,shared}
  adapters/  tests/  docs/
```

## UI (Nexo CMS Application)
Ícones Lucide (ou SVG próprios); emojis proibidos como ícones. Preview sempre rotulado com estado. Falhas parciais visíveis.

## Decisões adiadas pelos docs (NÃO inventar)
Protocolo de API (REST/RPC/GraphQL); tecnologia de auth/policy engine; SGBD; lib Git concreta; schemas exatos de capabilities (pertencem ao doc 06); merge de conflitos de edição.
