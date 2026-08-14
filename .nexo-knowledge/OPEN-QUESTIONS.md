# NEXO CMS — OPEN QUESTIONS / UNKNOWN STATES
> Regra: UNKNOWN/UNSUPPORTED preferível a inventar. Itens aqui NÃO podem ser decididos silenciosamente.

## Resolvidos nesta sessão
- [x] Stack do Nexo: não especificada nos docs → seleção formal §51 executada → ver STACK-DECISION.md.
- [x] Q4 — Lib Git concreta (2026-08-14): **git CLI real via @nexo/runtime CommandExecutor**, zero deps novas → ver STACK-DECISION.md D2 (pesquisa oficial: simple-git/isomorphic-git/nodegit avaliadas e rejeitadas com justificativa).

## Abertos (adiados pelos próprios docs — não inventar)
1. Protocolo do Control Plane (REST/RPC/GraphQL) — docs não fixam. M1 usa HTTP+JSON simples (justificativa: simplicidade, Inv. 41) documentada em STACK-DECISION.md. Revisitar quando Agent API formal for escrita.
2. Tecnologia de auth/policy engine definitiva — Permission Model adia para Security Architecture. M1: boundary de autorização interno com contexto explícito; tokens/sessões formais depois.
3. Schemas autoritativos de capabilities — pertencem ao doc 06 (contratos detalhados a extrair por domínio na implementação de cada um).
5. Merge de conflitos de edição (Editor) — "source-editing subsystem" não detalhado [AMBIGUO no doc 07].
6. SGBD: docs deixam aberto com Repository Pattern obrigatório → STACK-DECISION.md escolhe padrão local; remoto futuro sem reescrita do Domain.
7. Precedência Allow vs Deny em políticas compostas; jobs long-running pós-revogação; hierarquia definitiva de políticas — deferidos a Security Architecture [AMBIGUO nos docs].
8. PROMPT_EXECUCAO_KIMI_K3_LUNA_v3 — especifica correção do kernel Luna v3 legado; [REQUER CÓDIGO LEGADO NÃO ENVIADO] — não executável nesta sessão. Tratar como spec futura de integração Luna (doc 11).
9. Providers do primeiro release (deploy/AI) — não fixados.
10. Natureza exata da Luna (provider de modelo vs agente com execução própria) — [AMBIGUO no doc 11].

