# M3-RESULT.md — Relatório Final do Milestone M3

Data: 2026-08-14. Commit: `4dafd87` (feat(m3)). Veredicto da revisão independente (Wave 8-9): **APROVADO**, zero achados bloqueantes.

## 1. Escopo exato do M3

Editor core + Components/Media Engine + Design/Theme + Responsive Lab + UI `apps/cms`, conforme M3-CONTRACTS.md (Wave 1 congelada): 37 capabilities M3 (35 + 2 da emenda D19: `responsive.viewport.list/delete`) expostas via `POST /v1/capabilities/:id/invoke` (D4 — interface genérica única).

## 2. O que já existia

- M1: Control Plane HTTP (Hono 4), 5 capabilities `project.*`, 3 `runtime.*`, scope guard, audit events, PolicyEngine DEFAULT DENY (packages/security), storage better-sqlite3 com migrations.
- M2: Git Foundation — @nexo/git + 11 capabilities `git.*` + CLI base + policy REQUIRE_APPROVAL.
- Total pré-M3: 19 capabilities, 8 pacotes, apps/{runtime,cli}.

## 3. O que foi implementado

5 novos pacotes de domínio (editor, media, components, design, responsive), camada de transformação AST em adapters, source mapping + asset references em intelligence, 5 migrations de storage (v2-v6) com repositories, Control Plane M3 (37 specs + handlers), canal de aprovação D17 end-to-end (security → runtime → CLI → UI), 35 comandos CLI, e a UI completa `apps/cms` (React 19 + Vite 8 + Tailwind v4 + TanStack Router/Query/Table + zustand + lucide-react).

## 4. Novas capabilities

37: `editor.*` (10: source.open/save/close, change.apply/undo/redo/list, draft.create/discard, diagnostics, preview.refresh), `component.*` (6: list/inspect/create/update/delete/publish), `media.*` (7: upload/list/inspect/update/replace/delete/usage), `design.*` (4: get/update/token.list/token.update), `theme.*` (2: list/apply), `responsive.*` (8: viewport.create/list/delete, preview, diagnose, stressTest, compare, snapshot). Total descobrível: **56**.

## 5. Novas APIs

Nenhuma rota HTTP nova fora do contrato D4: tudo via `POST /v1/capabilities/:id/invoke` + `GET /v1/capabilities` (agora 56 entradas com requiredPermission/risk/decision). Envelope de invoke estendido com `approval: {approver, justification?}` (D17).

## 6. Novos serviços backend

- packages/editor: save pipeline de 8 etapas (Pending→Validate→Conflict→Adapter→Persist→Read/Verify→UpdatePI→Preview→MarkSaved), drafts, undo/redo, Change Object (D7).
- packages/media: identidade de asset (metadata name/type/size), magic bytes MIME (sem dep nova), lifecycle de usage.
- packages/components: Component Schema (08§9), publish pipeline (08§25) com validação de 6 checks (08§74) incl. secret scan sem vazar valores.
- packages/design: tokens (@theme Tailwind v4 + config v3), themes.
- packages/responsive: viewports (registry Nexo-owned), preview real via dev server (spawn sem shell, ProcessRegistry SIGTERM→SIGKILL), diagnose/stress via Playwright (diagnostics-only, D14), compare via pixelmatch.
- packages/intelligence: mapComponentSource (confidence EXACT|HIGH_CONFIDENCE|PARTIAL|UNKNOWN), findAssetReferences.
- packages/adapters/transform: react-tsx-transformer (offsets AST via compilador TS, byte-preserving, re-parse de verificação — D8, nunca string replacement), tailwind-styling-adapter, plain-css-styling-adapter, css-source.

## 7. Mudanças de storage

Migrations v2 (media_assets), v3 (responsive_viewports, responsive_snapshots), v4 (editor_drafts), v5 (components, component_versions), v6 (design tokens/themes). Versiones reservadas por pacote (protocolo anti-colisão). 4 novos repositories.

## 8. Mudanças de runtime

