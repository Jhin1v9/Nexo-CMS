# GROUP F — Resumos: GIT AND VERSIONING (10), AI ENGINE AND LUNA (11), INTEGRATIONS AND DEPLOYMENT (12)

Fontes: `10-GIT-AND-VERSIONING.md` (1522 linhas), `11-AI-ENGINE-AND-LUNA.md` (2139 linhas), `12-INTEGRATIONS-AND-DEPLOYMENT.md` (1581 linhas). Leitura integral realizada.

---

## NEXO CMS — GIT AND VERSIONING (Doc 10)

### Responsabilidade e fronteiras
- Define o subsistema Git e de controle de versão do Nexo CMS. Git é **capacidade arquitetural obrigatória**: o sistema deve trabalhar com repositórios Git e estado Git **reais**; é proibido criar uma camada falsa de versionamento que apenas se assemelhe a Git (§1, §83).
- Nexo é **consumidor e coordenador** de Git, não o dono do Git. Cadeia arquitetural: `Human / AI / CLI / Automation → Nexo Git API → Git Service → Authorization → Runtime → Real Git Repository → Git Remote Provider` (§3, §83).
- Fronteiras: Projeto Nexo ≠ Repositório Git (um projeto pode ser a raiz do repo, um subdiretório, ou um app dentro de monorepo; `Nexo Project ID` permanece separado da identidade do repositório — §5, §6). Git Engine ≠ GitHub API (operações de provider ficam dentro da integração do provider — §29, §74). Editor Diff ≠ Git Diff (§12). Snapshots Nexo são suplementares, nunca uma segunda história incompatível (§68).
- Divisão Git Service vs Runtime: Git Service responde por semântica de comando, interpretação de estado, autorização e resultado estruturado; Runtime responde por execução de processo (§51).

### Stack/tecnologias
- Git real (CLI/versão do ambiente deve ser inspecionada; o doc **não** nomeia uma lib específica como libgit2/simple-git — [NÃO ESPECIFICADO] qual lib/CLI exata).
- Providers Git: GitHub (único detalhado), com abstração genérica de provider permitindo futuros GitLab, Bitbucket, Gitea, Self-hosted Git (§74).
- Autenticação de provider: OAuth, Personal Access Token, SSH, Provider Credential, Service Identity — seguindo documentação oficial vigente, "do not invent authentication flows" (§32).

### Contratos
- **Estados de repositório** (§8): `CLEAN, MODIFIED, UNTRACKED, STAGED, CONFLICTED, DETACHED_HEAD, REBASE_IN_PROGRESS, MERGE_IN_PROGRESS, CHERRY_PICK_IN_PROGRESS, REVERT_IN_PROGRESS, NO_REPOSITORY, UNKNOWN` (extensível).
- **Working tree** (§9): `Untracked, Modified, Deleted, Renamed, Copied, Staged, Unmerged` — proibido reduzir tudo a um flag `dirty`.
- **`git.status`** (§10) deve fornecer: Branch, HEAD, Tracking Branch, Ahead, Behind, Staged Changes, Unstaged Changes, Untracked Files, Conflicts, Repository State (schema exato definido pelo Control Plane).
- **Comparações de diff** (§11): Working Tree vs HEAD, Staged vs HEAD, Branch vs Branch, Commit vs Commit, Commit vs Parent.
- **Branch switching** (§16) resulta em: `SWITCHED, BLOCKED, CONFLICT, REQUIRES_STASH, REQUIRES_COMMIT`.
- **Merge** (§34) resulta em: `MERGED, CONFLICT, FAILED`. Rebase expõe (§36): `Rebase Started, Rebase In Progress, Conflict, Rebase Completed, Rebase Aborted`. Reset subdividido em `Soft / Mixed / Hard` (§39).
- **Remote state** (§45): `LOCAL, REMOTE, AHEAD, BEHIND, DIVERGED, UNKNOWN`.
- **Erros Git classificados** (§62): `RepositoryNotFound, BranchNotFound, RemoteNotFound, AuthenticationFailed, PermissionDenied, MergeConflict, RebaseConflict, WorkingTreeDirty, NoTrackingBranch, NonFastForward, HookFailed, InvalidReference, UnknownGitError`. Erros devem ser machine-readable para que agentes decidam: Retry / Fetch / Pull / Resolve Conflict / Ask for Approval / Change Branch / Stop (§63).
- **API entry points** (§80) — mínimo: `git.status, git.diff, git.history, git.branch.list, git.branch.create, git.branch.switch, git.branch.delete, git.commit, git.push, git.pull, git.fetch`; avançado: `git.merge, git.rebase, git.stash, git.revert, git.reset, git.cherryPick`; alto risco: `git.forcePush, git.resetHard, git.branch.deleteForce` (permissões explícitas separadas).
- Operações suportadas (§2): inspect status/history/diffs, create/switch branches, commits, push, pull, fetch, merge, rebase, stash, revert, reset, clone, configurar remotes, criar repositórios via providers.
- Cada operação significativa tem **Operation ID** para rastreio `AI Request → git.commit → Runtime Process → Git Result → Audit` (§64). Operações longas viram **Jobs** com progresso: Clone, Fetch de repo grande, Large Push, Rebase, Merge (§65).

### Capabilities expostas
- Detecção de repositório (raiz, branch atual, HEAD, working tree status, remotes, upstream — §7); identidade de repositório (Repository Root, Remote URLs, Current Branch, HEAD, Repository Provider, Repository Identifier — §6); branches (list/create/delete/switch/track/get current — §14); commit com escopo (All Changes / Selected Files / Selected Hunks — §20) e mensagem explícita (§21); remotes (list/add/update/remove/select — §28); stash (`stash, stash list, stash apply, stash pop, stash drop` — §37); history (hash, author, committer, message, date, parents, branch refs — §41); commit detail (§42); criação de repositório local/remoto/local+remoto (§30); visibilidade Public/Private/Internal/Provider-Specific (§31); inicialização explícita de repo (`Initialize Git Repository` — §75) com verificação pós-init (§76).

