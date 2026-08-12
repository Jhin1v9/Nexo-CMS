# NEXO CMS — SPEC.md (M1 — FOUNDATION)
> Single source of truth para o M1. Fontes: `.nexo-knowledge/*` (síntese fiel dos 35 docs). Invariantes: ver INVARIANTS.md. Stack: ver STACK-DECISION.md.
> **Prova do M1:** Select Project Folder → Runtime Access → Project Scan → Stack Detection → Project Model → Project Open — via HTTP API e CLI (mesma capability), com testes reais sobre fixture projects.

## 0. Regras globais (não negociáveis)
- TypeScript strict, ESM, Node >=20. Sem `any` salvo justificado. Sem dependência nova sem justificativa no código (comentário `// dep:`).
- Nomenclatura oficial do Glossary (ProjectModel, Adapter, RuntimeCapability, ValidationGate...).
- Confidence: `CONFIRMED | HIGH | MEDIUM | LOW | UNKNOWN`. Suporte: `FULLY_SUPPORTED | PARTIALLY_SUPPORTED | DETECTED_BUT_UNSUPPORTED | UNKNOWN | CUSTOM`.
- Nunca inventar: incerto → `UNKNOWN`/`UNSUPPORTED`. Discovery NUNCA muta o projeto (sem npm install, sem git init, sem writes).
- Erros estruturados agent-friendly: `{ code, message, operationId?, resource?, retryable, requiresApproval?, requiredCapability?, details? }`. Códigos M1: `NOT_FOUND, CONFLICT, STALE_CONTEXT, UNSUPPORTED, UNKNOWN, REQUIRE_APPROVAL, FORBIDDEN, INVALID_INPUT, SCOPE_VIOLATION, COMMAND_BLOCKED, INTERNAL, STORAGE_UNAVAILABLE`.
- Toda operação importante emite AuditEvent (Who/What/Resource/Context/Decision/Result/Time).
- Resultados parciais explícitos: `status: 'SUCCESS' | 'PARTIAL' | 'FAILED'`; nunca success em parcial.

## 1. Layout do monorepo (pnpm workspaces)
```
nexo-cms/
  package.json  pnpm-workspace.yaml  tsconfig.base.json  .gitignore  README.md
  packages/
    shared/         # tipos puros, Result, erros, enums — zero deps runtime
    core/           # CapabilityContract, registry types, domain events — deps: shared
    security/       # AuthorizationBoundary (pure decision engine), AuditEvent types — deps: shared
    runtime/        # filesystem scope guard, command.execute, process.list — deps: shared, security
    storage/        # better-sqlite3 + Repository Pattern — deps: shared
    adapters/       # Adapter Contract + detection adapters — deps: shared
    intelligence/   # scanner, root/stack detection, ProjectModel builder — deps: shared, adapters
    control-plane/  # registry, discovery, invoke, jobs — deps: core, security, runtime, storage, intelligence
  apps/
    runtime/        # Hono server expondo o Control Plane (HTTP+JSON, 127.0.0.1)
    cli/            # nexo CLI — mesmo Control Plane via HTTP client (fetch)
  tests/
    fixtures/       # fixture projects reais (versionados)
    contract/       # contract tests
    e2e/            # no-playwright agent test (fetch/CLI)
```
Cada package: `package.json` (`"name": "@nexo/<pkg>"`, `"type": "module"`, exports `./src/index.ts` via tsx para dev e build tsc para dist), `tsconfig.json` estendendo base, `src/`, `test/` (vitest).

## 2. Contratos congelados (Wave 1 — packages/shared + packages/core)

