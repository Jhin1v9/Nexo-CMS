/**
 * CRUD real de cada repositorio contra SQLite em tmpdir (SPEC §5).
 * projects.id = uuid estavel NAO derivado de path; fingerprint persistido;
 * jobs com transicoes de estado persistidas; audit como AuditSink.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Actor, ExecutionContext } from '@nexo/core';
import { nexoError } from '@nexo/shared';

import type {
  AuditEvent,
  Job,
  MediaAssetRecord,
  ProjectRegistration,
  Storage,
  Workspace,
} from '../src/index.js';
import { createStorage } from '../src/index.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let dir: string;
let storage: Storage;

function iso(): string {
  return new Date().toISOString();
}

function makeProject(overrides: Partial<ProjectRegistration> = {}): ProjectRegistration {
  return {
    id: crypto.randomUUID(),
    name: 'demo',
    rootPath: '/srv/projects/demo',
    fingerprint: 'fp-v1',
    status: 'ACTIVE',
    createdAt: iso(),
    updatedAt: iso(),
    ...overrides,
  };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: crypto.randomUUID(),
    capabilityId: 'project.import',
    status: 'QUEUED',
    input: { path: '/srv/projects/demo' },
    result: null,
    error: null,
    createdAt: iso(),
    updatedAt: iso(),
    ...overrides,
  };
}

function makeAuditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  const who: Actor = { kind: 'AGENT', id: 'agent-1' };
  const context: ExecutionContext = {
    operationId: crypto.randomUUID(),
    initiatedBy: who,
    executedBy: { kind: 'SYSTEM', id: 'control-plane' },
    projectId: 'p-1',
    environment: 'DEVELOPMENT',
  };
  return {
    id: crypto.randomUUID(),
    who,
    what: 'project.import',
    resource: 'project:p-1',
    context,
    decision: 'ALLOW',
    result: 'SUCCESS',
    at: iso(),
    details: { durationMs: 12 },
    ...overrides,
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'nexo-repos-'));
  const r = createStorage(dir);
  if (!r.ok) throw new Error(r.error.message);
  storage = r.value;
});

afterEach(() => {
  storage.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('WorkspaceRepository (minimo M1: insert/getById/list)', () => {
  it('insert + getById + list roundtrip', () => {
    const ws: Workspace = { id: crypto.randomUUID(), name: 'main', status: 'ACTIVE', createdAt: iso() };
    storage.repos.workspaces.insert(ws);
    expect(storage.repos.workspaces.getById(ws.id)).toEqual(ws);
    expect(storage.repos.workspaces.list()).toEqual([ws]);
  });

  it('getById inexistente -> null', () => {
    expect(storage.repos.workspaces.getById('nope')).toBeNull();
  });

  it('status ARCHIVED persiste', () => {
    const ws: Workspace = { id: crypto.randomUUID(), name: 'old', status: 'ARCHIVED', createdAt: iso() };
    storage.repos.workspaces.insert(ws);
    expect(storage.repos.workspaces.getById(ws.id)?.status).toBe('ARCHIVED');
  });
});

describe('ProjectRepository (SPEC §5)', () => {
  it('insert + getById roundtrip com fingerprint salvo', () => {
    const p = makeProject();
    storage.repos.projects.insert(p);
    const got = storage.repos.projects.getById(p.id);
    expect(got).toEqual(p);
    expect(got?.fingerprint).toBe('fp-v1');
  });

  it('id e uuid estavel NAO derivado de rootPath', () => {
    const p = makeProject();
    storage.repos.projects.insert(p);
    expect(p.id).toMatch(UUID_V4);
    // reimport do mesmo path resolve o MESMO id via findByRootPath (nunca recomputa)
    const found = storage.repos.projects.findByRootPath(p.rootPath);
    expect(found?.id).toBe(p.id);
  });

  it('findByRootPath inexistente -> null', () => {
    expect(storage.repos.projects.findByRootPath('/nada')).toBeNull();
  });

  it('update preserva id e atualiza fingerprint/status/updatedAt', () => {
    const p = makeProject();
    storage.repos.projects.insert(p);
    const updated: ProjectRegistration = {
      ...p,
      fingerprint: 'fp-v2',
      status: 'ARCHIVED',
      updatedAt: iso(),
    };
    storage.repos.projects.update(updated);
    const got = storage.repos.projects.getById(p.id);
    expect(got?.id).toBe(p.id); // id estavel
    expect(got?.fingerprint).toBe('fp-v2');
    expect(got?.status).toBe('ARCHIVED');
  });

  it('list retorna todos os projetos', () => {
    const a = makeProject({ rootPath: '/a' });
    const b = makeProject({ rootPath: '/b' });
    storage.repos.projects.insert(a);
    storage.repos.projects.insert(b);
    expect(storage.repos.projects.list()).toHaveLength(2);
  });
});

describe('JobRepository — estados QUEUED|RUNNING|COMPLETED|FAILED|CANCELLED', () => {
  it('create + getById com input serializado', () => {
    const j = makeJob();
    storage.repos.jobs.create(j);
    const got = storage.repos.jobs.getById(j.id);
    expect(got).toEqual(j);
    expect(got?.status).toBe('QUEUED');
  });

  it('transicao QUEUED -> RUNNING -> COMPLETED persiste com result', () => {
    const j = makeJob();
    storage.repos.jobs.create(j);

    storage.repos.jobs.updateStatus(j.id, 'RUNNING');
    expect(storage.repos.jobs.getById(j.id)?.status).toBe('RUNNING');

    storage.repos.jobs.setResult(j.id, { projectId: 'p-1' });
    storage.repos.jobs.updateStatus(j.id, 'COMPLETED');
    const done = storage.repos.jobs.getById(j.id);
    expect(done?.status).toBe('COMPLETED');
    expect(done?.result).toEqual({ projectId: 'p-1' });
  });

  it('FAILED persiste error estruturado (NexoError)', () => {
    const j = makeJob();
    storage.repos.jobs.create(j);
    storage.repos.jobs.updateStatus(j.id, 'RUNNING');
    const error = nexoError('INTERNAL', 'boom', { resource: 'job:' + j.id });
    storage.repos.jobs.setError(j.id, error);
    storage.repos.jobs.updateStatus(j.id, 'FAILED');
    const failed = storage.repos.jobs.getById(j.id);
    expect(failed?.status).toBe('FAILED');
    expect(failed?.error).toEqual(error);
  });

  it('CANCELLED persiste', () => {
    const j = makeJob();
    storage.repos.jobs.create(j);
    storage.repos.jobs.updateStatus(j.id, 'CANCELLED');
    expect(storage.repos.jobs.getById(j.id)?.status).toBe('CANCELLED');
  });

  it('list filtra por status', () => {
    const a = makeJob();
    const b = makeJob();
    storage.repos.jobs.create(a);
    storage.repos.jobs.create(b);
    storage.repos.jobs.updateStatus(b.id, 'CANCELLED');
    const queued = storage.repos.jobs.list({ status: 'QUEUED' });
    expect(queued.map((j) => j.id)).toEqual([a.id]);
  });
});

describe('AuditRepository implements AuditSink { record(e) }', () => {
  it('record + list roundtrip fiel (Inv. 26: audit nao mente)', () => {
    const e = makeAuditEvent();
    storage.repos.audit.record(e);
    expect(storage.repos.audit.list()).toEqual([e]);
  });

  it('campos opcionais ausentes (resource/decision/details) fazem roundtrip', () => {
    const e = makeAuditEvent();
    delete e.resource;
    delete e.decision;
    delete e.details;
    storage.repos.audit.record(e);
    const got = storage.repos.audit.list();
    expect(got).toHaveLength(1);
    expect(got[0]?.resource).toBeUndefined();
    expect(got[0]?.decision).toBeUndefined();
    expect(got[0]?.details).toBeUndefined();
  });

  it('list filtra por result (allow E deny auditados, SPEC §3)', () => {
    storage.repos.audit.record(makeAuditEvent({ result: 'SUCCESS' }));
    storage.repos.audit.record(makeAuditEvent({ result: 'FAILED', decision: 'DENY' }));
    const failed = storage.repos.audit.list({ result: 'FAILED' });
    expect(failed).toHaveLength(1);
    expect(failed[0]?.decision).toBe('DENY');
  });
});

describe('PISnapshotRepository', () => {
  it('save + latest roundtrip do model_json (Record<string, unknown>)', () => {
    const model = { stack: { framework: 'react', confidence: 'CONFIRMED' }, roots: ['src'] };
    storage.repos.piSnapshots.save('p-1', model, '1.0.0');
    const snap = storage.repos.piSnapshots.latest('p-1');
    expect(snap?.projectId).toBe('p-1');
    expect(snap?.model).toEqual(model);
    expect(snap?.analysisVersion).toBe('1.0.0');
    expect(typeof snap?.analyzedAt).toBe('string');
  });

  it('latest retorna o snapshot mais recente do projeto', () => {
    storage.repos.piSnapshots.save('p-1', { v: 1 }, '1.0.0');
    storage.repos.piSnapshots.save('p-1', { v: 2 }, '1.0.1');
    storage.repos.piSnapshots.save('p-2', { v: 99 }, '1.0.0');
    expect(storage.repos.piSnapshots.latest('p-1')?.model).toEqual({ v: 2 });
  });

  it('latest de projeto sem snapshot -> null', () => {
    expect(storage.repos.piSnapshots.latest('ghost')).toBeNull();
  });
});


describe('MediaAssetRepository (M3 — doc 08§42, D10)', () => {
  function makeAsset(overrides: Partial<MediaAssetRecord> = {}): MediaAssetRecord {
    return {
      id: crypto.randomUUID(),
      projectId: 'p-1',
      name: 'hero.png',
      type: 'Image',
      identity: { id: 'x', type: 'Image', source: { origin: 'UploadedFile', path: 'src/assets/hero.png' } },
      createdAt: iso(),
      updatedAt: iso(),
      ...overrides,
    };
  }

  it('upsert + getById roundtrip da identity_json', () => {
    const asset = makeAsset();
    storage.repos.mediaAssets.upsert(asset);
    const got = storage.repos.mediaAssets.getById(asset.id);
    expect(got).toEqual(asset);
  });

  it('upsert e idempotente por id (re-registro preserva id, atualiza updatedAt)', () => {
    const asset = makeAsset();
    storage.repos.mediaAssets.upsert(asset);
    const updated = { ...asset, name: 'hero-2.png', updatedAt: iso() };
    storage.repos.mediaAssets.upsert(updated);
    expect(storage.repos.mediaAssets.listByProject('p-1')).toHaveLength(1);
    expect(storage.repos.mediaAssets.getById(asset.id)?.name).toBe('hero-2.png');
  });

  it('listByProject filtra por projeto e ordena por created_at', () => {
    storage.repos.mediaAssets.upsert(makeAsset({ projectId: 'p-2' }));
    storage.repos.mediaAssets.upsert(makeAsset({ projectId: 'p-1' }));
    storage.repos.mediaAssets.upsert(makeAsset({ projectId: 'p-1' }));
    expect(storage.repos.mediaAssets.listByProject('p-1')).toHaveLength(2);
    expect(storage.repos.mediaAssets.listByProject('ghost')).toHaveLength(0);
  });

  it('remove retorna true/false conforme o registro existia', () => {
    const asset = makeAsset();
    storage.repos.mediaAssets.upsert(asset);
    expect(storage.repos.mediaAssets.remove(asset.id)).toBe(true);
    expect(storage.repos.mediaAssets.remove(asset.id)).toBe(false);
    expect(storage.repos.mediaAssets.getById(asset.id)).toBeNull();
  });
});