### Regras de segurança/autorização
- **Commit**: fluxo Review Changes → Authorization → Validate Repository → Stage Selected → Create Commit → Verify Commit → Return Result; nunca reportar sucesso antes da confirmação do Git (§19). Mensagem gerada por AI ≠ autorização automática de commit (§21).
- **AI Commit**: permitido somente com permissão `git.commit`, policy, validação e aprovações; AI deve usar o Git Service, **não** comandos shell arbitrários como caminho normal (§23, §52).
- **Permissões separadas**: `git.push` vs `git.forcePush` — force push nunca implicitamente incluído em push comum (§25). Operações de alto risco (`git.forcePush`, `git.resetHard`, `git.branch.deleteForce`) não herdam permissões normais (§70). `hard` reset exige autorização elevada ou confirmação explícita (§39). Force delete de branch é capability separada de alto risco (§17).
- **Aprovação humana** pode ser exigida para: force push, hard reset, deletar branches protegidas, reescrever história, modificações em branch de produção — aprovação é controle adicional, não substitui autorização (§72). AI autônoma obedece às mesmas restrições (§71).
- **Branch protection do provider**: permissão local não implica permissão remota; `Local git.push → SUCCESS` + `Remote provider → DENIED` deve ser representado com precisão (§44).
- **Credenciais**: nunca expostas em logs, audit, contexto de AI, saída de terminal, mensagens de erro; armazenadas via mecanismo de secrets (§33). URLs remotas com credenciais embutidas devem ser redigidas/sanitizadas (§61).
- **Git hooks**: executam código controlado pelo projeto — `git commit` pode implicitamente executar lógica local; a política de segurança deve contabilizar isso e uma operação Git aparentemente simples pode exigir permissões de Runtime (§54, §55).
- **Safety pré-operações destrutivas**: inspecionar Working Tree, Branch, Current Operation, Uncommitted Changes, Tracking Branch, Conflicts; não executar cegamente por clique ou pedido de AI (§47). Concorrência: re-checar estado antes de mutações; optimistic concurrency com Expected HEAD vs Actual HEAD → falhar com conflito (§66, §67).
- **Escopo de comandos Git para AI**: somente capabilities estruturadas (`git.status`, `git.diff`, `git.commit`, `git.push`...); shell arbitrário só via permissões explícitas de terminal e não é o caminho preferido (§52). Automação usa identidades de máquina com permissões escopadas ao workflow (§53).

### Dependências
- `01-SYSTEM-ARCHITECTURE.md`, `04-RUNTIME-AND-SECURITY.md`, `05-NEXO-ENGINE.md`, `06-CONTROL-PLANE-AND-AGENT-API.md` (leitura obrigatória — §82); Runtime (execução de processos); Authorization; Control Plane (define schema exato de `git.status`); Project Intelligence (refresh após checkout/merge/rebase/reset/pull — §49, §60); Adapters (info de arquivos gerados/fonte/artefatos — §50); mecanismo de Secret Management; provider GitHub (e abstração genérica); documentação oficial do Git da versão do ambiente.

### Invariantes
- Estado Git vem do Git real, nunca de metadata cacheada do Nexo quando estado real está disponível (§7).
- Nenhum sistema falso de versionamento substitui Git; Git permanece autoridade sobre estado, história e semântica (§83).
- Projeto sem Git deve representar o estado explicitamente; proibido alegar versionamento inexistente (§4).
- Push e commit são operações separadas — sucesso de commit não implica sucesso de push; ambos os resultados são preservados (§24). Pull e fetch são separados (§27). Revert ≠ reset (§38).
- `Saved` (Editor) ≠ `Committed` (Git) (§48). Não descartar mudanças silenciosamente em switch/pull (§16, §26). Não reportar merge completo com conflitos pendentes (§35). Não alegar sincronização quando divergido (§45). Não alegar ponto de recuperação inexistente (§69). Não criar repositório público por acidente (§30). Não inicializar Git apenas porque um projeto foi importado (§75). Não alterar semântica de identidade Git sem configuração explícita (§22).
- AI recebe o **mínimo** de histórico relevante, não o repositório inteiro (§43, §79). Mensagem de commit gerada por AI deve refletir mudanças reais; AI não deve fabricar mudanças (§78). Nomes de branch sugeridos por AI não bypassam validação Git (§77).

### Ordem de implementação (§82, K3 Swarm)
1. Ler 01-System-Architecture; 2. Ler 04-Runtime-and-Security; 3. Ler 05-Nexo-Engine; 4. Ler 06-Control-Plane-and-Agent-API; 5. Inspecionar versão real do Git no ambiente; 6. Consultar documentação oficial do Git; 7. Comandos e resultados estruturados; 8. Detecção de repositório/branch; 9. Status e diff; 10. Commit; 11. Sincronização remota; 12. Tratamento de conflitos; 13. Permissões de operações de alto risco; 14. Abstração de Git provider; 15. Testes contra repos reais e fixtures temporários; 16. Testar acesso AI pelo mesmo Git Service; 17. Verificar que nenhuma capability Git depende de automação de UI; 18. Testar falha, cancelamento e mudanças externas.

### Acceptance criteria / validação (§81 — 22 itens)
Estado vem do Git real; identidade de repo distinta de Project ID; working tree preciso; branches gerenciáveis; commits criáveis; escopo de commit visível; push≠commit; pull≠fetch; remote state inspecionável; conflitos de merge e rebase representados; operações de alto risco com permissões separadas; credenciais protegidas; providers separados do Git Engine; AI executa operações Git autorizadas programaticamente; UI e AI usam o mesmo Git Service; mudanças Git disparam refresh de Project Intelligence; hooks e efeitos colaterais contabilizados; falhas Git estruturadas; operações auditáveis; recuperação explícita; nenhum versionamento falso.

