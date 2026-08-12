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
