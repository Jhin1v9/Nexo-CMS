/**
 * Integration test do apps/runtime (SPEC.md §9/§11): servidor REAL em porta
 * efêmera (0) + fetch nativo — sem mocks, sem Playwright.
 *
 * Fluxo validado (M1 proof): import de fixture real -> open -> list ->
 * filesystem.read -> command.execute `git status` num repo tmp registrado ->
 * deny de comando BLOCKED -> REQUIRE_APPROVAL de RESTRICTED -> STALE_CONTEXT
 * após modificar package.json da CÓPIA do fixture -> refresh resolve.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// dep: @hono/node-server — servidor real em porta efêmera para o integration test.
import { serve, type ServerType } from '@hono/node-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRuntime, type RuntimeInstance } from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
// Fixture versionado de @nexo/intelligence, copiado para tmpdir (o teste de
// STALE_CONTEXT modifica o package.json — nunca mutar o fixture versionado).
const FIXTURE = join(HERE, '../../../packages/intelligence/test/fixtures/react-vite-tailwind');

interface ApiResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: { code: string; message: string; retryable: boolean; requiresApproval?: boolean; details?: Record<string, unknown> };
}

let workDir: string;
let runtime: RuntimeInstance;
let server: ServerType;
let base: string;

/**
 * Wave 5 (FIX 2): clientes legítimos enviam `x-nexo-actor` EXPLICITAMENTE
 * (default 'cli:local'); `actor: null` omite o header (cenário anonymous).
 */
async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  actor: string | null = 'cli:local',
): Promise<{ status: number; body: ApiResult<T> }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (actor !== null) headers['x-nexo-actor'] = actor;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as ApiResult<T> };
}

const invoke = <T = unknown>(id: string, input: unknown, actor: string | null = 'cli:local') =>
  api<T>('POST', `/v1/capabilities/${id}/invoke`, input, actor);

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'nexo-runtime-test-'));
  const created = createRuntime({ dataDir: join(workDir, 'nexo-home') });
  if (!created.ok) throw new Error(`storage indisponível: ${created.error.message}`);
  runtime = created.value;
  server = serve({ fetch: runtime.app.fetch, hostname: '127.0.0.1', port: 0 });
  await new Promise<void>((resolveListen) => server.on('listening', resolveListen));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('sem porta efêmera');
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.close();
  runtime.close();
  rmSync(workDir, { recursive: true, force: true });
});