### packages/shared
```ts
export type Result<T, E = NexoError> = { ok: true; value: T } | { ok: false; error: E };
export interface NexoError { code: ErrorCode; message: string; operationId?: string; resource?: string;
  retryable: boolean; requiresApproval?: boolean; requiredCapability?: string; details?: Record<string, unknown>; }
export type ErrorCode = 'NOT_FOUND'|'CONFLICT'|'STALE_CONTEXT'|'UNSUPPORTED'|'UNKNOWN'|'REQUIRE_APPROVAL'
  |'FORBIDDEN'|'INVALID_INPUT'|'SCOPE_VIOLATION'|'COMMAND_BLOCKED'|'INTERNAL'|'STORAGE_UNAVAILABLE';
export type Confidence = 'CONFIRMED'|'HIGH'|'MEDIUM'|'LOW'|'UNKNOWN';
export type SupportLevel = 'FULLY_SUPPORTED'|'PARTIALLY_SUPPORTED'|'DETECTED_BUT_UNSUPPORTED'|'UNKNOWN'|'CUSTOM';
export type OpStatus = 'SUCCESS'|'PARTIAL'|'FAILED';
export type Detection<T> = { value: T | null; confidence: Confidence; evidence: string[] };
// helpers: ok(), err(), newOperationId() (crypto.randomUUID)
```
Zero dependências de runtime. Puro.

### packages/core
```ts
export type CapabilityId = string; // 'project.import' | 'runtime.command.execute' | ...
export interface CapabilityContract<I = unknown, O = unknown> {
  id: CapabilityId;
  version: 1;
  domain: string;                 // 'project' | 'runtime' | ...
  description: string;
  inputSchema: z.ZodType<I>;      // zod v4
  resultSchema: z.ZodType<O>;
  requiredPermission: string;     // 'project.import', 'runtime.command.execute', ...
  risk: 'SAFE' | 'MODIFYING' | 'DESTRUCTIVE' | 'CRITICAL';
  sideEffects: boolean;
  async: 'sync' | 'job';
  timeoutMs: number;
}
export type DomainEvent = { id: string; type: string; occurredAt: string; payload: Record<string, unknown> };
export interface ExecutionContext {
  operationId: string; initiatedBy: Actor; executedBy: Actor;
  workspaceId?: string; projectId?: string; environment?: 'DEVELOPMENT'|'PREVIEW'|'STAGING'|'PRODUCTION';
}
export type Actor = { kind: 'HUMAN'|'AGENT'|'CLI'|'SYSTEM'; id: string; };
```
deps: shared, zod.

## 3. packages/security (Wave 2A)
```ts
export type Decision = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'UNKNOWN';
export interface AuthorizationRequest { actor: Actor; permission: string;
  scope: { workspaceId?: string; projectId?: string; environment?: string }; context?: Record<string, unknown>; }
export interface AuthorizationBoundary {
  authorize(req: AuthorizationRequest): Decision;            // DEFAULT DENY; UNKNOWN ≠ ALLOW
  requireAllow(req: AuthorizationRequest): void;             // throws NexoAuthorizationError (FORBIDDEN / REQUIRE_APPROVAL)
}
export interface AuditEvent { id: string; who: Actor; what: string; resource?: string;
  context: ExecutionContext; decision?: Decision; result: OpStatus; at: string; details?: Record<string, unknown>; }
export interface AuditSink { record(e: AuditEvent): void; }  // implementado por storage
```
- `PolicyEngine` M1: grants explícitos por actor (`Map<actorId, Set<permission>>`), `DEFAULT_DENY`; política estática M1: permissões `*.execute_sensitive`/risk DESTRUCTIVE+ → REQUIRE_APPROVAL. Testável e puro.
- Testes: default deny, unknown≠allow, grant explícito, destructive→approval, audit emitido em allow E deny.

