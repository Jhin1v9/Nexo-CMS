/**
 * Wave 5 (FIX 1 — HIGH): análise pura de arg-paths (arg-paths.ts) + guard de
 * escopo de argumentos no executor (scope-guard.ts reutilizado do
 * ScopedFilesystem). Elimina a classe "scope escape via args de comandos
 * SAFE" (ex.: `cat /etc/passwd`, `cat ../../segredo`, symlink para fora).
 */

import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AuditEvent, AuditSink } from '@nexo/security';
import {
  analyzeCommandArgPaths,
  createCommandExecutor,
  type CommandRequest,
  type RuntimeCommandExecutor,
} from '../src/index.js';

class FakeSink implements AuditSink {
  events: AuditEvent[] = [];
  record(e: AuditEvent): void {
    this.events.push(e);
  }
}

describe('analyzeCommandArgPaths (puro)', () => {
  it('flags nunca são paths; valores (separados ou --flag=valor) são analisados', () => {
    // '5' (valor separado de -n) e 'auto' (valor de --color=) são tokens
    // não-flag -> candidatos; validação resolve dentro do root (não-paths
    // inexistentes passam — zero falso positivo). A flag em si nunca é path.
    const a = analyzeCommandArgPaths(['-n', '5', '--color=auto', 'file.txt']);
    expect(a.unanalyzable).toEqual([]);
    expect(a.pathCandidates).toEqual(['5', 'auto', 'file.txt']);
  });

  it('todo token não-flag é candidato a path (absolute, relativo, nome simples)', () => {
    const a = analyzeCommandArgPaths(['/etc/passwd', '../../segredo', 'arquivo.txt']);
    expect(a.pathCandidates).toEqual(['/etc/passwd', '../../segredo', 'arquivo.txt']);
  });

  it("'~' e null byte são não analisáveis -> rebaixamento SAFE->RESTRICTED", () => {
    expect(analyzeCommandArgPaths(['~/secret']).unanalyzable).toEqual(['~/secret']);
    expect(analyzeCommandArgPaths(['~root/.ssh']).unanalyzable).toEqual(['~root/.ssh']);
    expect(analyzeCommandArgPaths(['a\0b']).unanalyzable).toEqual(['a\0b']);
  });

  it("'--' e '-' são ignorados; tokens após -- continuam validados", () => {
    const a = analyzeCommandArgPaths(['--', '-weird-name', './x']);
    expect(a.unanalyzable).toEqual([]);
    expect(a.pathCandidates).toEqual(['./x']); // '-weird-name' é flag-like, nunca path
  });

  it('--output=/etc/x: valor de flag que escreve em arquivo é candidato', () => {
    const a = analyzeCommandArgPaths(['--output=/etc/x']);
    expect(a.pathCandidates).toEqual(['/etc/x']);
  });
});

