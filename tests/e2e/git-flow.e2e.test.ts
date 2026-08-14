/**
 * Wave 3 (M2) — E2E do fluxo Git via HTTP (doc 10, decisões D3/D4/D5).
 *
 * Verificação INDEPENDENTE (No Fake Validation): apps/runtime REAL em porta
 * efêmera com NEXO_HOME em tmpdir + repositório git REAL (git CLI) + fetch
 * puro — sem mocks, sem browser.
 *
 * Cobertura:
 *  fluxo: health -> project.import -> capabilities (11 git.*) -> git.status/
 *  diff/history/branch.list com dados reais -> mutações (commit/push/pull/
 *  fetch/branch.create/switch/delete) -> 422 REQUIRE_APPROVAL no gate ->
 *  ator ausente/desconhecido -> 403 -> audit trail persistido.
 *  security probes: path traversal em git.diff, branch name '--help',
 *  metacaracteres de shell em commit message (gate antes de qualquer
 *  execução), JSON malformado, capability inexistente (git.rebase).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// dep: @hono/node-server — servidor real em porta efêmera (SPEC §11: sem Playwright).
import { serve, type ServerType } from '@hono/node-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createStorage } from '@nexo/storage';

import { createRuntime, type RuntimeInstance } from '../../apps/runtime/src/index.js';

interface NexoErrorJson {
  code: string;
  message: string;
  retryable: boolean;
  requiresApproval?: boolean;
  requiredCapability?: string;
  details?: Record<string, unknown>;
}
interface ApiResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: NexoErrorJson;
}
interface ProjectJson {
  id: string;
  name: string;
  rootPath: string;
  fingerprint: string;
  status: string;
}
interface GitStatusJson {
  isRepo: boolean;
  branch?: string | null;
  head?: string | null;
  states: string[];
  remoteState?: string;
}

/** git real apenas para SETUP/verificação do fixture (fora do runtime). */
function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

let workDir: string;
let repoDir: string;
let nexoHome: string;
let runtime: RuntimeInstance;
let server: ServerType;
let base: string;
let projectId: string;

/** Cliente legítimo envia x-nexo-actor explicitamente; `actor: null` omite. */
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
  workDir = mkdtempSync(join(tmpdir(), 'nexo-git-e2e-'));
  // Repositório git REAL com commit inicial (doc 10 §82: nunca repo fingido).
  repoDir = join(workDir, 'repo');
  execFileSync('git', ['init', '-q', '-b', 'main', repoDir]);
  git(repoDir, ['config', 'user.name', 'Nexo E2E']);
  git(repoDir, ['config', 'user.email', 'nexo-e2e@example.com']);
  writeFileSync(join(repoDir, 'README.md'), '# e2e repo\n');
  git(repoDir, ['add', '.']);
  git(repoDir, ['commit', '-q', '-m', 'initial commit']);

  nexoHome = join(workDir, 'nexo-home');
  process.env['NEXO_HOME'] = nexoHome;
  const created = createRuntime(); // sem dataDir: prova que NEXO_HOME é honrado
  if (!created.ok) throw new Error(`bootstrap falhou: ${created.error.message}`);
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

