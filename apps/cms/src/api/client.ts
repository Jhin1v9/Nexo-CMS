/**
 * HTTP client tipado do Control Plane (SPEC.md §9; M3-CONTRACTS §2: apps/cms
 * consumidora pura — NUNCA fetch fora deste client).
 *
 * Rotas reais do runtime (apps/runtime/src/app.ts):
 *  - GET  /v1/health                  -> { status, version }
 *  - GET  /v1/capabilities            -> { ok: true, value: { capabilities } }
 *  - POST /v1/capabilities/:id/invoke -> { ok: true, value } | { ok: false, error }
 *                                        (async:'job' -> HTTP 202, value = { jobId })
 *  - GET  /v1/jobs/:id                -> { ok: true, value: Job }
 *
 * Envelope de erro: NexoError estável ({ code, message, operationId?, resource?,
 * retryable, requiresApproval?, requiredCapability?, details? }); a orientação
 * de recuperação (`nextAction`) viaja em `details.nextAction` (M3-CONTRACTS §3).
 *
 * Base URL relativa `/v1` — o proxy do vite (vite.config.ts) encaminha ao
 * runtime em 127.0.0.1 (default 47820; NEXO_URL override no dev server).
 */

// ---- tipos do contrato HTTP -------------------------------------------------

export type ErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'STALE_CONTEXT'
  | 'UNSUPPORTED'
  | 'UNKNOWN'
  | 'REQUIRE_APPROVAL'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'SCOPE_VIOLATION'
  | 'COMMAND_BLOCKED'
  | 'INTERNAL'
  | 'STORAGE_UNAVAILABLE';

/** NexoError estável (SPEC §0) — shape exato do envelope de erro do runtime. */
export interface ControlPlaneErrorShape {
  code: ErrorCode;
  message: string;
  operationId?: string;
  resource?: string;
  retryable: boolean;
  requiresApproval?: boolean;
  requiredCapability?: string;
  details?: Record<string, unknown>;
}

/** Decisão de autorização enriquecida no discovery (ControlPlane.discover). */
export type AuthorizationDecision = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'UNKNOWN';

export type RiskLevel = 'SAFE' | 'MODIFYING' | 'DESTRUCTIVE' | 'CRITICAL';

/** Descriptor público de discovery (SPEC §8 + allowed do Control Plane). */
export interface DiscoveredCapability {
  id: string;
  version: 1;
  domain: string;
  description: string;
  requiredPermission: string;
  risk: RiskLevel;
  sideEffects: boolean;
  async: 'sync' | 'job';
  timeoutMs: number;
  allowed: AuthorizationDecision;
}

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/** Job do repositório do Control Plane (@nexo/storage). SEM campo de progresso:
 *  progresso nunca é fabricado — apenas transições reais de estado (SPEC §8). */
export interface Job {
  id: string;
  capabilityId: string;
  status: JobStatus;
  input: unknown;
  result: unknown | null;
  error: ControlPlaneErrorShape | null;
  createdAt: string;
  updatedAt: string;
}

