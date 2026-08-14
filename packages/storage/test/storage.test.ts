/**
 * createStorage (SPEC §5): DB real em tmpdir, WAL, migrations idempotentes,
 * STORAGE_UNAVAILABLE estruturado em dataDir invalido.
 */

import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Storage } from '../src/index.js';
import { createStorage, DB_FILENAME, defaultDataDir } from '../src/index.js';

let dir: string;
let open: Storage[] = [];

function openStorage(d: string): Storage {
  const r = createStorage(d);
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  open.push(r.value);
  return r.value;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'nexo-storage-'));
});

afterEach(() => {
  for (const s of open) s.close();
  open = [];
  rmSync(dir, { recursive: true, force: true });
});

describe('createStorage', () => {
  it('cria nexo.db no dataDir e expoe repos + close (SPEC §5)', () => {
    const s = openStorage(dir);
    expect(existsSync(join(dir, DB_FILENAME))).toBe(true);
    expect(s.repos.workspaces).toBeDefined();
    expect(s.repos.projects).toBeDefined();
    expect(s.repos.jobs).toBeDefined();
    expect(s.repos.audit).toBeDefined();
    expect(s.repos.piSnapshots).toBeDefined();
    expect(typeof s.close).toBe('function');
  });

  it('abre em modo WAL (arquivo em disco)', () => {
    const s = openStorage(dir);
    const mode = s.db.pragma('journal_mode', { simple: true }) as string;
    expect(mode).toBe('wal');
  });

  it('cria dataDir inexistente recursivamente', () => {
    const nested = join(dir, 'a', 'b');
    openStorage(nested);
    expect(existsSync(join(nested, DB_FILENAME))).toBe(true);
  });

  it('migration idempotente: abrir 2x nao reaplica schema_migrations', () => {
    const first = openStorage(dir);
    first.close();
    open = open.filter((s) => s !== first);

    const second = openStorage(dir);
    const rows = second.db
      .prepare('SELECT version, applied_at FROM schema_migrations')
      .all() as Array<{ version: number; applied_at: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.version).toBe(1);
    expect(typeof rows[0]?.applied_at).toBe('string');

    // tabelas M1 existem apos reabrir
    const tables = (
      second.db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as Array<{ name: string }>
    ).map((t) => t.name);
    for (const t of ['workspaces', 'projects', 'jobs', 'audit_events', 'pi_snapshots']) {
      expect(tables).toContain(t);
    }
  });

  it('dados persistem entre close() e reabertura (durabilidade real)', () => {
    const first = openStorage(dir);
    first.repos.workspaces.insert({
      id: crypto.randomUUID(),
      name: 'ws',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
    first.close();
    open = open.filter((s) => s !== first);

    const second = openStorage(dir);
    expect(second.repos.workspaces.list()).toHaveLength(1);
  });

  it('dataDir impossivel (arquivo regular no meio do path) -> STORAGE_UNAVAILABLE', () => {
    // NOTA: /proc/readonly-x seria o caso classico, mas neste sandbox o mkdirSync
    // em /proc bloqueia a syscall (hang). ENOTDIR e deterministico e portavel.
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'not a dir');
    const r = createStorage(join(blocker, 'nested'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('STORAGE_UNAVAILABLE');
    expect(typeof r.error.message).toBe('string');
    expect(typeof r.error.retryable).toBe('boolean');
    expect(r.error.resource).toBe(join(blocker, 'nested'));
    expect(r.error.details).toBeDefined();
  });

  it('dataDir read-only (chmod) -> STORAGE_UNAVAILABLE ao abrir nexo.db', (ctx) => {
    // Root (uid 0) ignora bits de permissao de diretorio (CAP_DAC_OVERRIDE):
    // chmod 0555 nao impede escrita, logo a precondicao "read-only" e
    // impossivel de criar neste ambiente. Skip explicito e documentado —
    // nao e sucesso falso: o cenario ENOTDIR acima cobre o mesmo caminho de
    // erro (STORAGE_UNAVAILABLE) de forma deterministica.
    if (typeof process.getuid === 'function' && process.getuid() === 0) {
      ctx.skip('chmod read-only nao se aplica a root (uid 0)');
      return;
    }
    chmodSync(dir, 0o555);
    try {
      const r = createStorage(dir);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('STORAGE_UNAVAILABLE');
    } finally {
      chmodSync(dir, 0o755);
    }
  });

  it('dataDir que e arquivo existente -> STORAGE_UNAVAILABLE', () => {
    const filePath = join(dir, DB_FILENAME);
    const s = openStorage(dir); // cria arquivo real
    s.close();
    open = open.filter((x) => x !== s);
    const r = createStorage(filePath); // mkdir falha: path existe como arquivo
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('STORAGE_UNAVAILABLE');
  });

  it('defaultDataDir respeita NEXO_HOME (SPEC §5)', () => {
    const prev = process.env['NEXO_HOME'];
    process.env['NEXO_HOME'] = '/tmp/nexo-home-x';
    try {
      expect(defaultDataDir()).toBe('/tmp/nexo-home-x');
    } finally {
      if (prev === undefined) delete process.env['NEXO_HOME'];
      else process.env['NEXO_HOME'] = prev;
    }
  });
});
