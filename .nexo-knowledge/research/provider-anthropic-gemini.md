# Provider Research — Anthropic / Gemini (2026-08-14)

Docs oficiais (doc 11 §100). Anthropic migrou para platform.claude.com/docs (docs.anthropic.com redireciona).

## Anthropic Messages API
- Auth: `x-api-key: KEY` (ou Bearer p/ tokens WIF) + **obrigatório** `anthropic-version: 2023-06-01` + content-type json. `anthropic-beta` opcional.
- `POST https://api.anthropic.com/v1/messages`: obrigatórios `model`, `max_tokens`, `messages`. `system` é campo TOP-LEVEL separado (string ou TextBlockParam[]). Roles user/assistant (+system mid-conversation em modelos 2026, nunca 1ª msg). Última assistant = prefill (não em 4.6+).
- Response: `{id, type:"message", role:"assistant", content: ContentBlock[], model, stop_reason, usage}`; stop_reason ∈ end_turn|max_tokens|stop_sequence|tool_use|pause_turn|refusal|model_context_window_exceeded; usage{input_tokens, output_tokens, cache_*...}.
- Models: `GET /v1/models?limit&after_id&before_id` → `{data:[{id, type:"model", display_name, created_at, max_input_tokens, max_tokens, capabilities}], has_more, first_id, last_id}`. Retrieve: `GET /v1/models/{id}`.
- Tools: `tools:[{name, description, input_schema(JSON Schema 2020-12), strict?}]`; resposta = content block `{type:"tool_use", id:"toolu_...", name, input:object}` + stop_reason "tool_use"; resultado = msg `role:"user"` com `content:[{type:"tool_result", tool_use_id, content}]`; tool_choice {type:auto|any|none|tool, disable_parallel_tool_use?}.
- Structured output (2026): `output_config.format:{type:"json_schema", schema}` → JSON no text block; ou strict tool / forced tool. Limites: 20 tools strict, 16 unions, erro 400 "Schema is too complex".
- Streaming SSE: message_start → content_block_start/delta/stop → message_delta → message_stop; deltas text_delta / **input_json_delta{partial_json}** (acumular+parsear no stop) / thinking_delta; eventos desconhecidos ignorar; erro mid-stream vem como evento `error`.
- Erros: `{type:"error", error:{type,message}, request_id}`; 400 invalid_request, 401 authentication, 402 billing, 403 permission, 404 not_found, 409 conflict, 413 request_too_large, 429 rate_limit (retry-after header), 500 api_error, 504 timeout, **529 overloaded** (backoff).
- Cancelamento: sem endpoint para /v1/messages [confirmado por ausência] → abort client-side. Só Batches tem cancel.
- Modelos 2026: claude-fable-5/opus-5/sonnet-5 (1M ctx, 128k output; 300k via beta), haiku-4-5 (200k/64k). Consultar Models API para limites.

## Gemini (generativelanguage.googleapis.com, v1beta)
- Auth: header `x-goog-api-key: KEY` (oficial) ou `?key=KEY` (exemplos curl oficiais).
- `POST /v1beta/{model=models/*}:generateContent`: `contents[]` (Content{parts[], role ∈ user|model}), `systemInstruction` (Content text-only), `generationConfig`, `tools[]`, `toolConfig`, `safetySettings[]`.
- Response: `candidates[{content{role:"model",parts[]}, finishReason, ...}]`, `promptFeedback{blockReason?}`, `usageMetadata{promptTokenCount, candidatesTokenCount, totalTokenCount, ...}`, `modelVersion`, `responseId`.
- Function calling: `tools:[{functionDeclarations:[{name, description, parameters(OpenAPI 3.03) | parametersJsonSchema(JSON Schema) — mutuamente exclusivos}]}]`; modelo retorna Part `functionCall{name, args, id?}`; cliente devolve Part `functionResponse{name, response, id?}` — role do turno é ambíguo na doc ("function" no texto vs user|model no schema) [usar role "user" + parte functionResponse, prática corrente]; toolConfig.functionCallingConfig.mode AUTO|ANY|NONE|VALIDATED + allowedFunctionNames.
- Streaming: `POST /v1beta/{model}:streamGenerateContent?alt=sse` — chunks SSE = GenerateContentResponse parcial.
- Structured output: `generationConfig.responseMimeType:"application/json"` + `responseJsonSchema` (JSON Schema; responseSchema legacy deprecated; propertyOrdering não-padrão suportado).
- Erros: shape Google `{error:{code:int, message, status:google.rpc.Code}}` [verificado live 403 PERMISSION_DENIED; doc impressa só cobre Interactions API]; 429 RESOURCE_EXHAUSTED (backoff+jitter), 503 UNAVAILABLE; não retentar 400/403.
- Models: `GET /v1beta/models?pageSize&pageToken` → `{models:[{name:"models/{id}", displayName, inputTokenLimit, outputTokenLimit, supportedGenerationMethods[], thinking...}], nextPageToken}`.
- Modelos 2026: gemini-3.7-flash (stable), 3.6-flash, 3.1-pro-preview, 2.5-flash/pro (mantidos), 2.0 shut down. Limits confirmados: input 1.048.576 / output 65.536.

## Não confirmado (não adivinhar)
1. Anthropic cancel de /v1/messages (sem statement oficial).
2. Gemini error JSON do generateContent impresso em doc (só live probe).
3. Gemini role do functionResponse (doc contraditória).
4. Gemini streaming sem alt=sse (só alt=sse em exemplo oficial).