`apps/runtime/src/capabilities/m3.ts`: M3_CONTRACT_SPECS (fonte única id→contrato+handler, 37 specs), wiring editor com createReactSourceTransformAdapter/scanAndPersist/mapComponentSource. Policy: M3_READ_PERMISSIONS (22) + M3_MUTATION_PERMISSIONS (15, todas REQUIRE_APPROVAL). Gate order: registry→zod→authorize→handler (short-circuit).

## 9. Mudanças de adapters

Novo subpath `transform/`: 4 arquivos novos, 70 testes. AST via TypeScript compiler API (D8), sem regex/string replace.

## 10. Mudanças de segurança

D17: tipo `Approval`, PolicyEngine REQUIRE_APPROVAL+approval válido→ALLOW por invocação (nunca cria grant), AuditEvent.approval={approvedBy, justification?}. UI: ApprovalDialog re-invoca com approval. CLI: --approve/--approver/--justification. Git: novo GitErrorKind `IdentityNotConfigured`→INVALID_INPUT acionável (nextAction configure-git-user-name-and-email).

## 11. Mudanças de UI

`apps/cms` novo (108 arquivos): AppShell/Sidebar/Header/JobsIndicator; ui kit (Button, Dialog, ApprovalDialog, Tabs, Toast, Tooltip, Badge, ConfidenceBadge, RiskBadge, Card, EmptyState, ErrorState, Spinner, Field/Input/Select, GuardedButton); áreas: Projects, Git, Editor (3-pane FileTree/Code/Inspector, save flow com 5 resoluções de conflito sem Merge — D12), Components (TanStack Table v9, wizards, PublishValidationView 6 checks), Media (grid/upload/detail/replace/delete), Design (tokens/themes), Responsive (viewports/preview/diagnose/stress/compare/snapshot), stub Audit (gate honesto por discovery). Zero emojis, zero alert()/confirm()/prompt(), ícones Lucide. Proxy vite→127.0.0.1:47820.

## 12. Mudanças de AI

Nenhuma capability de IA no M3 (fora de escopo). Source mapping e references são determinísticos (packages/intelligence), sem modelo.

## 13. Mudanças de git

Apenas classificação de erro nova (`IdentityNotConfigured`, packages/git/src/errors.ts + types.ts). Nenhuma capability git nova em M3.

## 14. Novos testes

Suítes novas: editor 42, media 43, components 21, design 24, responsive 28, adapters 70, intelligence 44, control-plane 17, apps/cms 115, m3-capabilities (apps/runtime) 24 — total monorepo **725 passed, 1 skipped, 0 failed**.

## 15. Testes de integração reais

apps/runtime/test/m3-capabilities.test.ts: servidor HTTP real + disco real: save sem approval→422 sem escrita; upload sem approval→422 sem arquivo; audit com approvedBy; transformação AST verificada em disco; stress test com prova de zero mutação (sha256 da árvore idêntico).

## 16. Resultados E2E

`pnpm test:e2e`: **54/54** (agent-flow 36 + git-flow 18): 56 capabilities descobertas, DEFAULT DENY anônimo, probes de segurança 6/6 (path traversal absoluto/relativo/symlink/null byte/..%2f/metacaracteres), STALE_CONTEXT+refresh, git commit com approval e HEAD avançando, 24 audit events com approvedBy=qa-m3.

## 17. Achados de segurança

