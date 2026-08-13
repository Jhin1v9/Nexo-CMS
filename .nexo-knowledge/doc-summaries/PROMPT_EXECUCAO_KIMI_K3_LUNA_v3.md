# PROMPT DE EXECUÇÃO — KIMI K3 × LUNA KERNEL v3.0
## Correção Arquitetural Completa | Modo: Plan → Act

---

## INSTRUÇÃO DE SISTEMA PARA KIMI K3

Você é um engenheiro de software sênior especializado em sistemas distribuídos, parsers de stream e arquitetura de agentes. Sua tarefa é implementar correções arquiteturais no kernel Luna v3.0 — um sistema de orquestração entre frontend web (Luna-Mirror), extensão Chrome (luna-extension) e backend Node.js (luna-soul + luna-tools + kimi-bridge) que se comunica com a API Kimi Web.

**CRITICAL CONSTRAINTS (não negociáveis):**
- NENHUM remendo, patch ou workaround. Cada correção elimina a CAUSA-RAIZ.
- Cada correção deve ser verificável por INVARIANTE LÓGICO, não por teste empírico.
- Cada correção deve SIMPLIFICAR o código (menos linhas, menos estado, menos branches).
- NÃO aumente timeouts, caps de caracteres, ou debounces.
- NÃO adicione camadas de indireção.
- NÃO tome decisões não solicitadas. Execute EXATAMENTE o que está especificado.
- Se encontrar ambiguidade, PARE e peça esclarecimento. Não suponha.

---

## CONTEXTO DO SISTEMA LUNA

### Arquitetura
```
[Usuário] → [Luna-Mirror Frontend] → [Kimi Web API] → [Kimi K3 Modelo]
                     ↓
            [luna-extension Chrome]
                     ↓
            [kimi-bridge.cjs] ←→ [luna-soul.cjs] ←→ [luna-tools.cjs]
                     ↓
              [PC Linux Real]
```

### Arquivos principais
- `kimi-bridge.cjs`: Bridge entre extensão Chrome e backend Node. Gerencia stream, interceptor de rede, cursor de texto.
- `luna-extension/injected.js`: Script injetado na página Kimi Web. Detecta fim de stream, extrai DOM, repara JSON.
- `luna-soul.cjs`: Orquestrador. Recebe mensagens, constrói contexto, classifica thinking/response, executa tools.
- `luna-tools.cjs`: Ferramentas nativas (file ops, shell, git, search, etc.).
- `luna-tool-guard.cjs`: Validação de parâmetros, idempotência, segurança.
- `stream-text-cursor.cjs`: Cursor que rastreia texto renderizado no DOM da Kimi.
- `ChatArea.svelte` / `ToolCard.svelte`: Componentes frontend.

### Problemas identificados (diagnóstico forense completo)

**P0 — CRÍTICO:**
1. **Stream truncado + texto stale:** O fim de stream é detectado por heurísticas externas (botão Stop sumiu, inatividade 3s). O texto é truncado e o "rabo" que faltou chega no turno seguinte como resposta stale.
2. **gitStatus buraco negro:** Resultado da tool não é encaminhado ao chat. O frontend consome localmente.
3. **Card de confirmação fantasma:** Após confirmar deleteFile, o card reaparece em tools subsequentes.
4. **Vazamento de thinking:** Pensamento interno do agente é exposto ao usuário.
5. **writeFile eager execution:** Frontend executa writeFile automaticamente antes do agente emitir JSON.

**P1 — ALTO:**
6. viewDirectory retorna vazio no frontend.
7. searchFiles falha com glob (*.txt interpretado como regex pelo rg).
8. grep mostra "undefined resultado(s)" no contador.
9. replaceInFile schema inconsistente (old_string vs old vs oldStr vs oldString).
10. Truncamento de 4000 chars em todo output longo.

---

## FASES DE IMPLEMENTAÇÃO

### FASE 1: FUNDAÇÃO (Sem essas, o resto não funciona)

#### 1.1 Isolamento de turno no interceptor de rede (kimi-bridge.cjs)

**Problema:** `page.on('response')` acumula corpo SSE em arrays globais. O corpo do turno N termina de chegar durante o turno N+1 e despeja texto stale no buffer fresco.

**Implementação:**
- Cada turno deve ter seu PRÓPRIO interceptor de rede.
- Antes de iniciar o turno N+1, desregistre o handler do turno N: `page.off('response', handlerN)`.
- O buffer SSE deve ser anexado ao objeto de sessão do turno, não a variáveis globais do módulo.
- Use um `WeakMap<turnId, {buffer, handler}>` para isolamento.