describe('agent api M1 (servidor real + fetch)', () => {
  it('GET /v1/health -> ok + version', async () => {
    const res = await fetch(`${base}/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /v1/capabilities -> 8 capabilities M1, ALLOW para o ator local default', async () => {
    const { status, body } = api ? await api<{ capabilities: { id: string; allowed: string }[] }>('GET', '/v1/capabilities') : null!;
    expect(status).toBe(200);
    const caps = body.value!.capabilities;
    const ids = caps.map((c) => c.id).sort();
    expect(ids).toEqual([
      'project.import',
      'project.list',
      'project.open',
      'project.read',
      'project.refresh',
      'runtime.command.execute',
      'runtime.filesystem.list',
      'runtime.filesystem.read',
    ]);
    for (const c of caps) expect(c.allowed).toBe('ALLOW');
  });

  it('GET /v1/capabilities com ator desconhecido -> DEFAULT DENY', async () => {
    const res = await fetch(`${base}/v1/capabilities`, { headers: { 'x-nexo-actor': 'stranger' } });
    const body = (await res.json()) as ApiResult<{ capabilities: { allowed: string }[] }>;
    expect(res.status).toBe(200);
    for (const c of body.value!.capabilities) expect(c.allowed).toBe('DENY');
  });

  // ---- Wave 5 (FIX 2): ator default fail-closed ----------------------------
  it('SEM header x-nexo-actor -> anonymous:unknown (DEFAULT DENY), NUNCA cli:local', async () => {
    // Discovery: DENY em tudo (fail-closed; antes do fix caía em cli:local = ALLOW).
    const discovery = await api<{ capabilities: { allowed: string }[] }>('GET', '/v1/capabilities', undefined, null);
    expect(discovery.status).toBe(200);
    for (const c of discovery.body.value!.capabilities) expect(c.allowed).toBe('DENY');

    // Invoke: FORBIDDEN.
    const inv = await invoke('project.list', {}, null);
    expect(inv.status).toBe(403);
    expect(inv.body.error?.code).toBe('FORBIDDEN');
  });

  it('header x-nexo-actor VAZIO -> anonymous:unknown (DEFAULT DENY)', async () => {
    const discovery = await api<{ capabilities: { allowed: string }[] }>('GET', '/v1/capabilities', undefined, '');
    for (const c of discovery.body.value!.capabilities) expect(c.allowed).toBe('DENY');
    const inv = await invoke('project.list', {}, '');
    expect(inv.status).toBe(403);
    expect(inv.body.error?.code).toBe('FORBIDDEN');
  });

  it('header x-nexo-actor: cli:local explícito -> ALLOW (ator local com grants)', async () => {
    const inv = await invoke<{ projects: unknown[] }>('project.list', {}, 'cli:local');
    expect(inv.status).toBe(200);
    expect(Array.isArray(inv.body.value?.projects)).toBe(true);
    // Ator arbitrário via header (equivale a NEXO_ACTOR=outro na CLI) -> DENY.
    const foreign = await invoke('project.list', {}, 'outro');
    expect(foreign.status).toBe(403);
    expect(foreign.body.error?.code).toBe('FORBIDDEN');
  });

  it('invoke de capability inexistente -> 404 NOT_FOUND', async () => {
    const { status, body } = await invoke('project.nope', {});
    expect(status).toBe(404);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('invoke com input inválido -> 400 INVALID_INPUT com issues', async () => {
    const { status, body } = await invoke('project.import', { rootPath: 123 });
    expect(status).toBe(400);
    expect(body.error?.code).toBe('INVALID_INPUT');
    expect(Array.isArray(body.error?.details?.['issues'])).toBe(true);
  });

  it('invoke com ator sem grant -> 403 FORBIDDEN sem executar', async () => {
    const res = await fetch(`${base}/v1/capabilities/project.list/invoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nexo-actor': 'stranger' },
      body: '{}',
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as ApiResult;
    expect(body.error?.code).toBe('FORBIDDEN');
  });

  describe('fluxo project.* + runtime.* sobre fixtures reais', () => {
    let fixtureCopy: string;
    let projectId: string;

    it('project.import da cópia do fixture react-vite-tailwind -> model real detectado', async () => {
      fixtureCopy = join(workDir, 'fixture-react');
      cpSync(FIXTURE, fixtureCopy, { recursive: true });

      const { status, body } = await invoke<{
        project: { id: string; rootPath: string; fingerprint: string };
        model: { technologies: { technology: string }[]; support: string };
        alreadyRegistered: boolean;
      }>('project.import', { rootPath: fixtureCopy });

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      const v = body.value!;
      expect(v.alreadyRegistered).toBe(false);
      expect(v.project.rootPath).toBe(fixtureCopy);
      expect(v.project.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      const techs = v.model.technologies.map((t) => t.technology);
      expect(techs).toContain('react');
      expect(techs).toContain('tailwind');
      projectId = v.project.id;
    });

    it('reimport do mesmo path -> alreadyRegistered:true, MESMO id estável', async () => {
      const { body } = await invoke<{ project: { id: string }; alreadyRegistered: boolean }>(
        'project.import',
        { rootPath: fixtureCopy },
      );
      expect(body.value?.alreadyRegistered).toBe(true);
      expect(body.value?.project.id).toBe(projectId);
    });

    it('project.open -> registration + snapshot persistido', async () => {
      const { status, body } = await invoke<{
        project: { id: string };
        model: Record<string, unknown>;
        analyzedAt: string;
      }>('project.open', { projectId });
      expect(status).toBe(200);
      expect(body.value?.project.id).toBe(projectId);
      expect(body.value?.model['projectId']).toBe(projectId);
    });

    it('project.list -> contém o projeto importado', async () => {
      const { body } = await invoke<{ projects: { id: string }[] }>('project.list', {});
      expect(body.value?.projects.some((p) => p.id === projectId)).toBe(true);
    });

    it('runtime.filesystem.read lê package.json do fixture (scoped)', async () => {
      const { status, body } = await invoke<{ content: string }>('runtime.filesystem.read', {
        projectId,
        path: 'package.json',
      });
      expect(status).toBe(200);
      expect(body.value?.content).toContain('react');
    });

    it('runtime.filesystem.read com escape ../ -> 403 SCOPE_VIOLATION', async () => {
      const { status, body } = await invoke('runtime.filesystem.read', {
        projectId,
        path: '../../../../etc/passwd',
      });
      expect(status).toBe(403);
      expect(body.error?.code).toBe('SCOPE_VIOLATION');
    });

    it('runtime.filesystem.list lista o root do projeto', async () => {
      const { status, body } = await invoke<{ entries: { name: string }[] }>('runtime.filesystem.list', {
        projectId,
      });
      expect(status).toBe(200);
      const names = body.value!.entries.map((e) => e.name);
      expect(names).toContain('package.json');
      expect(names).toContain('src');
    });

    it('STALE_CONTEXT: modificar package.json -> open falha com retryable + hint; refresh resolve', async () => {
      writeFileSync(
        join(fixtureCopy, 'package.json'),
        JSON.stringify({ name: 'fixture-react', dependencies: { react: '^19.0.0', axios: '^1.7.0' } }, null, 2),
      );

      const stale = await invoke('project.open', { projectId });
      expect(stale.status).toBe(409);
      expect(stale.body.error?.code).toBe('STALE_CONTEXT');
      expect(stale.body.error?.retryable).toBe(true);
      expect(String(stale.body.error?.details?.['hint'])).toContain('project.refresh');

      const refresh = await invoke('project.refresh', { projectId });
      expect(refresh.status).toBe(200);

      const open = await invoke('project.open', { projectId });
      expect(open.status).toBe(200);
    });

    it('runtime.command.execute `git status` num repo tmp registrado -> exitCode 0 real', async () => {
      const gitProj = join(workDir, 'git-proj');
      cpSync(FIXTURE, gitProj, { recursive: true });
      execFileSync('git', ['init', '-q'], { cwd: gitProj });

      const imported = await invoke<{ project: { id: string } }>('project.import', { rootPath: gitProj });
      const gitProjectId = imported.body.value!.project.id;

      const { status, body } = await invoke<{
        exitCode: number | null;
        stdout: string;
        classification: string;
        timedOut: boolean;
      }>('runtime.command.execute', { projectId: gitProjectId, command: 'git', args: ['status'] });

      expect(status).toBe(200);
      expect(body.value?.classification).toBe('SAFE');
      expect(body.value?.exitCode).toBe(0);
      expect(body.value?.timedOut).toBe(false);
      expect(body.value?.stdout).toContain('branch');
    });

    it('runtime.command.execute BLOCKED (sudo) -> 403 COMMAND_BLOCKED, nunca executa', async () => {
      const { status, body } = await invoke('runtime.command.execute', {
        projectId,
        command: 'sudo',
        args: ['ls'],
      });
      expect(status).toBe(403);
      expect(body.error?.code).toBe('COMMAND_BLOCKED');
    });

    it('runtime.command.execute RESTRICTED (touch) -> 422 REQUIRE_APPROVAL via política', async () => {
      const { status, body } = await invoke('runtime.command.execute', {
        projectId,
        command: 'touch',
        args: ['should-not-exist.txt'],
      });
      expect(status).toBe(422);
      expect(body.error?.code).toBe('REQUIRE_APPROVAL');
      expect(body.error?.requiresApproval).toBe(true);
    });

    // ---- Wave 5 (FIX 1 — HIGH): scope escape via args de comandos SAFE ----
    it('runtime.command.execute `cat /etc/passwd` (SAFE) -> 403 SCOPE_VIOLATION, nada vaza', async () => {
      const { status, body } = await invoke('runtime.command.execute', {
        projectId,
        command: 'cat',
        args: ['/etc/passwd'],
      });
      expect(status).toBe(403);
      expect(body.error?.code).toBe('SCOPE_VIOLATION');
    });

    it('runtime.command.execute SAFE com arg não analisável (~) -> 422 REQUIRE_APPROVAL', async () => {
      const { status, body } = await invoke('runtime.command.execute', {
        projectId,
        command: 'cat',
        args: ['~/secret'],
      });
      expect(status).toBe(422);
      expect(body.error?.code).toBe('REQUIRE_APPROVAL');
      expect(body.error?.requiresApproval).toBe(true);
    });

    it('runtime.command.execute `cat package.json` (dentro do root) -> 200 conteúdo real', async () => {
      const { status, body } = await invoke<{ exitCode: number | null; stdout: string }>(
        'runtime.command.execute',
        { projectId, command: 'cat', args: ['package.json'] },
      );
      expect(status).toBe(200);
      expect(body.value?.exitCode).toBe(0);
      expect(body.value?.stdout).toContain('react'); // conteúdo REAL do projeto
    });

    it('runtime.command.execute com projectId inexistente -> 404 NOT_FOUND', async () => {
      const { status, body } = await invoke('runtime.command.execute', {
        projectId: 'nope',
        command: 'git',
        args: ['status'],
      });
      expect(status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('audit trail contém as invocações (allow E deny) — Inv. 26', async () => {
      const allows = runtime.storage.repos.audit.list({ result: 'SUCCESS' });
      const denies = runtime.storage.repos.audit.list({ result: 'FAILED' });
      expect(allows.some((e) => e.what === 'project.import')).toBe(true);
      expect(allows.some((e) => e.what === 'runtime.command.execute')).toBe(true);
      // deny: COMMAND_BLOCKED (executor) e/ou FORBIDDEN do ator 'stranger'
      expect(denies.length).toBeGreaterThan(0);
      expect(denies.some((e) => e.what === 'runtime.command.execute' || e.what === 'project.list')).toBe(true);
    });
  });
});
