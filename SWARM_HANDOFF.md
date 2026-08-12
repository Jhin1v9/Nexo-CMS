# SWARM HANDOFF — NEXO CMS
> Arquivo de passagem de bastao para agente swarm continuar de onde parou.

---

## Estado Atual (2026-08-12)

**Milestone:** M1 — FOUNDATION ✅ VALIDADO
**Proximo:** M2 — Git Foundation (NOT STARTED)

### O que foi entregue em M1
- Monorepo pnpm com 8 packages + 2 apps
- @nexo/core, @nexo/shared, @nexo/security, @nexo/runtime
- @nexo/storage (SQLite, 5 repos, migrations)
- @nexo/adapters (15 detection adapters)
- @nexo/intelligence (scanner, ProjectModel, fingerprint)
- @nexo/control-plane + apps/runtime (Hono) + apps/cli
- 204 unit tests + 36 e2e verdes
- Build 10/10, typecheck 10/10, lint 0/0

### Repo

git clone https://github.com/Jhin1v9/Nexo-CMS.git


---

## M2 — Git Foundation (INICIAR AGORA)

### Escopo
Implementar operacoes Git via Runtime com seguranca DEFAULT DENY:
- git.status, git.diff, git.history, git.branch.*
- git.commit, git.push, git.pull, git.fetch
- Operacoes de risco com REQUIRE_APPROVAL
- Git real (nao emulado)

### Documentacao obrigatoria (ler primeiro)
1. .nexo-knowledge/IMPLEMENTATION-PLAN.md — estado geral
2. .nexo-knowledge/doc-summaries/GROUP-F-GIT-AI-INTEGRATIONS.md — Doc 10 (Git)
3. .nexo-knowledge/doc-summaries/GROUP-D-RUNTIME-ENGINE-CONTROL.md — Doc 04/05/06
4. .nexo-knowledge/OPEN-QUESTIONS.md — Questao #4 (lib Git concreta)
5. SPEC.md — §12 Acceptance Criteria

### Decisao pendente (Questao #4)
Lib Git concreta: isomorphic-git vs nodegit vs CLI
Regra: docs exigem Git real. Decidir com pesquisa oficial antes de codificar.

### Open Questions relevantes
- Q4: Lib Git concreta → DECIDIR PRIMEIRO
- Q2: Auth/policy engine → usar boundary interno M1 por enquanto
- Q3: Schemas capabilities → extrair de doc 06 conforme implementar

### Estrutura esperada

packages/git/          # novo package
  src/
    index.ts
    operations/        # status, diff, log, branch, commit, push, pull, fetch
    security/          # risk classification, approval gates
    adapter/           # integracao com @nexo/runtime
  test/
apps/cli/src/          # novos comandos git:*
apps/runtime/src/      # novos endpoints /git/*


### Invariantes de seguranca (nao negociaveis)
- DEFAULT DENY em todas as operacoes
- fs scope enforcement via @nexo/runtime
- Audit trail em todas as operacoes de risco
- REQUIRE_APPROVAL para: commit, push, pull, branch delete, force operations
- Actor explicito em todas as chamadas

---

## Checklist de inicio M2
- [ ] Ler GROUP-F-GIT-AI-INTEGRATIONS.md completo
- [ ] Pesquisar e decidir lib Git (isomorphic-git vs nodegit vs CLI)
- [ ] Documentar decisao em STACK-DECISION.md
- [ ] Implementar git.status (read-only, ALLOW)
- [ ] Implementar git.diff (read-only, ALLOW)
- [ ] Implementar git.log / git.history (read-only, ALLOW)
- [ ] Implementar git.branch.list (read-only, ALLOW)
- [ ] Implementar git.branch.create (REQUIRE_APPROVAL)
- [ ] Implementar git.branch.delete (REQUIRE_APPROVAL)
- [ ] Implementar git.commit (REQUIRE_APPROVAL)
- [ ] Implementar git.push (REQUIRE_APPROVAL)
- [ ] Implementar git.pull (REQUIRE_APPROVAL)
- [ ] Implementar git.fetch (REQUIRE_APPROVAL)
- [ ] Testes unit + e2e para cada operacao
- [ ] Security probes (injecao de path, escape de scope)
- [ ] Atualizar IMPLEMENTATION-PLAN.md

---

## Comandos uteis
bash
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

# CLI local
node apps/cli/dist/index.js --help


---

*Handoff gerado por Luna em 2026-08-12. M1 concluido. M2 pronto para iniciar.*
