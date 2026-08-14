/**
 * React-query hooks sobre o client tipado. Server state SEMPRE aqui (cache
 * react-query); zustand guarda apenas estado local de UI (07§13, M3 §2).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { availabilityOf, isActionable, jobPollIntervalMs, type CapabilityAvailability } from './capabilities';
import {
  controlPlane,
  withApproval,
  type Approval,
  type ControlPlaneClient,
  type DiscoveredCapability,
  type GitBranchInfo,
  type GitDiffInput,
  type GitDiffOutput,
  type GitLogEntry,
  type GitStatusOutput,
  type Job,
  type ProjectImportOutput,
  type ProjectListOutput,
  type ProjectModelSnapshot,
  type ProjectOpenOutput,
  type ProjectReadOutput,
  type ProjectRegistration,
} from './client';

// ---- query keys (fonte única para invalidação) ------------------------------

export const queryKeys = {
  health: ['health'] as const,
  capabilities: ['capabilities'] as const,
  projects: ['project.list'] as const,
  project: (projectId: string) => ['project.read', projectId] as const,
  projectOpen: (projectId: string) => ['project.open', projectId] as const,
  gitStatus: (projectId: string) => ['git.status', projectId] as const,
  gitDiff: (projectId: string, params: Omit<GitDiffInput, 'projectId'>) =>
    ['git.diff', projectId, params] as const,
  gitHistory: (projectId: string, limit: number) => ['git.history', projectId, limit] as const,
  gitBranches: (projectId: string) => ['git.branch.list', projectId] as const,
  editorChanges: (projectId: string) => ['editor.change.list', projectId] as const,
  job: (jobId: string) => ['job', jobId] as const,
};

/** Invalida todo server state de um projeto (pós-mutação — 07§79, 10 §49). */
export function useInvalidateProject(): (projectId: string) => Promise<void> {
  const qc = useQueryClient();
  return async (projectId: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
      qc.invalidateQueries({ queryKey: queryKeys.projectOpen(projectId) }),
      qc.invalidateQueries({ queryKey: queryKeys.gitStatus(projectId) }),
      qc.invalidateQueries({ queryKey: queryKeys.gitBranches(projectId) }),
      qc.invalidateQueries({ queryKey: ['git.history', projectId] }),
      qc.invalidateQueries({ queryKey: ['git.diff', projectId] }),
      qc.invalidateQueries({ queryKey: queryKeys.editorChanges(projectId) }),
    ]);
  };
}

// ---- infra -------------------------------------------------------------------

export function useHealth(): UseQueryResult<{ status: string; version: string }> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => controlPlane.health(),
    refetchInterval: 15_000,
    retry: 1,
  });
}

export function useCapabilities(): UseQueryResult<{ capabilities: DiscoveredCapability[] }> {
  return useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: () => controlPlane.discoverCapabilities(),
    staleTime: 10_000,
  });
}

/** Disponibilidade de uma capability para o ator atual (undefined enquanto carrega). */
export function useCapability(id: string): { availability: CapabilityAvailability | undefined; isLoading: boolean } {
  const query = useCapabilities();
  const caps = query.data?.capabilities;
  return {
    availability: caps === undefined ? undefined : availabilityOf(caps, id),
    isLoading: query.isLoading,
  };
}

// ---- project -----------------------------------------------------------------

export function useProjects(): UseQueryResult<ProjectListOutput> {
  const { availability } = useCapability('project.list');
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => controlPlane.invoke<ProjectListOutput>('project.list', {}),
    enabled: availability !== undefined && isActionable(availability),
  });
}

export function useProject(projectId: string): UseQueryResult<ProjectReadOutput> {
  const { availability } = useCapability('project.read');
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => controlPlane.invoke<ProjectReadOutput>('project.read', { projectId }),
    enabled: projectId.length > 0 && availability !== undefined && isActionable(availability),
  });
}

/** project.open pode falhar com STALE_CONTEXT — a UI oferece refresh (retry). */
export function useProjectOpen(projectId: string): UseQueryResult<ProjectOpenOutput> {
  const { availability } = useCapability('project.open');
  return useQuery({
    queryKey: queryKeys.projectOpen(projectId),
    queryFn: () => controlPlane.invoke<ProjectOpenOutput>('project.open', { projectId }),
    enabled: projectId.length > 0 && availability !== undefined && isActionable(availability),
    retry: (failureCount, error) =>
      failureCount < 1 && (error as { code?: string }).code !== 'STALE_CONTEXT',
  });
}

export function useImportProject(): UseMutationResult<ProjectImportOutput, Error, { rootPath: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { rootPath: string }) => controlPlane.invoke<ProjectImportOutput>('project.import', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useRefreshProject(projectId: string): UseMutationResult<unknown, Error, void> {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: () => controlPlane.invoke('project.refresh', { projectId }),
    onSuccess: () => invalidate(projectId),
  });
}

// ---- git ----------------------------------------------------------------------

function useGitQuery<T>(capabilityId: string, key: readonly unknown[], input: unknown): UseQueryResult<T> {
  const { availability } = useCapability(capabilityId);
  return useQuery({
    queryKey: key,
    queryFn: () => controlPlane.invoke<T>(capabilityId, input),
    enabled: availability !== undefined && isActionable(availability),
  });
}

export function useGitStatus(projectId: string): UseQueryResult<GitStatusOutput> {
  return useGitQuery<GitStatusOutput>('git.status', queryKeys.gitStatus(projectId), { projectId });
}

export function useGitDiff(projectId: string, params: Omit<GitDiffInput, 'projectId'>): UseQueryResult<GitDiffOutput> {
  return useGitQuery<GitDiffOutput>('git.diff', queryKeys.gitDiff(projectId, params), { projectId, ...params });
}

export function useGitHistory(projectId: string, limit = 30): UseQueryResult<GitLogEntry[]> {
  return useGitQuery<GitLogEntry[]>('git.history', queryKeys.gitHistory(projectId, limit), { projectId, limit });
}

export function useGitBranches(projectId: string): UseQueryResult<GitBranchInfo[]> {
  return useGitQuery<GitBranchInfo[]>('git.branch.list', queryKeys.gitBranches(projectId), { projectId });
}

/** Mutação git genérica (todas DESTRUCTIVE -> REQUIRE_APPROVAL por policy). */
export function useGitMutation<TInput extends { projectId: string }, TOutput = Record<string, unknown>>(
  capabilityId: string,
): UseMutationResult<TOutput, Error, TInput> {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (input: TInput) => controlPlane.invoke<TOutput>(capabilityId, input),
    onSuccess: (_data, input) => invalidate(input.projectId),
  });
}