### [AMBIGUO]/[NÃO ESPECIFICADO]
- [NÃO ESPECIFICADO] Biblioteca/CLI Git concreta (libgit2, simple-git, shell-out) — o doc manda inspecionar o ambiente.
- [NÃO ESPECIFICADO] Schema exato de `git.status` ("defined by the Control Plane implementation").
- [NÃO ESPECIFICADO] Mecanismo concreto de secrets e de machine authentication.
- [NÃO ESPECIFICADO] Tratamento escolhido para Git hooks ("the agent must verify actual Git behavior and document the chosen handling" — §54).
- [AMBIGUO] Suporte a Selected Hunks no commit ("where supported" — §20); cherry-pick "may be supported" (§40); criação de repositório "should eventually support" (§30) — escopo de release não fixado.

---

## NEXO CMS — AI ENGINE AND LUNA (Doc 11)

### Responsabilidade e fronteiras
- Define o Nexo AI Engine, arquitetura de providers de AI, sistema de contexto, AI Tools, modos de execução e integração Luna. Regra central: **AI é consumidor first-class de capabilities Nexo — não um usuário de browser especial nem um processo de SO irrestrito** (§1).
- Cadeia: `AI PROVIDER → AI ENGINE → AI CONTEXT → AI PLANNER/EXECUTOR → AI TOOLS → NEXO ENGINE → DOMAIN CAPABILITIES → ADAPTER/RUNTIME/PROVIDER` (§3). O provider fornece inteligência de modelo; o Nexo controla contexto, capabilities, tools, permissões, policies, execução, validação e auditoria.
- Fronteira: AI **não** é a arquitetura — proibido `AI → decide tudo → filesystem direto → Git direto → deploy direto`; correto: `AI → requests capability → Nexo authorization → Nexo Engine → subsystem` (§4). "The model provides intelligence. Nexo provides capabilities, permissions and execution." (§103).
- Luna: integrada via interface dedicada Provider/Agent; preferido `Luna → Nexo Agent Interface → Authentication → Authorization → Nexo Engine`, **não** `Luna → Browser → Playwright → Nexo UI` quando acesso programático existe (§10, §11). Nexo não reimplementa internals da Luna (§12).

### Stack/tecnologias
- Providers de AI iniciais (lista não exaustiva, §5): **Kimi, Luna, OpenAI, Anthropic, Gemini, Local Models, Custom Providers**.
- Local models como providers first-class, comunicando via HTTP, OpenAI-compatible API, Local Process ou Custom Runtime (§9).
- Tool/function-calling: usar mecanismo oficial estruturado do provider (não parsing de texto livre) conforme documentação oficial vigente (§84); camada de provider normaliza diferenças de tool support (§85).
- Exigência de pesquisa: consultar docs oficiais de Kimi, OpenAI, Anthropic, Gemini, Local Model Runtime, Tool Calling, Streaming, Authentication, Context APIs antes de implementar (§100).

### Contratos
- **AI Provider Contract** (§6): `identify()`, `getModels()`, `generate()`, `stream()`, `cancel()` (onde suportado; interface exata depende da implementação).
- **Provider Metadata** (§7): Provider ID, Provider Name, Model ID, Model Capabilities, Context Limits, Tool Support, Streaming Support, Vision Support, Reasoning Support — tratados como dados, não suposições.
- **AI Tool Contract** (§27): `Tool ID, Description, Input Schema, Output Schema, Required Permission, Scope, Side Effects, Async Behavior, Error Model`.
- **Tools exemplificadas** (§26): `project.read, project.analyze, file.read, file.write, component.create, component.update, media.search, git.status, git.diff, git.commit, runtime.command.execute, runtime.build, runtime.test, responsive.diagnose, deployment.deploy`. Também: `file.create, file.delete` (§34), `route.create` (§29), `design.token.update` (§56), `deployment.preflight, deployment.verify` (§57), `component.read` (§64).
- **Tool Result** (§31): `status, operationId, resource, result, warnings, diagnostics, job, error`.
- **Tool errors** (§32): `INVALID_INPUT, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, UNSUPPORTED, RUNTIME_FAILURE, BUILD_FAILURE, TIMEOUT, CANCELLED` → AI decide Retry / Change Plan / Ask User / Request Approval / Stop.
- **Tool Call Validation** (§83): `Tool Exists, Tool Available, Input Valid, Actor Authorized, Project Accessible, Policy Allows`.
- **Plan Object** (§37): `Task, Assumptions, Steps, Required Capabilities, Affected Resources, Validation Plan, Rollback Strategy` — suposições devem ser identificadas explicitamente.
- **AI Task States** (§45): `QUEUED, PLANNING, WAITING_APPROVAL, EXECUTING, VALIDATING, BLOCKED, COMPLETED, FAILED, CANCELLED` (extensível).
- **Context freshness** (§21): `FRESH, STALE, PARTIAL, UNKNOWN`.
- **Autorização AI** (§16): `ALLOW / DENY / REQUIRE_APPROVAL`.
- **Modo Manual** (§38): `User Request → AI Analysis → Plan → Proposed Changes → Diff → Approval → Execution → Validation` — AI não aplica mutações antes da aprovação exigida.
- **Modo Autônomo** (§39): `Task → Understand → Plan → Execute → Validate → Repair if authorized → Complete` — autonomia **não** bypassa autorização, policy, restrições de Runtime, manejo de secrets, auditoria nem aprovações exigidas.
- **AI Diff** (§43): `Files, Before, After, Added, Removed, Modified` + origem `AI Agent, Task ID`.
- **AI Final Report** (§75): `Status, Summary, Files Changed, Operations Performed, Validation Results, Git Result, Deployment Result (quando aplicável), Warnings, Remaining Issues` — estado estruturado é autoritativo, resposta textual do modelo é apenas sumário.
- **Observabilidade** (§63): Task ID, Operation ID, Agent ID, Human Initiator, Provider, Model, Project, Workspace, Tools Used, Files Changed, Result.
- **Tool budget** (§68): Maximum Tool Calls / Runtime Duration / File Mutations / Retry Count / Cost / Concurrent Jobs — policy/config, não hardcoded em adapters. **Context budget** (§69): Maximum Context Size / File Size / Number of Files / History.
- **Luna integration** (§76): `Luna Identity, Authentication, Capabilities, Tool Access, Task Interface, Result Interface, Audit Context`. Luna Tool Translation: `Luna Tool → Nexo Capability`, sem duplicar a operação de domínio (§78).
- Identidades: `Kimi Agent, Codex Agent, Luna Agent, Local AI Agent, Automation Agent` (§13); preservar `Initiated By: Human User` / `Executed By: AI Agent` (§14). Machine auth: API Key, OAuth, Short-Lived Token, Service Identity, Signed Request (§15 — definido por Security e Control Plane).

