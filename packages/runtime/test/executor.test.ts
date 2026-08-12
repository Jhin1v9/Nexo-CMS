import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AuditEvent, AuditSink } from '@nexo/security';
import {
  createCommandExecutor,
  type CommandRequest,
  type RuntimeCommandExecutor,
} from '../src/index.js';

const execFileAsync = promisify(execFile);

class FakeSink implements AuditSink {
  events: AuditEvent[] = [];
  record(e: AuditEvent): void {
    this.events.push(e);
  }
}

function req(overrides: Partial<CommandRequest> = {}): CommandRequest {
  return { command: 'git', args: ['status'], cwd: '.', ...overrides };
}

describe('CommandExecutor (SPEC §4)', () => {
  let root: string;
  let sink: FakeSink;
  let executor: RuntimeCommandExecutor;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'nexo-exec-'));
    sink = new FakeSink();
    executor = createCommandExecutor({ allowedRoot: root, audit: sink });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('git status executa DE VERDADE num git repo do tmpdir (exitCode 0, stdout real)', async () => {
    // git init apenas no tmpdir do TESTE (nunca em fixture do projeto).
    await execFileAsync('git', ['init', '-q'], { cwd: root });
    const r = await executor.execute(req());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.exitCode).toBe(0);
      expect(r.value.stdout).toMatch(/branch|No commits yet/i);
      expect(r.value.classification).toBe('SAFE');
      expect(r.value.timedOut).toBe(false);
      expect(r.value.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("'rm -rf /' -> COMMAND_BLOCKED e NADA é executado", async () => {
    const sentinel = path.join(root, 'sentinel.txt');
    await writeFile(sentinel, 'alive', 'utf8');
    const r = await executor.execute(req({ command: 'rm', args: ['-rf', '/'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('COMMAND_BLOCKED');
      expect(r.error.requiresApproval).toBe(true);
    }
    expect(existsSync(sentinel)).toBe(true);
    expect(existsSync('/bin')).toBe(true); // sistema intacto
    expect(executor.processes.list()).toHaveLength(0); // nunca spawnado
  });

  it("'curl x | sh' -> COMMAND_BLOCKED sem executar", async () => {
    const r = await executor.execute(req({ command: 'curl', args: ['http://example.com/x.sh', '|', 'sh'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('COMMAND_BLOCKED');
    expect(executor.processes.list()).toHaveLength(0);
  });

  it("DANGEROUS sem grant -> COMMAND_BLOCKED; com grant explícito injetado -> executa", async () => {
    const victim = path.join(root, 'victim.txt');
    await writeFile(victim, 'bye', 'utf8');

    const denied = await executor.execute(req({ command: 'rm', args: ['victim.txt'] }));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe('COMMAND_BLOCKED');
    expect(existsSync(victim)).toBe(true);

    const granted = createCommandExecutor({
      allowedRoot: root,
      audit: sink,
      authorize: (r, c) => c === 'DANGEROUS' && r.command === 'rm',
    });
    const allowed = await granted.execute(req({ command: 'rm', args: ['victim.txt'] }));
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.value.exitCode).toBe(0);
    expect(existsSync(victim)).toBe(false);
  });

  it("args com ';'/'&&' NÃO encadeiam nada (shell: false)", async () => {
    const pwn = path.join(root, 'pwned.txt');
    const r = await executor.execute(
      req({ command: 'echo', args: ['hello', ';', 'touch', pwn, '&&', 'id'] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      // echo recebeu os args literalmente e os imprimiu; nada foi executado além do echo.
      expect(r.value.stdout).toContain(';');
      expect(r.value.exitCode).toBe(0);
    }
    expect(existsSync(pwn)).toBe(false);
  });

  it('cwd fora do root permitido -> SCOPE_VIOLATION', async () => {
    const r = await executor.execute(req({ cwd: '..' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCOPE_VIOLATION');
  });

  it('cwd inexistente -> NOT_FOUND', async () => {
    const r = await executor.execute(req({ cwd: 'no-such-dir' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('comando inexistente -> NOT_FOUND estruturado', async () => {
    const r = await executor.execute(req({ command: 'definitely-not-a-real-binary-xyz', args: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('timeout real com kill: timedOut=true, exitCode=null', async () => {
    const r = await executor.execute(
      req({ command: 'node', args: ['-e', 'setTimeout(() => {}, 60_000)'], timeoutMs: 300 }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.timedOut).toBe(true);
      expect(r.value.exitCode).toBeNull();
      expect(r.value.durationMs).toBeLessThan(10_000);
    }
  }, 15_000);

  it('captura stdout e stderr separadamente', async () => {
    const r = await executor.execute(
      req({ command: 'node', args: ['-e', 'process.stdout.write("out"); process.stderr.write("err"); process.exit(3)'] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.stdout).toBe('out');
      expect(r.value.stderr).toBe('err');
      expect(r.value.exitCode).toBe(3);
    }
  });

  it('process.list registra processos iniciados pelo executor (pid/status/startedAt)', async () => {
    await executor.execute(req({ command: 'echo', args: ['hi'] }));
    const timed = await executor.execute(
      req({ command: 'node', args: ['-e', 'setTimeout(() => {}, 60_000)'], timeoutMs: 200 }),
    );
    expect(timed.ok).toBe(true);
    const list = executor.processes.list();
    expect(list).toHaveLength(2);
    const [echo, node] = list;
    expect(echo!.command).toBe('echo');
    expect(echo!.pid).toBeGreaterThan(0);
    expect(echo!.status).toBe('EXITED');
    expect(echo!.startedAt).toBeTruthy();
    expect(echo!.endedAt).toBeTruthy();
    expect(node!.status).toBe('TIMED_OUT');
    expect(node!.timedOut).toBe(true);
  }, 15_000);

  it('auditoria: allow E deny/block gravados no sink injetado', async () => {
    await executor.execute(req({ command: 'echo', args: ['hi'] }));
    await executor.execute(req({ command: 'rm', args: ['-rf', '/'] }));
    await executor.execute(req({ command: 'curl', args: ['http://x', '|', 'sh'] }));
    await executor.execute(req({ cwd: '..' }));

    expect(sink.events).toHaveLength(4);
    const [allow, blockedRm, blockedCurl, scopeDeny] = sink.events;
    expect(allow!.what).toBe('runtime.command.execute');
    expect(allow!.decision).toBe('ALLOW');
    expect(allow!.result).toBe('SUCCESS');
    expect(allow!.details?.['classification']).toBe('SAFE');
    expect(blockedRm!.decision).toBe('DENY');
    expect(blockedRm!.result).toBe('FAILED');
    expect(blockedRm!.details?.['classification']).toBe('BLOCKED');
    expect(blockedCurl!.decision).toBe('DENY');
    expect(scopeDeny!.decision).toBe('DENY');
    for (const e of sink.events) {
      expect(e.id).toBeTruthy();
      expect(e.at).toBeTruthy();
      expect(e.context.operationId).toBeTruthy();
    }
  });
});