// ---- jobs (async:'job' -> { jobId }; polling de estado REAL, SPEC §8) ---------

export function useJob(jobId: string | null): UseQueryResult<Job> {
  return useQuery({
    queryKey: queryKeys.job(jobId ?? ''),
    queryFn: () => controlPlane.getJob(jobId ?? ''),
    enabled: jobId !== null && jobId.length > 0,
    refetchInterval: (query) => jobPollIntervalMs(query.state.data?.status) ?? false,
  });
}

export type { ProjectModelSnapshot, ProjectRegistration };

// ---------------------------------------------------------------------------
// APÊNDICE Wave 5b — Editor (M3-CONTRACTS §3.1) + preview responsive (§3.5).
//
// Contratos reais: apps/runtime/src/capabilities/m3.ts (zod registrado) e
// packages/editor/src/types.ts (Change Object D7, SaveState 07§29, Selection
// Model 07§11, Diff 07§42). Nada aqui inventa endpoint: toda função invoca
// capability registrada via o client tipado (M3 §2 — consumidora pura).
//
// As funções `editor*`/`responsivePreview` são PURAS (recebem o client) para
// serem testáveis com client stub em ambiente node; os hooks react-query são
// wrappers finos sobre elas com o singleton `controlPlane`. Server state fica
// no cache react-query; estado local de edição (buffer, SaveState) NUNCA aqui
// — fica no zustand da área (07§28: temporário ≠ persistido).
// ---------------------------------------------------------------------------

/** editor.source.open -> OpenSourceResult (packages/editor/src/source.ts). */
export interface EditorSourceOpenOutput {
  content: string;
  encoding: 'utf8';
  /** sha256 do conteúdo no disco — baseline para expectedHash (07§38). */
  hash: string;
  language: string;
  readOnly: boolean;
}

/** editor.source.save -> SourceSaveResult. `saved:true` só após verificação. */
export interface EditorSourceSaveOutput {
  saved: true;
  hash: string;
  verified: boolean;
  diagnostics: string[];
}

/** SaveState canônico (07§29) — espelhado na UI, nunca fabricado. */
export type EditorSaveState = 'Saved' | 'Unsaved' | 'Saving' | 'SaveFailed' | 'Conflict';

// ---- Change Object (D7 — M3-CONTRACTS §6, congelado) -----------------------

export type EditorChangeOperation = 'modify' | 'create' | 'delete' | 'rename';
export type EditorChangeSource = 'visual' | 'code' | 'ai' | 'external' | 'generated';
export type EditorChangeOrigin = 'Human' | 'AI' | 'Visual Editor' | 'Code Editor' | 'External Change';
export type EditorChangeState = 'PENDING' | 'APPLIED' | 'REJECTED' | 'FAILED' | 'REVERTED';

export interface EditorChangeObject {
  id: string;
  projectId: string;
  files: string[];
  operation: EditorChangeOperation;
  source: EditorChangeSource;
  origin: EditorChangeOrigin;
  before: Record<string, string | null>;
  after: Record<string, string | null>;
  state: EditorChangeState;
  createdAt: string;
  appliedAt: string | null;
}

/** ChangeInput (D7): `before` NUNCA vem do chamador — o backend lê o disco. */
export interface EditorChangeInput {
  files: string[];
  operation: EditorChangeOperation;
  source: EditorChangeSource;
  origin: EditorChangeOrigin;
  after: Record<string, string | null>;
  renameTo?: string;
}

// ---- Diff (07§42) ------------------------------------------------------------

export type EditorFileDiffStatus = 'Added' | 'Removed' | 'Modified';

export interface EditorFileDiff {
  file: string;
  before: string | null;
  after: string | null;
  status: EditorFileDiffStatus;
  added: string[];
  removed: string[];
  modified: Array<{ before: string; after: string }>;
  movedTo?: string;
}

export interface EditorDiff {
  files: EditorFileDiff[];
  origin?: EditorChangeOrigin;
}

// ---- Selection Model (07§11-12) ----------------------------------------------

export interface EditorSelectionOutput {
  projectId: string;
  route?: string;
  nodeRef?: string;
  component?: string;
  sourceFile?: string;
  sourceLocation?: { line: number; column: number };
  confidence: 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN';
  /** Alternativas seguras quando PARTIAL/UNKNOWN (07§15). */
  alternatives?: string[];
}

// ---- responsive.preview (09§27 — runtime REAL do projeto) ---------------------

export interface EditorViewport {
  id: string;
  name?: string;
  width: number;
  height: number;
  dpr?: number;
  orientation?: 'Portrait' | 'Landscape';
}

export interface ResponsivePreviewOutput {
  projectId: string;
  previewUrl: string;
  state: 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED';
  reused: boolean;
  viewport: EditorViewport;
  route: string;
  /** Script do package.json efetivamente usado (evidência real). */
  scriptName: string;
  pid?: number;
}

// ---- funções puras de invoke (testáveis com client stub) -----------------------

export function editorOpenSource(
  client: ControlPlaneClient,
  input: { projectId: string; filePath: string },
): Promise<EditorSourceOpenOutput> {
  return client.invoke<EditorSourceOpenOutput>('editor.source.open', input);
}

/** `approval` (D17) viaja mesclada no envelope — mutação DESTRUCTIVE. */
export function editorSaveSource(
  client: ControlPlaneClient,
  input: { projectId: string; filePath: string; content: string; expectedHash?: string },
  approval?: Approval,
): Promise<EditorSourceSaveOutput> {
  return client.invoke<EditorSourceSaveOutput>('editor.source.save', withApproval(input, approval));
}

export function editorReadSelection(
  client: ControlPlaneClient,
  input: { projectId: string; route?: string; nodeRef?: string },
): Promise<EditorSelectionOutput> {
  return client.invoke<EditorSelectionOutput>('editor.selection.read', input);
}

export function editorListChanges(client: ControlPlaneClient, projectId: string): Promise<EditorChangeObject[]> {
  return client.invoke<EditorChangeObject[]>('editor.change.list', { projectId });
}

export function editorCreateChange(
  client: ControlPlaneClient,
  input: { projectId: string; change: EditorChangeInput },
): Promise<EditorChangeObject> {
  return client.invoke<EditorChangeObject>('editor.change.create', input);
}

export function editorPreviewChange(
  client: ControlPlaneClient,
  input: { projectId: string; changeId: string },
): Promise<EditorDiff> {
  return client.invoke<EditorDiff>('editor.change.preview', input);
}

