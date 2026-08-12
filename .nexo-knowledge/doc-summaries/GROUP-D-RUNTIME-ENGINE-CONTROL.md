# GRUPO D — RUNTIME, NEXO ENGINE E CONTROL PLANE (docs 04, 05, 06)

Fontes: `NEXO CMS — RUNTIME AND SECURITY.md` (04, 1696 linhas, 83 seções), `NEXO CMS — NEXO ENGINE.md` (05, 1888 linhas, 84 seções), `# NEXO CMS — CONTROL PLANE AND AGENT API.md` (06, 1895 linhas, 85 seções). Todos são "Engineering Specification" para Nexo Digital Engineering Team, K3 Agent Swarm e AI Coding Agents.

---

## 04 — RUNTIME AND SECURITY (`04-RUNTIME-AND-SECURITY.md`)

### Responsabilidade e fronteiras
- Responde: "como o Nexo executa com segurança uma operação no ambiente onde o projeto existe?" (§2).
- É a fronteira controlada entre o Nexo e o ambiente operacional: acesso a filesystems (locais/remotos), processos, comandos de terminal, dev servers, builds, testes, previews, ambientes, ferramentas Git e recursos externos de execução (§1).
- **Executa; não decide** se a operação deve ocorrer — decisão é de Application/Domain + Authorization/Policy (§2).
- Domain code NÃO pode acessar diretamente Filesystem/Process/Shell/OS APIs quando roteável via Runtime (§5).
- Aplica: authorization context, path restrictions, command/process policies, timeouts, cancellation, logging, result normalization (§5).
- Ambientes-alvo: `Local Runtime`, `Remote Runtime`, `VPS Runtime`, `Containerized Runtime` — o contrato de capability é idêntico; o Domain não precisa saber qual ambiente físico está em uso (§4, §43, §51 do Engine).

### Stack/tecnologias mandatórias
- [NÃO ESPECIFICADO] — nenhuma versão de stack fixada. O doc exige pesquisa de documentação oficial sobre Node.js process APIs, filesystem APIs, child process behavior, OS permissions, container isolation, SSH, remote execution, browser security, credential systems (§79).
- Transporte remoto NÃO fixado: candidatos `HTTP`, `RPC`, `WebSocket`, `Secure Agent Protocol`, `SSH-based Execution`; escolha por segurança, confiabilidade, latência, streaming, ambiente, manutenibilidade (§44).

### Contratos (Capability Contract — §7)
Toda capability do Runtime deve ter exatamente:
```
Operation ID, Input Schema, Authorization Requirement, Policy Requirement,
Execution Context, Result Schema, Error Schema, Cancellation Behavior,
Timeout Behavior, Audit Behavior
```
- Entrada de comando deve definir: `Command, Arguments, Working Directory, Environment, Timeout, Cancellation Behavior` (§22).
- Classificação de política de comandos: `SAFE | RESTRICTED | DANGEROUS | BLOCKED | UNKNOWN` — UNKNOWN não recebe autorização irrestrita (§25).
- Categorias de erro do Runtime (§53): `PermissionDenied, PathNotFound, PathOutsideScope, CommandNotFound, ProcessStartFailed, ProcessExitedWithError, Timeout, Cancelled, EnvironmentUnavailable, ResourceLimitExceeded, RuntimeUnavailable, RemoteConnectionFailed, UnknownRuntimeError`.
- Resultado de build distingue (§32): `SUCCESS | FAILED | CANCELLED | TIMEOUT | BLOCKED | ENVIRONMENT_ERROR`, incluindo `Exit Code, Output, Error Output, Duration, Artifacts, Diagnostics`.
- Cancelamento deve reportar (§47): `CANCEL_REQUESTED | CANCELLED | CANCEL_FAILED | ALREADY_FINISHED`.
- Registro de processo (§16): `Process ID, Parent Process, Command, Arguments, Working Directory, Status, Start Time, Exit Code`.
- Tipos de identidade (§60): `Human User, AI Agent, Automation, Plugin, Service Identity, CLI Session`.
- Atores possíveis (§38): `Human, AI Agent, CLI Session, Automation, Plugin, Internal Service`.

### Capabilities expostas (§6)
```
filesystem.read / filesystem.write / filesystem.create / filesystem.delete /
filesystem.rename / filesystem.move
process.list / process.start / process.stop / process.restart / process.inspect
command.execute
build.run / test.run / preview.start / preview.stop
```
Permissões runtime (nomes preliminares, §61): `runtime.read, runtime.command.execute, runtime.command.execute_sensitive, runtime.process.read, runtime.process.start, runtime.process.stop, runtime.process.restart, runtime.files.read, runtime.files.write, runtime.files.create, runtime.files.delete, runtime.build, runtime.test, runtime.preview` — nomes finais pertencem ao Permission Model e contratos de API.

