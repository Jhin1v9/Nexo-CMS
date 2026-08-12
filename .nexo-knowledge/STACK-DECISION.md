# NEXO CMS — STACK DECISION (D1)
> Processo formal exigido por ARQUITETURE 01 §51/§52. Versões verificadas em fontes oficiais em 2026-08-12.

## Requisitos inspecionados
- Runtime precisa de: filesystem real, child processes, cross-platform (Linux/Windows/macOS), processos long-running, HTTP local para Control Plane. Doc 04 manda pesquisar explicitamente **Node.js process/fs/child-process APIs** → Node.js é a plataforma presumida dos docs.
- Estrutura proposta `apps/{cms,runtime}` + `packages/*` → monorepo.
- Repository Pattern obrigatório (SGBD substituível); deploy local primeiro.
- TypeScript: docs usam contratos em notação TS; ecosystem de adapters (AST/parsers) é JS/TS.

## Opções avaliadas
| Decisão | Opções | Escolha | Justificativa |
|---|---|---|---|
| Linguagem | TS / JS / Go / Rust | **TypeScript** | Contratos tipados entre 17+ capabilities; ecosystem AST (babel/ts-morph) é TS; docs citam TS. |
| Runtime | Node 22 / 24 / 26 | **Node.js ≥ 20 (recomendado 24 LTS)** | Node 24 = Active LTS até 2028-04 (nodejs.org, verificado). Build env desta sessão tem 20.20.2 instalado → engines `>=20` cobre ambos; sem APIs > Node 20. |
| Monorepo | pnpm / npm ws / turbo | **pnpm workspaces** | Padrão para monorepos TS; instalado via npm/corepack no ambiente. Sem turborepo (simplicidade, Inv. 41). |
| HTTP Control Plane | Hono / Express / Fastify | **Hono 4.13** (@hono/node-server) | TS-first, pequeno, Web Standards, middleware JWT/validator; verificado npm 4.13.1 (2026-08). Protocolo HTTP+JSON: docs não fixam protocolo (Open Question #1) → HTTP/JSON pela simplicidade (Inv. 41). |
| Schemas | zod / valibot / JSON Schema | **zod** | Validação de I/O de capabilities + integra com Hono validator. |
| Metadata store | better-sqlite3 / Postgres / JSON files | **better-sqlite3 ^12.11.1** atrás de Repository Pattern | Local-first, transações, zero serviço externo; Domain não conhece SQLite → troca futura sem reescrita (doc 14). **Desvio registrado (2026-08-12):** v13.0.3 declara engines node>=22 e seus prebuilds causam SEGFAULT no Node 20.20.2 do ambiente de build (verificado empiricamente); v12.11.1 suporta Node 20–26 com a mesma API. Inv. 38 (compatibilidade declarada) exigiu o pin compatível com a matriz `>=20`. |
| Testes | Vitest / Jest / node:test | **Vitest 4.1** | Rápido, ESM nativo, padrão no ecosystem Vite. |
| TS compiler | TS 6.0 / 7.0 | **TypeScript ^6.0** | 7.0 (port nativo Go) tem 1 mês; 6.0 é a ponte estável (manutenção/risco, Inv. 40/41). Upgrade path aberto. |
| Lint | oxlint | **oxlint** (leve) | Gate de merge exige lint quando configurado; oxlint é rápido e zero-config. |
| CLI | commander / util.parseArgs | **util.parseArgs (built-in)** | Sem dependência injustificada (Non-Goal §20 / Inv. 41). |
| UI (apps/cms) | React+Vite+Tailwind | **Adiado para M3** | Docs: "Não comece tentando construir todas as telas." M1 prova entendimento de projeto real via API/CLI. |

## Versões-alvo (pin no scaffold)
node >=20 · pnpm 10 · typescript ^6.0 · hono ^4.13 · @hono/node-server ^1 · zod ^4 · better-sqlite3 ^13 · vitest ^4.1 · oxlint latest

## Fontes
- nodejs.org/en/about/previous-releases + endoflife.date/nodejs (24 LTS ativo, EOL 2028-04-30; env instalado = v20.20.2)
- npmjs.com/package/hono (4.13.1), npmjs.com/package/better-sqlite3 (13.0.3, "requires currently supported Node.js"), npmjs.com/package/vitest (4.1.10), devblogs.microsoft.com/typescript (6.0 bridge / 7.0 native)

## Consequências
- Core tecnologicamente neutro (Inv. 43): nenhuma lógica de framework-alvo no Core — vale para o stack do Nexo também (Hono/SQLite ficam em apps/runtime e packages/storage, nunca em packages/core).
- Compatibilidade declarada (Inv. 38): suporte declarado = Node ≥ 20 testado em 20.20.2 (Linux); Windows/macOS = não testado nesta sessão (não declarar).
