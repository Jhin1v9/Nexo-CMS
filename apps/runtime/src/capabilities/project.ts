/**
 * Capabilities M1 do domínio `project` (SPEC.md §8/§9).
 *
 * - project.import: valida path -> scan (read-only, Inv. discovery nunca muta)
 *   -> insert OU alreadyRegistered via findByRootPath (id estável, SPEC §5)
 *   -> PI snapshot -> (audit é responsabilidade do Control Plane).
 * - project.open: registration + latest snapshot; fingerprint atual != salvo
 *   -> STALE_CONTEXT (retryable: true, hint de refresh) — ProjectModel é
 *   derivado e sujeito a staleness (ARCHITECTURE-MAP: fontes de verdade).
 * - project.read: metadata persistida sem checagem de staleness.
 * - project.list: registrations.
 * - project.refresh: re-scan + novo snapshot + fingerprint atualizado.
 */

import { basename, resolve } from 'node:path';

import type { CapabilityContract, ExecutionContext } from '@nexo/core';
import type { ProjectModel, ProjectScanner } from '@nexo/intelligence';
import { computeFingerprint } from '@nexo/intelligence';
import type { Result } from '@nexo/shared';
import { err, newOperationId, nexoError, ok } from '@nexo/shared';
import type { ProjectRegistration, Storage } from '@nexo/storage';
import { z } from 'zod';

import { toSnapshotModel } from '../model-adapter.js';

export interface ImportProjectInput {
  rootPath: string;
}

export interface ImportProjectOutput {
  project: ProjectRegistration;
  model: ProjectModel;
  alreadyRegistered: boolean;
}

export interface ProjectIdInput {
  projectId: string;
}

export interface OpenProjectOutput {
  project: ProjectRegistration;
  /** Snapshot persistido (shape Record — ver model-adapter.ts). */
  model: Record<string, unknown>;
  analyzedAt: string;
}

export interface ReadProjectOutput {
  project: ProjectRegistration;
  model: Record<string, unknown> | null;
  analyzedAt: string | null;
}

export interface ListProjectsOutput {
  projects: ProjectRegistration[];
}

export interface RefreshProjectOutput {
  project: ProjectRegistration;
  model: ProjectModel;
}

const importInputSchema = z.object({ rootPath: z.string().min(1) });
const projectIdInputSchema = z.object({ projectId: z.string().min(1) });

const STALE_HINT =
  "Project fingerprint changed on disk; invoke 'project.refresh' to re-scan and then retry 'project.open'";

function notFoundProject(projectId: string, operationId: string) {
  return nexoError('NOT_FOUND', `Project not registered: '${projectId}'`, {
    operationId,
    resource: projectId,
  });
}

export interface ProjectCapabilityDeps {
  storage: Storage;
  scanner: ProjectScanner;
}

function getProject(
  deps: ProjectCapabilityDeps,
  projectId: string,
  ctx: ExecutionContext,
): Result<ProjectRegistration> {
  const project = deps.storage.repos.projects.getById(projectId);
  if (project === null) return err(notFoundProject(projectId, ctx.operationId));
  return ok(project);
}

/**
 * Scan + fingerprint + persistência compartilhados por import/refresh.
 * Exportado para o hook `updateIntelligence` do save pipeline M3 (07§36:
 * após persistência confirmada, PI é re-escaneada — capabilities/m3.ts).
 */
export async function scanAndPersist(
  deps: ProjectCapabilityDeps,
  project: ProjectRegistration,
): Promise<Result<{ project: ProjectRegistration; model: ProjectModel }>> {
  const scanned = await deps.scanner.scan(project.rootPath);
  if (!scanned.ok) return scanned;
  const model = scanned.value;
  model.projectId = project.id;
  const fingerprint = await computeFingerprint(project.rootPath);
  const updated: ProjectRegistration = {
    ...project,
    fingerprint,
    updatedAt: new Date().toISOString(),
  };
  deps.storage.repos.projects.update(updated);
  deps.storage.repos.piSnapshots.save(project.id, toSnapshotModel(model), String(model.analysisVersion));
  return ok({ project: updated, model });
}

export function projectImportContract(): CapabilityContract {
  return {
    id: 'project.import',
    version: 1,
    domain: 'project',
    description: 'Importa/registra um projeto real pelo rootPath: scan read-only, ProjectModel + snapshot persistidos',
    inputSchema: importInputSchema,
    resultSchema: z.unknown(),
    requiredPermission: 'project.import',
    risk: 'SAFE', // discovery NUNCA muta o projeto; escreve apenas metadata do Nexo
    sideEffects: true, // escreve no Nexo Storage (projects + pi_snapshots)
    async: 'sync',
    timeoutMs: 60_000,
  };
}

