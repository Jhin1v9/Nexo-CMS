# NEXO CMS — CAPABILITY MAP
> REQUIREMENT → DOMAIN → CAPABILITY → CONTRACT → DEPENDENCY. Nomes fiéis aos docs.

## Runtime (docs 04, 05) — DONO: RuntimeService / packages/runtime
- `filesystem.read|write|create|delete|rename|move` — scope Project Root; overwrite explícito; delete exige autorização + análise de risco.
- `process.list|start|stop|restart|inspect`
- `command.execute` — args estruturados, classificação SAFE/RESTRICTED/DANGEROUS/BLOCKED/UNKNOWN, cwd explícito.
- `build.run`, `test.run`, `preview.start|stop` — comando/ferramenta vêm da descoberta do projeto (build pertence ao projeto).
- Contrato de cada capability: Operation ID, I/O schemas, Authorization, Policy, Execution Context, Cancellation, Timeout, Audit.

## Engine / Project (docs 02, 05) — DONO: ProjectService + ProjectIntelligenceService
- `project.create|import|open|read|refresh|analyze|clone|export|archive|remove`
- Fluxo de importação: Select Folder → Scan → Analyze → Detect → Review → Confirm → Open Project.
- Discovery não-destrutivo. Saída: Project Model + Project Graph + confidence/support + persist metadata.
- `project.remove` ≠ deletar Source Project.

## Adapters (doc 03) — DONO: Adapter System / packages/adapters
- Contrato: `detect, getIdentity, getVersion, getCapabilities, analyze, validate` + métodos por categoria.
- Set inicial: Next.js, React, Vue, Svelte, Astro, HTML/CSS/JS; TypeScript; Tailwind, CSS Modules, styled-components, Plain CSS; npm/pnpm/yarn/bun.

## Control Plane (doc 06) — DONO: packages/control-plane
- `capabilities discovery` (GET) → mapa capability → allowed/denied por contexto.
- `capability invoke` (POST) → sync result | Job ID → `GET Job`, `job.cancel`.
- Erros agent-friendly com códigos estáveis. Paridade humano↔agente.

## Git (docs 10, 05) — DONO: GitService
- Mínima: `git.status|diff|history|branch.*|commit|push|pull|fetch`.
- Avançada: `git.merge|rebase|stash|revert|reset|cherryPick`.
- Alto risco (permissões separadas): `git.forcePush|resetHard|branch.deleteForce` (+ aprovação humana por policy).
- Cadeia: Consumer → Git API → GitService → Authorization → Runtime → Real Git Repo → Remote.

## Editor (doc 07) — DONO: Editor domain (futuro packages/editor)
- `editor.selection.read`, `editor.change.create|apply`, save pipeline (Pending→Validate→Conflict→Adapter→Persist→Verify→Re-analyze→Preview→Saved).
- Source Mapping confidence EXACT|HIGH_CONFIDENCE|PARTIAL|UNKNOWN. Change Object com Origin.

## Components / Media (doc 08)
- `component.detect|create|read|update|delete|promote|publish`; escopos Project|Workspace|Library.
- `media.list|read|search|upload|update|replace|delete`; MIME real, não extensão.

## Design / Responsive (doc 09)
- `design.read|update`, `design.token.*`, `theme.*`.
- `responsive.viewport.create|preview|diagnose|stressTest|compare|snapshot`; stress test NUNCA persistido.

## AI / Luna (doc 11)
- `ai.task` (QUEUED…COMPLETED/FAILED/CANCELLED, persistente, cancelável).
- Tool Contract: Tool ID, I/O schemas, Required Permission, Scope, Side Effects, Async, Error Model; validação em 6 checagens.
- Fluxo: AI → Tool → Authorization → Nexo Engine → Capability. Providers via contrato `identify/getModels/generate/stream/cancel`.
- Luna integra via Nexo Agent Interface (nunca Playwright/UI).

## Integrations / Deployment (doc 12)
- `deployment.preflight|deploy|verify|rollback` (rollback first-class, 4 semânticas).
- Estados normalizados incl. UNKNOWN; provider é a verdade do estado externo.
- Providers: Vercel, Hostinger, SSH, SFTP, FTP, Docker atrás de contrato comum.

## Workspace / Storage (docs 14, Workspace Model)
- Entidades Nexo-owned via Repository Pattern; isolamento cross-Workspace na query boundary.
- 8 repositórios nomeados (ver GROUP-G); secrets separados de metadata.

## Testes (doc 13)
- Pirâmide: Unit → Adapter → Domain → Contract → Integration → E2E/Real Project.
- Contract tests em 9 fronteiras. No-Playwright Control Plane Test mandatório. Fixture matrix: 6 frameworks × 5 styling.
- No Fake Validation: validar condição real (exit code, source resultante, verificação de deploy).