### Capabilities expostas
- AI pode (com permissão+policy): entender projetos, inspecionar estrutura, raciocinar sobre código, planejar, editar arquivos, criar páginas/componentes, modificar componentes, gerenciar mídia, analisar problemas responsivos, rodar builds/testes, inspecionar Git, criar commits, push, deploy, verificar, recuperar, executar workflows de engenharia multi-step (§2).
- Context Engine: seleção de contexto task-specific (identidade do projeto, stack, versões, rotas, páginas, componentes, arquivos relevantes, estilos, assets, dependências, Git state, build state, diagnostics, task ativa — §19, §20); proveniência de contexto (§23); ordem de autoridade: Actual Source Project → Runtime Observation → Git State → Project Intelligence → Cached Metadata → AI Assumption (§24); estratégias de limite: Relevant File Selection, Summarization, Chunking, Prioritization, Tool Retrieval, Incremental Context (§25).
- Tool Discovery dinâmico por contexto (§28, §29); capability hiding de tools proibidas quando apropriado (§28).
- Planning, retry autônomo (somente erro retryable + policy + sem efeitos duplicados inseguros — §40), validation loop (Inspect→Modify→Validate→Observe→Fix→Validate Again — §41), hierarquia de edição: Structured Domain Capability → Adapter-backed Source Transformation → Targeted File Mutation → Generic File Write (§42).
- Task persistence fora do browser (§46), cancelamento (§47), resume com Completed/Current/Pending Steps + Operation IDs + Failures, sem repetir passos destrutivos (§48).
- Multi-model (Planner/Coder/Validator — §89), model handoff preservando Task Context, Project Context, Permissions, Tool Availability, Current State sem transferir secrets (§90), multi-agent (Planner/Developer/Tester — §92), delegação com escopo concedido preservando Parent/Child/Human Initiator (§93).

### Regras de segurança/autorização
- **AI nunca bypassa Security/Runtime/Engine**: toda operação AI passa pelo modelo de autorização Nexo; sem modo privilegiado oculto (§16). Execução de tool: `AI Model → Tool Request → Input Validation → Authorization → Policy → Nexo Engine → Tool Result → AI Model` (§30).
- **Permission parity** (§17): AI faz as mesmas capabilities que humano quando há entry point programático + permissão + policy + aprovações. **Sem herança automática**: permissões humanas não viram permissões de AI; ex.: humano `deployment.production → ALLOW`, AI `→ DENY` é válido (§18).
- **Tool Security** (§33): tool nunca expõe mais privilégio que a capability correspondente (ex.: `git.push` exige a mesma permissão via tool).
- Comandos gerados por AI são **input não confiável** até Validated/Authorized/Policy Checked (§61). Preferir capabilities estruturadas a `runtime.command.execute("git commit ...")` (§35).
- **Secrets**: contexto AI não deve conter API keys, passwords, private keys, tokens, secret env values, provider credentials; preferir tools que consomem secrets internamente (ex.: `deployment.deploy` em vez de AI receber senha de produção — §58, §59).
- Acesso de rede do provider AI ≠ acesso de rede do projeto; permissões de rede explícitas (§60).
- Operações destrutivas em modo autônomo (Delete Project, Delete File, Force Push, Hard Reset, Production Deployment, Secret Rotation) podem exigir aprovação mesmo com edição autônoma (§62). Aprovação estruturada pode ser exigida Before Change / Commit / Push / Production Deploy (§44).
- Inteligência do modelo **nunca** determina autorização ("Most capable model ≠ Most privileged model" — §87, §88). Modelo mais capaz não recebe permissões mais amplas (§87). Agente filho não herda permissões irrestritas (§93). Plugins/custom tools não conferem privilégios arbitrários (§94, §95). Luna sujeita ao mesmo modelo de autorização; ser a AI "da casa" não concede bypass (§79, §80).
- **Anti-alucinação**: tools retornam informação estruturada autoritativa com `Confidence: CONFIRMED` + Evidence (§65); precondições de ação rejeitam operação quando componente desconhecido/adapter indisponível/projeto stale (§66); "Done." do modelo não é evidência de sucesso — confiar em Tool/Runtime/Build/Test/Git/Deployment results (§72, §99); conversa não é estado de projeto (§71); AI memory não sobrepõe estado real (§70).

### Dependências
- Leituras obrigatórias: `01-SYSTEM-ARCHITECTURE.md`, `03-ADAPTER-SYSTEM.md`, `04-RUNTIME-AND-SECURITY.md`, `05-NEXO-ENGINE.md`, `06-CONTROL-PLANE-AND-AGENT-API.md` (§102).
- Subsistemas: Project Intelligence, Project Model/Graph, Adapters, Runtime, Git Domain, Component/Media Engines, Responsive Lab, Design, Deployment, Secret Management, Plugin System, Control Plane, Security/Policy (autorização). Docs oficiais de cada provider AI.