export function makeProjectImportHandler(deps: ProjectCapabilityDeps) {
  // _ctx: assinatura CapabilityHandler exige (audit de invoke fica no Control Plane)
  return async (input: unknown, _ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { rootPath: rawPath } = importInputSchema.parse(input);
    const rootPath = resolve(rawPath);

    // valida path existe + scan (scanner retorna NOT_FOUND/INVALID_INPUT estruturados)
    const scanned = await deps.scanner.scan(rootPath);
    if (!scanned.ok) return scanned;

    // reimport idempotente: mesmo rootPath -> MESMO registro (id estável, SPEC §5/§8)
    const existing = deps.storage.repos.projects.findByRootPath(rootPath);
    if (existing !== null) {
      const persisted = await scanAndPersist(deps, existing);
      if (!persisted.ok) return persisted;
      const output: ImportProjectOutput = {
        project: persisted.value.project,
        model: persisted.value.model,
        alreadyRegistered: true,
      };
      return ok(output);
    }

    const now = new Date().toISOString();
    const fingerprint = await computeFingerprint(rootPath);
    const project: ProjectRegistration = {
      id: newOperationId(), // uuid estável, NUNCA derivado de path (SPEC §5)
      name: basename(rootPath),
      rootPath,
      fingerprint,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    deps.storage.repos.projects.insert(project);

    const model = scanned.value;
    model.projectId = project.id;
    deps.storage.repos.piSnapshots.save(project.id, toSnapshotModel(model), String(model.analysisVersion));

    const output: ImportProjectOutput = { project, model, alreadyRegistered: false };
    return ok(output);
  };
}

export function projectOpenContract(): CapabilityContract {
  return {
    id: 'project.open',
    version: 1,
    domain: 'project',
    description: 'Abre um projeto registrado: registration + latest ProjectModel; STALE_CONTEXT se o fingerprint mudou',
    inputSchema: projectIdInputSchema,
    resultSchema: z.unknown(),
    requiredPermission: 'project.open',
    risk: 'SAFE',
    sideEffects: false,
    async: 'sync',
    timeoutMs: 30_000,
  };
}

export function makeProjectOpenHandler(deps: ProjectCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId } = projectIdInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    const project = found.value;

    const snapshot = deps.storage.repos.piSnapshots.latest(projectId);
    if (snapshot === null) {
      return err(
        nexoError('NOT_FOUND', `No ProjectModel snapshot for project '${projectId}'`, {
          operationId: ctx.operationId,
          resource: projectId,
          retryable: true,
          details: { hint: "invoke 'project.refresh' to (re)build the snapshot" },
        }),
      );
    }

    // Staleness: fingerprint = hash de package.json+lockfile+configs (SPEC §7/§8).
    const current = await computeFingerprint(project.rootPath);
    if (current !== project.fingerprint) {
      return err(
        nexoError('STALE_CONTEXT', `Project '${projectId}' changed on disk since last scan`, {
          operationId: ctx.operationId,
          resource: projectId,
          retryable: true,
          details: {
            hint: STALE_HINT,
            storedFingerprint: project.fingerprint,
            currentFingerprint: current,
          },
        }),
      );
    }

    const output: OpenProjectOutput = {
      project,
      model: snapshot.model,
      analyzedAt: snapshot.analyzedAt,
    };
    return ok(output);
  };
}

export function projectReadContract(): CapabilityContract {
  return {
    id: 'project.read',
    version: 1,
    domain: 'project',
    description: 'Lê metadata persistida do projeto (registration + latest snapshot), sem checagem de staleness',
    inputSchema: projectIdInputSchema,
    resultSchema: z.unknown(),
    requiredPermission: 'project.read',
    risk: 'SAFE',
    sideEffects: false,
    async: 'sync',
    timeoutMs: 10_000,
  };
}

export function makeProjectReadHandler(deps: ProjectCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId } = projectIdInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    const snapshot = deps.storage.repos.piSnapshots.latest(projectId);
    const output: ReadProjectOutput = {
      project: found.value,
      model: snapshot?.model ?? null,
      analyzedAt: snapshot?.analyzedAt ?? null,
    };
    return ok(output);
  };
}

export function projectListContract(): CapabilityContract {
  return {
    id: 'project.list',
    version: 1,
    domain: 'project',
    description: 'Lista projetos registrados no Nexo Storage',
    inputSchema: z.object({}),
    resultSchema: z.unknown(),
    requiredPermission: 'project.list',
    risk: 'SAFE',
    sideEffects: false,
    async: 'sync',
    timeoutMs: 10_000,
  };
}

export function makeProjectListHandler(deps: ProjectCapabilityDeps) {
  return async (): Promise<Result<unknown>> => {
    const output: ListProjectsOutput = { projects: deps.storage.repos.projects.list() };
    return ok(output);
  };
}

export function projectRefreshContract(): CapabilityContract {
  return {
    id: 'project.refresh',
    version: 1,
    domain: 'project',
    description: 'Re-scan do projeto (read-only) + novo snapshot + fingerprint atualizado (resolve STALE_CONTEXT)',
    inputSchema: projectIdInputSchema,
    resultSchema: z.unknown(),
    requiredPermission: 'project.refresh',
    risk: 'SAFE',
    sideEffects: true, // escreve apenas metadata do Nexo (snapshot + fingerprint)
    async: 'sync',
    timeoutMs: 60_000,
  };
}

export function makeProjectRefreshHandler(deps: ProjectCapabilityDeps) {
  return async (input: unknown, ctx: ExecutionContext): Promise<Result<unknown>> => {
    const { projectId } = projectIdInputSchema.parse(input);
    const found = getProject(deps, projectId, ctx);
    if (!found.ok) return found;
    const persisted = await scanAndPersist(deps, found.value);
    if (!persisted.ok) return persisted;
    const output: RefreshProjectOutput = {
      project: persisted.value.project,
      model: persisted.value.model,
    };
    return ok(output);
  };
}