### Modelo de segurança
- Modelo central (§59): `DEFAULT DENY + EXPLICIT CAPABILITY + EXPLICIT SCOPE + POLICY + AUDIT`. Ausência de regra de deny não é autorização.
- Filesystem scope: Project Root → Allowed Project Scope; operações não acessam paths arbitrários fora do escopo (§8).
- Path resolution deve rejeitar: `../`, absolute path escape, symbolic-link escape, path traversal, unexpected mount access (§9). Symlink: resolver target efetivo antes de operações privilegiadas; "path dentro do projeto ≠ target dentro do projeto" (§15).
- Preferir execução direta de processo a shell; inputs via argumentos estruturados, nunca interpolação (`exec("npm install " + userInput)` é o contraexemplo, §23–24).
- Comandos de IA passam pelo MESMO boundary de segurança que humanos — proibido criar "AI command bypass" (§26, §57). IA não herda permissões do iniciador humano; política central decide (§62).
- Não confiar em localhost/internal network/known browser/known process (§38, §65). Browser nunca recebe autoridade arbitrária de filesystem — o servidor local é quem acessa (§42, §66).
- Agentes externos (Kimi Code, Codex, Local AI, External Automation) autenticam por mecanismo programático oficial — NÃO por cookies de sessão de browser (§68).
- Credenciais de agente: dono identificável, escopo limitado, revogáveis, não armazenadas em plaintext, ausentes de logs, auditáveis (§69).
- Secrets: ciclo `Store/Use/Rotate/Revoke/Audit`; injetados só quando necessário no ambiente do processo; jamais em Logs, Audit Records, Diffs, AI Context, Error Messages, UI Output; redação antes de propagar output a UI/API/AI/logs/audit, cuidando de vazamento via encoding/transformações (§28–29, §70–71).
- Sandbox: mecanismos possíveis = Process Isolation, Filesystem Restrictions, Container Isolation, User Permissions, Working Directory Restrictions, Network Restrictions — só alegar isolamento com garantias técnicas verificadas (§41).
- Aprovação humana separada de autenticação para: deleção destrutiva, comandos sensíveis, comandos de produção, operações com credenciais, operações potencialmente irreversíveis (§63–64).
- Ambientes dev/preview/staging/production distinguíveis; credenciais de produção não disponíveis automaticamente em dev (§72–73).
- Resource limits configuráveis: CPU, Memory, Duration, Output Size, Concurrent Processes, Disk Usage, Network Access — só reivindicar controles efetivamente aplicados (§49). Output com streaming/buffer limitado/indicador de truncamento (§50).
- Eventos de segurança logados (§74): Authentication, Authorization Denial, Permission Change, Secret Access, Command Execution, Filesystem Mutation, Agent Creation, Agent Revocation, Plugin Permission Change, Deployment — sem valores secretos.
- Proibido "security through obscurity" (rota/endpoint/botão oculto, localhost only, comando obscuro) (§80).

### Dependências
- Depende de: modelo central de Security (política final vem dele, §39), Permission Model (nomes finais), Workspace/Storage e Control Plane specs (leitura obrigatória no protocolo K3, §82), Build/Test Adapters (definem comandos específicos do projeto, §31, §33).
- Dependem dele: Nexo Engine (RuntimeService delega execução ao Runtime), Git Service (interage com Git via Runtime ou boundary Git, §56 do Engine), Deployment, Preview, AI Tools, Plugins (todos via capabilities aprovadas, §57–58).

### Invariantes não-negociáveis
1. Runtime executa; não decide (separação decisão/execução).
2. Nenhum acesso fora do escopo autorizado sem permissão explícita de nível superior.
3. Overwrite acidental proibido por default; overwrite deve ser explícito (§12).
4. Delete: considerar autorização, referências, estado Git, estado do projeto, risco — nunca deleção silenciosa fora do escopo (§13).
5. Move não pode cruzar fronteiras de projeto acidentalmente (§14).
6. Processos iniciados pelo Nexo têm ownership (operação/projeto); stop/restart identificam o processo precisamente — proibido `kill` genérico por nome/string (§17, §19–20, §48).
7. Working directory explícito em todo comando/processo; proibido cwd global implícito (§30).
8. Sucesso só quando a operação real no SO/provider sucedeu — proibido `success: true` por mera submissão (§54). Timeout ≠ falha normal; estado desconhecido ≠ sucesso (§46, §75).
9. Preview isolado de produção; processo de preview identificável (§35–36); readiness real (porta, mensagem de startup, health endpoint), não mera existência do processo (§34).
10. Git normalmente via domínio Git, não via `command.execute` arbitrário (§56).
11. Plugins não ganham acesso irrestrito ao OS por estarem instalados (§58).
12. Sem segurança por obscuridade; falhas de segurança representadas explicitamente; recovery não inventa sucesso (§76, §80–81).

### Ordem de implementação (K3 Swarm Protocol, §82)
1. Ler `01-SYSTEM-ARCHITECTURE.md`; 2. Ler `02-PROJECT-INTELLIGENCE.md`; 3. Ler este doc completo; 4. Ler Core Invariants; 5. Ler Workspace/Storage e Control Plane quando disponíveis; 6. Inspecionar o ambiente-alvo real; 7. Identificar versões reais de runtime; 8. Pesquisar docs oficiais de APIs OS/runtime; 9. Definir e testar filesystem scope; 10. Definir e testar política de execução de comandos; 11. Definir identidade e permissões; 12. Implementar erros estruturados; 13. Implementar auditabilidade; 14. Testar casos de ataque e falha antes de declarar o Runtime seguro. Não simplificar controles de segurança só porque o deployment inicial é local.

### Acceptance criteria / testes exigidos
20 critérios (§81): fs com escopo; path traversal prevenido; symlink escape tratado; comandos estruturados/controlados; shell injection endereçado; processos com identidade e ciclo de vida; builds/testes observáveis; previews identificáveis; cancelamento quando suportado; outputs estruturados; secrets protegidos; IA sob o mesmo modelo de segurança; identidades de máquina; operações auditadas; bloqueio antes da execução; mesmo contrato lógico local/remoto; mudanças externas não sobrescritas silenciosamente; falhas de segurança explícitas; recovery não inventa sucesso.
Testes de segurança (§77): Path Traversal, Symlink Escape, Unauthorized Command/Write/Delete/Process Stop, Secret Exposure, Agent Privilege Escalation, Permission Revocation, Cross-Project/Cross-Workspace Access, Remote Access, Command Injection, Output Leakage. Compatibilidade testada em Linux/Windows/macOS/VPS/Container (§78) — não alegar cross-platform sem teste.

