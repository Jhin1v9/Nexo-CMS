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

## D2 — Lib Git concreta (2026-08-14, Open Question #4)
> Exigência dos docs: Git REAL (doc 10 §1/§83: "must never replace Git's actual repository state"; Inv. 14; doc 10 §82 passos 5-6: inspecionar versão do git do ambiente + docs oficiais).

### Opções avaliadas (pesquisa oficial 2026-08-14)
| Opção | Veredito | Motivo |
|---|---|---|
| **git CLI real via @nexo/runtime CommandExecutor** | **ESCOLHIDA** | É o Git canônico (binário `git` 2.39.5 verificado no ambiente). A cadeia arquitetural do doc 10 §3/§51 é Consumer → Git API → GitService → Authorization → **Runtime** → Real Git: o executor do M1 já provê spawn sem shell, scope guard (cwd dentro do Project Root), classificação, timeout real, audit allow+deny e process registry — exatamente a fronteira de segurança exigida. Hooks Git executam de verdade e são contabilizados (doc 10 §54/§55). Zero dependência nova (SPEC §0 / Inv. 41). Saída estruturada via formatos machine-readable oficiais (`--porcelain=v2 --branch`, `--format` com separadores, `--numstat`). |
| simple-git 3.36.0 | Rejeitada | Wrapper popular e mantido (npm, verificado 2026-08), mas executa git FORA da fronteira @nexo/runtime (spawn próprio: perde scope guard/classificação/audit da cadeia doc 10 §51) e adiciona dependência + superficie de CVE (CVE-2026-28292, crítico, corrigido em 3.32.3 — Snyk/GitHub Advisory, verificado). |
| isomorphic-git | Rejeitada | Reimplementação JS pura do Git — risco direto à Inv. 14 ("Git não pode ser falsificado") e ao doc 10 §83 (nunca substituir estado/história/semântica reais); não executa hooks do projeto (doc 10 §54); manutenção comunitária reduzida (README oficial). |
| nodegit (libgit2) | Rejeitada | Binding nativo frágil (build por plataforma; histórico de segfaults), não é o git CLI canônico. |

### Consequências
- `@nexo/git` (M2) implementa GitClient/GitService sobre `CommandExecutor` injetado: semântica de comando, interpretação de estado, autorização e resultado estruturado ficam no GitService; execução de processo fica no Runtime (doc 10 §51).
- Erros classificados em códigos de máquina (doc 10 §62/§63); verificação pós-operação obrigatória (§58/§59/§60); URLs remotas com credenciais redigidas (§61); force ops são permissões separadas (§25/§70).
- Versão do git inspecionada em runtime (`git --version`); formatos usados existem desde git ≥ 2.11 (porcelain v2) — matriz declarada: git ≥ 2.20 recomendado, testado em 2.39.5 (Linux).
- Fontes: npmjs.com/package/simple-git (3.36.0), GitHub Advisory GHSA-r275-fr43-pm7q / CVE-2026-28292, isomorphic-git.org README/FAQ, git-scm.com/docs (porcelain v2).

## Consequências
- Core tecnologicamente neutro (Inv. 43): nenhuma lógica de framework-alvo no Core — vale para o stack do Nexo também (Hono/SQLite ficam em apps/runtime e packages/storage, nunca em packages/core).
- Compatibilidade declarada (Inv. 38): suporte declarado = Node ≥ 20 testado em 20.20.2 (Linux); Windows/macOS = não testado nesta sessão (não declarar).
