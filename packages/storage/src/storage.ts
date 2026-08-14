/**
 * createStorage(dataDir) (SPEC §5): abre/cria <dataDir>/nexo.db em modo WAL,
 * aplica migrations (schema_migrations) e retorna Result<Storage>.
 * Falha de FS/SQLite -> erro estruturado STORAGE_UNAVAILABLE (nunca throw para
 * falha esperada; SPEC §0).
 */

import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// dep: better-sqlite3 ^12 — metadata store local-first atras de Repository Pattern (STACK-DECISION D1).
// NOTA de versao: STACK-DECISION pina ^13, mas v13 exige Node >=22 (engines do pacote) e seus
// prebuilds (NAPI 10) segfaultam no Node 20.20.2 do ambiente. STACK declara Node >=20 testado
// em 20.20.2 (Inv. 38) -> pin ^12.11.1 (engines 20.x-26.x, mesma API). Reavaliar ^13 ao exigir Node >=22.
import Database from 'better-sqlite3';

import type { Result } from '@nexo/shared';
import { err, nexoError, ok } from '@nexo/shared';

import { runMigrations } from './migrations.js';
import { createAuditRepository, type AuditRepository } from './repos/audit-repository.js';
import {
  createMediaAssetRepository,
  type MediaAssetRepository,
} from './repos/media-asset-repository.js';
import {
  createComponentRepository,
  type ComponentRepository,
} from './repos/component-repository.js';
import { createJobRepository, type JobRepository } from './repos/job-repository.js';
import {
  createPISnapshotRepository,
  type PISnapshotRepository,
} from './repos/pi-snapshot-repository.js';
import {
  createProjectRepository,
  type ProjectRepository,
} from './repos/project-repository.js';
import {
  createResponsiveSnapshotRepository,
  type ResponsiveSnapshotRepository,
} from './repos/responsive-snapshot-repository.js';
import {
  createResponsiveViewportRepository,
  type ResponsiveViewportRepository,
} from './repos/responsive-viewport-repository.js';
import {
  createWorkspaceRepository,
  type WorkspaceRepository,
} from './repos/workspace-repository.js';

export const DB_FILENAME = 'nexo.db';

/** dataDir default: NEXO_HOME env ou ~/.nexo (SPEC §5). */
export function defaultDataDir(): string {
  return process.env['NEXO_HOME'] ?? join(homedir(), '.nexo');
}

export interface StorageRepos {
  workspaces: WorkspaceRepository;
  projects: ProjectRepository;
  jobs: JobRepository;
  audit: AuditRepository;
  piSnapshots: PISnapshotRepository;
  mediaAssets: MediaAssetRepository;
  responsiveViewports: ResponsiveViewportRepository;
  responsiveSnapshots: ResponsiveSnapshotRepository;
  components: ComponentRepository;
}

export interface Storage {
  db: Database.Database;
  repos: StorageRepos;
  close(): void;
}

export function createStorage(dataDir: string): Result<Storage> {
  try {
    mkdirSync(dataDir, { recursive: true });
    const db = new Database(join(dataDir, DB_FILENAME));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    return ok({
      db,
      repos: {
        workspaces: createWorkspaceRepository(db),
        projects: createProjectRepository(db),
        jobs: createJobRepository(db),
        audit: createAuditRepository(db),
        piSnapshots: createPISnapshotRepository(db),
        mediaAssets: createMediaAssetRepository(db),
        responsiveViewports: createResponsiveViewportRepository(db),
        responsiveSnapshots: createResponsiveSnapshotRepository(db),
        components: createComponentRepository(db),
      },
      close() {
        db.close();
      },
    });
  } catch (cause) {
    return err(
      nexoError('STORAGE_UNAVAILABLE', `nao foi possivel abrir o storage em '${dataDir}'`, {
        resource: dataDir,
        retryable: true,
        details: { cause: cause instanceof Error ? cause.message : String(cause) },
      }),
    );
  }
}
