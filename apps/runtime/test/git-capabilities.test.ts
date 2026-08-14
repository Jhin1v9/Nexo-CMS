/**
 * Testes das 11 capabilities git M2 no apps/runtime (doc 10, D3/D4/D5):
 * Control Plane REAL (createRuntime em tmpdir) + repositório git REAL em
 * tmpdir (git CLI, mesmo padrão de packages/git/test/helpers.ts).
 *
 * Cobertura:
 *  1. leituras (status/diff/history/branch.list) -> ALLOW -> ok com dados reais;
 *  2. mutações (commit/push/pull/fetch/branch.create/switch/delete) ->
 *     REQUIRE_APPROVAL no gate do Control Plane (short-circuit ANTES do handler);
 *  3. ator sem grants -> FORBIDDEN (DEFAULT DENY);
 *  4. discovery: 11 git.* com allowed ALLOW (leitura) / REQUIRE_APPROVAL (mutação);
 *  5. schema: commit sem message / files+all -> INVALID_INPUT; projeto
 *     inexistente -> NOT_FOUND;
 *  6. audit: eventos git.* de allow E de REQUIRE_APPROVAL/deny.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ExecutionContext } from '@nexo/core';
import { newOperationId } from '@nexo/shared';

import { createRuntime, LOCAL_ACTOR_ID, type RuntimeInstance } from '../src/index.js';

/** git real apenas para SETUP do fixture (fora da fronteira do executor). */
function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Repo temporário real: init -b main + identidade local + commit inicial. */
function createTempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nexo-git-cap-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.name', 'Nexo Test']);
  git(dir, ['config', 'user.email', 'nexo-test@example.com']);
  writeFileSync(join(dir, 'README.md'), '# temp repo\n');
  git(dir, ['add', '.']);
  git(dir, ['commit', '-q', '-m', 'initial commit']);
  return dir;
}

const LOCAL_ACTOR = { kind: 'CLI' as const, id: LOCAL_ACTOR_ID };
const STRANGER_ACTOR = { kind: 'CLI' as const, id: 'agent:stranger' };

function makeCtx(actor: { kind: 'CLI'; id: string }, projectId?: string): ExecutionContext {
  return {
    operationId: newOperationId(),
    initiatedBy: actor,
    executedBy: actor,
    ...(projectId !== undefined ? { projectId } : {}),
  };
}

interface GitStatusValue {
  isRepo: boolean;
  branch?: string | null;
  states: string[];
}

let workDir: string;
let repoDir: string;
let runtime: RuntimeInstance;
let projectId: string;

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'nexo-runtime-git-'));
  repoDir = createTempRepo();
  const created = createRuntime({ dataDir: join(workDir, 'nexo-home') });
  if (!created.ok) throw new Error(`bootstrap falhou: ${created.error.message}`);
  runtime = created.value;

  // Registro direto no storage (mesma fonte usada por project.import).
  const now = new Date().toISOString();
  projectId = newOperationId();
  runtime.storage.repos.projects.insert({
    id: projectId,
    name: 'git-cap-fixture',
    rootPath: repoDir,
    fingerprint: '0'.repeat(64),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
});

afterAll(() => {
  runtime.close();
  rmSync(workDir, { recursive: true, force: true });
  rmSync(repoDir, { recursive: true, force: true });
});

describe('capabilities git — leituras ALLOW com dados REAIS', () => {
  it('git.status -> ok, isRepo true, branch real (main), CLEAN', async () => {
    const r = await runtime.controlPlane.invoke<unknown, GitStatusValue>('git.status', { projectId }, makeCtx(LOCAL_ACTOR, projectId));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.isRepo).toBe(true);
    expect(r.value.branch).toBe('main');
    expect(r.value.states).toContain('CLEAN');
  });

  it('git.status reflete mudança real no working tree (MODIFIED)', async () => {
    writeFileSync(join(repoDir, 'README.md'), '# temp repo\nmudança real\n');
    const r = await runtime.controlPlane.invoke<unknown, GitStatusValue>('git.status', { projectId }, makeCtx(LOCAL_ACTOR, projectId));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.states).toContain('MODIFIED');
  });

  it('git.diff -> ok com diff real contendo a mudança', async () => {
    const r = await runtime.controlPlane.invoke<unknown, { mode: string; diff: string; files: { path: string }[] }>(
      'git.diff',
      { projectId },
      makeCtx(LOCAL_ACTOR, projectId),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.mode).toBe('WORKTREE_VS_HEAD');
    expect(r.value.diff).toContain('mudança real');
    expect(r.value.files.some((f) => f.path === 'README.md')).toBe(true);
  });

  it('git.history -> ok com o commit inicial real', async () => {
    const r = await runtime.controlPlane.invoke<unknown, { hash: string; message: string; authorName: string }[]>(
      'git.history',
      { projectId },
      makeCtx(LOCAL_ACTOR, projectId),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(1);
    expect(r.value[0]!.message).toContain('initial commit');
    expect(r.value[0]!.hash).toMatch(/^[0-9a-f]{40}$/);
  });

  it('git.branch.list -> ok com branch main atual', async () => {
    const r = await runtime.controlPlane.invoke<unknown, { name: string; current: boolean }[]>(
      'git.branch.list',
      { projectId },
      makeCtx(LOCAL_ACTOR, projectId),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.some((b) => b.name === 'main' && b.current)).toBe(true);
  });
});