export function editorApplyChange(
  client: ControlPlaneClient,
  input: { projectId: string; changeId: string; expectedHash?: string },
  approval?: Approval,
): Promise<{ applied: true; change: EditorChangeObject; saved: EditorSourceSaveOutput[] }> {
  return client.invoke('editor.change.apply', withApproval(input, approval));
}

/** Reject é SAFE (não toca source — M3-CONTRACTS §3.1): sem aprovação. */
export function editorRejectChange(
  client: ControlPlaneClient,
  input: { projectId: string; changeId: string },
): Promise<EditorChangeObject> {
  return client.invoke<EditorChangeObject>('editor.change.reject', input);
}

export function editorUndo(client: ControlPlaneClient, projectId: string, approval?: Approval): Promise<EditorChangeObject> {
  return client.invoke<EditorChangeObject>('editor.change.undo', withApproval({ projectId }, approval));
}

export function editorRedo(client: ControlPlaneClient, projectId: string, approval?: Approval): Promise<EditorChangeObject> {
  return client.invoke<EditorChangeObject>('editor.change.redo', withApproval({ projectId }, approval));
}

export function responsiveViewportCreate(
  client: ControlPlaneClient,
  input: { projectId?: string; name?: string; width: number; height: number; dpr?: number; orientation?: 'Portrait' | 'Landscape' },
): Promise<EditorViewport> {
  return client.invoke<EditorViewport>('responsive.viewport.create', input);
}

export function responsivePreview(
  client: ControlPlaneClient,
  input: { projectId: string; route?: string; viewportId: string },
): Promise<ResponsivePreviewOutput> {
  return client.invoke<ResponsivePreviewOutput>('responsive.preview', input);
}

// ---- hooks react-query (wrappers finos sobre as funções puras) -----------------

export function useEditorOpenSource(): UseMutationResult<
  EditorSourceOpenOutput,
  Error,
  { projectId: string; filePath: string }
> {
  return useMutation({ mutationFn: (input) => editorOpenSource(controlPlane, input) });
}

export function useEditorSaveSource(): UseMutationResult<
  EditorSourceSaveOutput,
  Error,
  { projectId: string; filePath: string; content: string; expectedHash?: string; approval?: Approval }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ approval, ...input }) => editorSaveSource(controlPlane, input, approval),
    onSuccess: (_data, input) => qc.invalidateQueries({ queryKey: queryKeys.editorChanges(input.projectId) }),
  });
}

export function useEditorSelection(): UseMutationResult<
  EditorSelectionOutput,
  Error,
  { projectId: string; route?: string; nodeRef?: string }
> {
  return useMutation({ mutationFn: (input) => editorReadSelection(controlPlane, input) });
}

/** Pending changes reais do ChangeManager (07§30-31) — gate por discovery. */
export function useEditorChanges(projectId: string): UseQueryResult<EditorChangeObject[]> {
  const { availability } = useCapability('editor.change.list');
  return useQuery({
    queryKey: queryKeys.editorChanges(projectId),
    queryFn: () => editorListChanges(controlPlane, projectId),
    enabled: projectId.length > 0 && availability !== undefined && isActionable(availability),
  });
}

export function useEditorCreateChange(): UseMutationResult<
  EditorChangeObject,
  Error,
  { projectId: string; change: EditorChangeInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => editorCreateChange(controlPlane, input),
    onSuccess: (_data, input) => qc.invalidateQueries({ queryKey: queryKeys.editorChanges(input.projectId) }),
  });
}

export function useEditorPreviewChange(): UseMutationResult<
  EditorDiff,
  Error,
  { projectId: string; changeId: string }
> {
  return useMutation({ mutationFn: (input) => editorPreviewChange(controlPlane, input) });
}

export function useEditorApplyChange(): UseMutationResult<
  { applied: true; change: EditorChangeObject; saved: EditorSourceSaveOutput[] },
  Error,
  { projectId: string; changeId: string; expectedHash?: string; approval?: Approval }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ approval, ...input }) => editorApplyChange(controlPlane, input, approval),
    onSuccess: (_data, input) => qc.invalidateQueries({ queryKey: queryKeys.editorChanges(input.projectId) }),
  });
}

export function useEditorRejectChange(): UseMutationResult<
  EditorChangeObject,
  Error,
  { projectId: string; changeId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => editorRejectChange(controlPlane, input),
    onSuccess: (_data, input) => qc.invalidateQueries({ queryKey: queryKeys.editorChanges(input.projectId) }),
  });
}

/** Undo/redo DESTRUCTIVE (07§33-34) — aprovação D17; UNSUPPORTED propaga. */
export function useEditorUndo(): UseMutationResult<EditorChangeObject, Error, { projectId: string; approval?: Approval }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, approval }) => editorUndo(controlPlane, projectId, approval),
    onSuccess: (_data, input) => qc.invalidateQueries({ queryKey: queryKeys.editorChanges(input.projectId) }),
  });
}

export function useEditorRedo(): UseMutationResult<EditorChangeObject, Error, { projectId: string; approval?: Approval }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, approval }) => editorRedo(controlPlane, projectId, approval),
    onSuccess: (_data, input) => qc.invalidateQueries({ queryKey: queryKeys.editorChanges(input.projectId) }),
  });
}

export function useResponsiveViewportCreate(): UseMutationResult<
  EditorViewport,
  Error,
  { projectId?: string; name?: string; width: number; height: number; dpr?: number; orientation?: 'Portrait' | 'Landscape' }
> {
  return useMutation({ mutationFn: (input) => responsiveViewportCreate(controlPlane, input) });
}

/** Preview = runtime REAL (09§27); operação longa (startup do dev server). */
export function useResponsivePreview(): UseMutationResult<
  ResponsivePreviewOutput,
  Error,
  { projectId: string; route?: string; viewportId: string }
> {
  return useMutation({ mutationFn: (input) => responsivePreview(controlPlane, input) });
}

// ---------------------------------------------------------------------------
// APÊNDICE Wave 5c — Components/Media Engine (M3-CONTRACTS §3.2/§3.3/§7) e
// Design/Responsive Lab (§3.4/§3.5). Shapes fiéis aos services reais:
// packages/components/src/{types,create,update,delete,publish}.ts,
// packages/media/src/{types,service,upload,replace,delete,references}.ts,
// packages/design/src/{types,token,theme,update}.ts,
// packages/responsive/src/{types,service}.ts. NUNCA inventar campos (M3 §8).
//
// Mesmo padrão da Wave 5b: funções de invoke PURAS (recebem o client) +
// hooks react-query finos. Query keys desta wave ficam em `m3QueryKeys`
// (não estendemos o objeto `queryKeys` original — apêndice sem tocar o
// código existente).
// ---------------------------------------------------------------------------