Revisão independente (Wave 8-9): 0 bloqueantes. Riscos aceitos/documentados: (1) approval audita mas não autentica aprovador (D17/OQ#2 — auth formal futura); (2) ator auto-declarado via header, mitigado por fail-closed + bind 127.0.0.1; (3) env propagado a processos filhos (dev server/executor); (4) playwright/pixelmatch/pngjs como devDependencies usadas em src (D16); (5) transform adapter sem guard próprio — inalcançável via HTTP em M3 (nenhum handler seta transformRequest); guard obrigatório se exposto no futuro.

## 18. Achados de performance

Não bloqueantes: build monorepo ~min; apps/cms vite build 2.17s; diagnose/stress usam perfis fixos (D14); lint 320 arquivos em ~300ms. Sem medição formal de latência por capability neste milestone.

## 19. Achados de acessibilidade

Confirmações via Dialog acessível (sem alert/confirm/prompt nativos); estados vazios/erro dedicados; badges de confidence/risk com texto, não só cor. Auditoria automatizada (axe) não executada — candidata a M4.

## 20. Limitações conhecidas

Merge de conflito: UNSUPPORTED (D12). Sem processamento de imagem/AVIF (D13). Playwright somente diagnóstico (D14). Approval sem identidade verificável (D17). Fluxos de migração de publish: M4+ (D11). `runtime.command.execute` sem approval interativo (D18, M4). Undo de create/delete de arquivo: UNSUPPORTED honesto.

## 21. Questões abertas

D6-D19 registradas em .nexo-knowledge/OPEN-QUESTIONS.md; divergências Wave 3 aceitas em D18 (responsive sem sourceMapping; viewport.create projectId opcional). OQ#2 (auth formal) segue aberta para milestone de Security Architecture.

## 22. Decisões tomadas

D6 stack React+TSX+Tailwind+PlainCSS; D7 Change Object tipado; D8 AST via TS compiler; D9 permission=capability id; D10 registries via storage Repository; D11 publish full pipeline; D12 Merge=UNSUPPORTED; D13 sem AVIF; D14 Playwright diagnostics-only; D15 versões frontend (React 19.2.8, Vite 8.2.1, Tailwind 4.3.3, TanStack Router 1.170.27 — React Router 8 rejeitado por Node≥22); D16 deps backend (playwright 1.62.1, pixelmatch 7.2.0, pngjs 7.0.0); D17 canal de aprovação; D18 divergências aceitas; D19 emenda viewport.list/delete.

## 23. Dependências adicionadas

Frontend: react/react-dom 19.2.8, vite 8.2.1, @vitejs/plugin-react 6.0.5, tailwindcss+@tailwindcss/vite 4.3.3, lucide-react 1.31.0, @tanstack/react-router 1.170.27, @tanstack/react-table 9.1.2, @tanstack/react-query 5.101.4, zustand 5.0.15, @uiw/react-codemirror 4.25.11 + @codemirror/lang-{html 6.4.9, css 6.3.1, javascript 6.2.2}, @atlaskit/pragmatic-drag-and-drop 2.0.2, @base-ui/react 1.7.0. Backend: playwright 1.62.1, pixelmatch 7.2.0, pngjs 7.0.0.

## 24. Arquivos alterados

283 arquivos, +42.362/-86 linhas (commit 4dafd87): 108 novos em apps/cms, 121 novos nos 5 pacotes M3, 10 em adapters/transform, 5 em intelligence, 4 em storage, 2 em apps/runtime, 1 M3-CONTRACTS.md, demais modificações em CLI/security/git/tests/docs.

## 25. Comandos exatos de verificação

```
pnpm install --frozen-lockfile
pnpm build                                        # exit 0
pnpm test                                         # 725 passed, 1 skipped, 0 failed
pnpm test:e2e                                     # 54/54
pnpm lint                                         # 0 warnings, 0 errors (320 arquivos)
pnpm --filter ./apps/cms test                     # 115/115
pnpm --filter ./apps/cms build                    # exit 0
# live smoke:
node apps/runtime/dist/main.js &                  # NEXO_HOME=<tmp>
curl -X POST http://127.0.0.1:47820/v1/capabilities/responsive.viewport.list/invoke \
  -H 'content-type: application/json' -H 'x-nexo-actor: cli:local' -d '{}'
# -> {"ok":true,"value":[5 presets]}
```

## 26. Resultados finais exatos

- Capabilities: **56** (project 5, runtime 3, git 11, editor 10, component 6, media 7, design 4, theme 2, responsive 8).
- Testes: **725 passed / 1 skipped / 0 failed**; e2e **54/54**; lint **0/0**; build **verde** em todos os 16 pacotes/apps.
- Live smoke: `responsive.viewport.list` HTTP real → ok:true com 5 viewports preset.
- Bugs da verificação Wave 6-7 corrigidos e revalidados: BUG-1 (specs viewport.list/delete), BUG-2 (CLI media list metadata), BUG-3 (git IdentityNotConfigured→INVALID_INPUT).
- Revisão independente Wave 8-9: **APROVADO**.