### [AMBIGUO]/[NÃO ESPECIFICADO]
- Stack/versões: não citadas (exigida inspeção do ambiente real).
- Transporte remoto: não fixado (HTTP/RPC/WebSocket/Secure Agent Protocol/SSH).
- Mecanismo exato de sandbox/isolamento: depende do ambiente e threat model.
- Nomes finais de permissões: delegados ao Permission Model.
- Política exata de classificação de comandos: definida pela implementação de Security.
- Mecanismo exato de credenciais de agentes: delegado ao Security.
- Matriz de plataformas suportadas: definida pela implementação.

---

## 05 — NEXO ENGINE (`05-NEXO-ENGINE.md`)

### Responsabilidade e fronteiras
- Camada central de coordenação application/domain: implementação única e autoritativa das capabilities do Nexo (§1–2).
- NÃO é: browser UI, Runtime, Adapter System, AI provider, database, Git, deployment provider (§1).
- Responsável por (§4): executar capabilities de domínio, coordenar serviços, impor invariantes, validar contexto, interagir com adapters/Runtime/providers, resultados e erros estruturados, orquestrar operações multi-step, re-análise, estado de operação, auditoria/observabilidade.
- NÃO responsável por (§4): renderizar UI, parsear DOM arbitrário, escolher estruturas de framework sem adapters, contornar segurança, armazenar secrets em metadata de projeto, manipular infra externa sem contratos de provider.
- Reutilizável por: Web UI, API, CLI, AI Agents, Luna, Local AI, Automation, Plugins, Internal Jobs — nenhum consumidor reimplementa operação (§2).

### Stack/tecnologias mandatórias
- [NÃO ESPECIFICADO] — nenhuma stack/versão citada. Estrutura física de pacotes é detalhe de implementação; a fronteira lógica é obrigatória (§3). Nomes de módulos são detalhes de implementação; fronteiras de responsabilidade não são opcionais (§5).

### Contratos
- **Engine Context** (§8): `Actor, Workspace, Project, Environment, Branch, Runtime Session, Permissions, Policy Context, Operation ID`. Operações não dependem de estado global oculto.
- **Actor Context** (§9): tipos `Human, AI Agent, CLI Session, Automation, Plugin, Internal Service`; para IA preservar `Initiator` + `Executing Agent` (ex.: Initiator = Human User A; Executing Agent = Kimi Code Agent; Operation = project.write).
- **Operation Identity** (§10): Operation ID correlaciona UI, API, AI, Runtime, Jobs, Logs, Audit, Git, Deployment (ex.: `op_123`, `job_456`; formato implementation-defined).
- **Operation States** (§41): `PENDING, RUNNING, WAITING_APPROVAL, SUCCEEDED, FAILED, PARTIAL, CANCELLED, BLOCKED, CONFLICT`.
- **Result Model** (§56): `status, operationId, jobId, resource, changedFiles, warnings, diagnostics, nextActions` (schema exato definido depois).
- **Error Model** (§57): `ValidationError, AuthorizationError, NotFoundError, ConflictError, UnsupportedError, AdapterError, RuntimeError, ProviderError, GitError, BuildError, DeploymentError` — machine-readable.
- **Eventos de domínio** (§71): `project.updated, component.updated, git.committed, build.completed, deployment.completed, ai.task.completed` — só após a transição de estado real.
- **Permissões em nível de capability** (§47): `component.create, component.update, git.commit, git.push, runtime.command, runtime.build, deployment.deploy` — não depender só de roles amplos.
- **Estratégias de recovery** (§74): `Rollback, Compensating Operation, Git Revert, Restore Snapshot, Retry, Re-analysis, Manual Recovery`.

### Capabilities expostas (por serviço dono)
- **ProjectService** (§11): `project.create, project.import, project.open, project.read, project.refresh, project.analyze, project.clone, project.export, project.archive, project.remove`.
- **ProjectIntelligenceService**: `project.analyze` (§6).
- **ComponentService** (§19): `component.detect, component.create, component.read, component.update, component.delete, component.promote, component.publish`.
- **MediaService** (§24): `media.list, media.read, media.upload, media.update, media.replace, media.delete`.
- **DesignService** (§26): cores, gradients, typography, spacing, borders, radius, shadows, variables, themes, tokens (delega ao Styling Adapter).
- **ResponsiveService** (§28): Viewport, Preview, Diagnostics, Stress Testing, Overflow Detection, Text Wrapping Detection, Comparison.
- **GitService** (§29): `git.status, git.branch, git.commit, git.push, git.pull, git.fetch, git.merge, git.rebase, git.stash, git.revert, git.reset, git.history, git.diff`.
- **RuntimeService** (§31): `runtime.command, runtime.process, runtime.build, runtime.test, runtime.preview` (delega ao Runtime do doc 04).
- **AIService** (§32): AI Provider, AI Context, AI Tools, AI Tasks, AI Execution Modes, AI Validation (`ai.task` → AIService).
- **IntegrationService** (§34): External Scripts, Embeds, Widgets, Third-party Integrations, Custom HTML/CSS/JavaScript, API Integrations.
- **DeploymentService** (§35): `deployment.preflight, deployment.deploy, deployment.verify, deployment.rollback` (orquestração do Service; comportamento vendor do Provider).
- **WorkspaceService** (§37): Workspace, Membership, Roles, Permissions, Workspace Settings, Shared Resources, Policies.
- **PluginService** (§38): Install, Activate, Deactivate, Update, Remove, Permission Grants, Compatibility, Lifecycle.
- Grupos de serviço iniciais (§5): ProjectService, ProjectIntelligenceService, ComponentService, MediaService, DesignService, ResponsiveService, GitService, RuntimeService, AIService, IntegrationService, DeploymentService, WorkspaceService, PluginService.
- Fluxos detalhados: Project Import (§13), Project Open (§14), Project Refresh (§15), Component Create (§20), Component Update (§21), Media Replace (§25), Git Operation (§30), Deployment (§36), AI Tool Execution (§33), Cross-Domain (§39).