export const m3QueryKeys = {
  componentList: (projectId: string, scope?: ComponentScope) =>
    ['component.list', projectId, scope ?? 'all'] as const,
  component: (projectId: string, componentId: string) =>
    ['component.read', projectId, componentId] as const,
  mediaList: (projectId: string, filter?: MediaListFilter) =>
    ['media.list', projectId, filter ?? {}] as const,
  mediaAsset: (projectId: string, assetId: string) => ['media.read', projectId, assetId] as const,
  mediaSearch: (projectId: string, query: string) => ['media.search', projectId, query] as const,
  designModel: (projectId: string) => ['design.read', projectId] as const,
  themes: (projectId: string) => ['theme.read', projectId] as const,
};

/** Invalida o server state dos domínios M3 (component/media/design) do projeto. */
export function useInvalidateM3Project(): (projectId: string) => Promise<void> {
  const qc = useQueryClient();
  return async (projectId: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['component.list', projectId] }),
      qc.invalidateQueries({ queryKey: ['component.read', projectId] }),
      qc.invalidateQueries({ queryKey: ['media.list', projectId] }),
      qc.invalidateQueries({ queryKey: ['media.read', projectId] }),
      qc.invalidateQueries({ queryKey: ['media.search', projectId] }),
      qc.invalidateQueries({ queryKey: ['design.read', projectId] }),
      qc.invalidateQueries({ queryKey: ['theme.read', projectId] }),
    ]);
  };
}

// ---- shared: Detection (espelho de @nexo/shared, usado por design/responsive) --

export type DetectionConfidenceM3 = 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

/** Detection<T> de @nexo/shared: parciais explícitos, nunca SUCCESS falso. */
export interface M3Detection<T> {
  value: T | null;
  confidence: DetectionConfidenceM3;
  evidence: string[];
}

// ---- component (doc 08; packages/components/src/types.ts) ---------------------

export type ComponentScope = 'Project' | 'Workspace' | 'Library';

/** Vocabulário congelado de PropType (M3-CONTRACTS §7). */
export type PropType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Image'
  | 'Video'
  | 'URL'
  | 'Color'
  | 'RichText'
  | 'Enum'
  | 'Array'
  | 'Object'
  | 'ComponentReference'
  | 'Slot';

/** 'Unknown' = tipo TS indeterminável (nunca adivinhado — M3 §8.8). */
export type ResolvedPropType = PropType | 'Unknown';

export type ComponentSource =
  | { kind: 'ProjectFile'; path: string }
  | { kind: 'MultipleProjectFiles'; paths: string[] }
  | { kind: 'GeneratedSource'; generator: string; path: string }
  | { kind: 'ExternalScript'; url: string }
  | { kind: 'ExternalWidget'; provider: string; url?: string }
  | { kind: 'LibraryPackage'; packageName: string; version: string }
  | { kind: 'Integration'; provider: string };

export interface ComponentIdentity {
  id: string;
  name: string;
  scope: ComponentScope;
  source: ComponentSource;
  version: string | null;
}

export interface ComponentProp {
  name: string;
  type: ResolvedPropType;
  default?: unknown;
  required: boolean;
  description?: string;
  validation?: string;
}

export interface ComponentVariant {
  name: string;
  values: string[];
}

export interface ComponentSlot {
  name: string;
  kind: 'FixedProp' | 'ComposableSlot';
}

/** PropertySource mínimo espelhado no Component Schema (M3-CONTRACTS §7). */
export interface ComponentPropertySource {
  kind: 'TailwindUtility' | 'CssVariable' | 'InlineStyle' | 'Stylesheet' | 'Theme' | 'Unknown';
  reference: string;
}

/** Component Schema (M3-CONTRACTS §7 — EXATO). */
export interface ComponentSchema {
  identity: ComponentIdentity;
  props: ComponentProp[];
  variants: ComponentVariant[];
  slots: ComponentSlot[];
  events: string[];
  assets: string[];
  styles: ComponentPropertySource[];
  responsiveRules: unknown[];
  metadata: Record<string, unknown>;
}

export interface CreatePropInput {
  name: string;
  type: PropType;
  required?: boolean;
  /** Somente literais JSON; exige required:false (08§12). */
  default?: unknown;
  description?: string;
  validation?: string;
}

export interface CreateComponentInput {
  projectId: string;
  name: string;
  description?: string;
  props: CreatePropInput[];
  variants?: ComponentVariant[];
  /** M3: somente 'Project' (08§20). Demais => UNSUPPORTED honesto. */
  scope?: ComponentScope;
}

export interface CreateComponentOutcome {
  componentId: string;
  filesChanged: string[];
  diagnostics: string[];
  status: 'Created';
  conventions: {
    componentDir: string;
    fileExtension: string;
    naming: string;
    evidence: string[];
  };
}

export type ComponentFileDiffStatus = 'Added' | 'Removed' | 'Modified';

export interface ComponentFileDiff {
  file: string;
  before: string | null;
  after: string | null;
  status: ComponentFileDiffStatus;
  added: string[];
  removed: string[];
}

export interface ComponentDiff {
  files: ComponentFileDiff[];
}

export interface ComponentPatch {
  description?: string;
  metadata?: Record<string, unknown>;
  props?: ComponentProp[];
  variants?: ComponentVariant[];
}

export interface UpdateComponentInput {
  projectId: string;
  componentId: string;
  patch?: ComponentPatch;
}

export interface UpdateComponentOutcome {
  componentId: string;
  diff: ComponentDiff;
  diagnostics: string[];
  schema: ComponentSchema;
}

export interface ImpactReference {
  file: string;
  line: number;
  kind: 'import' | 'jsx-usage' | 're-export' | 'text';
  confidence: 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL';
  context: string;
}

/** Impact analysis 08§23 (references/routes/pages/components/assets/exports/tests). */
export interface ComponentImpact {
  references: ImpactReference[];
  routes: string[];
  pages: string[];
  otherComponents: string[];
  exports: string[];
  tests: string[];
  assets: string[];
  scannedFiles: number;
  skippedFiles: number;
  /** false => impacto Unknown — delete bloqueado (M3 §8.8). */
  complete: boolean;
}

export interface DeleteComponentInput {
  projectId: string;
  componentId: string;
  /** Exigido quando há referências ativas (EXACT/HIGH_CONFIDENCE). */
  confirm?: boolean;
}

export interface DeleteComponentOutcome {
  componentId: string;
  deletedFiles: string[];
  removedFromRegistry: boolean;
  impact: ComponentImpact;
  brokenReferences: ImpactReference[];
  verified: boolean;
}