### Invariantes
- AI usa capabilities Nexo, nunca recria lógica da plataforma (§2); AI nunca recebe modo privilegiado oculto (§16); autonomia não bypassa authorization/policy/Runtime/secrets/audit/aprovações (§39); tools correspondem a operações Nexo reais (§26); modelo não precisa adivinhar parâmetros de tool (§27); modelo não interpreta screenshots/mensagens de UI para saber o que aconteceu (§31); não enviar repo inteiro a cada modelo (§19); não agir sobre fonte conhecidamente stale (§21); não truncar cegamente código crítico (§25); ações destrutivas não são repetidas cegamente (§40, §48); task state sobrevive a refresh do browser (§46); suposições de AI nunca são fatos autoritativos (§24); falha de provider não destrói projeto (§81); erros de modelo (Invalid Tool Call, Malformed Output, Context Overflow, Provider Timeout, Unsupported Tool Format) são falhas da camada AI, não sucessos (§82); nenhuma operação interna depende de Playwright (§97, §102).
- Provider não recebe acesso irrestrito ao Runtime só porque gera respostas (§6); local AI ≠ acesso local irrestrito (§9).

### Ordem de implementação (§102, K3 Swarm)
1. Ler 01-System-Architecture; 2. Ler 03-Adapter-System; 3. Ler 04-Runtime-and-Security; 4. Ler 05-Nexo-Engine; 5. Ler 06-Control-Plane-and-Agent-API; 6. Ler este doc completo; 7. Inspecionar APIs dos providers selecionados; 8. Pesquisar documentação oficial vigente; 9. Abstração de provider; 10. AI Context Engine; 11. Tool Contract; 12. Tool Validation; 13. Modo manual; 14. Modo autônomo atrás de permissões; 15. Fronteira de integração Luna; 16. Persistência de AI tasks; 17. Cancelamento; 18. Fixture tasks determinísticas; 19. Verificar paridade humano/AI; 20. Verificar que AI não bypassa Runtime/Authorization; 21. Verificar ausência de dependência de Playwright.

### Acceptance criteria / validação (§101 — 30 itens)
Múltiplos providers; providers isolados atrás de contratos; local AI como provider; fronteira Luna explícita; identidade de máquina; distinção iniciador humano vs agente; capabilities controladas por autorização; paridade humano/AI; sem Playwright para controle interno; contexto task-specific; freshness representada; secrets não expostos; tools com contratos machine-readable; tool calls validadas; execução via autorização Nexo; tasks persistentes; cancelamento; claims textuais não autoritativos; diffs reais; uso de Project Intelligence, Adapters, Runtime, Git, Component/Media, responsive diagnosis; modo autônomo respeitando Security; aprovação para alto risco; falha de provider não corrompe projeto; multi-agente auditável; workflow completo sem automação de browser.
Testes (§96–§98): determinísticos (tool selection/validation/authorization/errors/context selection/provider errors/task state/cancellation/retries/diff handling/validation loop); integração Agent→Authenticate→Discover→Read→Modify→Validate→Git sem browser; fixtures determinísticas (CSS bug conhecido, componente conhecido, design token, testes, commit).

### [AMBIGUO]/[NÃO ESPECIFICADO]
- [NÃO ESPECIFICADO] Interface exata do provider ("depends on the chosen implementation" — §6) e mecanismo de machine authentication (§15 — delegado a Security/Control Plane).
- [NÃO ESPECIFICADO] Schema concreto de AI task (campos, formato de armazenamento) — apenas estados e conteúdo conceitual.
- [AMBIGUO] Luna: não está claro se Luna é provider de modelo, agente externo, ou ambos ("conceptually different from an ordinary remote model if it already possesses its own execution, tools or internal orchestration" — §10); natureza local/remota/interna/externa em aberto (§77).
- [AMBIGUO] Quais providers entram no primeiro release — lista é "initial possible" (§5).
- [AMBIGUO] Streaming de tools "may" (§86); multi-model "may eventually" (§89); custom tools "in the future" (§95).

---

## NEXO CMS — INTEGRATIONS AND DEPLOYMENT (Doc 12)

### Responsabilidade e fronteiras
- Define o sistema de integrações externas (scripts, widgets, embeds, APIs) e o sistema de deployment do Nexo, sem acoplar o Core a um vendor específico. Princípio: **tecnologia externa permanece externa ao Core e conecta via contratos explícitos** (§2); serviços externos não controlam o Core diretamente (§3).
- Arquitetura: `NEXO ENGINE → {INTEGRATION ENGINE → Widget/Script/API providers, DEPLOYMENT ENGINE → Vercel/Hostinger/SSH} → SOURCE PROJECT` (§3). "Nexo owns the capability and contract. The external provider owns the provider-specific implementation." (§82).
- Fronteiras: Component layer provê configuração visual de widgets; Integration layer é dona do comportamento provider-specific (§20). Deployment Provider não entende a estrutura interna do source, a menos que a plataforma seja dona do build (§41). Registros de deployment ficam separados do histórico Git (§51). Deployment ≠ "write files" para AI (Doc 11 §57; Doc 12 §53).

### Stack/tecnologias
- **Deployment providers iniciais** (lista extensível, §34): **Vercel, Hostinger, SSH, SFTP, FTP, Docker**.
- Vercel: API oficial (auth, project linking, deployment creation, status, env vars, domains, rollback/restore) verificada contra docs oficiais; proibido hardcodar comportamento não documentado (§58).
- Hostinger: mecanismo pode ser Git, SSH, SFTP, FTP ou Provider API dependendo do produto; proibido assumir API uniforme entre produtos Hostinger (§59).
- SSH deployment: Host, Port, User, Authentication, Remote Path, Build Strategy, Restart Strategy, Verification (§60). SFTP: distingue Upload/Delete/Replace/Sync (§61). FTP: só quando o alvo exige; comunicar características de segurança; nunca fazer downgrade silencioso de mecanismo seguro para FTP (§62). Docker: Build/Tag/Push Image, Run/Update Container, Health Check, Rollback — implementar só quando requerido (§63).
- Tipos de integração (§4): Inline HTML, Inline CSS, Inline JavaScript, External Script, External Stylesheet, iframe, Widget, API Integration, Webhook, SDK Integration, Embed, Third-Party Component.
- Autenticação de provider: OAuth, API Token, SSH, Provider Credential, Service Identity (§57).