**Invariante:** "O interceptor do turno N nunca escreve no buffer do turno N+1."

**Arquivo:** `kimi-bridge.cjs`
**Funções a alterar:** `sendMessageStream`, `_setupNetworkInterceptor`, `_resetNetworkState`
**Não alterar:** `luna-soul.cjs` (a soul não deve saber que o interceptor existe)

---

#### 1.2 Fonte única de verdade: cursor.committed (kimi-bridge.cjs + luna-soul.cjs)

**Problema:** `fullResponse` é sobrescrito por `event.response || fullResponse`, onde `event.response` vem de releitura do DOM ou interceptor — ambas fontes potencialmente stale. O `committed` do cursor (única fonte confiável) nunca é lido depois do loop.

**Implementação:**
- No momento do `stream_end`, o bridge deve ler `cursor.committed` como fonte PRIMÁRIA do texto final.
- O DOM e o interceptor servem apenas como fontes SECUNDÁRIAS de fallback.
- Em `luna-soul.cjs:2903`, altere:
  ```javascript
  // ANTES (bug):
  fullResponse = event.response || fullResponse;

  // DEPOIS (correto):
  fullResponse = cursor?.committed || event.response || fullResponse;
  ```
- O cursor deve ser passado como referência no evento de conclusão.

**Invariante:** "O texto final de um turno é sempre `cursor.committed` no momento do término."

**Arquivos:** `kimi-bridge.cjs` (leitura do cursor), `luna-soul.cjs` (uso do cursor)
**Funções a alterar:** `_onStreamEnd` (bridge), `_processTurnCompletion` (soul)

---

#### 1.3 Detecção de término de stream (luna-extension/injected.js)

**Problema:** `stream_end` é disparado por polling do botão Stop (80ms, sem debounce) ou por inatividade de 3s. Re-renders do React disparam falsos positivos.

**Implementação:**
- Use TRÊS sinais independentes:
  1. **Primário:** Evento SSE `data: [DONE]` da API Kimi (fonte de verdade)
  2. **Secundário:** Mutação do DOM (Stop → Enviar) com debounce de 500ms MÍNIMO
  3. **Terciário:** Inatividade de 5s APENAS se primário e secundário não ocorreram
- O `stream_end` só é aceito se PELO MENOS DOIS dos três sinais concordarem.
- Remova o polling de 80ms do botão Stop. Use MutationObserver no container de mensagens.

**Invariante:** "O fim de stream é confirmado por consenso de múltiplas fontes independentes."

**Arquivo:** `luna-extension/injected.js`
**Funções a alterar:** `_detectStreamEnd`, `_setupStreamMonitoring`
**Não usar:** `setInterval` para polling de botão.

---

#### 1.4 Eliminção do drain loop pós-conclusão (kimi-bridge.cjs)

**Problema:** `kimi-bridge.cjs:9268-9309` processa `response_delta` após `stream_end` sem timestamp/cursor/guard.

**Implementação:**
- Após `stream_end`, feche o turno IMEDIATAMENTE.
- Nenhum processamento de `response_delta` deve ocorrer após o fechamento.
- Eventos SSE atrasados devem ser descartados silenciosamente (log de debug apenas).
- Adicione uma flag `isTurnClosed` que bloqueia todo processamento pós-fechamento.

**Invariante:** "Após `stream_end`, o turno é imutável."

**Arquivo:** `kimi-bridge.cjs`
**Funções a alterar:** `_onStreamEnd`, `_processResponseDelta`, `_drainPendingDeltas`

---

#### 1.5 Separação thinking/response com delimitadores (luna-soul.cjs)

**Problema:** Pensamento interno do agente é encaminhado ao usuário. O sistema não tem barreira arquitetural entre processamento interno e output externo.

**Implementação:**
- Introduza delimitadores explícitos no prompt do sistema:
  ```
  <thinking>
  raciocínio interno aqui — NUNCA visível ao usuário
  </thinking>

  <response>
  resposta ao usuário ou JSON de tool aqui
  </response>
  ```
- O parser do bridge (`kimi-bridge.cjs`) deve extrair e descartar o conteúdo de `<thinking>` antes de encaminhar ao frontend.
- O frontend NUNCA recebe thinking.
- Adicione validação: se `<response>` não for encontrado, rejeite o turno e peça ao modelo para reformatar.

**Invariante:** "O usuário nunca vê texto que não esteja dentro de `<response>`."