describe('git flow M2 — servidor real + fetch puro', () => {
  it('GET /v1/health -> 200 {status:ok}', async () => {
    const res = await fetch(`${base}/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  it('project.import do repo git real -> 200', async () => {
    const { status, body } = await invoke<{ project: ProjectJson }>('project.import', { rootPath: repoDir });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    projectId = body.value!.project.id;
    expect(body.value!.project.rootPath).toBe(repoDir);
  });

  it('GET /v1/capabilities -> contém as 11 git.* com allowed correto', async () => {
    const { status, body } = await api<{ capabilities: { id: string; allowed: string; risk: string }[] }>(
      'GET',
      '/v1/capabilities',
    );
    expect(status).toBe(200);
    const gitCaps = body.value!.capabilities.filter((c) => c.id.startsWith('git.'));
    expect(gitCaps.map((c) => c.id).sort()).toEqual([
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
    const byId = new Map(gitCaps.map((c) => [c.id, c]));
    for (const id of ['git.status', 'git.diff', 'git.history', 'git.branch.list']) {
      expect(byId.get(id)!.allowed).toBe('ALLOW');
      expect(byId.get(id)!.risk).toBe('SAFE');
    }
    for (const id of ['git.branch.create', 'git.branch.switch', 'git.branch.delete', 'git.commit', 'git.push', 'git.pull', 'git.fetch']) {
      expect(byId.get(id)!.allowed).toBe('REQUIRE_APPROVAL');
      expect(byId.get(id)!.risk).toBe('DESTRUCTIVE');
    }
  });

  it('git.status -> 200, branch real, states contém CLEAN', async () => {
    const { status, body } = await invoke<GitStatusJson>('git.status', { projectId });
    expect(status).toBe(200);
    expect(body.value!.isRepo).toBe(true);
    expect(body.value!.branch).toBe('main');
    expect(body.value!.head).toMatch(/^[0-9a-f]{40}$/);
    expect(body.value!.states).toContain('CLEAN');
  });

  it('modificar arquivo -> git.status MODIFIED; git.diff com a mudança; git.history com o commit inicial', async () => {
    writeFileSync(join(repoDir, 'README.md'), '# e2e repo\nmudança e2e real\n');

    const st = await invoke<GitStatusJson>('git.status', { projectId });
    expect(st.status).toBe(200);
    expect(st.body.value!.states).toContain('MODIFIED');

    const diff = await invoke<{ mode: string; diff: string; files: { path: string; additions: number; deletions: number }[] }>(
      'git.diff',
      { projectId },
    );
    expect(diff.status).toBe(200);
    expect(diff.body.value!.diff).toContain('mudança e2e real');
    expect(diff.body.value!.files.some((f) => f.path === 'README.md')).toBe(true);

    const hist = await invoke<{ hash: string; message: string }[]>('git.history', { projectId });
    expect(hist.status).toBe(200);
    expect(hist.body.value!.some((e) => e.message.includes('initial commit'))).toBe(true);
  });

  it('git.branch.list -> 200 com main atual', async () => {
    const { status, body } = await invoke<{ name: string; current: boolean }[]>('git.branch.list', { projectId });
    expect(status).toBe(200);
    expect(body.value!.some((b) => b.name === 'main' && b.current)).toBe(true);
  });

  it('mutações git -> 422 REQUIRE_APPROVAL no gate e NADA executa', async () => {
    const headBefore = git(repoDir, ['rev-parse', 'HEAD']);
    const branchesBefore = git(repoDir, ['branch', '--format=%(refname:short)']);
    const mutations: [string, Record<string, unknown>][] = [
      ['git.commit', { projectId, message: 'feat: deveria ser bloqueado', all: true }],
      ['git.push', { projectId }],
      ['git.pull', { projectId }],
      ['git.fetch', { projectId }],
      ['git.branch.create', { projectId, name: 'feature-bloqueada' }],
      ['git.branch.switch', { projectId, name: 'main' }],
      ['git.branch.delete', { projectId, name: 'main' }],
    ];
    for (const [id, input] of mutations) {
      const { status, body } = await invoke(id, input);
      expect(status, `${id} deve ser 422`).toBe(422);
      expect(body.error!.code).toBe('REQUIRE_APPROVAL');
      expect(body.error!.requiresApproval).toBe(true);
      expect(body.error!.requiredCapability).toBe(id);
    }
    // prova de short-circuit: HEAD e branches intactos, mudança NÃO commitada
    expect(git(repoDir, ['rev-parse', 'HEAD'])).toBe(headBefore);
    expect(git(repoDir, ['branch', '--format=%(refname:short)'])).toBe(branchesBefore);
    expect(git(repoDir, ['status', '--porcelain'])).toContain('M README.md');
  });

  it('SEM header x-nexo-actor -> git.status 403 FORBIDDEN (fail-closed)', async () => {
    const { status, body } = await invoke('git.status', { projectId }, null);
    expect(status).toBe(403);
    expect(body.error!.code).toBe('FORBIDDEN');
  });

  it("ator desconhecido 'agent:stranger' -> 403 FORBIDDEN em git.status", async () => {
    const { status, body } = await invoke('git.status', { projectId }, 'agent:stranger');
    expect(status).toBe(403);
    expect(body.error!.code).toBe('FORBIDDEN');
  });

  it('audit trail persistido contém eventos git.* (allow E REQUIRE_APPROVAL/deny)', async () => {
    const second = createStorage(nexoHome); // conexão NOVA ao mesmo DB
    expect(second.ok).toBe(true);
    const events = second.ok ? second.value.repos.audit.list() : [];
    if (second.ok) second.value.close();

    const gitEvents = events.filter((e) => e.what.startsWith('git.') || e.what.startsWith('authorize:git.'));
    expect(gitEvents.length).toBeGreaterThan(0);
    // invokes ALLOW das leituras
    expect(events.some((e) => e.what === 'git.status' && e.decision === 'ALLOW' && e.result === 'SUCCESS')).toBe(true);
    // gates REQUIRE_APPROVAL das mutações
    expect(events.some((e) => e.what === 'git.commit' && e.decision === 'REQUIRE_APPROVAL')).toBe(true);
    expect(events.some((e) => e.what === 'git.push' && e.decision === 'REQUIRE_APPROVAL')).toBe(true);
    // denies (FORBIDDEN dos probes de ator)
    expect(events.some((e) => e.what === 'git.status' && e.decision === 'DENY')).toBe(true);
  });
});

describe('git security probes (tentativa de REFUTAR o sistema)', () => {
  it("probe: git.diff path '../../etc/passwd' -> erro estruturado, NUNCA conteúdo de /etc/passwd", async () => {
    const { status, body } = await invoke<{ diff?: string }>('git.diff', { projectId, path: '../../etc/passwd' });
    // validateRepoPath do @nexo/git rejeita com INVALID_INPUT (defesa em
    // profundidade; a contenção real é o allowedRoot do executor).
    expect([400, 403]).toContain(status);
    expect(body.ok).toBe(false);
    expect(JSON.stringify(body)).not.toContain('root:');
  });

  it("probe: git.branch.create name '--help' -> 422 no gate ANTES de executar (repo intacto)", async () => {
    const branchesBefore = git(repoDir, ['branch', '--format=%(refname:short)']);
    const { status, body } = await invoke('git.branch.create', { projectId, name: '--help' });
    expect(status).toBe(422);
    expect(body.error!.code).toBe('REQUIRE_APPROVAL'); // gate venceu, não o git
    expect(git(repoDir, ['branch', '--format=%(refname:short)'])).toBe(branchesBefore); // nada executou
  });

  it('probe: git.commit com metacaracteres de shell na message -> 422 no gate, NADA criado', async () => {
    const sentinel = join(workDir, 'pwned');
    const { status, body } = await invoke('git.commit', {
      projectId,
      message: `x; touch ${sentinel}`,
      all: true,
    });
    expect(status).toBe(422);
    expect(body.error!.code).toBe('REQUIRE_APPROVAL');
    expect(existsSync(sentinel)).toBe(false); // PROVA: nenhum metacaractere executou
    expect(git(repoDir, ['status', '--porcelain'])).toContain('M README.md'); // nada commitado
  });

  it('probe: body JSON malformado -> 400 INVALID_INPUT', async () => {
    const res = await fetch(`${base}/v1/capabilities/git.status/invoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nexo-actor': 'cli:local' },
      body: '{not-json',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiResult;
    expect(body.error!.code).toBe('INVALID_INPUT');
  });

  it("probe: capability inexistente 'git.rebase' -> 404 NOT_FOUND", async () => {
    const { status, body } = await invoke('git.rebase', { projectId });
    expect(status).toBe(404);
    expect(body.error!.code).toBe('NOT_FOUND');
  });
});