export interface PublishCheck {
  pass: boolean;
  detail: string;
}

/** Validação 08§74 — as seis verificações, sem exceção. */
export interface PublishValidation {
  sourceIntegrity: PublishCheck;
  dependencyResolution: PublishCheck;
  noSecretLeakage: PublishCheck;
  noPrivateReferences: PublishCheck;
  schemaValidity: PublishCheck;
  compatibility: PublishCheck;
}

export type CompatibilityResult = 'COMPATIBLE' | 'PARTIAL' | 'INCOMPATIBLE' | 'UNKNOWN';
export type Portability = 'Portable' | 'PartiallyPortable' | 'ProjectSpecific' | 'NonPortable';

export interface ComponentDependency {
  kind: 'package' | 'component' | 'asset' | 'utility';
  name: string;
  declared: boolean;
}

export interface PublishComponentInput {
  projectId: string;
  componentId: string;
  version?: string;
  changes?: string[];
}

export interface PublishComponentOutcome {
  libraryComponentId: string;
  version: string;
  validation: PublishValidation;
  compatibility: CompatibilityResult;
  portability: Portability;
  dependencies: ComponentDependency[];
  status: 'Published';
}

// ---- media (doc 08§41-58/§82; packages/media/src/types.ts) --------------------

export type AssetType = 'Image' | 'SVG' | 'Video' | 'Audio' | 'Font' | 'PDF' | 'Document' | 'Other';

export type AssetOrigin =
  | 'LocalProject'
  | 'UploadedFile'
  | 'GeneratedFile'
  | 'ExternalURL'
  | 'CDN'
  | 'Library'
  | 'Integration';

/** UsageState (08§50): `Unknown` NUNCA é tratado como `Unused`. */
export type UsageState = 'Used' | 'Unused' | 'Unknown' | 'External' | 'Generated';

export type ReferenceConfidence = 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN';
export type ReferenceKind = 'import' | 'src' | 'href' | 'css-url' | 'text';

export interface AssetDimensions {
  width: number;
  height: number;
}

export interface AssetSource {
  origin: AssetOrigin;
  path?: string;
  url?: string;
}

export interface AssetReference {
  filePath: string;
  line: number;
  kind: ReferenceKind;
  matchedText: string;
  confidence: ReferenceConfidence;
}

/** AssetMetadata (08§82) — NUNCA contém secrets. */
export interface AssetMetadata {
  name: string;
  type: AssetType;
  /** MIME real detectado por magic bytes (08§45). */
  mime: string;
  dimensions?: AssetDimensions;
  size: number;
  source: AssetSource;
  altText?: string;
  caption?: string;
  createdAt: string;
  updatedAt: string;
  references: AssetReference[];
}

export interface AssetUsage {
  state: UsageState;
  confidence: ReferenceConfidence | 'UNKNOWN';
  scannedAt?: string;
}

export interface AssetIdentity {
  id: string;
  type: AssetType;
  source: AssetSource;
  metadata: AssetMetadata;
  dimensions?: AssetDimensions;
  references: AssetReference[];
  scope: ComponentScope;
  usage: AssetUsage;
}

export interface MediaListFilter {
  type?: AssetType;
  usageState?: UsageState;
  scope?: ComponentScope;
}

export interface MediaReadResult {
  asset: AssetIdentity;
  /** Somente com includeContent:true E asset local (08§57). */
  contentBase64?: string;
}

export interface MediaSearchMatch {
  asset: AssetIdentity;
  matchedOn: Array<{ field: 'name' | 'type' | 'reference'; value: string }>;
}

/** Patch de metadata (08§82): name é de EXIBIÇÃO (não renomeia arquivo). */
export interface AssetMetadataPatch {
  name?: string;
  altText?: string;
  caption?: string;
}

export interface MediaUploadInput {
  projectId: string;
  fileName: string;
  contentBase64: string;
  targetPath?: string;
  altText?: string;
  caption?: string;
}

export interface MediaUploadOutcome {
  asset: AssetIdentity;
  storedPath: string;
  verified: boolean;
  sha256: string;
}

export interface ReferenceRewrite {
  filePath: string;
  replacements: number;
}

export interface MediaReplaceOutcome {
  asset: AssetIdentity;
  previousPath: string;
  newPath: string;
  filesChanged: ReferenceRewrite[];
  /** Referências PARTIAL reportadas, NUNCA reescritas. */
  ambiguousReferences: AssetReference[];
  verified: boolean;
}

export interface MediaDeleteOutcome {
  assetId: string;
  deletedLocalFile: boolean;
  removedFromRegistry: boolean;
  brokenReferences: AssetReference[];
  verified: boolean;
}

// ---- design (doc 09§51-53/§7; packages/design/src/types.ts) -------------------

export type DesignTokenType =
  | 'Color'
  | 'Spacing'
  | 'Typography'
  | 'Radius'
  | 'Shadow'
  | 'Breakpoint'
  | 'ContainerWidth'
  | 'Other';

export type StylingMechanism = 'tailwind-v4' | 'tailwind-v3' | 'plain-css-variables' | 'unknown';

/** Token com origem exata; valor VERBATIM do source (09§10 — nunca convertido). */
export interface DesignTokenInfo {
  tokenRef: string;
  type: DesignTokenType;
  value: string;
  representation: string;
  mechanism: Exclude<StylingMechanism, 'unknown'>;
  source: { file: string; line: number };
}

export type DesignTokenGroupKey =
  | 'color'
  | 'spacing'
  | 'typography'
  | 'radius'
  | 'shadow'
  | 'breakpoint'
  | 'containerWidth'
  | 'other';

export type DesignTokenGroups = Record<DesignTokenGroupKey, DesignTokenInfo[]>;

export type ThemeMechanism = 'CssVariables' | 'Classes' | 'Attributes' | 'Configuration' | 'ComponentState';
export type ThemeKind = 'Light' | 'Dark' | 'Brand' | 'Custom';

export interface ThemeInfo {
  name: string;
  kind: ThemeKind;
  mechanism: ThemeMechanism;
  activation: string;
  selectors: string[];
  variables: string[];
  source: { file: string; line: number };
  confidence: DetectionConfidenceM3;
}

/** PropertySource (09§7 — enum congelado, 9 valores). */
export type DesignPropertySource =
  | 'DirectValue'
  | 'CssVariable'
  | 'DesignToken'
  | 'TailwindUtility'
  | 'ThemeConfiguration'
  | 'ComponentProp'
  | 'StyledComponentRule'
  | 'InlineStyle'
  | 'Unknown';