## 4. packages/runtime (Wave 2A)
```ts
export interface ScopedFilesystem {
  readFile(rel: string): Promise<Result<string>>;            // rel ao Project Root
  writeFile(rel: string, content: string, opts: { overwrite: boolean }): Promise<Result<void>>;
  listDir(rel?: string): Promise<Result<DirEntry[]>>;        // DirEntry {name, kind:'file'|'dir'|'symlink'|'other', size?, mtime}
  exists(rel: string): Promise<boolean>;
  stat(rel: string): Promise<Result<DirEntry>>;
}
export function createScopedFilesystem(rootAbsPath: string): ScopedFilesystem;
```
- Guard: resolve + rejeita escape de root (`../`, absolute, symlink escape via realpath), retorna `SCOPE_VIOLATION`. Overwrite só explícito.
```ts
export type CommandClass = 'SAFE'|'RESTRICTED'|'DANGEROUS'|'BLOCKED'|'UNKNOWN';
export interface CommandRequest { command: string; args: string[]; cwd: string; timeoutMs?: number; env?: Record<string,string>; }
export interface CommandResult { exitCode: number|null; stdout: string; stderr: string; durationMs: number; classification: CommandClass; timedOut: boolean; }
export interface CommandExecutor {
  classify(req: CommandRequest): CommandClass;
  execute(req: CommandRequest): Promise<Result<CommandResult>>;  // spawn SEM shell; BLOCKED/DANGEROUS → COMMAND_BLOCKED salvo grant explícito
}
```
- Classificação M1: allowlist SAFE (`git status|diff|log|branch`, `ls`, `cat`, `node --version`, `npm --version`...); BLOCKED (`rm -rf /`, `sudo`, `mkfs`, fork bombs, curl|sh pipes...); DANGEROUS (`rm`, `git push --force`, `git reset --hard`...); resto → RESTRICTED/UNKNOWN. Tabela de classificação em módulo próprio, testada.
- Process: `process.list` mínimo (processos iniciados pelo executor, com pid/status).
- Testes: escape `../` rejeitado; symlink escape rejeitado; comando BLOCKED rejeitado sem shell; `git status` executa de verdade num fixture; sem injeção via args.

## 5. packages/storage (Wave 2B)
- better-sqlite3, WAL, arquivo `nexo.db` em `<dataDir>` (default `~/.nexo` ou `NEXO_HOME` env). `StorageUnavailable` explícito quando DB indisponível.
- Schema versioning: tabela `schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT)`.
- Entidades M1 (tabelas): `workspaces(id, name, status, created_at)`, `projects(id, name, root_path, fingerprint, status, created_at, updated_at)` — **id estável uuid, NÃO derivado de path** —, `jobs(id, capability_id, status, input_json, result_json, error_json, created_at, updated_at)`, `audit_events(...)`, `pi_snapshots(project_id, model_json, analyzed_at, analysis_version)`.
```ts
export interface ProjectRepository { insert(p: ProjectRegistration): void; getById(id: string): ProjectRegistration | null;
  findByRootPath(p: string): ProjectRegistration | null; update(p: ProjectRegistration): void; list(): ProjectRegistration[]; }
export interface JobRepository { /* create, get, update status, result */ }
export interface AuditRepository extends AuditSink { list(filter?): AuditEvent[]; }
export interface PISnapshotRepository { save(projectId: string, model: ProjectModel): void; latest(projectId: string): ProjectModel | null; }
export function createStorage(dataDir: string): Result<Storage>; // Storage = { db, repos..., close() }
```
- Testes com DB em tmpdir: CRUD real, id estável, fingerprint salvo, storage unavailable path inválido.