### Modelo de segurança
- Todo consumidor é não-confiável até autorização: Actor → Permission Evaluation → Policy Evaluation → Capability (§45); nunca confiar na autorização prévia da UI.
- Boundary de autorização em cada Service crítico: ComponentService, GitService, RuntimeService, DeploymentService, WorkspaceService (§46).
- IA usa as mesmas capabilities com autorização efetiva própria (ex.: Human git.push=ALLOW / Agent git.push=DENY é válido); nenhuma capability estruturalmente oculta de agentes (§48).
- IA não vira shell de filesystem genérico; invoca capabilities autorizadas pelos mesmos caminhos (§32–33). AI Planner ≠ Security Authority (§65).
- API/CLI/Plugins não podem contornar o Engine para operações privilegiadas (§67–70).
- Secrets fora de metadata de projeto; plugin isolado de acesso não autorizado ao Core (§38, §4).

### Dependências
- Depende de: Adapter System (§50 — resolve Framework/Styling Adapter ativos; proibido fallback silencioso de tecnologia), Runtime (§51 — resolve Local/Remote/VPS/Container), Providers (§52 — ex. Vercel, Hostinger; proibido estado global de provider), Project Intelligence (frescor de contexto, §53), Security central.
- Dependem dele: UI, API, CLI, AI Tools, Plugins, Jobs, Luna, Local AI — todos convergem nas mesmas capabilities (§66–70). Control Plane (doc 06) define a interface externa detalhada (§11).

### Invariantes não-negociáveis
1. Uma implementação autoritativa por capability; ownership único (§6).
2. Nenhuma duplicação de capability em UI/AI/CLI (§2, §6).
3. `project.create` distingue "criar metadata Nexo" de "criar projeto fonte real"; metadata não gera fonte (§12).
4. Import não modifica o projeto fonte por default (§13); Open não assume cache atual (§14); Export produz projeto utilizável fora do Nexo, sem metadata Nexo obrigatória (§18).
5. Clone cria nova identidade — não reutiliza Nexo Project ID, workspace ownership, secrets, credenciais de integração/deploy (§17).
6. `project.write` ≠ escrita arbitrária; mutações via capabilities específicas (`component.update, page.update, style.update, file.write`) (§16).
7. Component Service não hardcoda geração de fonte de framework — Adapter é dono (§20); delete de componente avalia References/Dependencies/Routes/Pages/Git e avisa/bloqueia referências inválidas (§22); promote valida deps/imports/assets/secrets/config/adapter (§23).
8. Design: preferir modificar fonte de verdade existente (ex.: `--primary-color`) a hardcode novo (§27).
9. Consumidores não constroem comandos Git arbitrários como API primária (§30).
10. Deploy não é sucesso por aceite do provider — exige condição de conclusão definida (§36).
11. Sem transação universal fake entre domínios; estados rastreados independentemente; resultado reflete parcialidade (§40, §58). Resultados parciais não achatados em success/failure.
12. Sem efeitos colaterais ocultos: `component.update` não commita/pusha/deploya/deleta silenciosamente (§62); composições são explícitas e auditáveis passo a passo (§63–64).
13. Eventos só após transição real; cache nunca é verdade inquestionável (§71–72); Source Project é autoridade para fonte, Git para git, Provider para deploy (§73).
14. Sem "NexoService" gigante; serviços com responsabilidades estreitas (§76–77); sem abstração prematura (§78); contratos expostos são dependência arquitetural versionada (§79).
15. Idempotência onde prático (`project.import, component.publish, deployment.deploy, job.submit`) com estratégia definida (§59).
16. Estado persistido para sobreviver a refresh/restart/disconnect; UI nunca é o único detentor do estado (§42); Jobs identificam Actor/Workspace/Project/Operation Type (§44).
17. Conflitos (mudança externa, branch change, git conflict, stale model, provider conflict) detectados e nunca resolvidos silenciosamente (§54); re-análise obrigatória após mutação (§55).

### Ordem de implementação (K3 Swarm Protocol, §83)
1. Ler `01-SYSTEM-ARCHITECTURE.md`; 2. Ler `02-PROJECT-INTELLIGENCE.md`; 3. Ler `03-ADAPTER-SYSTEM.md`; 4. Ler este doc; 5. Identificar domínio dono; 6. Identificar dependências; 7. Identificar capabilities de Runtime requeridas; 8. Identificar capabilities de Adapter requeridas; 9. Identificar requisitos de autorização; 10. Identificar entry points programáticos; 11. Definir estados de sucesso/falha; 12. Implementar testes; 13. Validar contra fixture projects reais; 14. Consultar docs oficiais externos quando comportamento depende de versão. Não inventar nova fronteira sem justificativa arquitetural.

