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