export interface DesignSystemSignals {
  tokens: boolean;
  theme: boolean;
  sharedComponents: boolean;
  typographySystem: boolean;
  spacingScale: boolean;
  colorPalette: boolean;
}

export interface DesignSystemInfo {
  detected: boolean;
  signals: DesignSystemSignals;
  evidence: string[];
}

export interface ImpactEntry {
  file: string;
  line: number;
  context: string;
  kind: 'css-var-usage' | 'css-var-definition' | 'literal-reference';
}

/** ImpactReport (09§79) — contagens de varredura real; limitações em `notes`. */
export interface DesignImpactReport {
  target: string;
  usagesCount: number;
  scannedFiles: number;
  affectedFiles: string[];
  affectedComponents: string[];
  affectedPages: string[];
  affectedTokens: string[];
  affectedInstances: number;
  entries: ImpactEntry[];
  notes: string[];
}

export interface DesignModel {
  projectId: string;
  analyzedAt: string;
  stylingMechanism: M3Detection<{ primary: StylingMechanism; all: StylingMechanism[] }>;
  tokens: DesignTokenGroups;
  tokensTotal: number;
  themes: ThemeInfo[];
  propertySources: DesignPropertySource[];
  designSystem: M3Detection<DesignSystemInfo>;
}

export interface DesignTokenUpdateInput {
  projectId: string;
  tokenRef: string;
  /** Novo valor VERBATIM (09§10). */
  value: string;
}

export interface DesignTokenUpdateResult {
  tokenRef: string;
  previousValue: string;
  value: string;
  representation: string;
  file: string;
  line: number;
  filesChanged: string[];
  impact: DesignImpactReport;
  verified: true;
}

export interface ThemeReadResult {
  themes: ThemeInfo[];
  /** UNKNOWN quando nenhum tema foi detectado. */
  confidence: DetectionConfidenceM3;
}

export interface ThemeUpdateInput {
  projectId: string;
  theme: string;
  mechanism?: ThemeMechanism;
  /** Variável CSS -> novo valor verbatim; somente variáveis JÁ declaradas. */
  patch: Record<string, string>;
}

export interface ThemeVariableUpdate {
  variable: string;
  previousValue: string;
  value: string;
  file: string;
  line: number;
  impact: DesignImpactReport;
}

export interface ThemeUpdateResult {
  theme: ThemeInfo;
  updatedVariables: ThemeVariableUpdate[];
  filesChanged: string[];
  verified: true;
}

export type DesignUpdateTarget =
  | { kind: 'token'; tokenRef: string }
  | {
      kind: 'element';
      file: string;
      elementSelector: { componentName?: string; jsxTag?: string; propMatch?: { name: string; value?: string } };
      propertySource: DesignPropertySource;
      classList?: string;
      tokenRef?: string;
      propName?: string;
      explicitDetach?: boolean;
    };

export interface DesignUpdateInput {
  projectId: string;
  target: DesignUpdateTarget;
  property: string;
  value: string;
}

export interface DesignUpdateResult {
  updated: true;
  route: 'token-source' | 'tailwind-utility' | 'jsx-prop';
  propertySource: DesignPropertySource;
  filesChanged: string[];
  impact: DesignImpactReport;
  verified: true;
  token?: DesignTokenUpdateResult;
}

// ---- responsive (doc 09§24-47; packages/responsive/src/types.ts) --------------
// Viewport/PreviewInfo: reutilizar EditorViewport/ResponsivePreviewOutput da
// Wave 5b (mesmas shapes — packages/responsive/src/types.ts).

export type DiagnosticSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** 09§36: incerteza representada; falso positivo nunca vira fato. */
export type DiagnosticCertainty = 'ConfirmedIssue' | 'PotentialIssue' | 'Unknown';

export type DiagnosticKind =
  | 'HORIZONTAL_OVERFLOW'
  | 'VERTICAL_OVERFLOW'
  | 'CONTENT_CLIPPING'
  | 'TEXT_OVERFLOW'
  | 'UNWANTED_WRAPPING'
  | 'BROKEN_GRID'
  | 'BROKEN_FLEX'
  | 'FIXED_ELEMENT_OVERFLOW'
  | 'IMAGE_INTRINSIC_OVERFLOW'
  | 'ABSOLUTE_OVERFLOW'
  | 'UNBREAKABLE_TEXT';

/** Referência a elemento do DOM renderizado (DOM ≠ Source — 09§49). */
export interface ElementRef {
  selector: string;
  tagName: string;
  id?: string;
  classList: string[];
  textPreview?: string;
}

export interface ResponsiveSourceMapping {
  filePath: string;
  line?: number;
  column?: number;
  confidence: 'EXACT' | 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN';
}

export interface DiagnosticEvidence {
  measurements: Record<string, number>;
  computedStyles?: Record<string, string>;
  observed: string;
}

export interface DiagnosticIssue {
  id: string;
  kind: DiagnosticKind;
  severity: DiagnosticSeverity;
  certainty: DiagnosticCertainty;
  viewport: { width: number; height: number };
  element: ElementRef;
  sourceMapping?: ResponsiveSourceMapping;
  description: string;
  evidence: DiagnosticEvidence;
  /** Hipóteses de causa (09§59) — NUNCA apresentadas como verificadas. */
  suggestedFixes?: string[];
}

export interface BrowserCapabilities {
  viewportResize: boolean;
  screenshots: boolean;
  domInspection: boolean;
  boundingBoxes: boolean;
  computedStyles: boolean;
  consoleLogs: boolean;
  network: boolean;
  engine: string;
  engineVersion: string;
}

export interface DiagnoseResult {
  projectId: string;
  route: string;
  viewport: EditorViewport;
  previewUrl: string;
  issues: DiagnosticIssue[];
  browser: { engine: string; engineVersion: string; capabilities: BrowserCapabilities };
}

/** Perfis FIXOS (D14) — enum exato do contrato zod de m3.ts. */
export type StressProfileId = 'longHeading' | 'longButtonText' | 'manyItems' | 'missingImage' | 'extremeViewport';

export interface SourceIntegrityProof {
  beforeHash: string;
  afterHash: string;
  mutated: boolean;
  scope: { hashedFiles: number; excludedDirs: string[] };
}

export interface StressTestResult {
  profile: StressProfileId;
  viewport: EditorViewport;
  route: string;
  appliedMutation: string;
  issues: DiagnosticIssue[];
  sourceIntegrity: SourceIntegrityProof;
}

export interface ViewportCapture {
  viewport: EditorViewport;
  imagePath: string;
  issues: DiagnosticIssue[];
}