## Registro de decisões desta sessão
- D1: Stack — ver STACK-DECISION.md (processo §51, versões verificadas em docs oficiais).
- D2 (2026-08-14): Lib Git — git CLI real via @nexo/runtime CommandExecutor → ver STACK-DECISION.md D2.
- D3 (2026-08-14): Nomenclatura de permissões/capabilities Git — **camelCase conforme doc 10 §70/§80** (`git.forcePush`, `git.resetHard`, `git.branch.deleteForce`), consistente com o padrão M1 onde requiredPermission === capability id (`project.import`, `runtime.command.execute`). O Permission Model usa snake_case (`git.force_push`) — discrepância registrada; doc 10 é autoridade do domínio Git (hierarquia: contratos congelados seguem a spec técnica do domínio). Permissões de alto risco ficam RESERVADAS em M2 (sem grant, sem capability → DEFAULT DENY; force em push/delete retorna UNSUPPORTED apontando a capability reservada).
- D4 (2026-08-14): Exposição HTTP das capabilities git — via endpoint genérico M1 `POST /v1/capabilities/:id/invoke` (paridade Control Plane, Inv. 41; sem rotas `/git/*` duplicadas). CLI ganha comandos `nexo git *` como segundo consumer.
- D5 (2026-08-14): Commit scope M2 — default = somente staged; `files: string[]` = staging explícito de arquivos selecionados (validados dentro do Project Root); `all: true` = opt-in explícito. Selected hunks → UNSUPPORTED explícito (doc 10 §20 "where supported").
- D6 (2026-08-14, M3): Stack first-class do write-path M3 = **React+TSX + Tailwind + Plain CSS** (fixture M1 já existente). Vue/Svelte/Astro/CSS Modules/styled-components permanecem detection-only neste milestone: operações de mutação retornam UNSUPPORTED honesto (Inv. 6/25; doc 08§90 item 24: "reported, not guessed"). Não é fake support — é escopo declarado.
- D7 (2026-08-14, M3): Tipagem concreta do Change Object e do Component Schema congelada em M3-CONTRACTS.md §6/§7 (docs dão formato conceitual — 07§31, 08§9; decisão de implementação registrável, padrão D3-D5).
- D8 (2026-08-14, M3): Source transformation React/TSX via **AST (TypeScript compiler API)**, nunca string replacement (Inv. 44/45; AM §Adapters proíbe string replacement como estratégia universal). Versão exata em STACK-DECISION após pesquisa oficial.
- D9 (2026-08-14, M3): Permissões M3 = capability id (padrão D3): `editor.*`, `component.*`, `media.*`, `design.*`, `theme.*`, `responsive.*` camelCase conforme docs 07/08/09. Doc 09§68 lista `design.write`/`design.tokens.write`/`theme.write` como permissões — decisão: grants finos por capability id (D3 prevalece; o doc marca nomes exatos como pertencentes a Security/Control Plane). Risco: leituras SAFE; mutações DESTRUCTIVE (REQUIRE_APPROVAL mesmo com grant, padrão M2).
- D10 (2026-08-14, M3): Registries (Components, Media Assets, Viewports, Snapshots) persistem via **packages/storage Repository Pattern** (doc 14: "Nexo stores what Nexo owns"; Media Metadata e Library Component já são entidades nomeadas no doc 14). Nada de registry em JSON solto no projeto do usuário.
- D11 (2026-08-14, M3): CONFLITO ENTRE DOCS resolvido — Feature Priorities §47 classifica promotion/versioning/migration como P2, mas doc 08§90 (acceptance, autoridade de domínio) exige publish com dependency analysis (itens 10-11). Decisão: M3 implementa `component.publish` com o pipeline completo 08§25 + validação §74; **migration workflows** (08§71 mecanismo v1→v2) e auto-update policies ficam para M4+ (docs não definem mecanismo).
- D12 (2026-08-14, M3): Merge de conflitos de edição (OQ #5) — M3 implementa detecção + representação de CONFLICT + resoluções `Keep Local | Keep External | Compare | Reload | Cancel` (07§38-39); opção `Merge` retorna UNSUPPORTED explícito até spec do source-editing subsystem (07§39 "eventually"; Inv. 39: não antecipar decisão não tomada).
- D13 (2026-08-14, M3): Processamento/otimização de imagem (resize/crop/conversão/compressão — 08§46 "may support") e AVIF **fora do M3** (linguagem não-obrigatória; AVIF nunca nomeado). M3 = upload/validate/replace/delete/metadata/reference tracking (P1, FP§35). Unused asset detection só com confidence real; `Unknown` nunca vira `Unused` (08§50).
- D14 (2026-08-14, M3): Diagnósticos responsive exigem browser real (09§46) → **Playwright** (versão em STACK-DECISION após pesquisa) SOMENTE para `responsive.diagnose/stressTest/compare/snapshot`. Nenhuma mutação de source ou operação privilegiada depende dele (07§80 item 20). Image-diff para compare: decisão adiada à implementação (09§45 manda escolher por confiabilidade/performance); stress profiles: conjunto fixo documentado no código (heading longo, botão longo, N itens, imagem ausente, viewport extremo — 09§32), nunca persistidos (09§33).
- D17 (2026-08-14, M3): Canal de aprovação — M1/M2 tinham REQUIRE_APPROVAL terminal (nada DESTRUCTIVE executava via HTTP). Permission Model §20/§65/§67 exige aprovação com auditoria (quem solicitou, quem aprovou, quando, operação, recurso, resultado) e boundary único, sem fixar mecanismo. Decisão: envelope de invoke aceita `approval: { approver: string, justification?: string }`; no boundary (packages/security), REQUIRE_APPROVAL + approval válido (approver não-vazio) → ALLOW, e o audit event registra requestedBy/approvedBy/at/operation/resource/result (§65). Aprovação é POR INVOCAÇÃO (sem grant permanente implícito). UI: ApprovalDialog re-invoca com approval; CLI: `--approve --approver <id>`. Não inventar fluxo de tokens multi-fase neste milestone.
- D18 (2026-08-14, M3 — divergências da Wave 3, aceitas documentadas):
  (a) `responsive.*` issues saem SEM sourceMapping em M3 — o `SourceMapperFn` do responsive é síncrono/DOM-based (ElementRef) e `mapComponentSource` (intelligence) é async/componentName-based; sem correspondência honesta. Doc 09§34 diz "Source Mapping **when available**" → aceito. Evolução: mapper por ElementRef na intelligence (M4+).
  (b) `responsive.viewport.create` aceita projectId OPCIONAL ignorado — registry de viewports é global (09§24), a linha §3.5 do contrato omite projectId; header genérico "sempre projectId" cede à tabela específica.
  (c) `runtime.command.execute` (RESTRICTED) NÃO recebeu canal de aprovação (gate interno '*.execute_sensitive' sem acesso a approval via ExecutionContext — exigiria mudança em packages/core). Limitação registrada: builds/tests/preview via command.execute seguem bloqueados por policy; preview do M3 usa a camada própria do responsive (spawn disciplinado + ProcessRegistry). Wire de approval em ExecutionContext fica para M4.
  (d) `pnpm-lock.yaml` formalizado na integração (coders não rodam install).
- D19 (2026-08-14, M3 — emenda de contrato): `responsive.viewport.list` e `responsive.viewport.delete` adicionadas ao Control Plane (37 capabilities M3). O registry de viewports (09§24-25) já existia no service; sem list/delete a UI não podia gerenciar viewports sem inventar dados. Ambas SAFE: registry Nexo-owned, reversível, nunca toca Source Project (precedente: viewport.create já era SAFE com escrita no registry). M3-CONTRACTS §3.5 emendado.

## D20 — Providers do 1º release (MASTER §4, doc 11 §5)
OpenAI, Anthropic, Gemini, Kimi, OpenAI-compatible/local. Cada um com adapter próprio atrás de AIProviderAdapter comum (M4-CONTRACTS §3). Nenhum provider fictício. Luna provider: LUNA-DEFERRED.

## D21 — Assinaturas do Provider Contract
identify/getModels/generate/stream?/cancel-via-AbortSignal (doc 11 §6 delega à implementação). Cancelamento = AbortSignal client-side (único mecanismo comum confirmado; server-side cancel não é documentado pelos providers).

## D22 — AI Task schema/storage (GROUP-F [NÃO ESPECIFICADO])
ai_tasks + ai_task_events (SQLite v8); 9 estados doc 11 §45; boot recovery: não-terminais → FAILED RUNTIME_RESTART (§34: interrompido ≠ concluído).

## D23 — Context budget defaults (doc 11 §25, §69 "may")
20 arquivos / 64KB por arquivo / 512KB total. Bounded output (master §33).

## D24 — Retry/timeout provider-level (doc 11 omite; master §33 sem retry infinito)
Timeout 120s default (máx 600s). Retry: máx 2, backoff exponencial, só RATE_LIMITED/TIMEOUT/5xx; chamada generate não tem efeito de projeto → retry seguro; destrutivas NUNCA repetidas (§40).

## D25 — Secret store local (RT&SEC §69-70 "não plaintext"; sem KMS documentado)
AES-256-GCM, chave em NEXO_HOME/keys modo 0600. KMS/HSM = COMMERCIAL-FUTURE. Separação config/secret material obrigatória (WM §24).

## D26 — ai.task.create é SAFE
Criação de task não muta projeto (mutações passam por WAITING_APPROVAL/policy); audit registra creator. Mutações internas do task seguem REQUIRE_APPROVAL normalmente.

## D27 — Auth formal permanece OPEN (OQ#2)
Docs proíbem inventar mecanismo (PM §1, UR §58, CP §21). Mantido: ator local fail-closed + bind 127.0.0.1 + DEFAULT DENY. AI executa como agent:ai-engine com initiatedBy humano real (FP §20).
