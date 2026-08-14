/**
 * Entidades M1 persistidas (SPEC.md §5) + espelho local dos tipos de auditoria (SPEC §3).
 *
 * AuditEvent/AuditSink sao definidos em @nexo/security (Wave 2A, branch paralela).
 * Para nao criar dependencia cruzada entre branches, este package declara o espelho
 * local fiel ao contrato de SPEC §3; na integracao, @nexo/security passa a ser a fonte
 * e estes tipos devem convergir (structural typing ja garante compatibilidade).
 */

// dep: @nexo/core — tipos Actor/ExecutionContext usados em AuditEvent (SPEC §3); import type apenas (zero runtime).
import type { Actor, ExecutionContext } from '@nexo/core';
import type { NexoError, OpStatus } from '@nexo/shared';

/** Decision (SPEC §3) — espelho local; fonte canonica: @nexo/security. */
export type AuditDecision = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'UNKNOWN';

/** AuditEvent (SPEC §3) — espelho local; fonte canonica: @nexo/security. */
export interface AuditEvent {
  id: string;
  who: Actor;
  what: string;
  resource?: string;
  context: ExecutionContext;
  decision?: AuditDecision;
  result: OpStatus;
  at: string; // ISO 8601
  details?: Record<string, unknown>;
}

/** AuditSink (SPEC §3) — espelho local; fonte canonica: @nexo/security. */
export interface AuditSink {
  record(e: AuditEvent): void;
}

export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED';