/** Extrai a orientação de recuperação (details.nextAction) quando presente. */
export function nextActionOf(error: ControlPlaneErrorShape): string | undefined {
  const value = error.details?.['nextAction'];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// ---- erro tipado do client --------------------------------------------------

/** Erro lançado pelos métodos do client (integra com react-query via `error`). */
export class ControlPlaneError extends Error {
  readonly shape: ControlPlaneErrorShape;

  constructor(shape: ControlPlaneErrorShape) {
    super(shape.message);
    this.name = 'ControlPlaneError';
    this.shape = shape;
  }

  get code(): ErrorCode {
    return this.shape.code;
  }

  get requiresApproval(): boolean {
    return this.shape.requiresApproval === true;
  }

  get retryable(): boolean {
    return this.shape.retryable;
  }

  get nextAction(): string | undefined {
    return nextActionOf(this.shape);
  }
}

/** Converte qualquer falha em ControlPlaneError (boundary único de erro). */
export function toControlPlaneError(cause: unknown): ControlPlaneError {
  if (cause instanceof ControlPlaneError) return cause;
  return new ControlPlaneError({
    code: 'INTERNAL',
    message: cause instanceof Error ? cause.message : String(cause),
    retryable: false,
  });
}

// ---- formas de domínio consumidas pela UI (honestas: só campos reais) -------

export interface ProjectRegistration {
  id: string;
  name: string;
  rootPath: string;
  fingerprint: string;
  status: 'ACTIVE' | 'ARCHIVED' | string;
  createdAt: string;
  updatedAt: string;
}

/** Detecção evidence-based (@nexo/shared): incerto -> UNKNOWN. */
export type DetectionConfidence = 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type SupportLevel =
  | 'FULLY_SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'DETECTED_BUT_UNSUPPORTED'
  | 'UNKNOWN'
  | 'CUSTOM';

export interface DetectedTechnology {
  technology: string;
  category: string;
  confidence: DetectionConfidence;
  support: SupportLevel;
  evidence: string[];
  version: string | null;
  adapterId: string;
  adapterVersion: string;
}

/**
 * Snapshot do ProjectModel persistido (project.read/open). O envelope é
 * Record<string, unknown> no contrato; aqui tipamos apenas os campos que a UI
 * realmente consome (doc 07§1 — a UI não inventa estrutura).
 */
export interface ProjectModelSnapshot {
  projectId?: string;
  rootPath?: string;
  analyzedAt?: string;
  technologies?: DetectedTechnology[];
  support?: SupportLevel;
  confidence?: DetectionConfidence;
  git?: { value: { isRepo: boolean; branch: string | null } | null; confidence: DetectionConfidence };
}

export interface ProjectListOutput {
  projects: ProjectRegistration[];
}

export interface ProjectReadOutput {
  project: ProjectRegistration;
  model: ProjectModelSnapshot | null;
  analyzedAt: string | null;
}

export interface ProjectOpenOutput {
  project: ProjectRegistration;
  model: ProjectModelSnapshot;
  analyzedAt: string;
}

export interface ProjectImportOutput {
  project: ProjectRegistration;
  model: ProjectModelSnapshot;
  alreadyRegistered: boolean;
}

// ---- git (doc 10; shapes reais de @nexo/git, ver apps/cli/src/format.ts) ----

export type GitChangeKind =
  | 'ADDED'
  | 'MODIFIED'
  | 'DELETED'
  | 'RENAMED'
  | 'COPIED'
  | 'TYPECHANGE'
  | 'CONFLICT'
  | string;

export interface GitFileChange {
  path: string;
  origPath?: string;
  kind: GitChangeKind;
}

export interface GitStatusOutput {
  isRepo: boolean;
  states: string[];
  repoRoot?: string;
  branch?: string | null;
  head?: string | null;
  detached?: boolean;
  tracking?: string | null;
  ahead?: number;
  behind?: number;
  staged?: GitFileChange[];
  unstaged?: GitFileChange[];
  untracked?: string[];
  conflicts?: GitFileChange[];
  remoteState?: string;
}

export type GitDiffMode = 'WORKTREE_VS_HEAD' | 'STAGED_VS_HEAD' | 'COMMIT_VS_PARENT' | 'COMMITS' | 'BRANCHES';

export interface GitDiffInput {
  projectId: string;
  mode?: GitDiffMode;
  from?: string;
  to?: string;
  path?: string;
}

export interface GitDiffOutput {
  mode: string;
  diff: string;
  files: { path: string; additions: number; deletions: number }[];
}

export interface GitLogEntry {
  hash: string;
  authorName: string;
  authorEmail: string;
  message: string;
  dateISO: string;
}

export interface GitBranchInfo {
  name: string;
  current: boolean;
  tracking: string | null;
  head: string | null;
}

// ---- client -----------------------------------------------------------------

/**
 * Ator M1 enviado SEMPRE explicitamente (apps/runtime/src/policy.ts): o único
 * ator com grants é `cli:local`; header ausente -> anonymous:unknown (DEFAULT
 * DENY, fail-closed Wave 5 FIX 2). A CMS roda local junto ao runtime e usa o
 * mesmo ator local da CLI — auth formal é milestone futuro (OPEN QUESTION #2,
 * NÃO inventar OAuth). Override de desenvolvimento via localStorage.
 */
export const DEFAULT_ACTOR_ID = 'cli:local';
const ACTOR_STORAGE_KEY = 'nexo.cms.actor';

function actorId(): string {
  try {
    const override = globalThis.localStorage?.getItem(ACTOR_STORAGE_KEY);
    if (override !== null && override !== undefined && override.trim().length > 0) return override.trim();
  } catch {
    // localStorage indisponível (SSR/privacidade) -> ator default documentado.
  }
  return DEFAULT_ACTOR_ID;
}

/** Ator atual da sessão (usado como `approver` em aprovações D17). */
export function currentActorId(): string {
  return actorId();
}

/**
 * Aprovação por invocação (decisão D17, OPEN-QUESTIONS.md): o envelope de
 * invoke aceita `approval` e REQUIRE_APPROVAL + approval válido EXECUTA de
 * verdade, com auditoria (requestedBy/approvedBy/at/operation/resource/result,
 * Permission Model §65). Sem grant permanente implícito.
 */
export interface Approval {
  /** Quem aprovou (ator humano da sessão). Não-vazio obrigatório. */
  approver: string;
  justification?: string;
}

/**
 * Mescla `approval` no envelope de invoke (chave irmã do input no body).
 * Input não-objeto é substituído por `{}` — inputs de capability são sempre
 * objetos nos contratos M1/M2/M3.
 */
export function withApproval(input: unknown, approval?: Approval): unknown {
  if (approval === undefined) return input;
  const base = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const justification = approval.justification?.trim();
  return {
    ...base,
    approval: {
      approver: approval.approver,
      ...(justification !== undefined && justification.length > 0 ? { justification } : {}),
    },
  };
}

interface OkEnvelope<T> {
  ok: true;
  value: T;
}
interface ErrEnvelope {
  ok: false;
  error: ControlPlaneErrorShape;
}

function isErrEnvelope(body: unknown): body is ErrEnvelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { ok?: unknown }).ok === false &&
    typeof (body as { error?: unknown }).error === 'object'
  );
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', 'x-nexo-actor': actorId() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    // Falha de transporte: o runtime pode não estar no ar (retryable honesto).
    throw new ControlPlaneError({
      code: 'INTERNAL',
      message: 'Não foi possível conectar ao Control Plane (o runtime está no ar?)',
      retryable: true,
      details: { cause: cause instanceof Error ? cause.message : String(cause) },
    });
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new ControlPlaneError({
      code: 'INTERNAL',
      message: `Resposta não-JSON do Control Plane (HTTP ${String(res.status)})`,
      retryable: true,
    });
  }

  if (isErrEnvelope(parsed)) {
    throw new ControlPlaneError(parsed.error);
  }
  // /v1/health não usa envelope { ok, value } — aceita shape direto.
  if (typeof parsed === 'object' && parsed !== null && 'value' in parsed) {
    return (parsed as OkEnvelope<T>).value;
  }
  return parsed as T;
}

