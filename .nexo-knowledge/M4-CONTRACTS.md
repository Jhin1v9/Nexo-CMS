# M4-CONTRACTS.md — AI ENGINE + SECURITY COMPLETION (Wave congelada 2026-08-14)

Base documental: doc 11 (AI ENGINE AND LUNA), Permission Model, RUNTIME AND SECURITY, WORKSPACE AND STORAGE, AUDIT-MASTER.md (R1-R16). Master directive §4-14. Luna: fora do caminho crítico; Agent Interface permanece genérica.

## 1. Escopo e pacotes

- **@nexo/secrets** (novo): secret store local, redaction, injeção. Zero deps de domínio (só shared/core/storage).
- **@nexo/ai** (novo): provider abstraction + adapters + registry, context engine, tools, task engine, modos. Deps permitidas: shared, core, security, runtime, storage, intelligence, control-plane (somente contratos de invoke), git (somente tipos/leitura via capabilities). NUNCA importa apps/*.
- **apps/runtime**: capabilities `ai.*`, `secret.*`, `audit.list`; wire D18c.
- **apps/cli**, **apps/cms**: consumidores puros.

## 2. Capabilities novas (21)

### 2.1 secret.* (6) — mutations REQUIRE_APPROVAL (PM §20: alteração de secrets é candidata)
| id | risk | contrato |
|---|---|---|
| secret.store | DESTRUCTIVE | in: {name, value, scope: WORKSPACE\|PROJECT, projectId?, providerId?, metadata?} → out: {id, name, scope, createdAt} — valor NUNCA retornado |
| secret.list | SAFE | in: {projectId?} → metadata apenas (id, name, scope, providerId?, createdAt, updatedAt, revokedAt) |
| secret.read | SAFE | in: {id} → metadata apenas; NUNCA valor |
| secret.rotate | DESTRUCTIVE | in: {id, newValue} → metadata; audit Secret Rotation |
| secret.revoke | DESTRUCTIVE | in: {id} → revokedAt setado; usos futuros falham FORBIDDEN |
| secret.delete | DESTRUCTIVE | in: {id} → remove de vez; só se revoked |

### 2.2 ai.provider.* / ai.model.* (6)
| id | risk | contrato |
|---|---|---|
| ai.provider.register | DESTRUCTIVE | in: {type: openai\|anthropic\|gemini\|kimi\|openai-compatible, name, baseUrl?, modelDefault?, secretRef (id de secret), timeoutMs? (<=600000), maxRetries? (<=3)} → valida conexão REAL (getModels) antes de persistir; falha → PROVIDER_FAILURE, nada persistido |
| ai.provider.list | SAFE | → configs SEM secret material |
| ai.provider.read | SAFE | in: {id} → config + capabilities reportadas + modelos cacheados |
| ai.provider.update | DESTRUCTIVE | in: {id, ...campos} → re-valida conexão |
| ai.provider.remove | DESTRUCTIVE | in: {id} → bloqueia se tasks ativas referenciam |
| ai.model.list | SAFE | in: {providerId} → getModels real (cache curto) |

### 2.3 ai.context.build (1, SAFE)
in: {projectId, taskHint?, maxFiles?, maxBytesPerFile?, maxTotalBytes?} → out: ContextPackage {project:{identity, stack, adapters}, git:{status resumido}, files:[{path, content?, truncated, reason}], diagnostics?, freshness: FRESH\|STALE\|PARTIAL\|UNKNOWN, provenance: [{field, source}], redactions: n} — secrets redigidos (padrões + valores do store); limites default: 20 arquivos, 64KB/arquivo, 512KB total (D23).

### 2.4 ai.tools.list (1, SAFE)
in: {projectId?, providerId?} → ToolDefinition[] geradas do registry de capabilities real (§28-29 doc 11: filtradas por permissão do ator, adapter, estado). Cada tool: {id, description, inputSchema (JSON Schema via zod), outputSchema?, requiredPermission, scope, sideEffects, asyncBehavior, errorModel} — 9 campos do §27.

### 2.5 ai.task.* (6)
| id | risk | contrato |
|---|---|---|
| ai.task.create | SAFE (cria estado; zero mutação de projeto) | in: {projectId, request, mode: MANUAL\|AUTONOMOUS, providerId, modelId?, maxIterations? (<=25)} → {taskId, status: QUEUED}; runner assíncrono |
| ai.task.list | SAFE | filtros {projectId?, status?} |
| ai.task.read | SAFE | → task completa: plan, diff, toolTrace, validation, finalReport, audit refs |
| ai.task.cancel | SAFE→mutation permitida | cancelamento propagado; destrutivos completados NUNCA repetidos |
| ai.task.approve | mutation (é o verbo de aprovação — CP §39) | in: {taskId, justification?} — só de WAITING_APPROVAL; approver=ator; audit completo (PM §65); revalida autorização antes de executar |
| ai.task.reject | mutation | in: {taskId, reason?} → CANCELLED com motivo |

### 2.6 audit.list (1, SAFE)
in: {actor?, what?, result?, from?, to?, limit<=200, cursor?} → eventos paginados (doc 06 §52).

## 3. Provider Contract (D21) — packages/ai/src/providers/types.ts

```ts
interface AIProviderAdapter {
  readonly type: ProviderType; // openai|anthropic|gemini|kimi|openai-compatible
  identify(): ProviderIdentity; // {type, name, baseUrl}
  getModels(ctx): Promise<ModelInfo[]>; // {id, contextTokens?, capabilities:{streaming,tools,structuredOutput,vision?,reasoning?}}
  generate(req: GenerateRequest, ctx): Promise<GenerateResult>;
  stream?(req: GenerateRequest, ctx): AsyncIterable<StreamChunk>; // só se suportado
}
// GenerateRequest: {model, messages: AIMessage[], tools?: AIToolDef[], toolChoice?, responseFormat?: {type:'text'|'json'|'json_schema', schema?}, maxTokens?, temperature?, signal: AbortSignal}
// AIMessage: {role:'system'|'user'|'assistant'|'tool', content?: string, toolCalls?: AIToolCall[], toolCallId?: string}
// GenerateResult: {message: AIMessage, finishReason, usage?: {inputTokens,outputTokens,totalTokens?}, model, providerType, cost?: CostMetadata} // cost só quando o provider reporta (nunca estimativa inventada)
// Erros normalizados (D24): AIProviderErrorKind = AUTH_FAILED|RATE_LIMITED|TIMEOUT|CONTEXT_OVERFLOW|INVALID_REQUEST|UNSUPPORTED|CANCELLED|PROVIDER_FAILURE
```
Regras: Core sem lógica provider-specific (§8); credencial resolvida via @nexo/secrets por referência (secretRef) e injetada só na chamada (RT&SEC §71); timeout default 120s, máx 600s; retry só de chamada ao provider (sem efeito colateral de projeto), máx 2, backoff exponencial, só RATE_LIMITED/TIMEOUT/PROVIDER_FAILURE 5xx (D24); adapters seguem doc oficial vigente (§100) — pesquisa em .nexo-knowledge/research/.

## 4. Task Engine (D22)

Estados (doc 11 §45): QUEUED PLANNING WAITING_APPROVAL EXECUTING VALIDATING BLOCKED COMPLETED FAILED CANCELLED.
Transições: QUEUED→PLANNING→(WAITING_APPROVAL→EXECUTING)*→VALIDATING→COMPLETED|FAILED; qualquer não-terminal→CANCELLED (cancel) ou FAILED (erro); política nega/falta dado→BLOCKED.
Persistência (§46): storage migrations v7 (secrets) e v8 (ai_providers, ai_tasks, ai_task_events). Refresh/restart não perde task. Boot recovery (§34): tasks em EXECUTING/VALIDATING/PLANNING no boot → FAILED{reason:'RUNTIME_RESTART'} (interrompido ≠ concluído; resume é CORE FUTURE §48).
ExecutionContext: initiatedBy=ator humano que criou; executedBy='agent:ai-engine' (FP §20). Audit em toda transição e toda tool call (operationId correlacionado, doc 06 §20).
Loop do runner (bounded, §33): máx 25 iterações de tool call; output bounded.

## 5. Modos (doc 11 §38-39, §62)

- MANUAL: Request→Analyze→Plan→Propose→Diff→**WAITING_APPROVAL**→Execution→Validation→Result. Zero mutation antes de ai.task.approve.
- AUTONOMOUS: Task→Understand→Plan→Execute→Validate→Repair (se autorizado)→Complete. Tool calls com policy ALLOW seguem direto; REQUIRE_APPROVAL → task vai a WAITING_APPROVAL (autonomia NUNCA bypassa approval §62); DENY → BLOCKED.
- Proposals de arquivo usam editor.change.preview/apply (diff real antes/depois, §43). Diff object: {files:[{path,before,after,status:added|removed|modified}], taskId, agentId}.

## 6. Tools (doc 11 §26-35, §83)

Tools = capabilities reais expostas ao modelo (geradas do registry; nunca hardcoded falsas). Execução via ControlPlane.invoke com ator agent:ai-engine + initiatedBy humano → mesma policy/audit (§30, §33: tool nunca mais privilégio que a capability). Grants do agente ai-engine: leituras SAFE ALLOW; mutações DESTRUCTIVE → REQUIRE_APPROVAL (resolvidas pelo fluxo do modo). Validação de tool call: 6 checks §83 mapeados ao gate() existente.

## 7. Validation (doc 11 §41, §72-75, §99)

VALIDATING executa via capabilities reais: parser/typecheck (editor), build/test (runtime.command.execute com wire D18c — approval do task cobre comandos de validação declarados no plano), re-analyze (project.open refresh). Final Report estruturado (§75): status, summary, filesChanged, operations, validationResults, gitResult?, warnings, remainingIssues. "Done." do modelo nunca é evidência.

## 8. Wire D18c (command.execute approval)

ExecutionContext passa a carregar `approval?` (já existe no envelope invoke — propagar ao policy interno do command classification: comando SENSITIVE/DANGEROUS + approval válido no contexto → ALLOW por invocação; audit approvedBy). Restrito a allowlist documentada de validação (build/test/dev) para tasks AI; uso direto mantém comportamento atual.

## 9. Regras transversais

- Secrets NUNCA em: logs, audit, diff, AI context, error messages, UI output (RT&SEC §28-29). Redaction central em @nexo/secrets aplicada no context engine e nos audit details.
- Secret store local (D25): valor cifrado AES-256-GCM, chave em `${NEXO_HOME}/keys/` modo 0600 (local-first; KMS é COMMERCIAL-FUTURE). Config de provider NUNCA contém secret material (WM §24).
- Zero mocks para provar integração: adapters testados contra provider sandbox = servidor HTTP local real falando o protocolo oficial (master §30; doc 11 §96-98).
- Zero emojis; zero alert/confirm/prompt; Lucide na UI.
- UI consumidora pura; AI area nova + Providers + Secrets + Audit real.
- ai.task.create SAFE (decisão D26): criação de task não muta projeto; custo de tokens é do usuário que configurou o provider; audit registra.

## 10. Fora de escopo M4 (registrado)

Luna bridges (LUNA-DEFERRED); task resume (§48 "may"); streaming ao cliente UI (§86 "may" — runner usa streaming interno só se suportado; UI consome estado persistido); multi-model/multi-agent (§89-93); tool/context budgets avançados (§68-69); AI provider plugins (§94 EXTENSION); custom tools (§95 futuro); deployment/integrations (M5); pages/content (CORE FUTURE).