export interface Workspace {
  id: string; // uuid
  name: string;
  status: WorkspaceStatus;
  createdAt: string; // ISO 8601
}

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface ProjectRegistration {
  /**
   * uuid estavel, gerado no registro e NUNCA derivado de rootPath (SPEC §5).
   * Reimportar o mesmo path deve reutilizar/atualizar o id existente
   * (resolucao via ProjectRepository.findByRootPath), nunca recomputar id.
   */
  id: string;
  name: string;
  rootPath: string;
  fingerprint: string;
  status: ProjectStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Job {
  id: string; // uuid
  capabilityId: string;
  status: JobStatus;
  input: unknown; // serializado em input_json
  result: unknown | null; // serializado em result_json
  error: NexoError | null; // serializado em error_json
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Snapshot do ProjectModel (Project Intelligence) persistido em pi_snapshots.model_json.
 * O tipo FORTE (ProjectModel) vem de @nexo/intelligence na integracao (Wave 3);
 * aqui permanece propositalmente estrutural para nao criar dependencia cruzada.
 */
export type ProjectModelSnapshot = Record<string, unknown>;

export interface PISnapshot {
  projectId: string;
  model: ProjectModelSnapshot;
  analyzedAt: string; // ISO 8601
  analysisVersion: string;
}

/**
 * MediaAssetRecord (M3 — doc 08§42/§82, D10: registries via Repository Pattern;
 * "Media Metadata" é entidade nomeada no doc 14).
 * A identidade COMPLETA (AssetIdentity de @nexo/media) é serializada em
 * identity_json; aqui permanece estrutural para não criar dependência cruzada
 * (mesmo padrão de ProjectModelSnapshot). Colunas name/type existem só para
 * indexação/consulta; a verdade canônica é identity_json.
 */
export interface MediaAssetRecord {
  id: string; // uuid estável do asset (gerado por @nexo/media)
  projectId: string;
  name: string;
  type: string; // AssetType (08§41) — string para não acoplar o enum
  identity: Record<string, unknown>; // AssetIdentity serializada
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * ResponsiveViewportRecord (M3 — doc 09§24/§25/§26): registry de viewports
 * persistido via Repository Pattern. Presets são CONFIGURÁVEIS (09§25) e nunca
 * verdade universal — isPreset apenas marca a origem, não confere autoridade.
 * Tipos fortes (Viewport de @nexo/responsive) convergem por structural typing.
 */
export interface ResponsiveViewportRecord {
  id: string; // uuid estável gerado por @nexo/responsive
  name: string | null;
  width: number; // px CSS, inteiro > 0
  height: number; // px CSS, inteiro > 0
  dpr: number | null; // device pixel ratio quando suportado (09§24)
  orientation: 'Portrait' | 'Landscape'; // doc 09§28
  isPreset: boolean;
  createdAt: string; // ISO 8601
}

/**
 * ResponsiveSnapshotRecord (M3 — doc 09§44): metadata do Snapshot visual.
 * A IMAGEM fica em arquivo no dataDir (imagePath) — fora do SQLite; este row
 * é só metadata + referência. Snapshots NUNCA são o Source Project (09§44):
 * sourceState registra uma referência (ex.: fingerprint/HEAD) sem autoridade.
 */
export interface ResponsiveSnapshotRecord {
  id: string; // uuid estável gerado por @nexo/responsive
  projectId: string;
  viewportId: string;
  route: string;
  sourceState: string; // referência de estado do source no momento da captura
  previewRef: string; // Preview URL / Reference (09§44)
  imagePath: string; // path absoluto do PNG no dataDir
  diagnosticsJson: string; // DiagnosticIssue[] serializado (09§34)
  createdAt: string; // ISO 8601
}

/**
 * ComponentRecord (M3 — doc 08§6/§9, D10: registries via Repository Pattern;
 * "Library Component" é entidade nomeada no doc 14).
 * O ComponentSchema COMPLETO (de @nexo/components) é serializado em
 * schema_json; aqui permanece estrutural para não criar dependência cruzada
 * (mesmo padrão de MediaAssetRecord). Colunas name/scope existem só para
 * indexação/consulta; a verdade canônica é schema_json.
 * projectId é NULL para componentes de escopo Library/Workspace (identidade
 * estável DENTRO do escopo — 08§6; Project Component != Library Component).
 */
export interface ComponentRecord {
  id: string; // uuid estável do componente (gerado por @nexo/components)
  projectId: string | null;
  name: string;
  scope: string; // 'Project' | 'Workspace' | 'Library' — string para não acoplar o enum
  schema: Record<string, unknown>; // ComponentSchema serializado
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * ComponentVersionRow (M3 — doc 08§26): version record de Library Component.
 * O record completo (source snapshot/hash, dependencies, compatibility,
 * changes, publishedAt — 08§26) vive em record_json (estrutural aqui).
 * Um projeto usando a versão X nunca muda silenciosamente para Y (08§26):
 * versions são imutáveis (insert-only, sem update).
 */
export interface ComponentVersionRow {
  id: string; // uuid do version record
  componentId: string; // id do Library Component
  version: string; // semver
  record: Record<string, unknown>; // ComponentVersionRecord serializado (08§26)
  publishedAt: string; // ISO 8601
}

/**
 * SecretRecord (M4 — M4-CONTRACTS §2.1/§9, D25): registro do secret store
 * local. O VALOR vive SOMENTE cifrado (AES-256-GCM por @nexo/secrets):
 * ciphertext/iv/authTag em base64. Nenhum campo deste record contém
 * plaintext — metadata é JSON estrutural (Record) e NUNCA secret material
 * (WM §24). projectId é NULL para scope WORKSPACE; providerId é a referência
 * lógica do provider de IA dono da credencial (quando houver).
 * revokedAt != null => usos futuros falham FORBIDDEN (M4-CONTRACTS §2.1).
 */
export interface SecretRecord {
  id: string; // uuid estável gerado por @nexo/secrets
  name: string;
  scope: 'WORKSPACE' | 'PROJECT';
  projectId: string | null;
  providerId: string | null;
  ciphertext: string; // base64 — NUNCA plaintext
  iv: string; // base64, 12 bytes (GCM)
  authTag: string; // base64, 16 bytes (GCM)
  metadata: Record<string, unknown>; // JSON estrutural, sem secret material
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  revokedAt: string | null; // ISO 8601
}