describe('CommandExecutor — arg-path scope guard (Wave 5 FIX 1)', () => {
  let root: string;
  let sink: FakeSink;
  let executor: RuntimeCommandExecutor;

  function req(overrides: Partial<CommandRequest> = {}): CommandRequest {
    return { command: 'cat', args: [], cwd: '.', ...overrides };
  }

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'nexo-argguard-'));
    await writeFile(path.join(root, 'arquivo-dentro.txt'), 'conteudo-dentro\n', 'utf8');
    sink = new FakeSink();
    executor = createCommandExecutor({ allowedRoot: root, audit: sink });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('cat /etc/passwd -> SCOPE_VIOLATION e NADA executa', async () => {
    const r = await executor.execute(req({ args: ['/etc/passwd'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCOPE_VIOLATION');
    expect(executor.processes.list()).toHaveLength(0); // nunca spawnado
    const deny = sink.events.at(-1);
    expect(deny?.decision).toBe('DENY');
    expect(deny?.details?.['reason']).toBe('SCOPE_VIOLATION');
  });

  it('cat ../../../etc/passwd -> SCOPE_VIOLATION (escape relativo)', async () => {
    const r = await executor.execute(req({ args: ['../../../etc/passwd'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCOPE_VIOLATION');
    expect(executor.processes.list()).toHaveLength(0);
  });

  it('cat arquivo-dentro.txt -> executa (200, conteúdo real)', async () => {
    const r = await executor.execute(req({ args: ['arquivo-dentro.txt'] }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.exitCode).toBe(0);
      expect(r.value.stdout).toBe('conteudo-dentro\n');
      expect(r.value.classification).toBe('SAFE');
    }
  });

  it('grep root /etc/passwd -> SCOPE_VIOLATION (pattern ok, path final não)', async () => {
    const r = await executor.execute(req({ command: 'grep', args: ['root', '/etc/passwd'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCOPE_VIOLATION');
    expect(executor.processes.list()).toHaveLength(0);
  });

  it('grep root arquivo-dentro.txt -> pattern não-path NÃO é falso positivo', async () => {
    await writeFile(path.join(root, 'hosts.txt'), 'root:x:0\nnobody:x:1\n', 'utf8');
    const r = await executor.execute(req({ command: 'grep', args: ['root', 'hosts.txt'] }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.exitCode).toBe(0);
      expect(r.value.stdout).toContain('root:x:0');
    }
  });

  it('symlink REAL dentro do root apontando para fora -> SCOPE_VIOLATION', async () => {
    await symlink('/etc/passwd', path.join(root, 'pwn-link'));
    const plain = await executor.execute(req({ args: ['pwn-link'] }));
    expect(plain.ok).toBe(false);
    if (!plain.ok) expect(plain.error.code).toBe('SCOPE_VIOLATION');

    const dotted = await executor.execute(req({ args: ['./pwn-link'] }));
    expect(dotted.ok).toBe(false);
    if (!dotted.ok) expect(dotted.error.code).toBe('SCOPE_VIOLATION');
    expect(executor.processes.list()).toHaveLength(0);
  });

  it('symlink de DIRETÓRIO para fora -> SCOPE_VIOLATION', async () => {
    await symlink('/etc', path.join(root, 'etc-link'));
    const r = await executor.execute(req({ args: ['etc-link/passwd'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCOPE_VIOLATION');
  });

  it('head -n 5 /etc/passwd -> SCOPE_VIOLATION; head -n 5 <dentro> -> ok', async () => {
    const out = await executor.execute(req({ command: 'head', args: ['-n', '5', '/etc/passwd'] }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe('SCOPE_VIOLATION');

    const inside = await executor.execute(req({ command: 'head', args: ['-n', '5', 'arquivo-dentro.txt'] }));
    expect(inside.ok).toBe(true);
    if (inside.ok) expect(inside.value.stdout).toBe('conteudo-dentro\n');
  });

  it('flag com valor-path fora do root (--flag=/etc/x) -> SCOPE_VIOLATION', async () => {
    // git diff é SAFE (subcomando read-only) mas --output= escreve em arquivo.
    const r = await executor.execute(req({ command: 'git', args: ['diff', '--output=/etc/pwn'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCOPE_VIOLATION');
    expect(existsSync('/etc/pwn')).toBe(false);
  });

  it('arg-path não analisável (~) -> REQUIRE_APPROVAL (rebaixado SAFE->RESTRICTED), nada executa', async () => {
    const r = await executor.execute(req({ args: ['~/secret'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('REQUIRE_APPROVAL');
      expect(r.error.requiresApproval).toBe(true);
      expect(r.error.details?.['downgradedFrom']).toBe('SAFE');
      expect(r.error.details?.['classification']).toBe('RESTRICTED');
    }
    expect(executor.processes.list()).toHaveLength(0);
    const deny = sink.events.at(-1);
    expect(deny?.decision).toBe('DENY');
    expect(deny?.details?.['reason']).toBe('UNANALYZABLE_PATH_ARGS');
  });

  it('cwd em subdir do root: paths resolvem contra o cwd real', async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(path.join(root, 'sub'));
    await writeFile(path.join(root, 'sub', 'local.txt'), 'local\n', 'utf8');
    const r = await executor.execute(req({ cwd: 'sub', args: ['local.txt'] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.stdout).toBe('local\n');

    const escape = await executor.execute(req({ cwd: 'sub', args: ['../../etc/passwd'] }));
    expect(escape.ok).toBe(false);
    if (!escape.ok) expect(escape.error.code).toBe('SCOPE_VIOLATION');
  });
});