### Acceptance criteria / testes exigidos
18 critérios (§82): implementação autoritativa única; UI/API/CLI/AI consomem as mesmas capabilities; IA faz operações humano-equivalentes autorizadas; serviços com responsabilidades claras; Adapters donos de tecnologia; Runtime dono de execução; Providers donos de vendor; autorização antes de execução privilegiada; resultados e erros estruturados; Jobs para long-running; falhas parciais explícitas; mudanças externas invalidam estado stale; Source Project autoritativo; efeitos ocultos proibidos; operações auditáveis; workflows compõem capabilities; Engine utilizável sem browser UI.
Testes obrigatórios por serviço (§81): Success, Invalid Input, Unauthorized, Not Found, Unsupported Capability, Stale Context, External Modification, Adapter Failure, Runtime Failure, Provider Failure, Partial Failure, Cancellation, Retry + testes de integração para workflows críticos.

### [AMBIGUO]/[NÃO ESPECIFICADO]
- Stack, linguagem, estrutura de pacotes e nomes de módulos: detalhes de implementação.
- Schema exato de Result/Context/IDs: "defined later" / implementation-defined.
- Interface externa detalhada das operações de projeto: delegada ao Control Plane (doc 06).
- Capabilities concretas de DesignService/ResponsiveService/WorkspaceService/PluginService: listadas como responsabilidades, sem IDs de capability nomeados.

---

## 06 — CONTROL PLANE AND AGENT API (`06-CONTROL-PLANE-AND-AGENT-API.md`)

### Responsabilidade e fronteiras
- Propriedade machine-facing central: **o Nexo deve ser totalmente operável via capabilities programáticas sem operar a UI gráfica** (§1).
- Expõe **capabilities de domínio, não ações de UI** (proibido `click.createProject`, `press.saveButton`, etc.) (§3).
- Paridade humano↔agente: mesma capability, sem duplicação; distinção via Identity/Permissions/Policy/Approval/Execution Context (§4).
- Sem restrição artificial a IA (§5); sem exigência de Playwright/DOM/screenshots/cliques simulados para capabilities programáticas (§6).
- "A UI não é o control plane. As capabilities do Nexo são o control plane." (§85).

### Stack/tecnologias mandatórias
- [NÃO ESPECIFICADO] — transporte é decisão de implementação; contratos de capability independentes de transporte (§8–9). Mecanismos de autenticação candidatos (§21): `API Key, OAuth, Short-Lived Token, Service Identity, Signed Request, Session Credential` — escolha final na arquitetura de Security; agentes não inventam esquemas locais.

### Contratos
- **Entry points** (§8): HTTP API, Agent API, CLI, SDK, Internal Application API, Job API, Webhook API, Plugin API.
- **Fluxo de request** (§10): Consumer → Transport → Authentication → Request Validation → Authorization → Application Capability → Domain → Adapter/Runtime/Provider → Result. API nunca contorna autorização, validação de domínio, segurança do Runtime ou validação de estado do projeto.
- **Request Contract** (§13): `Capability ID, Request Schema, Authentication, Required Permissions, Policy Requirements, Resource Scope, Execution Behavior, Response Schema, Error Schema, Async Behavior, Idempotency Behavior`.
- **Response Contract** (§14): `operationId, status, result, warnings, diagnostics, job, nextActions`.
- **Status Model** (§15): `PENDING, RUNNING, WAITING_APPROVAL, SUCCEEDED, FAILED, PARTIAL, CANCELLED, BLOCKED, CONFLICT`.
- **Job Contract** (§18): `id, type, status, createdAt, startedAt, completedAt, owner, workspaceId, projectId, progress, result, error` — proibido fabricar percentuais de progresso; reportar fase/status. `job.cancel` → `CANCEL_REQUESTED | CANCELLED | CANCEL_FAILED | ALREADY_COMPLETED` (§19).
- **Erro agent-friendly** (§50): `code, message, operationId, resource, retryable, requiresApproval, requiredCapability, details` (sem detalhes internos sensíveis). Retryability: `true | false | unknown` (§51). Erros estruturados: `NOT_FOUND` (§47), `CONFLICT`/`STALE_CONTEXT` (§48, §60), `UNSUPPORTED` (§49), `REQUIRE_APPROVAL` (§26).
- **Atribuição dupla** (§23): `initiatedBy: user_123` + `executedBy: agent_kimi_01`.
- **AI Task** (§40): `Task ID, Actor, Agent, Provider, Project, Instruction, Mode, Status, Permissions, Tools Used, Files Changed, Validation, Result, Error` — prompts/secrets sensíveis não logados indiscriminadamente. Modos (§41): `MANUAL | AUTONOMOUS`.
- **Agent context** (§58): `Workspace, Project, Environment, Branch, Actor`; mutações preferem identificadores estáveis `workspaceId`/`projectId` (§59).
- **Webhooks** (§44): `project.updated, git.pushed, build.completed, build.failed, deployment.completed, deployment.failed, ai.task.completed` — autenticados e idempotentes.
- **CLI** (§42): `nexo project create|analyze|open|export`, `nexo git status|commit|push`, `nexo build`, `nexo test`, `nexo ai run`, `nexo deploy`. **SDK** (§43): `client.projects.create(...)` → `project.create`, sem lógica de negócio própria.
- **Versionamento** (§55): URL/Header/Protocol/Schema Version — definir antes de implementar. **Schemas** (§56): machine-readable, fonte única de verdade. **Agent Tool Schemas** (§57): ex. Tool `project.create` → Input `ProjectCreateRequest` → Output `ProjectCreateResult`.