**Arquivos:** `luna-soul.cjs` (prompt do sistema), `kimi-bridge.cjs` (parser de delimitadores)
**Funções a alterar:** `_buildSystemPrompt` (soul), `_extractResponseBlocks` (bridge)

---

### FASE 2: ROBUSTEZ

#### 2.1 Fallback universal de serialização de tool results (luna-soul.cjs)

**Problema:** O serializador de feedback só lê `stdout || output || text`. Tools que retornam objetos estruturados (gitStatus: `{cwd, modified, untracked}`) produzem feedback vazio.

**Implementação:**
- Substitua a cadeia de fallback atual por:
  ```javascript
  const feedbackText = result.stdout 
    || result.output 
    || result.text 
    || result.content
    || _serializeStructuredResult(result);

  function _serializeStructuredResult(result) {
    const safeKeys = ['cwd','branch','modified','untracked','added','deleted',
                      'files','entries','path','total','truncated','matches',
                      'results','count','success','error','data'];
    return JSON.stringify(result, safeKeys, 2);
  }
  ```
- Isso elimina a classe de bugs "tool retorna objeto → feedback vazio" para sempre.

**Invariante:** "Toda tool que retorna um objeto não-vazio produz feedback legível."

**Arquivo:** `luna-soul.cjs`
**Funções a alterar:** `_buildToolFeedback`, `_serializeToolResult`
**Linhas de referência:** `:3183`, `:2937`, `:3016`

---

#### 2.2 Interface unificada ToolResult (luna-tools.cjs)

**Problema:** Cada tool retorna um formato diferente. grep retorna `{matches: number, results: array}` (frontend lê `matches.length` → undefined porque matches é número). viewDirectory retorna `{entries: array}`.

**Implementação:**
- Crie uma interface mínima que TODAS as tools devem implementar:
  ```typescript
  interface ToolResult {
    success: boolean;
    text?: string;        // Representação textual legível para o modelo
    data?: any;           // Payload estruturado para o frontend
    error?: string;       // Mensagem de erro, se houver
  }
  ```
- Refatore as tools afetadas:
  - `grep`: `result.text = \`Encontrados ${result.matches} resultados em ${result.results.length} arquivos.\``
  - `viewDirectory`: `result.text = \`Diretório ${path}: ${entries.length} itens
${entries.map(e => e.name).join('\n')}\``
  - `gitStatus`: `result.text = \`Branch: ${branch}\nModificados: ${modified.length}\nUntracked: ${untracked.length}\``
- O campo `text` é obrigatório para tools que produzem output legível.
- O campo `data` é usado pelo frontend para renderização rica (cards, tabelas).

**Invariante:** "Toda tool retorna `result.text` como fonte primária de feedback."

**Arquivo:** `luna-tools.cjs`
**Funções a alterar:** `grep`, `viewDirectory`, `gitStatus`, `searchFiles`, `searchWeb`
**Não alterar:** Tools que já retornam `stdout`/`output`/`text` (executeShell, readFile, etc.)

---

#### 2.3 Máquina de estados finita para confirmação (luna-web)

**Problema:** `confirmationId` e `confirmationMessage` são limpos apenas no caminho de histórico, não no caminho live. O `toolInstanceMap` é deletado no `action_end`, mas reconnect/replay recria o card.

**Implementação:**
- Substitua o estado booleano por uma máquina de estados explícita:
  ```
  IDLE → CONFIRMATION_REQUIRED → CONFIRMED → EXECUTING → COMPLETED
  ```
- Transições válidas:
  - `CONFIRMATION_REQUIRED` → `CONFIRMED` (usuário clica Confirmar)
  - `CONFIRMATION_REQUIRED` → `CANCELLED` (usuário clica Cancelar)
  - `CONFIRMED` → `EXECUTING` (tool é executada)
  - `EXECUTING` → `COMPLETED` (tool retorna sucesso)
  - `COMPLETED` → `IDLE` (estado limpo, irrevogável)
- Uma vez em `COMPLETED`, qualquer evento `confirmation_required` para o mesmo `toolId` é REJEITADO como stale.
- No `action_end` live (`ChatArea.svelte:762`), limpe `confirmationId` e `confirmationMessage` explicitamente.

**Invariante:** "Um toolId nunca volta de COMPLETED para CONFIRMATION_REQUIRED."

**Arquivos:** `ChatArea.svelte`, `ToolCard.svelte`, `luna-chat-routes.js`
**Funções a alterar:** `handleConfirmation`, `handleActionEnd`, `handleToolReplay`

