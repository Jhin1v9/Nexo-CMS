# SWARM HANDOFF — NEXO CMS
> Arquivo de passagem de bastao para agente swarm continuar de onde parou.

---

## Estado Atual (2026-08-14)

**Milestone:** M2 — GIT FOUNDATION VALIDADO
**Proximo:** M3 — Editor core + Components/Media + Design/Responsive (NOT STARTED)

### O que foi entregue em M1 (2026-08-12)
- Monorepo pnpm com 8 packages + 2 apps
- @nexo/core, @nexo/shared, @nexo/security, @nexo/runtime
- @nexo/storage (SQLite, 5 repos, migrations)
- @nexo/adapters (15 detection adapters)
- @nexo/intelligence (scanner, ProjectModel, fingerprint)
- @nexo/control-plane + apps/runtime (Hono) + apps/cli
- 204 unit tests + 36 e2e verdes; build 10/10, typecheck 10/10, lint 0/0

### O que foi entregue em M2 (2026-08-14)
- **@nexo/git** (packages/git): GitClient + GitService sobre git CLI REAL via
  @nexo/runtime CommandExecutor (decisao D2 — zero deps externas novas).
  - status (porcelain v2, 12 estados de repo doc 10 s8, remoteState doc 10 s45)
  - diff (5 modos doc 10 s11), history (parents/refs/limit), branch list
  - branch create (check-ref-format real), switch (pre-check dirty: REQUIRES_COMMIT/BLOCKED, nunca descarta mudancas), delete (force -> UNSUPPORTED git.branch.deleteForce)
  - commit (escopo: staged default / files[] explicito / all:true opt-in; expectedHead optimistic concurrency -> CONFLICT; verificacao pos-commit; hook failure -> HookFailed)
  - push (JAMAIS force; NonFastForward -> CONFLICT; verificacao pos-push), pull (pre-check WorkingTreeDirty; conflito real -> CONFLICT + arquivos; piRefreshRecommended), fetch
  - redacao de credenciais em URLs de remote e em stderr de erros (doc 10 s33/s61)
  - erros classificados machine-readable (doc 10 s62/s63): details.gitError + nextAction
- **apps/runtime**: 11 capabilities git.* no Control Plane (endpoint generico M1, decisao D4)
- **policy**: leitura git SAFE/ALLOW; 7 mutacoes DESTRUCTIVE -> REQUIRE_APPROVAL mesmo com grant;
  reservadas SEM grant (DEFAULT DENY): git.forcePush, git.resetHard, git.branch.deleteForce
- **apps/cli**: `nexo git status|diff|history|branch list|branch create|branch switch|branch delete|commit|push|pull|fetch` (--json, saida humana, sem emojis)
- **Testes**: 313 unit (88 git) + 51 e2e (15 git-flow) verdes; security probes de injecao
  (path traversal, flag injection, shell metachars) com prova de nao-execucao
- **Verificacao independente**: smoke dist real (node apps/runtime/dist/main.js) —
  URLs 200/422/403/404 corretas, repo temp bit-identico apos probes, audit allow+deny+approval no DB

### Repo

git clone https://github.com/Jhin1v9/Nexo-CMS.git

---

## Decisoes registradas (ler OPEN-QUESTIONS.md e STACK-DECISION.md)
- D2: lib Git = git CLI real via CommandExecutor (simple-git/isomorphic-git/nodegit rejeitadas com pesquisa oficial)
- D3: permisses git camelCase (doc 10 autoridade); force reservadas
- D4: HTTP via endpoint generico /v1/capabilities/:id/invoke (sem rotas /git/*)
- D5: commit scope — staged default; files[] explicito; all:true opt-in; hunks UNSUPPORTED

---

## M3 — Editor core + Components/Media + Design/Responsive (INICIAR NA PROXIMA SESSAO)

### Escopo (DEPENDENCY-GRAPH / IMPLEMENTATION-PLAN)
- Save pipeline real (Pending -> Validate -> Conflict -> Adapter -> Persist -> Verify -> Re-analyze -> Preview -> Saved)
- Source mapping (elemento -> arquivo:linha:col; confidence EXACT|HIGH_CONFIDENCE|PARTIAL|UNKNOWN)
- Component schema registry; media engine (MIME real); design tokens; viewports/responsive lab
- UI (apps/cms React+Vite+Tailwind) entra aqui — STACK-DECISION: adiada do M1 para M3

### Documentacao obrigatoria (ler primeiro)
1. .nexo-knowledge/IMPLEMENTATION-PLAN.md — estado geral
2. .nexo-knowledge/doc-summaries/NEXO CMS — EDITOR.md (doc 07)
3. .nexo-knowledge/doc-summaries/NEXO CMS — COMPONENT AND MEDIA ENGINE.md (doc 08)
4. .nexo-knowledge/doc-summaries/NEXO CMS — DESIGN AND RESPONSIVE LAB.md (doc 09)
5. .nexo-knowledge/doc-summaries/GROUP-E-EDITOR-COMPONENTS-DESIGN.md
6. NEXO-KNOWLEDGE-INDEX.md — hierarquia de leitura e regras do swarm

### Open Questions relevantes
- Q5: merge de conflitos de edicao (source-editing subsystem) [AMBIGUO doc 07]
- Q2: auth/policy engine definitiva — boundary interno M1/M2 por enquanto
- Q3: schemas capabilities — extrair dos docs 07/08/09 conforme implementar

### Invariantes de seguranca (nao negociaveis, mantidas de M1/M2)
- DEFAULT DENY em todas as operacoes
- fs scope enforcement via @nexo/runtime
- Audit trail em todas as operacoes de risco
- Actor explicito em todas as chamadas
- Git real: toda edicao visual tem contraparte Git (editor -> save pipeline -> git status/diff visiveis; commit via git.commit com REQUIRE_APPROVAL)

---

## Comandos uteis
```bash
# Setup
cd Nexo-CMS
pnpm install

# Testes
pnpm test
pnpm test:e2e

# Build
pnpm build
pnpm typecheck
pnpm lint

# Runtime local (dist)
NEXO_PORT=47820 node apps/runtime/dist/main.js

# CLI local
node apps/cli/dist/main.js --help
node apps/cli/dist/main.js git status <projectId> --json
```

---

*Handoff atualizado em 2026-08-14. M1 + M2 concluidos e validados. M3 pronto para iniciar.*
