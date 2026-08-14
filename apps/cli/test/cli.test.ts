/**
 * Smoke tests da CLI (SPEC.md §10): parsing de argv (util.parseArgs) + fluxo
 * run() com client injetado — SEM spawnar servidor (o integration test real
 * do Agent API vive em apps/runtime/test/server.test.ts).
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { CliUsageError, parseCliArgs } from '../src/args.js';
import { createNexoClient, type NexoClient } from '../src/client.js';
import {
  formatChangeList,
  formatComponentList,
  formatComponentSchema,
  formatDesignModel,
  formatDiagnosticIssues,
  formatEditorSave,
  formatMediaList,
  formatMediaMetadata,
  formatThemes,
  formatViewport,
} from '../src/format.js';
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

// ---- M3: parsing dos comandos novos (M3-CONTRACTS §3) -------------------------
describe('parseCliArgs — M3 (M3-CONTRACTS §3)', () => {
  it('editor open/save/selection', () => {
    expect(parseCliArgs(['editor', 'open', 'p1', 'src/App.tsx'])).toEqual({
      kind: 'editor.open',
      projectId: 'p1',
      filePath: 'src/App.tsx',
      json: false,
    });
    expect(parseCliArgs(['editor', 'save', 'p1', 'src/App.tsx', '--expected-hash', 'abc123'])).toEqual({
      kind: 'editor.save',
      projectId: 'p1',
      filePath: 'src/App.tsx',
      expectedHash: 'abc123',
      json: false,
    });
    expect(parseCliArgs(['editor', 'selection', 'p1', '--route', '/', '--node-ref', 'n42'])).toEqual({
      kind: 'editor.selection.read',
      projectId: 'p1',
      route: '/',
      nodeRef: 'n42',
      json: false,
    });
    expect(() => parseCliArgs(['editor', 'open', 'p1'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['editor', 'selection', 'p1', '--route', '/'])).toThrow(CliUsageError);
  });

  it('editor change-create/preview/apply/reject/changes/undo/redo', () => {
    expect(parseCliArgs(['editor', 'change-create', 'p1', '--change', '{"operation":"modify"}'])).toEqual({
      kind: 'editor.change.create',
      projectId: 'p1',
      changeJson: '{"operation":"modify"}',
      json: false,
    });
    expect(parseCliArgs(['editor', 'change-create', 'p1'])).toEqual({
      kind: 'editor.change.create',
      projectId: 'p1',
      json: false,
    });
    expect(parseCliArgs(['editor', 'change-preview', 'p1', 'c1'])).toEqual({
      kind: 'editor.change.preview',
      projectId: 'p1',
      changeId: 'c1',
      json: false,
    });
    expect(parseCliArgs(['editor', 'change-apply', 'p1', 'c1', '--expected-hash', 'h'])).toEqual({
      kind: 'editor.change.apply',
      projectId: 'p1',
      changeId: 'c1',
      expectedHash: 'h',
      json: false,
    });
    expect(parseCliArgs(['editor', 'change-reject', 'p1', 'c1'])).toEqual({
      kind: 'editor.change.reject',
      projectId: 'p1',
      changeId: 'c1',
      json: false,
    });
    expect(parseCliArgs(['editor', 'changes', 'p1', '--json'])).toEqual({
      kind: 'editor.change.list',
      projectId: 'p1',
      json: true,
    });
    expect(parseCliArgs(['editor', 'undo', 'p1'])).toEqual({ kind: 'editor.change.undo', projectId: 'p1', json: false });
    expect(parseCliArgs(['editor', 'redo', 'p1'])).toEqual({ kind: 'editor.change.redo', projectId: 'p1', json: false });
    expect(() => parseCliArgs(['editor', 'change-apply', 'p1'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['editor', 'frobnicate', 'p1'])).toThrow(CliUsageError);
  });

  it('component list/read/create/update/delete/publish', () => {
    expect(parseCliArgs(['component', 'list', 'p1', '--scope', 'Library'])).toEqual({
      kind: 'component.list',
      projectId: 'p1',
      scope: 'Library',
      json: false,
    });
    expect(parseCliArgs(['component', 'read', 'p1', 'comp-1'])).toEqual({
      kind: 'component.read',
      projectId: 'p1',
      componentId: 'comp-1',
      json: false,
    });
    expect(
      parseCliArgs([
        'component', 'create', 'p1', '--name', 'Hero', '--description', 'hero section',
        '--props', '[{"name":"title","type":"String","required":true}]',
        '--variants', '[{"name":"size","values":["sm","lg"]}]', '--scope', 'Project',
      ]),
    ).toEqual({
      kind: 'component.create',
      projectId: 'p1',
      name: 'Hero',
      description: 'hero section',
      props: [{ name: 'title', type: 'String', required: true }],
      variants: [{ name: 'size', values: ['sm', 'lg'] }],
      scope: 'Project',
      json: false,
    });
    expect(parseCliArgs(['component', 'update', 'p1', 'comp-1', '--patch', '{"props":[]}'])).toEqual({
      kind: 'component.update',
      projectId: 'p1',
      componentId: 'comp-1',
      patchJson: '{"props":[]}',
      json: false,
    });
    expect(parseCliArgs(['component', 'delete', 'p1', 'comp-1'])).toEqual({
      kind: 'component.delete',
      projectId: 'p1',
      componentId: 'comp-1',
      json: false,
    });
    expect(parseCliArgs(['component', 'publish', 'p1', 'comp-1'])).toEqual({
      kind: 'component.publish',
      projectId: 'p1',
      componentId: 'comp-1',
      json: false,
    });
    expect(() => parseCliArgs(['component', 'create', 'p1'])).toThrow(CliUsageError); // sem --name
    expect(() => parseCliArgs(['component', 'create', 'p1', '--name', 'X', '--props', '{nao-array}'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['component', 'create', 'p1', '--name', 'X', '--props', '[broken'])).toThrow(CliUsageError);
  });

  it('media list/read/search/upload/update/replace/delete', () => {
    expect(parseCliArgs(['media', 'list', 'p1', '--filter', 'image'])).toEqual({
      kind: 'media.list',
      projectId: 'p1',
      filter: 'image',
      json: false,
    });
    expect(parseCliArgs(['media', 'read', 'p1', 'a1', '--include-content'])).toEqual({
      kind: 'media.read',
      projectId: 'p1',
      assetId: 'a1',
      includeContent: true,
      json: false,
    });
    expect(parseCliArgs(['media', 'search', 'p1', 'logo'])).toEqual({
      kind: 'media.search',
      projectId: 'p1',
      query: 'logo',
      json: false,
    });
    expect(parseCliArgs(['media', 'upload', 'p1', '/tmp/logo.png', '--name', 'logo.png', '--target-path', 'assets'])).toEqual({
      kind: 'media.upload',
      projectId: 'p1',
      file: '/tmp/logo.png',
      fileName: 'logo.png',
      targetPath: 'assets',
      json: false,
    });
    expect(parseCliArgs(['media', 'update', 'p1', 'a1', '--alt', 'logo da empresa'])).toEqual({
      kind: 'media.update',
      projectId: 'p1',
      assetId: 'a1',
      alt: 'logo da empresa',
      json: false,
    });
    expect(parseCliArgs(['media', 'replace', 'p1', 'a1', '/tmp/nova.png'])).toEqual({
      kind: 'media.replace',
      projectId: 'p1',
      assetId: 'a1',
      file: '/tmp/nova.png',
      json: false,
    });
    expect(parseCliArgs(['media', 'delete', 'p1', 'a1'])).toEqual({
      kind: 'media.delete',
      projectId: 'p1',
      assetId: 'a1',
      confirm: false,
      json: false,
    });
    expect(parseCliArgs(['media', 'delete', 'p1', 'a1', '--confirm'])).toEqual({
      kind: 'media.delete',
      projectId: 'p1',
      assetId: 'a1',
      confirm: true,
      json: false,
    });
    expect(() => parseCliArgs(['media', 'update', 'p1', 'a1'])).toThrow(CliUsageError); // nenhum campo de metadata
    expect(() => parseCliArgs(['media', 'replace', 'p1', 'a1'])).toThrow(CliUsageError);
  });

  it('design read/update/token-read/token-update; theme read/update', () => {
    expect(parseCliArgs(['design', 'read', 'p1'])).toEqual({ kind: 'design.read', projectId: 'p1', json: false });
    expect(
      parseCliArgs(['design', 'update', 'p1', '--target', 'Button.primary', '--property', 'color', '--value', '#fff']),
    ).toEqual({
      kind: 'design.update',
      projectId: 'p1',
      target: 'Button.primary',
      property: 'color',
      value: '#fff',
      json: false,
    });
    expect(parseCliArgs(['design', 'token-read', 'p1'])).toEqual({ kind: 'design.token.read', projectId: 'p1', json: false });
    expect(parseCliArgs(['design', 'token-read', 'p1', '--token-ref', 'color.primary'])).toEqual({
      kind: 'design.token.read',
      projectId: 'p1',
      tokenRef: 'color.primary',
      json: false,
    });
    expect(parseCliArgs(['design', 'token-update', 'p1', '--token-ref', 'color.primary', '--value', '#0af'])).toEqual({
      kind: 'design.token.update',
      projectId: 'p1',
      tokenRef: 'color.primary',
      value: '#0af',
      json: false,
    });
    expect(parseCliArgs(['theme', 'read', 'p1'])).toEqual({ kind: 'theme.read', projectId: 'p1', json: false });
    expect(parseCliArgs(['theme', 'update', 'p1', '--theme', 'Dark', '--patch', '{"bg":"#000"}'])).toEqual({
      kind: 'theme.update',
      projectId: 'p1',
      theme: 'Dark',
      patchJson: '{"bg":"#000"}',
      json: false,
    });
    expect(() => parseCliArgs(['design', 'update', 'p1', '--target', 'x'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['design', 'token-update', 'p1', '--value', '#fff'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['theme', 'update', 'p1'])).toThrow(CliUsageError);
  });

  it('responsive viewport-create/preview/diagnose/stress-test/compare/snapshot', () => {
    expect(
      parseCliArgs(['responsive', 'viewport-create', 'p1', '--width', '375', '--height', '812', '--name', 'iphone', '--dpr', '3', '--orientation', 'portrait']),
    ).toEqual({
      kind: 'responsive.viewport.create',
      projectId: 'p1',
      width: 375,
      height: 812,
      name: 'iphone',
      dpr: 3,
      orientation: 'portrait',
      json: false,
    });
    expect(parseCliArgs(['responsive', 'preview', 'p1', '--viewport-id', 'v1', '--route', '/home'])).toEqual({
      kind: 'responsive.preview',
      projectId: 'p1',
      viewportId: 'v1',
      route: '/home',
      json: false,
    });
    expect(parseCliArgs(['responsive', 'diagnose', 'p1', '--viewport-id', 'v1'])).toEqual({
      kind: 'responsive.diagnose',
      projectId: 'p1',
      viewportId: 'v1',
      json: false,
    });
    expect(parseCliArgs(['responsive', 'stress-test', 'p1', '--viewport-id', 'v1', '--profile', 'long-text'])).toEqual({
      kind: 'responsive.stressTest',
      projectId: 'p1',
      viewportId: 'v1',
      profile: 'long-text',
      json: false,
    });
    expect(parseCliArgs(['responsive', 'compare', 'p1', '--viewports', 'mobile,tablet,desktop'])).toEqual({
      kind: 'responsive.compare',
      projectId: 'p1',
      viewportIds: ['mobile', 'tablet', 'desktop'],
      json: false,
    });
    expect(parseCliArgs(['responsive', 'snapshot', 'p1', '--viewport-id', 'v1'])).toEqual({
      kind: 'responsive.snapshot',
      projectId: 'p1',
      viewportId: 'v1',
      json: false,
    });
    expect(() => parseCliArgs(['responsive', 'viewport-create', 'p1', '--width', '375'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['responsive', 'viewport-create', 'p1', '--width', '0', '--height', '10'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['responsive', 'viewport-create', 'p1', '--width', '37.5', '--height', '10'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['responsive', 'viewport-create', 'p1', '--width', '10', '--height', '10', '--dpr', '-1'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['responsive', 'diagnose', 'p1'])).toThrow(CliUsageError); // sem --viewport-id
    expect(() => parseCliArgs(['responsive', 'stress-test', 'p1', '--viewport-id', 'v1'])).toThrow(CliUsageError); // sem --profile
    expect(() => parseCliArgs(['responsive', 'compare', 'p1', '--viewports', 'so-um'])).toThrow(CliUsageError);
  });

  it('D17: --approve exige --approver; --approver/--justification exigem --approve', () => {
    expect(parseCliArgs(['git', 'commit', 'p1', '--message', 'm', '--approve', '--approver', 'user:ana'])).toEqual({
      kind: 'git.commit',
      projectId: 'p1',
      message: 'm',
      all: false,
      approval: { approver: 'user:ana' },
      json: false,
    });
    expect(
      parseCliArgs(['media', 'delete', 'p1', 'a1', '--confirm', '--approve', '--approver', 'user:ana', '--justification', 'limpeza']),
    ).toEqual({
      kind: 'media.delete',
      projectId: 'p1',
      assetId: 'a1',
      confirm: true,
      approval: { approver: 'user:ana', justification: 'limpeza' },
      json: false,
    });
    expect(parseCliArgs(['editor', 'save', 'p1', 'f.ts', '--approve', '--approver', 'user:ana'])).toMatchObject({
      approval: { approver: 'user:ana' },
    });
    expect(() => parseCliArgs(['git', 'commit', 'p1', '--message', 'm', '--approve'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['git', 'commit', 'p1', '--message', 'm', '--approver', 'user:ana'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['component', 'publish', 'p1', 'c1', '--justification', 'x'])).toThrow(CliUsageError);
  });
});

// ---- M3: formatters -----------------------------------------------------------
describe('formatters M3', () => {
  it('formatEditorSave: saved real + hash + diagnostics com severity/certainty', () => {
    const out = formatEditorSave({
      saved: true,
      hash: 'abc',
      verified: true,
      diagnostics: [{ severity: 'warning', certainty: 'HIGH', code: 'PARSE', message: 'parser lento' }],
    });
    expect(out).toContain('saved: true');
    expect(out).toContain('hash: abc');
    expect(out).toContain('verified: true');
    expect(out).toContain('[warning] (HIGH) PARSE parser lento');
  });

  it('formatEditorSave: saved ausente NUNCA vira true (zero fake success)', () => {
    expect(formatEditorSave({})).toContain('saved: false');
  });

  it('formatChangeList: pending changes (array ou envelope)', () => {
    const change = {
      id: 'c1',
      operation: 'modify',
      source: 'visual',
      origin: 'Visual Editor',
      state: 'PENDING',
      files: ['src/App.tsx'],
      createdAt: '2026-01-01T00:00:00Z',
      appliedAt: null,
    };
    const out = formatChangeList({ changes: [change] });
    expect(out).toContain('c1  [PENDING]  modify');
    expect(out).toContain('arquivos: src/App.tsx');
    expect(formatChangeList({ changes: [] })).toBe('nenhuma pending change');
  });

  it('formatComponentList / formatComponentSchema', () => {
    expect(
      formatComponentList([{ id: 'comp-1', name: 'Hero', scope: 'Project', version: '1.2.0' }]),
    ).toBe('comp-1  Hero  [Project]  v1.2.0');
    expect(formatComponentList({ components: [] })).toBe('nenhum componente');
    const schema = formatComponentSchema({
      identity: { id: 'comp-1', name: 'Hero', scope: 'Project', version: null },
      props: [{ name: 'title', type: 'String', required: true, default: 'Oi', description: 'título' }],
      variants: [{ name: 'size', values: ['sm', 'lg'] }],
      slots: [{ name: 'children', kind: 'ComposableSlot' }],
      events: ['onClick'],
      assets: ['a1'],
    });
    expect(schema).toContain('comp-1  Hero  [Project]');
    expect(schema).toContain('title: String (obrigatória)  default: "Oi"  — título');
    expect(schema).toContain('size: sm | lg');
    expect(schema).toContain('children  [ComposableSlot]');
    expect(schema).toContain('events: onClick');
  });

  it('formatMediaList com usage state; vazio honesto', () => {
    expect(
      formatMediaList({ assets: [{ id: 'a1', fileName: 'logo.png', mimeType: 'image/png', usageState: 'Used', sizeBytes: 120 }] }),
    ).toBe('a1  logo.png  image/png  120B  [Used]');
    expect(formatMediaList([])).toBe('nenhum asset');
  });

  it('formatMediaMetadata NUNCA despeja base64 na saída humana', () => {
    const out = formatMediaMetadata({ id: 'a1', name: 'logo', contentBase64: 'QUJDREVGRw==' });
    expect(out).toContain('id: a1');
    expect(out).not.toContain('QUJDREVGRw==');
    expect(out).toContain('content: (base64');
    expect(out).toContain('--json');
  });

  it('formatDesignModel: tokens por tipo + themes; fallback JSON', () => {
    const out = formatDesignModel({
      tokens: { color: [{ ref: 'color.primary', value: '#0af', source: { file: 'tokens.css', line: 3 } }] },
      themes: [{ name: 'Dark', activation: 'class' }],
    });
    expect(out).toContain('tokens:');
    expect(out).toContain('color:');
    expect(out).toContain('color.primary');
    expect(out).toContain('"#0af"');
    expect(out).toContain('themes:');
    expect(out).toContain('Dark');
    // shape desconhecido -> JSON pretty (honesto)
    expect(formatDesignModel({ algoInesperado: 1 })).toContain('algoInesperado');
  });

  it('formatThemes: temas + mecanismo de ativação', () => {
    expect(formatThemes([{ name: 'Light' }, { name: 'Dark', activationMechanism: 'media-query' }])).toBe(
      'Light\nDark  (ativação: "media-query")',
    );
    expect(formatThemes([])).toBe('nenhum tema detectado');
  });

  it('formatDiagnosticIssues: severity + certainty + evidence', () => {
    const out = formatDiagnosticIssues({
      issues: [
        { severity: 'ERROR', certainty: 'CERTAIN', code: 'OVERFLOW', message: 'conteúdo transborda', evidence: { selector: '.card' } },
        { severity: 'WARNING', message: 'tocável pequeno' },
      ],
    });
    expect(out).toContain('issues: 2');
    expect(out).toContain('[ERROR] (CERTAIN) OVERFLOW conteúdo transborda');
    expect(out).toContain('evidência: {"selector":".card"}');
    expect(out).toContain('[WARNING] (UNKNOWN) tocável pequeno');
    expect(formatDiagnosticIssues({ issues: [] })).toBe('nenhuma issue detectada');
  });

  it('formatViewport', () => {
    expect(formatViewport({ id: 'v1', name: 'iphone', width: 375, height: 812, dpr: 3, orientation: 'portrait' })).toBe(
      'viewport: v1\n  name:        iphone\n  dimensões:   375x812\n  dpr:         3\n  orientação:  portrait',
    );
  });
});

// ---- M3: dispatch run() com client injetado (sem servidor) --------------------
describe('run() M3 — invoke da capability homônima (Inv. 17)', () => {
  function makeIo(stdin?: string): RunIo & { stdout: string; stderr: string } {
    const buf = { stdout: '', stderr: '' };
    return {
      out: { write: (s: string) => (buf.stdout += s) },
      err: { write: (s: string) => (buf.stderr += s) },
      ...(stdin !== undefined ? { readStdin: async () => stdin } : {}),
      get stdout() {
        return buf.stdout;
      },
      get stderr() {
        return buf.stderr;
      },
    };
  }

  function recordingClient(value: unknown): { client: NexoClient; calls: { id: string; input: unknown }[] } {
    const calls: { id: string; input: unknown }[] = [];
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async <T,>(id: string, input: unknown) => {
        calls.push({ id, input });
        return { ok: true as const, value: value as T };
      },
    };
    return { client, calls };
  }

  it('editor open -> editor.source.open; humano recebe conteúdo puro', async () => {
    const { client, calls } = recordingClient({ content: 'const x = 1;\n', hash: 'h1', language: 'typescript', readOnly: false });
    const io = makeIo();
    const code = await run(['editor', 'open', 'p1', 'src/x.ts'], io, client);
    expect(code).toBe(0);
    expect(calls).toEqual([{ id: 'editor.source.open', input: { projectId: 'p1', filePath: 'src/x.ts' } }]);
    expect(io.stdout).toBe('const x = 1;\n');
  });

  it('editor save -> editor.source.save com conteúdo do stdin + expectedHash + approval (D17)', async () => {
    const { client, calls } = recordingClient({ saved: true, hash: 'h2', verified: true, diagnostics: [] });
    const io = makeIo('novo conteúdo\n');
    const code = await run(
      ['editor', 'save', 'p1', 'src/x.ts', '--expected-hash', 'h1', '--approve', '--approver', 'user:ana'],
      io,
      client,
    );
    expect(code).toBe(0);
    expect(calls).toEqual([
      {
        id: 'editor.source.save',
        input: {
          projectId: 'p1',
          filePath: 'src/x.ts',
          content: 'novo conteúdo\n',
          expectedHash: 'h1',
          approval: { approver: 'user:ana' },
        },
      },
    ]);
    expect(io.stdout).toContain('saved: true');
    expect(io.stdout).toContain('hash: h2');
  });

  it('editor save CONFLICT -> exit 1 com code + nextAction em stderr', async () => {
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async () => ({
        ok: false,
        error: {
          code: 'CONFLICT',
          message: 'hash diverge do baseline',
          retryable: false,
          nextAction: 'Reabra o arquivo (editor open) e reaplique sobre o novo hash',
        },
      }),
    };
    const io = makeIo('x');
    const code = await run(['editor', 'save', 'p1', 'f.ts', '--expected-hash', 'h1'], io, client);
    expect(code).toBe(1);
    expect(io.stderr).toContain('[CONFLICT]');
    expect(io.stderr).toContain('próximo passo: Reabra o arquivo');
    expect(io.stdout).toBe('');
  });

  it('editor changes -> editor.change.list; lista de Change Objects', async () => {
    const { client, calls } = recordingClient({
      changes: [
        { id: 'c1', operation: 'modify', source: 'visual', state: 'PENDING', files: ['a.ts'], createdAt: 't', appliedAt: null },
      ],
    });
    const io = makeIo();
    const code = await run(['editor', 'changes', 'p1'], io, client);
    expect(code).toBe(0);
    expect(calls).toEqual([{ id: 'editor.change.list', input: { projectId: 'p1' } }]);
    expect(io.stdout).toContain('c1  [PENDING]  modify');
  });

  it('editor change-create -> editor.change.create com ChangeInput do stdin', async () => {
    const { client, calls } = recordingClient({ id: 'c9', state: 'PENDING', files: ['b.ts'], operation: 'create', source: 'ai' });
    const io = makeIo('{"operation":"create","files":["b.ts"]}');
    const code = await run(['editor', 'change-create', 'p1'], io, client);
    expect(code).toBe(0);
    expect(calls).toEqual([
      { id: 'editor.change.create', input: { projectId: 'p1', change: { operation: 'create', files: ['b.ts'] } } },
    ]);
    expect(io.stdout).toContain('c9  [PENDING]');
  });

  it('editor undo/redo -> editor.change.undo/redo', async () => {
    const { client, calls } = recordingClient({ reverted: true });
    const io = makeIo();
    await run(['editor', 'undo', 'p1'], io, client);
    await run(['editor', 'redo', 'p1'], io, client);
    expect(calls.map((c) => c.id)).toEqual(['editor.change.undo', 'editor.change.redo']);
  });

  it('component create -> component.create com props/variants/scope/approval', async () => {
    const { client, calls } = recordingClient({ componentId: 'comp-9', status: 'REGISTERED', filesChanged: ['src/Hero.tsx'] });
    const io = makeIo();
    const code = await run(
      ['component', 'create', 'p1', '--name', 'Hero', '--props', '[{"name":"title","type":"String","required":true}]', '--scope', 'Project', '--approve', '--approver', 'user:ana', '--justification', 'novo hero'],
      io,
      client,
    );
    expect(code).toBe(0);
    expect(calls).toEqual([
      {
        id: 'component.create',
        input: {
          projectId: 'p1',
          name: 'Hero',
          props: [{ name: 'title', type: 'String', required: true }],
          scope: 'Project',
          approval: { approver: 'user:ana', justification: 'novo hero' },
        },
      },
    ]);
    expect(io.stdout).toContain('componentId: comp-9');
  });

  it('component update -> patch do stdin; JSON malformado -> exit 2', async () => {
    const { client, calls } = recordingClient({ diff: '@@ -1 +1 @@' });
    const io = makeIo('{"props":[{"name":"title"}]}');
    const code = await run(['component', 'update', 'p1', 'comp-1'], io, client);
    expect(code).toBe(0);
    expect(calls).toEqual([
      { id: 'component.update', input: { projectId: 'p1', componentId: 'comp-1', patch: { props: [{ name: 'title' }] } } },
    ]);

    const bad = makeIo('{broken');
    const code2 = await run(['component', 'update', 'p1', 'comp-1'], bad, client);
    expect(code2).toBe(2);
    expect(bad.stderr).toContain('JSON malformado');
  });

  it('media upload -> lê arquivo local e envia contentBase64 + fileName', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nexo-cli-test-'));
    try {
      const filePath = join(dir, 'logo.png');
      writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      const { client, calls } = recordingClient({ assetId: 'a9', uploaded: true });
      const io = makeIo();
      const code = await run(['media', 'upload', 'p1', filePath], io, client);
      expect(code).toBe(0);
      expect(calls).toEqual([
        {
          id: 'media.upload',
          input: {
            projectId: 'p1',
            fileName: 'logo.png',
            contentBase64: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64'),
          },
        },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('media upload com arquivo inexistente -> exit 1 LOCAL_IO, SEM invoke', async () => {
    const { client, calls } = recordingClient({});
    const io = makeIo();
    const code = await run(['media', 'upload', 'p1', '/nao/existe/arquivo.bin'], io, client);
    expect(code).toBe(1);
    expect(io.stderr).toContain('LOCAL_IO');
    expect(calls).toEqual([]); // zero fake success: nada foi enviado
  });

  it('media delete --confirm -> confirm:true; sem flag, chave omitida (08§51)', async () => {
    const { client, calls } = recordingClient({ deleted: true });
    const io = makeIo();
    await run(['media', 'delete', 'p1', 'a1', '--confirm'], io, client);
    await run(['media', 'delete', 'p1', 'a2'], io, client);
    expect(calls[0]).toEqual({ id: 'media.delete', input: { projectId: 'p1', assetId: 'a1', confirm: true } });
    expect(calls[1]).toEqual({ id: 'media.delete', input: { projectId: 'p1', assetId: 'a2' } });
  });

  it('design/theme/responsive -> ids EXATOS do M3-CONTRACTS §3.4/§3.5', async () => {
    const { client, calls } = recordingClient({ ok: true });
    const io = makeIo();
    await run(['design', 'read', 'p1'], io, client);
    await run(['design', 'update', 'p1', '--target', 'T', '--property', 'color', '--value', '#fff'], io, client);
    await run(['design', 'token-read', 'p1', '--token-ref', 'color.primary'], io, client);
    await run(['design', 'token-update', 'p1', '--token-ref', 'color.primary', '--value', '#0af'], io, client);
    await run(['theme', 'read', 'p1'], io, client);
    await run(['theme', 'update', 'p1', '--theme', 'Dark', '--patch', '{"bg":"#000"}'], io, client);
    await run(['responsive', 'viewport-create', 'p1', '--width', '375', '--height', '812'], io, client);
    await run(['responsive', 'preview', 'p1', '--viewport-id', 'v1'], io, client);
    await run(['responsive', 'stress-test', 'p1', '--viewport-id', 'v1', '--profile', 'long-text'], io, client);
    await run(['responsive', 'compare', 'p1', '--viewports', 'v1,v2'], io, client);
    await run(['responsive', 'snapshot', 'p1', '--viewport-id', 'v1'], io, client);
    expect(calls.map((c) => c.id)).toEqual([
      'design.read',
      'design.update',
      'design.token.read',
      'design.token.update',
      'theme.read',
      'theme.update',
      'responsive.viewport.create',
      'responsive.preview',
      'responsive.stressTest',
      'responsive.compare',
      'responsive.snapshot',
    ]);
    expect(calls[1]!.input).toEqual({ projectId: 'p1', target: 'T', property: 'color', value: '#fff' });
    expect(calls[5]!.input).toEqual({ projectId: 'p1', theme: 'Dark', patch: { bg: '#000' } });
    expect(calls[6]!.input).toEqual({ projectId: 'p1', width: 375, height: 812 });
    expect(calls[8]!.input).toEqual({ projectId: 'p1', viewportId: 'v1', profile: 'long-text' });
    expect(calls[9]!.input).toEqual({ projectId: 'p1', viewportIds: ['v1', 'v2'] });
  });

  it('responsive diagnose -> progresso honesto em stderr + issues formatadas', async () => {
    const { client, calls } = recordingClient({
      issues: [{ severity: 'ERROR', certainty: 'CERTAIN', message: 'overflow' }],
    });
    const io = makeIo();
    const code = await run(['responsive', 'diagnose', 'p1', '--viewport-id', 'v1', '--route', '/'], io, client);
    expect(code).toBe(0);
    expect(calls).toEqual([{ id: 'responsive.diagnose', input: { projectId: 'p1', viewportId: 'v1', route: '/' } }]);
    expect(io.stderr).toContain('Running diagnostics (real browser)');
    expect(io.stderr).toMatch(/concluído em \d+\.\ds/);
    expect(io.stdout).toContain('[ERROR] (CERTAIN) overflow');
  });

  it('D17: REQUIRE_APPROVAL sem --approve -> hint de reexecução; com approval -> sem hint', async () => {
    const denied: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async () => ({
        ok: false,
        error: {
          code: 'REQUIRE_APPROVAL',
          message: "Permission 'component.delete' requires explicit approval",
          retryable: false,
          requiresApproval: true,
        },
      }),
    };
    const io1 = makeIo();
    const code1 = await run(['component', 'delete', 'p1', 'c1'], io1, denied);
    expect(code1).toBe(1);
    expect(io1.stderr).toContain('REQUIRE_APPROVAL');
    expect(io1.stderr).toContain('Requer aprovacao: reexecute com --approve --approver <seu-id>');

    // Approval enviado mas recusado pelo servidor: hint NÃO é repetido (a
    // mensagem do servidor é a fonte da verdade).
    const io2 = makeIo();
    const code2 = await run(['component', 'delete', 'p1', 'c1', '--approve', '--approver', 'user:ana'], io2, denied);
    expect(code2).toBe(1);
    expect(io2.stderr).not.toContain('Requer aprovacao: reexecute');
  });

  it('erro --json -> envelope completo (com nextAction) em stderr', async () => {
    const client: NexoClient = {
      capabilities: async () => ({ ok: true, value: { capabilities: [] } }),
      invoke: async () => ({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'asset não existe', nextAction: 'media list para ver ids' },
      }),
    };
    const io = makeIo();
    const code = await run(['media', 'read', 'p1', 'aX', '--json'], io, client);
    expect(code).toBe(1);
    const envelope = JSON.parse(io.stderr) as { ok: boolean; error: { code: string; nextAction: string } };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe('NOT_FOUND');
    expect(envelope.error.nextAction).toBe('media list para ver ids');
  });
});