---

### FASE 3: POLIMENTO

#### 3.1 Renderização de tools por contrato de campos (luna-web)

**Problema:** `ToolCard.svelte:56` só lê `output/stdout/content`. viewDirectory retorna `{entries}` mas o card não sabe renderizar.

**Implementação:**
- Substitua o renderizador fixo por introspecção de campos:
  ```svelte
  {#if result.stdout || result.output || result.content}
    <pre>{result.stdout || result.output || result.content}</pre>
  {:else if result.entries}
    <DirectoryList entries={result.entries} />
  {:else if result.modified !== undefined}
    <GitStatus data={result} />
  {:else if result.results}
    <SearchResults results={result.results} count={result.matches} />
  {:else}
    <pre>{JSON.stringify(result, null, 2)}</pre>
  {/if}
  ```
- Isso torna o frontend resiliente a novas tools sem modificação.

**Invariante:** "O frontend renderiza qualquer tool result com pelo menos um campo conhecido."

**Arquivo:** `ToolCard.svelte`
**Funções a alterar:** `renderToolResult`

---

#### 3.2 Classificação de idempotência por semântica (luna-tool-guard.cjs)

**Problema:** `MUTATING_TOOL_RE` usa regex no nome da tool. `executeShell` com `cat`/`ls`/`git status` é erroneamente considerado mutante e pulado.

**Implementação:**
- Substitua `MUTATING_TOOL_RE` por um registro semântico:
  ```javascript
  const TOOL_SEMANTICS = {
    readFile: { idempotent: true, mutating: false },
    writeFile: { idempotent: false, mutating: true },
    executeShell: { idempotent: 'analyze_command', mutating: 'analyze_command' },
    // ...
  };
  ```
- Para `executeShell` e `executeScript`, analise o comando:
  ```javascript
  const READONLY_COMMANDS = new Set([
    'cat', 'ls', 'grep', 'find', 'head', 'tail', 'wc', 'git status',
    'git log', 'git diff', 'git branch', 'git remote', 'git config --list',
    'node --version', 'npm --version', 'which', 'echo'
  ]);

  function isReadOnlyCommand(command) {
    const cmd = command.trim().split(' ')[0];
    return READONLY_COMMANDS.has(cmd) || 
           READONLY_COMMANDS.has(command.trim().slice(0, 30));
  }
  ```
- TTL por categoria:
  - Read-only: TTL = 0 (sempre re-executa, cache desabilitado)
  - Mutante: TTL = 60s
  - Escrita: TTL = 0 + confirmação obrigatória

**Invariante:** "Uma tool read-only nunca é pulada por cache de idempotência."

**Arquivo:** `luna-tool-guard.cjs`
**Funções a alterar:** `isMutatingTool`, `getToolTTL`, `checkIdempotency`
**Não alterar:** `luna-soul.cjs` (a soul usa o guard, não define a política)

---

#### 3.3 Aliases centralizados de parâmetros (luna-tool-guard.cjs)

**Problema:** `replaceInFile` aceita `old`/`new` no schema, mas o bridge renomeia para `oldString`/`newString` ao recuperar JSON parcial, e o guard só normaliza `oldStr`/`newStr`.

**Implementação:**
- Crie uma função de normalização centralizada:
  ```javascript
  function normalizeToolParams(toolName, params) {
    const normalizers = {
      replaceInFile: (p) => ({
        ...p,
        old: p.old ?? p.oldStr ?? p.oldString ?? p.old_string ?? p.oldText,
        new: p.new ?? p.newStr ?? p.newString ?? p.new_string ?? p.newText,
      }),
      // Extensível para outras tools
    };
    return normalizers[toolName]?.(params) || params;
  }
  ```
- Aplique `normalizeToolParams` UMA ÚNICA VEZ no entry point de execução de tools (`luna-soul.cjs:2830` ou `luna-tool-guard.cjs:447`).

**Invariante:** "Todo alias conhecido de parâmetro é normalizado antes da validação."

**Arquivo:** `luna-tool-guard.cjs`
**Funções a alterar:** `validateParams`, `normalizeParams`
**Não alterar:** O schema JSON (mantenha `old`/`new` como canonical)

---

#### 3.4 Dedup de mensagens por UUID (luna-web)

**Problema:** Dedup por conteúdo + janela de 5s. Echo atrasado ou replayado após reconnect passa direto.