export interface ControlPlaneClient {
  health(): Promise<{ status: string; version: string }>;
  discoverCapabilities(): Promise<{ capabilities: DiscoveredCapability[] }>;
  /**
   * Invoca capability (sync -> value; async:'job' -> HTTP 202, value = { jobId }).
   * `opts.approval` (D17): aprovação por invocação para capabilities
   * DESTRUCTIVE — REQUIRE_APPROVAL + approval válido executa, com auditoria.
   * Erros estruturados do runtime viram ControlPlaneError (code/requiresApproval/
   * details.nextAction preservados — nunca mensagem genérica, doc 07 §44).
   */
  invoke<T = unknown>(id: string, input: unknown, opts?: { approval?: Approval }): Promise<T>;
  getJob(id: string): Promise<Job>;
}

export function createControlPlaneClient(basePath = '/v1'): ControlPlaneClient {
  const base = basePath.replace(/\/+$/, '');
  return {
    health: () => request('GET', `${base}/health`),
    discoverCapabilities: () => request('GET', `${base}/capabilities`),
    invoke: <T>(id: string, input: unknown, opts?: { approval?: Approval }) =>
      request<T>(
        'POST',
        `${base}/capabilities/${encodeURIComponent(id)}/invoke`,
        withApproval(input, opts?.approval),
      ),
    getJob: (id: string) => request<Job>('GET', `${base}/jobs/${encodeURIComponent(id)}`),
  };
}

/** Singleton da app — boundary único de HTTP (M3-CONTRACTS §2). */
export const controlPlane = createControlPlaneClient();