## 6. packages/adapters (Wave 2C)
```ts
export type AdapterCategory = 'FRAMEWORK'|'STYLING'|'PACKAGE_MANAGER'|'BUILD'|'TEST';
export type AdapterCapabilityLevel = 'FULL'|'PARTIAL'|'READ_ONLY'|'EXPERIMENTAL'|'UNSUPPORTED';
export interface AdapterIdentity { id: string; name: string; category: AdapterCategory; adapterVersion: string; }
export interface Adapter {
  identity: AdapterIdentity;
  detect(ctx: DetectionContext): Promise<Detection<unknown>>;   // NUNCA muta; evidence obrigatória
  getCapabilities(): AdapterCapabilityLevel;
  analyze?(ctx: DetectionContext): Promise<Record<string, unknown>>;
}
export interface DetectionContext { root: string; readFile(rel: string): Promise<string|null>; exists(rel: string): Promise<boolean>; listDir(rel?: string): Promise<DirEntry[]>; }
```
- Adapters M1 (detecção somente, evidence-based): `react` (dep react em package.json), `nextjs` (dep next), `vue`, `svelte`, `astro`, `html-static` (index.html sem package.json → DETECTED), `typescript` (tsconfig.json/dep), `tailwind` (dep/config), `css-modules` (*.module.css presente), `styled-components` (dep), `plain-css` (*.css), `npm|pnpm|yarn|bun` (lockfiles: package-lock.json / pnpm-lock.yaml / yarn.lock / bun.lock(b)).
- `AdapterRegistry`: register + `detectAll(ctx)` → `DetectedTechnology[]` com confidence+evidence+support.
- Testes: fixtures → detecções corretas com evidência; projeto desconhecido → UNKNOWN, nunca inventado.

## 7. packages/intelligence (Wave 2C)
```ts
export interface ProjectModel {
  projectId: string; rootPath: string; analyzedAt: string; analysisVersion: 1;
  root: Detection<{ isMonorepo: boolean; packageRoots: string[] }>;
  technologies: DetectedTechnology[];           // dos adapters
  packageManager: Detection<{ name: 'npm'|'pnpm'|'yarn'|'bun'; version: string|null }>;
  scripts: Detection<Record<string, string>>;   // de package.json — NUNCA assumir 'dev'/'build'
  git: Detection<{ isRepo: boolean; branch: string|null }>;
  structure: { entryFiles: string[]; configFiles: string[]; topLevelDirs: string[] };
  support: SupportLevel;                        // agregado das detecções
  confidence: Confidence;                       // agregado
}
export interface ProjectScanner { scan(rootAbsPath: string): Promise<Result<ProjectModel>>; }
```
- Regras: multi-sinal (package.json + lockfile + config files); monorepo-aware (workspaces field → packageRoots); git via `.git` exists + `git rev-parse --abbrev-ref HEAD` via runtime executor SAFE; análise NUNCA escreve no projeto.
- Agregação: qualquer tecnologia DETECTED_BUT_UNSUPPORTED → support ≤ PARTIALLY_SUPPORTED; sem sinais → UNKNOWN.
- Testes: fixture react+vite+tailwind → model correto; fixture html estático → DETECTED; pasta vazia → UNKNOWN/INVALID_INPUT; re-scan atualiza snapshot (staleness).

## 8. packages/control-plane (Wave 3)
```ts
export interface CapabilityRegistry { register(c: RegisteredCapability): void; get(id: CapabilityId): RegisteredCapability | undefined;
  list(): CapabilityDescriptor[]; }
export interface RegisteredCapability { contract: CapabilityContract; handler: (input: unknown, ctx: ExecutionContext) => Promise<Result<unknown>>; }
// Discovery: list() filtrado por authorize() → { id, domain, description, risk, allowed: Decision }
// Invoke: validate input (zod) → authorize (security) → REQUIRE_APPROVAL/DENY short-circuit → handler ou Job → audit → resultado
// Jobs: capabilities async:'job' → JobRepository; estados QUEUED|RUNNING|COMPLETED|FAILED|CANCELLED; sem progresso fabricado
export function createControlPlane(deps: { security: AuthorizationBoundary; audit: AuditSink; jobs: JobRepository }): ControlPlane;
export interface ControlPlane {
  register(c: RegisteredCapability): void;
  discover(ctx: ExecutionContext): CapabilityDescriptor[];
  invoke<I,O>(id: CapabilityId, input: I, ctx: ExecutionContext): Promise<Result<O>>;       // sync
  invokeAsync(id: CapabilityId, input: unknown, ctx: ExecutionContext): Promise<Result<{ jobId: string }>>;
  getJob(jobId: string): Result<Job>;
}
```
- Capabilities M1 registradas: `project.import`, `project.open`, `project.read`, `project.refresh` (analyze), `project.list`, `runtime.filesystem.read`, `runtime.filesystem.list`, `runtime.command.execute`.
- `project.import`: input `{ rootPath: string }` → fluxo: valida path existe → SecurityContext → Scanner.scan → Storage projects.insert (ou CONFLICT se rootPath já registrado → retorna existente com `alreadyRegistered: true`) → PI snapshot save → audit. Output: `{ project: ProjectRegistration; model: ProjectModel; alreadyRegistered: boolean }`.
- `project.open`: `{ projectId }` → registration + latest model (STALE_CONTEXT se fingerprint mudou — fingerprint = hash de package.json+lockfile+configs; ver intel).
- Testes: contract test registry/discovery/invoke; deny path; approval path; job lifecycle; erros agent-friendly.