### Capabilities expostas (por API)
- **Project API** (§30): `project.create, project.import, project.open, project.read, project.analyze, project.refresh, project.clone, project.export, project.archive, project.remove`.
- **File API** (§31): `file.read, file.write, file.create, file.delete, file.rename, file.move` — sempre com escopo de Project/Runtime autorizado; `file.write` ≠ acesso irrestrito ao filesystem.
- **Component API** (§32): `component.detect, component.read, component.create, component.update, component.delete, component.promote, component.publish` (via adapters ativos).
- **Media API** (§33): `media.list, media.read, media.upload, media.update, media.replace, media.delete`.
- **Design API** (§34): `design.read, design.update, design.token.read, design.token.update, theme.read, theme.update` (nomes finais dependem do Design Engine).
- **Responsive API** (§35): `responsive.createViewport, responsive.preview, responsive.diagnose, responsive.stressTest, responsive.readResult` (diagnósticos longos via Jobs).
- **Runtime API** (§36): `runtime.command.execute, runtime.process.list, runtime.process.start, runtime.process.stop, runtime.process.restart, runtime.build, runtime.test, runtime.preview.start, runtime.preview.stop`.
- **Git API** (§37): `git.status, git.history, git.diff, git.branch.create, git.branch.switch, git.branch.delete, git.commit, git.push, git.pull, git.fetch, git.merge, git.rebase, git.stash, git.revert, git.reset` (destrutivos com permissões/políticas próprias).
- **Deployment API** (§38): `deployment.preflight, deployment.deploy, deployment.status, deployment.verify, deployment.rollback` (cada operação inclui Project/Environment/Provider/Actor).
- **AI API** (§39): `ai.provider.list, ai.provider.select, ai.task.create, ai.task.read, ai.task.cancel, ai.task.approve, ai.task.reject, ai.capabilities.read`.
- **Capability Discovery** (§27–29): conceitualmente `GET capabilities` retornando capability → allowed/denied (ex.: `project.read → allowed … deployment.deploy → denied`), avaliado por contexto (Actor/Workspace/Project/Environment/Provider/Policy), sem revelar capabilities internas sensíveis.
- Paginação (§52: `projects.list, media.list, git.history, audit.list, jobs.list`), filtros estruturados (§53 — sem query syntax arbitrária de banco), ordenação explícita (§54).

### Modelo de segurança
- Autenticação definida em toda interface machine-facing (§21); identidades de máquina explícitas (Kimi Code Agent, Codex Agent, Luna Agent, Local AI Agent, CI Agent, Deployment Automation, Plugin, Service Account) distinguíveis do humano (§22).
- Autorização: Actor → Workspace Membership → Role/Permissions → Resource Scope → Project Scope → Environment → Policy → Capability (§24). Autenticação bem-sucedida nunca implica confiança.
- **Default Deny** (§25): estado de permissão desconhecido nunca vira autorização.
- Approval estruturado: operação retorna `REQUIRE_APPROVAL`; nunca executa silenciosamente (§26).
- Todos os entry points convergem no mesmo modelo central de autorização — proibido UI→Security A, API→Security B, CLI→No Security, AI→Security C (§73).
- Proibida API administrativa oculta/endpoint privilegiado não documentado; bypasses de dev não vão para produção (§74). API interna ≠ irrestrita (§75). Overrides de dev claramente separados, configuração explícita, nunca enfraquecem o Control Plane de produção (§76).
- Kimi Code e Codex integram via mecanismo programático oficial, sem browser/login visual/DOM (§67–68). Luna usa o mesmo Control Plane sem Playwright (§69). Local AI via API/CLI/SDK/Agent Tool Protocol, autenticada (§70). Automação auditável independentemente (§71). CI/CD com permissões mínimas ao workflow (§72).
- Controles de recurso: Rate Limits, Concurrent Jobs, Request Size, Output Limits, Timeouts, AI Task Limits, Deployment Limits (§77).

### Dependências
- Depende de: Nexo Engine/Application (doc 05 — toda operação alcança as mesmas capabilities), Runtime & Security (doc 04), Permission Model, Security architecture (auth final).
- Dependem dele: Web UI, Kimi Code, Codex, Luna, Local AI, External AI Agents, CLI, SDK, Automation, CI/CD, Plugins, Internal Services (§7).

### Invariantes não-negociáveis
1. Capabilities de domínio, nunca ações de UI; IDs estáveis independentes de rota de UI (§3, §12).
2. Paridade humano/agente sem duplicação de implementação (§4); paridade CLI↔Agent↔UI na mesma capability (§65–66).
3. Sem Playwright/browser automation para capabilities programáticas (§6, §81).
4. Consumidor nunca distingue "aceite do request" de "conclusão" — status model obrigatório (§15).
5. Operações longas retornam Job consultável/cancelável; progresso nunca fabricado (§17–19).
6. operationId correlaciona todas as camadas (§20).
7. Default Deny; aprovação explícita; contexto validado antes de mutação (§25–26, §60).
8. Idempotência onde retryável: `project.create, project.import, deployment.deploy, plugin.install, webhook processing` (§45).
9. `UNSUPPORTED` retornado em vez de implementação aproximada (§49); conflitos explícitos com dados para decidir refresh/retry/humano (§48).
10. Request inválido rejeitado antes de efeitos colaterais (§46).
11. Erros machine-readable com retryability (§50–51).
12. Breaking changes nunca invalidam agentes silenciosamente; versionamento definido (§55).
13. Observabilidade de workflow de agente como dados estruturados (status, fase, operações, arquivos, validações, erros, aprovações pendentes) — sem parsear logs de UI (§62).
14. Cancelamento de AI task propaga; rollback nunca alegado sem ocorrência real; resume não replaya operações destrutivas cegamente (§63–64).
15. Sem API administrativa oculta; interno ≠ irrestrito; todos os entry points na mesma autorização central (§73–75).

