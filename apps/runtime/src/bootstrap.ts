/**
 * Composition root (SPEC.md §9): storage -> security -> adapters/intelligence
 * -> control-plane -> registra capabilities M1 -> Hono app.
 *
 * Ordem de montagem:
 *  1. createStorage(NEXO_HOME || ~/.nexo) — metadata do Nexo (sqlite WAL);
 *  2. PolicyEngine com grants M1 do ator local (ver ./policy.ts) + audit sink
 *     do storage adaptado (convergência de tipos: @nexo/security é a fonte,
 *     adaptação tipada em @nexo/control-plane/audit-adapter);
 *  3. ProjectScanner com createDefaultAdapterRegistry (detecção M1);
 *  4. ControlPlane (registry + invoke gate: zod -> authorize -> handler -> audit);
 *  5. Registro das capabilities M1 (project.*, runtime.filesystem.*,
 *     runtime.command.execute);
 *  6. Hono Agent API (./app.ts).
 */

import type { ControlPlane } from '@nexo/control-plane';
import { asSecurityAuditSink, createControlPlane } from '@nexo/control-plane';
import { createProjectScanner } from '@nexo/intelligence';
import type { Result } from '@nexo/shared';
import { createStorage, defaultDataDir, type Storage } from '@nexo/storage';
import type { Hono } from 'hono';

import { createAgentApi } from './app.js';
import {
  makeProjectImportHandler,
  makeProjectListHandler,
  makeProjectOpenHandler,
  makeProjectReadHandler,
  makeProjectRefreshHandler,
  projectImportContract,
  projectListContract,
  projectOpenContract,
  projectReadContract,
  projectRefreshContract,
  type ProjectCapabilityDeps,
} from './capabilities/project.js';
import {
  commandExecuteContract,
  fsListContract,
  fsReadContract,
  makeCommandExecuteHandler,
  makeFsListHandler,
  makeFsReadHandler,
  type RuntimeCapabilityDeps,
} from './capabilities/runtime.js';
import { gitCapabilityRegistrations, type GitCapabilityDeps } from './capabilities/git.js';
import {
  createM3Services,
  m3CapabilityRegistrations,
  type M3Services,
} from './capabilities/m3.js';
import { createM1PolicyEngine } from './policy.js';

export interface RuntimeInstance {
  app: Hono;
  controlPlane: ControlPlane;
  storage: Storage;
  close(): void;
}

export interface RuntimeOptions {
  /** Default: NEXO_HOME env ou ~/.nexo (SPEC §5). */
  dataDir?: string;
}

export function createRuntime(opts: RuntimeOptions = {}): Result<RuntimeInstance> {
  // 1. storage
  const dataDir = opts.dataDir ?? defaultDataDir();
  const storageResult = createStorage(dataDir);
  if (!storageResult.ok) return storageResult;
  const storage = storageResult.value;

  // 2. security (grants M1 do ator local) + audit canônico -> sink do storage
  const audit = asSecurityAuditSink(storage.repos.audit);
  const security = createM1PolicyEngine(audit);

  // 3. scanner (adapters M1 default) — discovery read-only
  const scanner = createProjectScanner();

  // 4. control-plane
  const controlPlane = createControlPlane({ security, audit, jobs: storage.repos.jobs });

  // 5. capabilities M1
  const projectDeps: ProjectCapabilityDeps = { storage, scanner };
  const runtimeDeps: RuntimeCapabilityDeps = { storage, security, audit };
  controlPlane.register({ contract: projectImportContract(), handler: makeProjectImportHandler(projectDeps) });
  controlPlane.register({ contract: projectOpenContract(), handler: makeProjectOpenHandler(projectDeps) });
  controlPlane.register({ contract: projectReadContract(), handler: makeProjectReadHandler(projectDeps) });
  controlPlane.register({ contract: projectListContract(), handler: makeProjectListHandler(projectDeps) });
  controlPlane.register({ contract: projectRefreshContract(), handler: makeProjectRefreshHandler(projectDeps) });
  controlPlane.register({ contract: fsReadContract(), handler: makeFsReadHandler(runtimeDeps) });
  controlPlane.register({ contract: fsListContract(), handler: makeFsListHandler(runtimeDeps) });
  controlPlane.register({ contract: commandExecuteContract(), handler: makeCommandExecuteHandler(runtimeDeps) });

  // capabilities M2 (git): 11 capabilities sobre @nexo/git, executor scoped
  // por invoke (allowedRoot = rootPath registrado) — ver capabilities/git.ts.
  const gitDeps: GitCapabilityDeps = { storage, security, audit };
  for (const cap of gitCapabilityRegistrations(gitDeps)) {
    controlPlane.register(cap);
  }

  // capabilities M3 (35 — M3-CONTRACTS §3): services criados UMA vez aqui
  // (composition root), wiring real: storage, scanner (PI), transformer
  // React/TSX (D8), sourceMapper do intelligence, parser TSX real (07§41) e
  // hook updateIntelligence (07§36) — ver capabilities/m3.ts.
  const m3Services = createM3Services({ storage, dataDir, scanner });
  if (!m3Services.ok) return m3Services;
  const m3: M3Services = m3Services.value;
  for (const cap of m3CapabilityRegistrations(m3, storage)) {
    controlPlane.register(cap);
  }

  // 6. HTTP
  const app = createAgentApi({ controlPlane });

  return {
    ok: true,
    value: {
      app,
      controlPlane,
      storage,
      close() {
        // ResponsiveService.close() encerra previews (dev servers) e o browser;
        // async por natureza — close() da instância é sync (storage). Dispara
        // e não bloqueia; testes que sobem previews devem aguardar o service.
        void m3.responsive.close();
        storage.close();
      },
    },
  };
}
