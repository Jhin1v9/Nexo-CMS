/**
 * Smoke tests da CLI (SPEC.md §10): parsing de argv (util.parseArgs) + fluxo
 * run() com client injetado — SEM spawnar servidor (o integration test real
 * do Agent API vive em apps/runtime/test/server.test.ts).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { CliUsageError, parseCliArgs } from '../src/args.js';
import { createNexoClient, type NexoClient } from '../src/client.js';
import { run, type RunIo } from '../src/run.js';

describe('parseCliArgs (smoke)', () => {
  it('capabilities default (humano) e --json', () => {
    expect(parseCliArgs(['capabilities'])).toEqual({ kind: 'capabilities', json: false });
    expect(parseCliArgs(['capabilities', '--json'])).toEqual({ kind: 'capabilities', json: true });
  });

  it('project import/open/list', () => {
    expect(parseCliArgs(['project', 'import', '/tmp/x'])).toEqual({
      kind: 'project.import',
      path: '/tmp/x',
      json: false,
    });
    expect(parseCliArgs(['project', 'open', 'abc', '--json'])).toEqual({
      kind: 'project.open',
      projectId: 'abc',
      json: true,
    });
    expect(parseCliArgs(['project', 'list'])).toEqual({ kind: 'project.list', json: false });
  });

  it('runtime exec exige --project e separa cmd/args', () => {
    expect(parseCliArgs(['runtime', 'exec', '--project', 'p1', 'git', 'status', '--json'])).toEqual({
      kind: 'runtime.exec',
      projectId: 'p1',
      command: 'git',
      args: ['status'],
      json: true,
    });
    expect(() => parseCliArgs(['runtime', 'exec', 'git', 'status'])).toThrow(CliUsageError);
  });

  it('runtime exec --timeout numérico; inválido -> erro de uso', () => {
    expect(parseCliArgs(['runtime', 'exec', '--project', 'p1', '--timeout', '5000', 'ls'])).toMatchObject({
      timeoutMs: 5000,
    });
    expect(() => parseCliArgs(['runtime', 'exec', '--project', 'p1', '--timeout', 'x', 'ls'])).toThrow(
      CliUsageError,
    );
  });

  it('argv vazio/--help -> help; desconhecido -> CliUsageError', () => {
    expect(parseCliArgs([])).toEqual({ kind: 'help' });
    expect(parseCliArgs(['--help'])).toEqual({ kind: 'help' });
    expect(() => parseCliArgs(['frobnicate'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['project', 'import'])).toThrow(CliUsageError);
  });

  // Wave 5 (FIX 5): `pnpm start -- <args>` repassa '--' literal para o argv;
  // o '--' (terminador de opções do parseArgs) tornava TUDO depois dele
  // posicional, quebrando flags. Um '--' leading é removido antes do parse.
  it("leading '--' vazado por pnpm/npm run é removido (flags continuam parseadas)", () => {
    expect(parseCliArgs(['--', 'capabilities'])).toEqual({ kind: 'capabilities', json: false });
    expect(parseCliArgs(['--', 'capabilities', '--json'])).toEqual({ kind: 'capabilities', json: true });
    expect(parseCliArgs(['--', 'runtime', 'exec', '--project', 'p1', 'git', 'status'])).toEqual({
      kind: 'runtime.exec',
      projectId: 'p1',
      command: 'git',
      args: ['status'],
      json: false,
    });
    expect(parseCliArgs(['--', 'project', 'list'])).toEqual({ kind: 'project.list', json: false });
  });

  // ---- M2: comandos `nexo git *` (doc 10) -----------------------------------
  it('git status/diff/history — parsing de posicionais e flags', () => {
    expect(parseCliArgs(['git', 'status', 'p1'])).toEqual({ kind: 'git.status', projectId: 'p1', json: false });
    expect(parseCliArgs(['git', 'status', 'p1', '--json'])).toEqual({ kind: 'git.status', projectId: 'p1', json: true });
    expect(
      parseCliArgs(['git', 'diff', 'p1', '--mode', 'COMMITS', '--from', 'a1b2c3d', '--to', 'e4f5a6b', '--path', 'src/x.ts']),
    ).toEqual({ kind: 'git.diff', projectId: 'p1', mode: 'COMMITS', from: 'a1b2c3d', to: 'e4f5a6b', path: 'src/x.ts', json: false });
    expect(parseCliArgs(['git', 'history', 'p1', '--limit', '5', '--ref', 'main'])).toEqual({
      kind: 'git.history',
      projectId: 'p1',
      limit: 5,
      ref: 'main',
      json: false,
    });
    expect(() => parseCliArgs(['git', 'history', 'p1', '--limit', 'x'])).toThrow(CliUsageError);
  });

  it('git branch list/create/switch/delete — parsing', () => {
    expect(parseCliArgs(['git', 'branch', 'list', 'p1'])).toEqual({ kind: 'git.branch.list', projectId: 'p1', json: false });
    expect(parseCliArgs(['git', 'branch', 'create', 'p1', 'feat', '--start-point', 'main', '--checkout'])).toEqual({
      kind: 'git.branch.create',
      projectId: 'p1',
      name: 'feat',
      startPoint: 'main',
      checkout: true,
      json: false,
    });
    expect(parseCliArgs(['git', 'branch', 'switch', 'p1', 'feat'])).toEqual({
      kind: 'git.branch.switch',
      projectId: 'p1',
      name: 'feat',
      json: false,
    });
    expect(parseCliArgs(['git', 'branch', 'delete', 'p1', 'feat'])).toEqual({
      kind: 'git.branch.delete',
      projectId: 'p1',
      name: 'feat',
      json: false,
    });
    expect(() => parseCliArgs(['git', 'branch', 'switch', 'p1'])).toThrow(CliUsageError);
  });

  it('git commit — exige --message; --files csv; files+all mutuamente exclusivos (D5)', () => {
    expect(parseCliArgs(['git', 'commit', 'p1', '--message', 'feat: x', '--files', 'a.ts,b.ts'])).toEqual({
      kind: 'git.commit',
      projectId: 'p1',
      message: 'feat: x',
      files: ['a.ts', 'b.ts'],
      all: false,
      json: false,
    });
    expect(parseCliArgs(['git', 'commit', 'p1', '--message', 'm', '--all', '--expected-head', 'a1b2c3d'])).toEqual({
      kind: 'git.commit',
      projectId: 'p1',
      message: 'm',
      all: true,
      expectedHead: 'a1b2c3d',
      json: false,
    });
    expect(() => parseCliArgs(['git', 'commit', 'p1'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['git', 'commit', 'p1', '--message', 'm', '--files', 'a', '--all'])).toThrow(CliUsageError);
  });

  it('git push/pull/fetch — parsing de --remote/--branch', () => {
    expect(parseCliArgs(['git', 'push', 'p1'])).toEqual({ kind: 'git.push', projectId: 'p1', json: false });
    expect(parseCliArgs(['git', 'push', 'p1', '--remote', 'origin', '--branch', 'main'])).toEqual({
      kind: 'git.push',
      projectId: 'p1',
      remote: 'origin',
      branch: 'main',
      json: false,
    });
    expect(parseCliArgs(['git', 'pull', 'p1', '--remote', 'upstream'])).toEqual({
      kind: 'git.pull',
      projectId: 'p1',
      remote: 'upstream',
      json: false,
    });
    expect(parseCliArgs(['git', 'fetch', 'p1'])).toEqual({ kind: 'git.fetch', projectId: 'p1', json: false });
    expect(() => parseCliArgs(['git', 'rebase', 'p1'])).toThrow(CliUsageError); // capability reservada/ausente
  });
});

describe('run() com client injetado (sem servidor)', () => {
  function makeIo(): RunIo & { stdout: string; stderr: string } {
    const buf = { stdout: '', stderr: '' };
    return {
      ...buf,
      out: { write: (s: string) => (buf.stdout += s) },
      err: { write: (s: string) => (buf.stderr += s) },
      get stdout() {
        return buf.stdout;
      },
      get stderr() {
        return buf.stderr;
      },
    };
  }

  it('help -> exit 0 sem chamar o client', async () => {
    const io = makeIo();
    const code = await run([], io);
    expect(code).toBe(0);
    expect(io.stdout).toContain('nexo');
  });

  it('erro de uso -> exit 2 + stderr', async () => {
    const io = makeIo();
    const code = await run(['project', 'import'], io);
    expect(code).toBe(2);
    expect(io.stderr).toContain('uso inválido');
  });

  it('erro estruturado do runtime -> stderr + exit 1', async () => {
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async () => ({
        ok: false,
        error: { code: 'STALE_CONTEXT', message: 'mudou no disco', retryable: true },
      }),
    };
    const io = makeIo();
    const code = await run(['project', 'open', 'p1'], io, client);
    expect(code).toBe(1);
    expect(io.stderr).toContain('STALE_CONTEXT');
    expect(io.stdout).toBe('');
  });

  it('sucesso --json -> JSON puro do value em stdout', async () => {
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [{ id: 'project.list' }] } }),
      invoke: async <T,>() => ({ ok: true as const, value: {} as T }),
    };
    const io = makeIo();
    const code = await run(['capabilities', '--json'], io, client);
    expect(code).toBe(0);
    expect(JSON.parse(io.stdout)).toEqual({ capabilities: [{ id: 'project.list' }] });
  });

  // ---- M2: dispatch dos comandos git via client.invoke ----------------------
  it('git status -> client.invoke("git.status") e saída humana formatada', async () => {
    const calls: { id: string; input: unknown }[] = [];
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async <T,>(id: string, input: unknown) => {
        calls.push({ id, input });
        return {
          ok: true as const,
          value: {
            isRepo: true,
            branch: 'main',
            head: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
            detached: false,
            tracking: null,
            ahead: 0,
            behind: 0,
            staged: [],
            unstaged: [],
            untracked: [],
            conflicts: [],
            states: ['CLEAN'],
            remoteState: 'LOCAL',
          } as T,
        };
      },
    };
    const io = makeIo();
    const code = await run(['git', 'status', 'p1'], io, client);
    expect(code).toBe(0);
    expect(calls).toEqual([{ id: 'git.status', input: { projectId: 'p1' } }]);
    expect(io.stdout).toContain('branch: main');
    expect(io.stdout).toContain('states: CLEAN');
  });

  it('git commit -> client.invoke("git.commit") com files/all/expectedHead', async () => {
    const calls: { id: string; input: unknown }[] = [];
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async <T,>(id: string, input: unknown) => {
        calls.push({ id, input });
        return {
          ok: true as const,
          value: { commit: { hash: 'abc', message: 'm', author: 'a', dateISO: 'd' }, verified: true } as T,
        };
      },
    };
    const io = makeIo();
    const code = await run(['git', 'commit', 'p1', '--message', 'm', '--files', 'a.ts,b.ts', '--json'], io, client);
    expect(code).toBe(0);
    expect(calls).toEqual([{ id: 'git.commit', input: { projectId: 'p1', message: 'm', files: ['a.ts', 'b.ts'] } }]);
    expect(JSON.parse(io.stdout)).toMatchObject({ verified: true });
  });

  it('git branch create -> client.invoke("git.branch.create") com startPoint/checkout', async () => {
    const calls: { id: string; input: unknown }[] = [];
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async <T,>(id: string, input: unknown) => {
        calls.push({ id, input });
        return { ok: true as const, value: { created: true, name: 'feat', checkedOut: true } as T };
      },
    };
    const io = makeIo();
    const code = await run(['git', 'branch', 'create', 'p1', 'feat', '--start-point', 'main', '--checkout'], io, client);
    expect(code).toBe(0);
    expect(calls).toEqual([
      { id: 'git.branch.create', input: { projectId: 'p1', name: 'feat', startPoint: 'main', checkout: true } },
    ]);
    expect(io.stdout).toContain('created: true');
  });

  it('REQUIRE_APPROVAL do runtime -> exit 1 com "(requer aprovação explícita)" em stderr', async () => {
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async () => ({
        ok: false,
        error: {
          code: 'REQUIRE_APPROVAL',
          message: "Permission 'git.commit' requires explicit approval",
          retryable: false,
          requiresApproval: true,
        },
      }),
    };
    const io = makeIo();
    const code = await run(['git', 'commit', 'p1', '--message', 'm'], io, client);
    expect(code).toBe(1);
    expect(io.stderr).toContain('REQUIRE_APPROVAL');
    expect(io.stderr).toContain('(requer aprovação explícita)');
    expect(io.stdout).toBe('');
  });
});

// Wave 5 (FIX 2): a CLI SEMPRE envia x-nexo-actor explicitamente — o runtime
// é fail-closed (sem header -> anonymous:unknown, DEFAULT DENY).
describe('createNexoClient — header x-nexo-actor explícito (Wave 5 FIX 2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env['NEXO_ACTOR'];
  });

  function stubFetchCapture(): { captured: { headers: Record<string, string> }[] } {
    const captured: { headers: Record<string, string> }[] = [];
    vi.stubGlobal('fetch', async (_url: unknown, init?: { headers?: Record<string, string> }) => {
      captured.push({ headers: init?.headers ?? {} });
      return new Response(JSON.stringify({ ok: true, value: { capabilities: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    return { captured };
  }

  it("default: envia 'cli:local' explicitamente", async () => {
    const { captured } = stubFetchCapture();
    const client = createNexoClient('http://127.0.0.1:1');
    await client.capabilities();
    expect(captured).toHaveLength(1);
    expect(captured[0]!.headers['x-nexo-actor']).toBe('cli:local');
  });

  it('NEXO_ACTOR=outro -> header enviado como "outro" (runtime faz DEFAULT DENY)', async () => {
    process.env['NEXO_ACTOR'] = 'outro';
    const { captured } = stubFetchCapture();
    const client = createNexoClient('http://127.0.0.1:1');
    await client.capabilities();
    expect(captured[0]!.headers['x-nexo-actor']).toBe('outro');
  });

  it('NEXO_ACTOR vazio -> cai no default cli:local', async () => {
    process.env['NEXO_ACTOR'] = '   ';
    const { captured } = stubFetchCapture();
    const client = createNexoClient('http://127.0.0.1:1');
    await client.capabilities();
    expect(captured[0]!.headers['x-nexo-actor']).toBe('cli:local');
  });
});