## 9. apps/runtime (Wave 3) — Hono HTTP
- Bind `127.0.0.1`, porta `NEXO_PORT` (default 47820). Rotas:
  - `GET /v1/capabilities` → discovery (actor via header `x-nexo-actor: cli:local` M1)
  - `POST /v1/capabilities/:id/invoke` → body = input JSON → Result JSON (sync) ou `{jobId}`
  - `GET /v1/jobs/:id` → job
  - `GET /v1/health` → `{ status: 'ok', version }`
- Erros: NexoError JSON com HTTP status mapeado (400 INVALID_INPUT, 403 FORBIDDEN, 409 CONFLICT/STALE, 422 REQUIRE_APPROVAL, 501 UNSUPPORTED).
- Bootstrap composition root: storage → security → runtime → adapters → intelligence → control-plane → registra capabilities → serve.

## 10. apps/cli (Wave 3) — `nexo`
- `util.parseArgs`, fetch para o runtime (`NEXO_URL` default `http://127.0.0.1:47820`).
- Comandos: `nexo capabilities`, `nexo project import <path>`, `nexo project open <id>`, `nexo project list`, `nexo runtime exec <cmd> [args...]`.
- Saída JSON com `--json` ou humano legível default. Erros → exit code != 0 com code impresso.

## 11. tests/ (Wave 4)
- `tests/fixtures/react-vite-tailwind/` (package.json com react+vite+tailwind deps, tsconfig, src/App.tsx, pnpm-lock.yaml vazio-estrutural), `tests/fixtures/html-static/` (index.html + styles.css), `tests/fixtures/unknown-empty/`. Fixtures NÃO têm node_modules.
- `tests/contract/`: contract tests das fronteiras M1 (control-plane↔capabilities, storage↔repos).
- `tests/e2e/agent-flow.e2e.test.ts`: sobe apps/runtime em porta efêmera → via fetch puro (sem browser): import fixture → open → capabilities → command.execute `git status` → valida estados REAIS (arquivo de DB existe, snapshot persistido, exitCode 0). **No-Playwright Control Plane Test do doc 13.**
- Gate: `pnpm -r typecheck && pnpm -r test && pnpm test:e2e` verde.

## 12. Acceptance Criteria M1 (Definition of Done)
1. `pnpm install && pnpm build && pnpm test` verde do zero.
2. E2E agent flow passa contra fixture real, sem UI, sem Playwright.
3. Importar fixture react-vite-tailwind → ProjectModel com react CONFIRMED (evidence package.json), tailwind, PM correto, scripts reais.
4. Escape de filesystem e comando BLOCKED negados com erro estruturado + audit.
5. Projeto desconhecido → UNKNOWN, nunca inventado.
6. Snapshot persistido; `project.open` retorna model; fingerprint alterado → STALE_CONTEXT.
7. Audit trail contém todas as invocações (allow e deny).
8. Zero Core Invariant violada (checklist K3 em cada PR/commit).