### Ordem de implementação (K3 Swarm Protocol, §84)
1. Ler `01-SYSTEM-ARCHITECTURE.md`; 2. Ler `04-RUNTIME-AND-SECURITY.md`; 3. Ler `05-NEXO-ENGINE.md`; 4. Identificar toda capability a expor; 5. Definir schemas de request/response; 6. Definir autenticação; 7. Definir autorização; 8. Definir resource scope; 9. Definir comportamento sync/async; 10. Definir códigos de erro; 11. Definir idempotência; 12. Definir operation IDs; 13. Definir comportamento de Jobs; 14. Definir versionamento; 15. Implementar contract tests; 16. Implementar workflow machine-agent end-to-end; 17. Verificar ausência de dependência de Playwright; 18. Verificar mesmas capabilities em UI/API/CLI/AI; 19. Pesquisar docs oficiais do protocolo/auth/integrações escolhidos; 20. Documentar decisões arquiteturais não resolvidas em vez de inventar.

### Acceptance criteria / testes exigidos
24 critérios (§83): capabilities invocáveis sem UI; UI/API/CLI/IA nas mesmas capabilities; Kimi Code, Codex, Luna e Local AI integrados sem Playwright; autenticação de máquina; autorização aplicada; capability discovery; requests/responses/erros estruturados; Jobs consultáveis/canceláveis; idempotência; versionamento; fronteiras cross-project/cross-workspace; nenhum consumidor exige automação de UI; ações de agente auditáveis; iniciador humano vs agente distinguíveis; IA não contorna Runtime/Domain security; capabilities públicas com contratos machine-readable.
Testes: API Security Testing (§78 — auth failure, cross-workspace/project, token revocation, expired credentials, capability/agent privilege escalation, malformed input, path traversal, command injection, replay, idempotency, concurrent requests); Contract Testing por capability pública (§79); Capability Discovery Testing por contexto (§80); Agent Parity Test e2e (§81: Authenticate → Select Project → Read → Create Component → Build → Test → Commit, sem browser); Full Agent Workflow Test (§82: Create → Analyze → Modify → Validate → Commit → Push → Deploy → Verify via interfaces programáticas oficiais).

### [AMBIGUO]/[NÃO ESPECIFICADO]
- Transporte concreto, rotas/endpoints REST literais (exceto conceituais `GET capabilities`, `POST capability`/`GET Job`): implementation-defined.
- Mecanismo final de autenticação: candidatos listados; escolha na Security architecture.
- Estratégia de versionamento: 4 opções; definir antes de implementar.
- Nomes finais das capabilities de Design (dependem do Design Engine).
- Estilo de paginação e valores de rate limits: decisão de implementação/deployment.
- Schemas exatos de request/response: a definir (protocolo K3, passo 5).

---

# SÍNTESE DO GRUPO

## (1) Superfície completa do Runtime
- **Filesystem** (escopo = Project Root → Allowed Project Scope; nada fora do escopo sem permissão superior explícita): `filesystem.read, filesystem.write, filesystem.create, filesystem.delete, filesystem.rename, filesystem.move`. Proteções: path traversal (`../`), absolute path escape, symlink escape (resolver target efetivo), unexpected mount; overwrite explícito; delete condicionado a autorização/referências/Git/risco; move sem cruzar projetos.
- **Processos**: `process.list, process.start, process.stop, process.restart, process.inspect`; registro com PID/PPID/Command/Args/CWD/Status/StartTime/ExitCode; ownership por projeto/sessão; stop/restart por identidade Nexo precisa — proibido kill genérico por nome.
- **Comandos**: `command.execute` com Command/Args/CWD/Env/Timeout/Cancel explícitos; preferência por execução direta de processo sobre shell; argumentos estruturados (anti-injection); classificação de política `SAFE/RESTRICTED/DANGEROUS/BLOCKED/UNKNOWN`; UNKNOWN sem autorização automática. Git normalmente via domínio Git, não comando arbitrário (git direto no terminal só com autorização explícita).
- **Derivadas**: `build.run, test.run, preview.start, preview.stop` (via Build/Test Adapters; resultados `SUCCESS/FAILED/CANCELLED/TIMEOUT/BLOCKED/ENVIRONMENT_ERROR`; preview isolado de produção com readiness real).
- **Permissões runtime**: `runtime.read, runtime.command.execute, runtime.command.execute_sensitive, runtime.process.*, runtime.files.*, runtime.build, runtime.test, runtime.preview`.
- Ambientes: Local/Remote/VPS/Container com o mesmo contrato; transporte remoto aberto (HTTP/RPC/WebSocket/Secure Agent Protocol/SSH).