### Contratos
- **Integration identity** (§5): `ID, Name, Type, Scope, Provider, Configuration, Credentials, Permissions, Status, Metadata`. Escopo (§6): `Platform, Workspace, Project, Environment, Component, Page` — explícito; integração de Project não vaza automaticamente para o Workspace.
- **Lifecycle de integração** (§7): `DRAFT, CONFIGURED, VALIDATED, ACTIVE, DISABLED, ERROR, REMOVED`. Instalação (§8): Select → Check Compatibility → Configure → Validate → Authorize → Apply to Project → Verify → Register. Registry (§9): `ID, Name, Version, Type, Capabilities, Configuration Schema, Permissions, Dependencies, Compatibility, Security Requirements`.
- **Script loading** (§13): Source URL, Provider, Load Strategy, Scope, Integrity (quando suportado), Dependencies. Script scope (§14): Global/Page/Component/Environment. Posição (§15): Head, Body Start, Body End, Component, Page Region, Framework-Specific Entry Point. Ordenação explícita (§16). Classificação de scripts (§12): Trusted Provider / User-Approved Script / Unknown Script / Blocked Script.
- **iframe** (§17): URL, Width, Height, Responsive Behavior, Sandbox Policy, Allow Attributes, Loading Policy; permissões mínimas entre camera/microphone/geolocation/fullscreen/payment/clipboard (§18).
- **API integration** (§21): Base URL, Endpoints, Authentication, Headers, Request Schema, Response Schema, Environment, Secrets. Credenciais (§22): Public/Private/Secret/Environment-Specific/Provider Managed.
- **Webhook** (§24): Incoming/Outgoing, Event Mapping, Signature Verification, Retry; verificação por mecanismo do provider — não confiar só pela URL (§25).
- **Deployment Provider capability model** (§35): `Deploy, Preview, Rollback, Logs, Environment Variables, Domains, Build, Artifact Upload, Status` — features não suportadas declaradas explicitamente.
- **Deployment Target** (§36): `Project, Environment, Provider, Target, Configuration`. Environments (§37): `Development, Preview, Staging, Production, Custom`. Config (§38): Build Command, Output Directory, Environment Variables, Node/Runtime Version, Framework, Provider Configuration, Domain, Branch.
- **Preflight** (§39): Project Accessible, Git State, Build Configuration, Dependencies, Build, Environment Variables, Provider Authentication, Target Configuration, Required Permissions. Resultado (§40): `READY, WARNINGS, BLOCKED, FAILED` — deploy não prossegue com condição bloqueante.
- **Deployment flow** (§42): Request → Resolve Project → Resolve Environment → Resolve Provider → Authorization → Preflight → Build if required → Deploy → Wait for Provider Result → Verify → Persist Deployment State → Audit.
- **Deployment states** (§43): `DRAFT, READY, PREPARING, BUILDING, UPLOADING, DEPLOYING, VERIFYING, SUCCEEDED, FAILED, CANCELLED, ROLLED_BACK, UNKNOWN` (estados de provider normalizados nestes conceituais).
- **Cancel** (§48): `CANCEL_REQUESTED, CANCELLED, ALREADY_COMPLETED, CANCEL_FAILED`.
- **Rollback** (§49): distinguir `Rollback to Previous Deployment / Redeploy Previous Commit / Provider Rollback / Git Revert` — não idênticos; sem provider nativo, Nexo pode reconstruir deploy de uma revisão conhecida; não chamar de "rollback" o que não restaura o estado pretendido (§50).
- **Deployment history** (§51): Deployment ID, Project, Environment, Provider, Source Revision, Status, URL, Started At, Completed At, Initiator, Agent. Deployment referencia o source revision (ex.: `prod-42 → commit abc123` — §52).
- **Deployment artifact** (§64): Source / Build Output / Container Image / Archive / Static Files — definido pelo contrato do provider. URLs de deployment (Preview/Production/Dashboard URL, Deployment ID) são metadata, não fonte de verdade do estado (§46).
- **Env vars** (§56): Build-time / Runtime / Public / Secret / Environment-Specific.
- AI integration flow (§28): User Request → AI Analysis → Integration Definition → Compatibility Check → Security Check → Diff → Approval when required → Apply → Validate. AI deploy (§53): `deployment.preflight → Review → Approval if required → deployment.deploy → deployment.verify`.

### Capabilities expostas
- Gerenciar integrações (HTML/CSS/JS inline e externo, iframes, widgets, APIs, webhooks, SDKs, embeds, componentes third-party); widgets expostos como componentes reutilizáveis (WhatsApp, Map, Chat, Reviews, Booking, Social Feed — §20); custom integrations declarando Integration ID, Type, Configuration Schema, Permissions, Execution Model, Security Requirements, Lifecycle (§26); remoção de integração definindo o que remove (Configuration/Source/Dependencies/Scripts/Components/Credentials — §74); migração de provider como operação própria (Google Maps→Mapbox não é edição de config — §75); verificação de domínio externo (DNS/SSL/ownership — §76).
- Deployment: preflight, build coordination (Build Adapter → Runtime Build — §41), deploy, verificação (Provider Status, HTTP Status, Health Endpoint, Expected Domain, Preview URL, Build Completion, Basic Rendering Check — §45), logs (estruturados, associados a Deployment ID/Project, redigidos de secrets — §47), cancelamento, rollback, histórico.