export interface ViewportPairDiff {
  viewportA: string;
  viewportB: string;
  diffPixels: number;
  diffPercentage: number;
  comparedRegion: { width: number; height: number };
  fullDimensionsCompared: boolean;
  diffImagePath?: string;
  algorithm: { name: 'pixelmatch'; threshold: number; includeAA: boolean };
}

export interface CompareResult {
  projectId: string;
  route: string;
  captures: ViewportCapture[];
  diffs: ViewportPairDiff[];
}

/** Snapshot visual (09§44): NÃO é o Source Project. */
export interface ResponsiveSnapshot {
  id: string;
  project: string;
  viewport: EditorViewport;
  route: string;
  sourceState: string;
  timestamp: string;
  previewRef: string;
  imagePath: string;
  diagnostics: DiagnosticIssue[];
}

export interface ResponsiveTargetInput {
  projectId: string;
  route?: string;
  viewportId: string;
}

export interface ResponsiveStressInput extends ResponsiveTargetInput {
  profile: StressProfileId;
}

export interface ResponsiveCompareInput {
  projectId: string;
  route?: string;
  viewportIds: string[];
}

// ---- funções puras de invoke (client stub-friendly) ----------------------------

export function componentList(
  client: ControlPlaneClient,
  input: { projectId: string; scope?: ComponentScope },
): Promise<ComponentIdentity[]> {
  return client.invoke<ComponentIdentity[]>('component.list', input);
}

export function componentRead(
  client: ControlPlaneClient,
  input: { projectId: string; componentId: string },
): Promise<ComponentSchema> {
  return client.invoke<ComponentSchema>('component.read', input);
}

export function componentCreate(
  client: ControlPlaneClient,
  input: CreateComponentInput,
  approval?: Approval,
): Promise<CreateComponentOutcome> {
  return client.invoke<CreateComponentOutcome>('component.create', withApproval(input, approval));
}

export function componentUpdate(
  client: ControlPlaneClient,
  input: UpdateComponentInput,
  approval?: Approval,
): Promise<UpdateComponentOutcome> {
  return client.invoke<UpdateComponentOutcome>('component.update', withApproval(input, approval));
}

export function componentDelete(
  client: ControlPlaneClient,
  input: DeleteComponentInput,
  approval?: Approval,
): Promise<DeleteComponentOutcome> {
  return client.invoke<DeleteComponentOutcome>('component.delete', withApproval(input, approval));
}

export function componentPublish(
  client: ControlPlaneClient,
  input: PublishComponentInput,
  approval?: Approval,
): Promise<PublishComponentOutcome> {
  return client.invoke<PublishComponentOutcome>('component.publish', withApproval(input, approval));
}

export function mediaList(
  client: ControlPlaneClient,
  input: { projectId: string; filter?: MediaListFilter },
): Promise<AssetIdentity[]> {
  return client.invoke<AssetIdentity[]>('media.list', input);
}

export function mediaRead(
  client: ControlPlaneClient,
  input: { projectId: string; assetId: string; includeContent?: boolean },
): Promise<MediaReadResult> {
  return client.invoke<MediaReadResult>('media.read', input);
}

export function mediaSearch(
  client: ControlPlaneClient,
  input: { projectId: string; query: string },
): Promise<MediaSearchMatch[]> {
  return client.invoke<MediaSearchMatch[]>('media.search', input);
}

export function mediaUpload(
  client: ControlPlaneClient,
  input: MediaUploadInput,
  approval?: Approval,
): Promise<MediaUploadOutcome> {
  return client.invoke<MediaUploadOutcome>('media.upload', withApproval(input, approval));
}

export function mediaUpdate(
  client: ControlPlaneClient,
  input: { projectId: string; assetId: string; patch: AssetMetadataPatch },
  approval?: Approval,
): Promise<AssetIdentity> {
  return client.invoke<AssetIdentity>('media.update', withApproval(input, approval));
}

export function mediaReplace(
  client: ControlPlaneClient,
  input: { projectId: string; assetId: string; fileName: string; contentBase64: string },
  approval?: Approval,
): Promise<MediaReplaceOutcome> {
  return client.invoke<MediaReplaceOutcome>('media.replace', withApproval(input, approval));
}

export function mediaDelete(
  client: ControlPlaneClient,
  input: { projectId: string; assetId: string; confirm?: boolean },
  approval?: Approval,
): Promise<MediaDeleteOutcome> {
  return client.invoke<MediaDeleteOutcome>('media.delete', withApproval(input, approval));
}

export function designRead(client: ControlPlaneClient, projectId: string): Promise<DesignModel> {
  return client.invoke<DesignModel>('design.read', { projectId });
}

export function designTokenUpdate(
  client: ControlPlaneClient,
  input: DesignTokenUpdateInput,
  approval?: Approval,
): Promise<DesignTokenUpdateResult> {
  return client.invoke<DesignTokenUpdateResult>('design.token.update', withApproval(input, approval));
}

export function themeRead(client: ControlPlaneClient, projectId: string): Promise<ThemeReadResult> {
  return client.invoke<ThemeReadResult>('theme.read', { projectId });
}

export function themeUpdate(
  client: ControlPlaneClient,
  input: ThemeUpdateInput,
  approval?: Approval,
): Promise<ThemeUpdateResult> {
  return client.invoke<ThemeUpdateResult>('theme.update', withApproval(input, approval));
}

export function designUpdate(
  client: ControlPlaneClient,
  input: DesignUpdateInput,
  approval?: Approval,
): Promise<DesignUpdateResult> {
  return client.invoke<DesignUpdateResult>('design.update', withApproval(input, approval));
}

export function responsiveDiagnose(
  client: ControlPlaneClient,
  input: ResponsiveTargetInput,
): Promise<DiagnoseResult> {
  return client.invoke<DiagnoseResult>('responsive.diagnose', input);
}

export function responsiveStressTest(
  client: ControlPlaneClient,
  input: ResponsiveStressInput,
): Promise<StressTestResult> {
  return client.invoke<StressTestResult>('responsive.stressTest', input);
}

export function responsiveCompare(
  client: ControlPlaneClient,
  input: ResponsiveCompareInput,
): Promise<CompareResult> {
  return client.invoke<CompareResult>('responsive.compare', input);
}

export function responsiveSnapshot(
  client: ControlPlaneClient,
  input: ResponsiveTargetInput,
): Promise<ResponsiveSnapshot> {
  return client.invoke<ResponsiveSnapshot>('responsive.snapshot', input);
}

// ---- hooks react-query (wrappers finos sobre as funções puras) -----------------