## (2) Catálogo de capabilities do Nexo Engine (nome → descrição → domínio)
- `project.create/import/open/read/refresh/analyze/clone/export/archive/remove` → ciclo de vida do projeto → **ProjectService** (`analyze` → **ProjectIntelligenceService**).
- `component.detect/create/read/update/delete/promote/publish` → CRUD + promoção/publicação de componentes via adapters → **ComponentService**.
- `media.list/read/upload/update/replace/delete` → gestão de assets e referências → **MediaService**.
- Design (colors/typography/spacing/tokens/themes…) → mudanças de estilo na fonte de verdade do projeto → **DesignService** (via Styling Adapter).
- Responsive (viewport/preview/diagnostics/stress/overflow/comparison) → diagnóstico responsivo → **ResponsiveService**.
- `git.status/branch/commit/push/pull/fetch/merge/rebase/stash/revert/reset/history/diff` → Git estruturado → **GitService** (via Runtime/boundary Git).
- `runtime.command/process/build/test/preview` → execução segura → **RuntimeService** (delega ao doc 04).
- `ai.task` + AI Provider/Context/Tools/Modes/Validation → coordenação de IA → **AIService**.
- Integrações (scripts, embeds, widgets, custom HTML/CSS/JS, APIs) → **IntegrationService**.
- `deployment.preflight/deploy/verify/rollback` → orquestração de deploy → **DeploymentService** (Provider = vendor).
- Workspace/Membership/Roles/Permissions/Settings/Resources/Policies → **WorkspaceService**.
- Plugin Install/Activate/Deactivate/Update/Remove/Grants/Lifecycle → **PluginService**.

## (3) Contrato do Control Plane / Agent API
- **Entry points**: HTTP API, Agent API, CLI (`nexo project create`, `nexo git commit`, `nexo build/test/deploy`, `nexo ai run`…), SDK (`client.projects.create(...)`), Internal Application API, Job API, Webhook API, Plugin API — todos convergindo nas mesmas capabilities do Engine.
- **Auth**: candidatos API Key/OAuth/Short-Lived Token/Service Identity/Signed Request/Session Credential (escolha na Security); identidades de máquina explícitas; atribuição dupla `initiatedBy`/`executedBy`; default deny; approval via `REQUIRE_APPROVAL`; mesma autorização central para todos os entry points.
- **Capability discovery**: conceitualmente `GET capabilities` → mapa capability → allowed/denied, contextual (actor/workspace/project/environment/provider/policy), sem vazar capabilities internas sensíveis.
- **Invocação**: `POST capability` → resultado síncrono (operações pequenas) ou Job ID → `GET Job` (operações longas: `project.analyze, runtime.build/test, ai.task.create, deployment.deploy`). Job: `id/type/status/createdAt/startedAt/completedAt/owner/workspaceId/projectId/progress/result/error`; `job.cancel` → `CANCEL_REQUESTED/CANCELLED/CANCEL_FAILED/ALREADY_COMPLETED`.
- **Erros**: `code/message/operationId/resource/retryable/requiresApproval/requiredCapability/details`; códigos `NOT_FOUND, CONFLICT, STALE_CONTEXT, UNSUPPORTED`; status `PENDING/RUNNING/WAITING_APPROVAL/SUCCEEDED/FAILED/PARTIAL/CANCELLED/BLOCKED/CONFLICT`.
- **Eventos/webhooks**: `project.updated, git.pushed, build.completed/failed, deployment.completed/failed, ai.task.completed` (autenticados, idempotentes).
- Versionamento obrigatório; schemas machine-readable de fonte única; Agent Tool Schemas mapeiam 1:1 (ex.: `project.create` → `ProjectCreateRequest`/`ProjectCreateResult`); sem Playwright para qualquer capability programática.

## (4) Regras de segurança (15 bullets)
1. **DEFAULT DENY + EXPLICIT CAPABILITY + EXPLICIT SCOPE + POLICY + AUDIT** — ausência de deny não é autorização (doc 04 §59; doc 06 §25).
2. Runtime executa, nunca decide; decisão vem de Application + Authorization/Policy (doc 04 §2).
3. Domain code nunca acessa FS/Process/Shell/OS diretamente — sempre via Runtime (doc 04 §5).
4. Filesystem limitado ao escopo do projeto; path traversal, symlink escape e mount inesperado rejeitados (doc 04 §8–9, §15).
5. Argumentos estruturados em vez de interpolação em shell; preferir execução direta de processo (doc 04 §23–24).
6. Comandos classificados SAFE/RESTRICTED/DANGEROUS/BLOCKED/UNKNOWN; UNKNOWN não ganha autorização (doc 04 §25).
7. IA passa pelo mesmo boundary que humanos — proibido "AI command bypass"; IA não herda permissões do iniciador (doc 04 §26, §62; doc 05 §48).
8. Localhost/rede interna/browser/processo conhecido não são confiança; sem security through obscurity (doc 04 §65, §80).
9. Agentes externos autenticam por mecanismo programático oficial, nunca cookies de sessão de browser; credenciais com dono, escopo limitado, revogáveis, auditáveis (doc 04 §68–69).
10. Secrets injetados só quando necessário; jamais em logs/audit/diffs/AI context/erros/UI; redação antes de propagar output; ciclo Store/Use/Rotate/Revoke/Audit (doc 04 §28–29, §70–71).
11. Aprovação humana separada de autenticação para operações destrutivas/sensíveis/produção/irreversíveis; resposta `REQUIRE_APPROVAL` estruturada (doc 04 §63–64; doc 06 §26).
12. Todos os entry points (UI/API/CLI/AI/Plugin) convergem no mesmo modelo central de autorização; sem API admin oculta; interno ≠ irrestrito (doc 06 §73–75).
13. Processos identificados por identidade Nexo; stop/restart precisos; sem kill por padrão genérico (doc 04 §48).
14. Sucesso só quando a operação real completou; timeout/cancel/estado desconhecido/parcial representados explicitamente; recovery nunca inventa sucesso (doc 04 §46, §54, §75; doc 05 §58, §74).
15. Plugins isolados: sem acesso irrestrito ao OS/Core por estarem instalados; Runtime access de plugin com escopo e auditoria (doc 04 §58; doc 05 §38, §70).
