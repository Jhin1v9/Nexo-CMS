# Provider Research — OpenAI / Kimi / OpenAI-compatible local (2026-08-14)

Pesquisa de docs oficiais (doc 11 §100). Relatório integral na sessão; resumo operacional para adapters.

## OpenAI (platform.openai.com/docs/api-reference)
- Auth: `Authorization: Bearer KEY`; opcionais `OpenAI-Organization`, `OpenAI-Project`.
- Models: `GET /v1/models` → `{object:"list", data:[{id, object:"model", created, owned_by}]}`. Retrieve: `GET /v1/models/{id}`.
- Chat: `POST /v1/chat/completions`; obrigatórios `model`,`messages`. Roles: developer/system/user/assistant/tool. Response: `choices[0].message{role,content,refusal,tool_calls}`, `finish_reason ∈ stop|length|tool_calls|content_filter`, `usage{prompt_tokens,completion_tokens,total_tokens}`.
- Tools: `tools:[{type:"function",function:{name,description,parameters(JSON Schema),strict}}]`; resposta `tool_calls:[{id,type:"function",function:{name,arguments:string JSON}}]`; resultado `{role:"tool",tool_call_id,content}`; `tool_choice: none|auto|required|{...}`; parallel por default (`parallel_tool_calls:false` desliga).
- Structured output: `response_format:{type:"json_object"}` ou `{type:"json_schema",json_schema:{name,schema,strict:true}}` (strict: additionalProperties:false, todos required, máx 5 níveis/100 props). Refusal: `message.refusal`.
- Streaming: `stream:true` SSE; chunks `choices[0].delta{role?,content?,tool_calls?}`; tool_calls agregados por `index` concatenando `function.arguments`; `stream_options:{include_usage:true}` → chunk final com usage antes de `data:[DONE]`.
- Cancelamento: só client-side (abort). Sem endpoint server-side em Chat Completions.
- Erros: `{error:{message,type,param,code}}`; 400 invalid_request, 401 auth, 403 região, 404, 422, 429 rate-limit (respeitar Retry-After; códigos credit_balance_exhausted etc.), 500, 503 overloaded/Slow Down.

## Kimi / Moonshot (platform.kimi.ai/docs)
- Base global `https://api.moonshot.ai/v1`; China `https://api.moonshot.cn/v1`. Chaves NÃO intercambiáveis entre plataformas (401).
- Auth: Bearer. Models: `GET /v1/models` → shape OpenAI + extras por modelo: `context_length`, `supports_image_in`, `supports_video_in`, `supports_reasoning`. Doc recomenda consultar antes de chamar.
- Chat: `POST /v1/chat/completions` compatível OpenAI. Response extras: `message.reasoning_content` (thinking), `usage.cached_tokens`. Request extra: `partial` (Partial Mode).
- Tool calling idêntico OpenAI; "moonshot flavored json schema" mais estrito (anyOf/oneOf sem type por branch → 400) [parcialmente confirmado via issue]; reasoning_content deve ser repassado em multi-turn thinking [gotcha, issue de terceiro].
- JSON Mode confirmado (`response_format:{type:"json_object"}`); json_schema strict como response_format NÃO confirmado; `stream_options.include_usage` NÃO confirmado.
- Erros: `{error:{type,message}}`; 400 content_filter/invalid_request (contexto excedido), 401 invalid_authentication/incorrect_api_key, 403 permission_denied, 404 resource_not_found (modelo), 429 engine_overloaded (overloaded é 429, não 503)/exceeded_current_quota/rate_limit_reached, 499 client_closed_request, 500, 503, 504 (usar stream).
- Modelos 2026: kimi-k3 (1M ctx, visão, reasoning_effort low/high/max), kimi-k2.7-code-highspeed (256K), kimi-k2.6/k2.5 (256K). Não hardcodar: usar /v1/models.
- Extras: `/v1/tokenizers/estimate-token-count`, `/v1/users/me/balance`.

## Local OpenAI-compatible (Ollama 11434, LM Studio 1234, vLLM 8000)
- base_url `http://localhost:PORT/v1` (sufixo /v1 obrigatório); api_key dummy não-vazio (`'ollama'` "required but ignored"; vLLM opt-in `--api-key`; LM Studio [não confirmado]).
- `/v1/models`, `/v1/chat/completions`, `/v1/responses` (Ollama/LM Studio/vLLM), guided decoding (vLLM), structured output (LM Studio parcialmente confirmado).
- ERROS: shape pode DESVIAR do envelope OpenAI (vLLM `{object:"error",message,type,code:number}` documentado) → parser tolerante a múltiplos shapes.

## Cancelamento (todos)
Chat Completions: sem cancel server-side — abort client-side (AbortController). Kimi confirma 499 client_closed_request. Responses API tem /cancel (fora de escopo).