### Regras de segurança/autorização
- Integrações e providers de deploy são **fronteiras privilegiadas**: exigem Authentication, Authorization, Secret Management, Audit, Failure Handling, Revocation (§66).
- JavaScript externo é código executável: `<script>` passa por Security e policy (§12); não injetar scripts arbitrários em todas as páginas (§13); script de página não vira global automaticamente (§14); não reordenar scripts arbitrariamente (§16); iframe sem permissões excessivas (§18).
- **Secrets**: credenciais sensíveis via Secret Management (§22); prevenir exposição de API keys/Bearer tokens/passwords/private credentials/signing secrets em logs, AI context, diffs, UI previews, audit (§23); credenciais de provider em secret management, nunca no source (§55); não expor secrets ao client bundle salvo variável pública intencional (§56); AI recebe info estruturada de integração com `Credential: Configured`, nunca o valor bruto (§71); componente referencia integração sem embutir credenciais privadas (§72).
- **Sem instalação silenciosa de dependências** — instalação explícita, autorizada, via Package Manager/Runtime (§31). Integração falha → `ERROR`/`BLOCKED`, nunca `ACTIVE` (§29); não reportar ACTIVE se validação falhou (§7).
- **Deploy de produção**: políticas mais estritas — Require Approval, Require Clean Git State, Require Build Success, Require Tests, Restrict AI Autonomous Deployment, Restrict Provider (§54 — política exata pertence a Security/Workspace). AI não faz deploy só porque mudou arquivos (§53).
- Webhook incoming verificado pelo mecanismo do provider (§25). Não assumir domain ownership por estar configurado no Nexo (§76).
- Falha de integração isolada — não corrompe estado não relacionado do projeto (§67). Falha de deploy preserva Source Project, Git State, Previous Known Deployment State, Logs, Failure Reason; não modificar source automaticamente sem workflow de remediação autorizado (§68). Retry só quando falha retryable + provider state conhecido + sem risco de deploy duplicado + policy permite (§69). Provider inalcançável durante deploy → `UNKNOWN` até recuperar estado real; não assumir sucesso nem falha (§70).

### Dependências
- Leituras: `01-SYSTEM-ARCHITECTURE.md`, `03-ADAPTER-SYSTEM.md`, `04-RUNTIME-AND-SECURITY.md`, `05-NEXO-ENGINE.md`, `06-CONTROL-PLANE-AND-AGENT-API.md`, `08-COMPONENT-AND-MEDIA-ENGINE.md` (§81).
- Subsistemas: Adapters (representação de source, compatibilidade), Runtime/Package Manager, Build Adapter, Secret Management, Security/Workspace policy, Component Engine, Project Model, Git (source revision), AI Engine (`deployment.preflight/deploy/verify`), documentação oficial de cada provider (ordem preferida: Official Documentation → Official API Reference → Official Repository → Official Support/Engineering Docs → Primary Technical Source — §79).

### Invariantes
- Nenhuma lógica provider-specific hardcoded no Domain/Core (§3, §80, §82); nenhum provider assume comportamento idêntico a outro (§34); não forçar `build → zip → upload` em provider Git-based ou container-based — o Provider determina o mecanismo (§65).
- Deploy não é sucesso por upload aceito — sucesso depende da condição real de completion do provider + verificação (§44). `UNKNOWN` representado até recuperar estado real (§70).
- Configuração environment-specific isolada (§37). Integração falha não corrompe projeto (§67). Deploy falho não altera source (§68). Custom code tratado como source code, distinguindo Nexo-Generated / User / External Integration / AI-Generated (§27). AI não embute scripts externos desconhecidos silenciosamente (§28). Remoção de integração não deleta source não relacionado (§74). Não inventar capabilities de provider (§79).
- **Fonte de verdade do estado externo**: o provider real — estado do provider prevalece sobre metadata/URLs; URLs são metadata, não fonte de verdade (§46); falha desconhecida não é assumida como sucesso ou falha (§70).

### Ordem de implementação (§81, K3 Swarm)
1. Ler 01-System-Architecture; 2. Ler 03-Adapter-System; 3. Ler 04-Runtime-and-Security; 4. Ler 05-Nexo-Engine; 5. Ler 06-Control-Plane-and-Agent-API; 6. Ler 08-Component-and-Media-Engine; 7. Ler este doc completo; 8. Identificar providers realmente necessários para o primeiro release; 9. Pesquisar documentação oficial; 10. Definir contrato genérico de provider; 11. Implementar um provider por vez; 12. Validar autenticação; 13. Validar estados de falha; 14. Validar manejo de secrets; 15. Validar verificação de deployment; 16. Validar acesso AI pelas mesmas Engine capabilities; 17. Adicionar testes de integração e deployment; 18. Registrar limitações do provider em vez de inventar comportamento.

### Acceptance criteria / validação (§80 — 23 itens)
Identidades estáveis de integração; escopo explícito; scripts e iframes security-controlled; APIs externas com config estruturada; secrets via mecanismos seguros; custom integrations sem mudar o Core; lifecycle explícito; providers de deploy com contrato comum; comportamento provider-specific isolado; environments explícitos; preflight existente; estado de deployment observável; sucesso exige completion real; verificação existe; semântica de rollback explícita; estado desconhecido representado; source revision registrada; AI usa deployment quando autorizada; AI usa integrações sem secrets desnecessários; falhas de provider não corrompem projeto; nenhuma suposição provider-specific no Domain; documentação oficial consultada.
Testes (§77–§78): integrações (config, auth, ativação, falha, remoção, proteção de credencial, mutação de projeto, rollback) com ambientes de teste do provider; deployment (preflight, build, deploy, status, verificação, falha, rollback, credential failure, network failure, unknown state) — não depender exclusivamente de mocks para comportamento crítico.

