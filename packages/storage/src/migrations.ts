/**
 * Schema versioning (SPEC §5): tabela schema_migrations(version, applied_at)
 * + lista ordenada de migrations aplicadas em transacao. Idempotente por
 * construcao: versions ja presentes em schema_migrations sao puladas.
 */

// dep: better-sqlite3 ^12 — metadata store local-first atras de Repository Pattern (STACK-DECISION D1).
// NOTA de versao: STACK-DECISION pina ^13, mas v13 exige Node >=22 (engines do pacote) e seus
// prebuilds (NAPI 10) segfaultam no Node 20.20.2 do ambiente. STACK declara Node >=20 testado
// em 20.20.2 (Inv. 38) -> pin ^12.11.1 (engines 20.x-26.x, mesma API). Reavaliar ^13 ao exigir Node >=22.
import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/** M1 FOUNDATION — nunca editar migrations ja aplicadas; adicionar novas ao final. */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'm1-foundation',
    sql: `
      CREATE TABLE workspaces (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        status     TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE projects (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        root_path   TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        status      TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
      CREATE INDEX idx_projects_root_path ON projects(root_path);

      CREATE TABLE jobs (
        id            TEXT PRIMARY KEY,
        capability_id TEXT NOT NULL,
        status        TEXT NOT NULL,
        input_json    TEXT NOT NULL,
        result_json   TEXT,
        error_json    TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE INDEX idx_jobs_status ON jobs(status);

      CREATE TABLE audit_events (
        id           TEXT PRIMARY KEY,
        who_json     TEXT NOT NULL,
        what         TEXT NOT NULL,
        resource     TEXT,
        context_json TEXT NOT NULL,
        decision     TEXT,
        result       TEXT NOT NULL,
        at           TEXT NOT NULL,
        details_json TEXT
      );
      CREATE INDEX idx_audit_events_at ON audit_events(at);

      CREATE TABLE pi_snapshots (
        project_id       TEXT NOT NULL,
        model_json       TEXT NOT NULL,
        analyzed_at      TEXT NOT NULL,
        analysis_version TEXT NOT NULL
      );
      CREATE INDEX idx_pi_snapshots_project ON pi_snapshots(project_id, analyzed_at);
    `,
  },
];

/**
 * Aplica migrations pendentes em ordem de version, cada uma em transacao
 * (all-or-nothing por migration). Abrir o mesmo DB 2x nao reaplica nada.
 */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{
    version: number;
  }>;
  const applied = new Set(rows.map((r) => r.version));

  const insertVersion = db.prepare(
    'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
  );
  const pending = [...MIGRATIONS].sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    if (applied.has(migration.version)) continue;
    const apply = db.transaction((m: Migration) => {
      db.exec(m.sql);
      insertVersion.run(m.version, new Date().toISOString());
    });
    apply(migration);
  }
}