**Implementação:**
- Cada mensagem do usuário deve ter um client-generated UUID v4 anexado no momento do envio.
- O servidor ecoa o mesmo UUID.
- O frontend deduplica por UUID, não por conteúdo + timestamp.
- Se duas mensagens têm o mesmo UUID, são a mesma mensagem.
- Se têm UUIDs diferentes, são mensagens diferentes, mesmo com conteúdo idêntico.

**Invariante:** "Duas mensagens com o mesmo UUID são a mesma mensagem."

**Arquivo:** `ChatArea.svelte`
**Funções a alterar:** `handleSend`, `handleServerEcho`, `deduplicateMessage`

---

## CHECKLIST DE VERIFICAÇÃO POR FASE

Antes de declarar uma fase completa, verifique:

### Fase 1
- [ ] O interceptor do turno N é desregistrado antes do turno N+1?
- [ ] O `cursor.committed` é lido como fonte primária no `stream_end`?
- [ ] O fim de stream requer consenso de pelo menos 2 sinais independentes?
- [ ] Após `stream_end`, nenhum `response_delta` é processado?
- [ ] O conteúdo de `<thinking>` é descartado antes de chegar ao frontend?
- [ ] Se `<response>` não for encontrado, o turno é rejeitado?

### Fase 2
- [ ] Toda tool que retorna objeto produz feedback legível via `_serializeStructuredResult`?
- [ ] grep retorna `result.text` com contagem legível?
- [ ] viewDirectory retorna `result.text` com listagem legível?
- [ ] gitStatus retorna `result.text` com status legível?
- [ ] A máquina de estados de confirmação rejeita eventos stale para toolId em COMPLETED?
- [ ] O `action_end` live limpa `confirmationId` e `confirmationMessage`?

### Fase 3
- [ ] ToolCard renderiza qualquer result com pelo menos um campo conhecido?
- [ ] Tools read-only (cat, ls, git status) NÃO são puladas por cache?
- [ ] TTL de read-only é 0?
- [ ] Aliases de replaceInFile são normalizados antes da validação?
- [ ] Mensagens são deduplicadas por UUID?

---

## ORDEM DE COMMIT RECOMENDADA

```
commit 1: [F1.1] Isolamento de turno no interceptor
commit 2: [F1.2] Fonte única de verdade: cursor.committed
commit 3: [F1.3] Detecção de término de stream por consenso
commit 4: [F1.4] Eliminação do drain loop pós-conclusão
commit 5: [F1.5] Separação thinking/response com delimitadores
commit 6: [F2.1] Fallback universal de serialização
commit 7: [F2.2] Interface unificada ToolResult
commit 8: [F2.3] Máquina de estados de confirmação
commit 9: [F3.1] Renderização por contrato de campos
commit 10: [F3.2] Idempotência por semântica
commit 11: [F3.3] Aliases centralizados
commit 12: [F3.4] Dedup por UUID
```

---

## INSTRUÇÕES ESPECÍFICAS PARA KIMI K3

### Sobre thinking history
K3 é sensível ao histórico de thinking. SEMPRE inclua o thinking completo das interações anteriores no contexto. NUNCA truncue ou omita o thinking history ao passar contexto entre turns.

### Sobre proatividade
K3 tende a ser excessivamente proativo. Este prompt contém constraints explícitas para limitar isso. Se K3 sugerir alterações não listadas aqui, REJEITE e peça para seguir estritamente o plano.

### Sobre modo Plan
No modo Plan, K3 deve gerar um documento de plano detalhado (`.plan.md`) com:
- Cada commit listado acima expandido em subtarefas
- Arquivos afetados por commit
- Funções a alterar por commit
- Invariantes a verificar por commit
- Testes de regressão sugeridos por commit

### Sobre modo Act
No modo Act, K3 deve executar UM commit por vez. Após cada commit:
1. Verificar os checklists da fase correspondente
2. Rodar testes de regressão
3. Só então prosseguir para o próximo commit

---

## NOTA FINAL

Não implemente nada que não esteja neste prompt. Se encontrar um caso de borda não coberto, pare e reporte. Não invente soluções ad-hoc. A arquitetura proposta foi desenhada para ser minimalista, verificável e livre de race conditions.

Se uma correção exigir mais de 50 linhas de código novas, ela provavelmente não é minimalista. Revise.

Se uma correção adicionar um novo módulo ou dependência, ela provavelmente adiciona indireção. Revise.

Se uma correção não puder ser verificada por um invariante lógico simples, ela provavelmente é um remendo. Revise.