### [AMBIGUO]/[NÃO ESPECIFICADO]
- [NÃO ESPECIFICADO] Contrato genérico de Deployment Provider em nível de assinaturas/métodos (apenas capability model conceitual, §35).
- [NÃO ESPECIFICADO] Quais providers entram no primeiro release (item 8 do protocolo manda identificar).
- [AMBIGUO] Hostinger: mecanismo real de deploy depende do produto de hosting selecionado (§59) — indeterminado por design.
- [AMBIGUO] Docker provider é condicional ("only when actually required" — §63); custom integrations "eventually" (§26).
- [NÃO ESPECIFICADO] Mecanismo de assinatura/verificação de webhooks por provider (§25 — delegado à spec provider-specific).
- [NÃO ESPECIFICADO] Estratégia exata de verificação de deploy ("provider- and project-dependent" — §45) e política exata de produção (§54 — delegada a Security/Workspace).

---

# SÍNTESE DO GRUPO

## 1. Superfície Git
- **Operações suportadas**: leitura (status, diff com 5 modos de comparação, history, commit detail, remotes), branches (list/create/delete/switch/track), commit (escopo: all/selected files/hunks), push, pull, fetch, merge, rebase, stash (list/apply/pop/drop), revert, reset (soft/mixed/hard), cherry-pick, clone, init explícito, criação de repo via provider, gerenciamento de remotes. API mínima: `git.status, git.diff, git.history, git.branch.list, git.branch.create, git.branch.switch, git.branch.delete, git.commit, git.push, git.pull, git.fetch`; avançada: `git.merge, git.rebase, git.stash, git.revert, git.reset, git.cherryPick`.
- **Operações de risco** (permissões separadas, não herdadas): `git.forcePush`, `git.resetHard`, `git.branch.deleteForce`; aprovação humana para force push, hard reset, deletar branches protegidas, reescrever história, modificar branch de produção. Branch protection do provider prevalece sobre permissão local.
- **Proteções**: Git real é a única autoridade (nada de camada falsa, snapshots são suplementares); pré-operações destrutivas exigem inspeção de estado; optimistic concurrency (Expected vs Actual HEAD); Operation IDs e Jobs auditáveis; erros classificados machine-readable; credenciais fora de logs/audit/AI context com redação de URLs; Git hooks tratados como execução de código do projeto (podem exigir permissões de Runtime); AI usa Git Service estruturado, não shell arbitrário; commit só reportado após confirmação do Git; push separado de commit; pull/fetch separados; Project Intelligence refreshed após checkout/merge/rebase/reset/pull.

## 2. Arquitetura AI/Luna
- **Providers**: Kimi, Luna, OpenAI, Anthropic, Gemini, Local Models, Custom — atrás de Provider Adapters com contrato `identify()/getModels()/generate()/stream()/cancel()`; local AI é provider first-class; docs oficiais obrigatórios antes de implementar.
- **Contexto**: AI Context Engine task-specific com freshness (FRESH/STALE/PARTIAL/UNKNOWN), proveniência, ordem de autoridade (Source real → Runtime → Git → Project Intelligence → Cache → AI assumption) e budgets; nunca enviar repo inteiro nem secrets.
- **Tools**: contrato com Tool ID, schemas de I/O, Required Permission, Scope, Side Effects, Async Behavior, Error Model; resultados estruturados (`status, operationId, resource, result, warnings, diagnostics, job, error`); erros padronizados; validação de tool call em 6 checagens; descoberta dinâmica com capability hiding; hierarquia de edição preferindo capabilities estruturadas a file.write genérico.
- **Fluxo canônico**: `AI → Tool Request → Input Validation → Authorization → Policy → Nexo Engine → Capability (Domain) → Adapter/Runtime/Provider → Tool Result`. Modo Manual exige aprovação antes de mutações; modo Autônomo executa mas **nunca** bypassa authorization/policy/Runtime/secrets/audit/aprovações.
- **Task lifecycle**: estados `QUEUED→PLANNING→WAITING_APPROVAL→EXECUTING→VALIDATING→…→COMPLETED/FAILED/CANCELLED`, persistidos fora do browser, com cancelamento e resume sem repetir passos destrutivos. Verdade operacional vem de tool/build/test/git/deploy results — nunca de claims textuais do modelo.
- **Luna**: fronteira dedicada via Nexo Agent Interface (auth → authorization → Engine), nunca via Playwright/UI; tradução `Luna Tool → Nexo Capability`; mesma autorização de qualquer identidade de máquina; sem privilégio por ser "a AI da casa".

## 3. Integrações e Deploy
- **Providers de deploy**: Vercel, Hostinger, SSH, SFTP, FTP, Docker (extensível) atrás de um contrato comum com capability model declarado (`Deploy, Preview, Rollback, Logs, Env Vars, Domains, Build, Artifact Upload, Status`); lógica vendor-specific isolada dentro de cada provider; o provider define o artefato (Source/Build Output/Container Image/Archive/Static Files) e o mecanismo — proibido impor `build→zip→upload` universal.
- **Contrato de deploy**: Target (Project/Environment/Provider/Target/Config) → Authorization → Preflight (`READY/WARNINGS/BLOCKED/FAILED`) → Build via Build Adapter+Runtime → Deploy → Wait Provider Result → Verify → Persist State → Audit; estados normalizados (`DRAFT…SUCCEEDED/FAILED/CANCELLED/ROLLED_BACK/UNKNOWN`); cancelamento e rollback como capabilities first-class com semânticas distintas (provider rollback ≠ redeploy ≠ git revert); histórico separado do Git mas referenciando source revision.
- **Fonte de verdade do estado externo**: o **provider real** — sucesso exige condição real de completion + verificação (HTTP/health/domain); `UNKNOWN` quando o provider está inalcançável (não assumir sucesso nem falha); URLs são metadata, não verdade; retry apenas com estado conhecido e sem risco de duplicidade.
- **Integrações**: identidade/escopo/lifecycle explícitos; scripts e iframes com classificação de confiança e permissões mínimas; secrets sempre via Secret Management e fora de logs/diffs/AI context; sem instalação silenciosa de dependências; falha de integração isolada do projeto; produção com políticas mais estritas (aprovação, Git limpo, build, testes, restrição de deploy autônomo por AI).