function useM3Query<T>(capabilityId: string, key: readonly unknown[], queryFn: () => Promise<T>, enabled: boolean): UseQueryResult<T> {
  const { availability } = useCapability(capabilityId);
  return useQuery({
    queryKey: key,
    queryFn,
    enabled: enabled && availability !== undefined && isActionable(availability),
  });
}

export function useComponentList(projectId: string, scope?: ComponentScope): UseQueryResult<ComponentIdentity[]> {
  return useM3Query(
    'component.list',
    m3QueryKeys.componentList(projectId, scope),
    () => componentList(controlPlane, scope === undefined ? { projectId } : { projectId, scope }),
    projectId.length > 0,
  );
}

export function useComponent(projectId: string, componentId: string | null): UseQueryResult<ComponentSchema> {
  return useM3Query(
    'component.read',
    m3QueryKeys.component(projectId, componentId ?? ''),
    () => componentRead(controlPlane, { projectId, componentId: componentId ?? '' }),
    projectId.length > 0 && componentId !== null && componentId.length > 0,
  );
}

export function useMediaList(projectId: string, filter?: MediaListFilter): UseQueryResult<AssetIdentity[]> {
  return useM3Query(
    'media.list',
    m3QueryKeys.mediaList(projectId, filter),
    () => mediaList(controlPlane, filter === undefined ? { projectId } : { projectId, filter }),
    projectId.length > 0,
  );
}

export function useMediaAsset(
  projectId: string,
  assetId: string | null,
  includeContent = false,
): UseQueryResult<MediaReadResult> {
  return useM3Query(
    'media.read',
    [...m3QueryKeys.mediaAsset(projectId, assetId ?? ''), includeContent] as const,
    () => mediaRead(controlPlane, { projectId, assetId: assetId ?? '', includeContent }),
    projectId.length > 0 && assetId !== null && assetId.length > 0,
  );
}

/** Busca SAFE; desabilitada com query vazia (contrato exige query min(1)). */
export function useMediaSearch(projectId: string, query: string): UseQueryResult<MediaSearchMatch[]> {
  return useM3Query(
    'media.search',
    m3QueryKeys.mediaSearch(projectId, query),
    () => mediaSearch(controlPlane, { projectId, query }),
    projectId.length > 0 && query.trim().length > 0,
  );
}

export function useDesignModel(projectId: string): UseQueryResult<DesignModel> {
  return useM3Query('design.read', m3QueryKeys.designModel(projectId), () => designRead(controlPlane, projectId), projectId.length > 0);
}

export function useThemes(projectId: string): UseQueryResult<ThemeReadResult> {
  return useM3Query('theme.read', m3QueryKeys.themes(projectId), () => themeRead(controlPlane, projectId), projectId.length > 0);
}

/**
 * Mutação M3 (component/media/design) com aprovação D17 por invocação:
 * o caller passa `approval` no input (mesclada via withApproval na função pura)
 * e o server state do projeto é invalidado no sucesso.
 */
export function useM3Mutation<TInput extends { projectId: string; approval?: Approval }, TOutput>(
  invokeFn: (client: ControlPlaneClient, input: Omit<TInput, 'approval'>, approval?: Approval) => Promise<TOutput>,
): UseMutationResult<TOutput, Error, TInput> {
  const invalidate = useInvalidateM3Project();
  return useMutation({
    mutationFn: (input: TInput) => {
      const { approval, ...rest } = input;
      return invokeFn(controlPlane, rest, approval);
    },
    onSuccess: (_data, input) => invalidate(input.projectId),
  });
}

// Wrappers nomeados por capability (descoberta/depuração honestas).

export function useComponentCreate() {
  return useM3Mutation<CreateComponentInput & { approval?: Approval }, CreateComponentOutcome>(componentCreate);
}
export function useComponentUpdate() {
  return useM3Mutation<UpdateComponentInput & { approval?: Approval }, UpdateComponentOutcome>(componentUpdate);
}
export function useComponentDelete() {
  return useM3Mutation<DeleteComponentInput & { approval?: Approval }, DeleteComponentOutcome>(componentDelete);
}
export function useComponentPublish() {
  return useM3Mutation<PublishComponentInput & { approval?: Approval }, PublishComponentOutcome>(componentPublish);
}
export function useMediaUpload() {
  return useM3Mutation<MediaUploadInput & { approval?: Approval }, MediaUploadOutcome>(mediaUpload);
}
export function useMediaUpdate() {
  return useM3Mutation<{ projectId: string; assetId: string; patch: AssetMetadataPatch; approval?: Approval }, AssetIdentity>(mediaUpdate);
}
export function useMediaReplace() {
  return useM3Mutation<{ projectId: string; assetId: string; fileName: string; contentBase64: string; approval?: Approval }, MediaReplaceOutcome>(mediaReplace);
}
export function useMediaDelete() {
  return useM3Mutation<{ projectId: string; assetId: string; confirm?: boolean; approval?: Approval }, MediaDeleteOutcome>(mediaDelete);
}
export function useDesignTokenUpdate() {
  return useM3Mutation<DesignTokenUpdateInput & { approval?: Approval }, DesignTokenUpdateResult>(designTokenUpdate);
}
export function useThemeUpdate() {
  return useM3Mutation<ThemeUpdateInput & { approval?: Approval }, ThemeUpdateResult>(themeUpdate);
}
export function useDesignUpdate() {
  return useM3Mutation<DesignUpdateInput & { approval?: Approval }, DesignUpdateResult>(designUpdate);
}

/**
 * Operações LONGAS responsive (browser real + dev server, 09§46): sync no
 * Control Plane com timeout de 180s — o estado `isPending` da mutation é o
 * estado honesto de "executando" (pode demorar; nunca simular progresso).
 * Todas SAFE (nunca mutam source) — sem aprovação.
 */
export function useResponsiveDiagnose(): UseMutationResult<DiagnoseResult, Error, ResponsiveTargetInput> {
  return useMutation({ mutationFn: (input) => responsiveDiagnose(controlPlane, input) });
}
export function useResponsiveStressTest(): UseMutationResult<StressTestResult, Error, ResponsiveStressInput> {
  return useMutation({ mutationFn: (input) => responsiveStressTest(controlPlane, input) });
}
export function useResponsiveCompare(): UseMutationResult<CompareResult, Error, ResponsiveCompareInput> {
  return useMutation({ mutationFn: (input) => responsiveCompare(controlPlane, input) });
}
export function useResponsiveSnapshot(): UseMutationResult<ResponsiveSnapshot, Error, ResponsiveTargetInput> {
  return useMutation({ mutationFn: (input) => responsiveSnapshot(controlPlane, input) });
}