describe('capabilities git — mutações exigem aprovação (gate do Control Plane)', () => {
  const mutations: { id: string; input: (pid: string) => Record<string, unknown> }[] = [
    { id: 'git.commit', input: (pid) => ({ projectId: pid, message: 'feat: x' }) },
    { id: 'git.push', input: (pid) => ({ projectId: pid }) },
    { id: 'git.pull', input: (pid) => ({ projectId: pid }) },
    { id: 'git.fetch', input: (pid) => ({ projectId: pid }) },
    { id: 'git.branch.create', input: (pid) => ({ projectId: pid, name: 'feature-x' }) },
    { id: 'git.branch.switch', input: (pid) => ({ projectId: pid, name: 'main' }) },
    { id: 'git.branch.delete', input: (pid) => ({ projectId: pid, name: 'feature-x' }) },
  ];

  for (const m of mutations) {
    it(`${m.id} -> REQUIRE_APPROVAL (requiresApproval, requiredCapability) e NADA executa`, async () => {
      const branchesBefore = git(repoDir, ['branch', '--format=%(refname:short)']);
      const headBefore = git(repoDir, ['rev-parse', 'HEAD']);
      const r = await runtime.controlPlane.invoke(m.id, m.input(projectId), makeCtx(LOCAL_ACTOR, projectId));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe('REQUIRE_APPROVAL');
      expect(r.error.requiresApproval).toBe(true);
      expect(r.error.requiredCapability).toBe(m.id);
      // prova de short-circuit: o repositório não mudou em nada
      expect(git(repoDir, ['rev-parse', 'HEAD'])).toBe(headBefore);
      expect(git(repoDir, ['branch', '--format=%(refname:short)'])).toBe(branchesBefore);
    });
  }
});

describe('capabilities git — autorização, schema e audit', () => {
  it("ator sem grants ('agent:stranger') -> FORBIDDEN em git.status (DEFAULT DENY)", async () => {
    const r = await runtime.controlPlane.invoke('git.status', { projectId }, makeCtx(STRANGER_ACTOR, projectId));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('FORBIDDEN');
  });

  it('discovery mostra as 11 git.*: ALLOW (leitura) / REQUIRE_APPROVAL (mutação) para o ator local', () => {
    const caps = runtime.controlPlane.discover(makeCtx(LOCAL_ACTOR)).filter((c) => c.id.startsWith('git.'));
    expect(caps.map((c) => c.id).sort()).toEqual([
      'git.branch.create',
      'git.branch.delete',
      'git.branch.list',
      'git.branch.switch',
      'git.commit',
      'git.diff',
      'git.fetch',
      'git.history',
      'git.pull',
      'git.push',
      'git.status',
    ]);
    const byId = new Map(caps.map((c) => [c.id, c]));
    for (const id of ['git.status', 'git.diff', 'git.history', 'git.branch.list']) {
      expect(byId.get(id)?.allowed).toBe('ALLOW');
      expect(byId.get(id)?.risk).toBe('SAFE');
    }
    for (const id of ['git.branch.create', 'git.branch.switch', 'git.branch.delete', 'git.commit', 'git.push', 'git.pull', 'git.fetch']) {
      expect(byId.get(id)?.allowed).toBe('REQUIRE_APPROVAL');
      expect(byId.get(id)?.risk).toBe('DESTRUCTIVE');
    }
  });

  it('permissões reservadas D3 (git.forcePush etc.) NÃO existem: NOT_FOUND no invoke', async () => {
    for (const id of ['git.forcePush', 'git.resetHard', 'git.branch.deleteForce']) {
      const r = await runtime.controlPlane.invoke(id, { projectId }, makeCtx(LOCAL_ACTOR, projectId));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe('NOT_FOUND'); // sem capability -> nunca executa
    }
  });

  it('git.commit sem message -> INVALID_INPUT (gate zod)', async () => {
    const r = await runtime.controlPlane.invoke('git.commit', { projectId }, makeCtx(LOCAL_ACTOR, projectId));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('git.commit com files + all juntos -> INVALID_INPUT (mutuamente exclusivos, D5)', async () => {
    const r = await runtime.controlPlane.invoke(
      'git.commit',
      { projectId, message: 'x', files: ['README.md'], all: true },
      makeCtx(LOCAL_ACTOR, projectId),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('projeto inexistente -> NOT_FOUND estruturado', async () => {
    const r = await runtime.controlPlane.invoke('git.status', { projectId: 'nope' }, makeCtx(LOCAL_ACTOR, 'nope'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
    expect(r.error.resource).toBe('nope');
  });

  it('audit contém eventos git.* de ALLOW (leitura) E de REQUIRE_APPROVAL/DENY', () => {
    const events = runtime.storage.repos.audit.list();
    const allows = events.filter((e) => e.decision === 'ALLOW' && e.result === 'SUCCESS');
    const approvals = events.filter((e) => e.decision === 'REQUIRE_APPROVAL');
    const denies = events.filter((e) => e.decision === 'DENY' && e.result === 'FAILED');

    // invoke das leituras registrado no Control Plane
    expect(allows.some((e) => e.what === 'git.status')).toBe(true);
    expect(allows.some((e) => e.what === 'git.diff')).toBe(true);
    // gate de mutação auditado
    expect(approvals.some((e) => e.what === 'git.commit')).toBe(true);
    expect(approvals.some((e) => e.what === 'git.push')).toBe(true);
    // executor auditou processos git reais (allow de leitura) e o authorize do
    // PolicyEngine registra deny/approval (what 'authorize:<permission>')
    expect(denies.some((e) => e.what === 'authorize:git.status' || e.what === 'git.status')).toBe(true);
  });
});
