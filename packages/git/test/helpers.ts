/**
 * Helpers de teste do @nexo/git: repositórios REAIS em tmpdir via git CLI
 * (doc 10 §82 passo 15 / doc 13 §48). Helpers de TESTE usam execFileSync
 * direto (fora da fronteira do executor); o código sob teste usa SEMPRE o
 * CommandExecutor real com allowedRoot = dir do repo temporário.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { Actor, ExecutionContext } from '@nexo/core';
import type { AuditEvent, AuditSink } from '@nexo/security';
import { newOperationId } from '@nexo/shared';
import { createCommandExecutor, type RuntimeCommandExecutor } from '@nexo/runtime';

import { createGitService, type GitService } from '../src/index.js';

/** Executa git real num fixture (apenas para SETUP/verificação de teste). */
export function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export class FakeAuditSink implements AuditSink {
  events: AuditEvent[] = [];
  record(e: AuditEvent): void {
    this.events.push(e);
  }
}

export const TEST_ACTOR: Actor = { kind: 'SYSTEM', id: 'git-test' };

export function makeCtx(): ExecutionContext {
  return { operationId: newOperationId(), initiatedBy: TEST_ACTOR, executedBy: TEST_ACTOR };
}

export function makeExecutor(dir: string, sink?: AuditSink): RuntimeCommandExecutor {
  return createCommandExecutor({ allowedRoot: dir, ...(sink !== undefined ? { audit: sink } : {}), actor: TEST_ACTOR });
}

export interface TestHarness {
  dir: string;
  service: GitService;
  executor: RuntimeCommandExecutor;
  sink: FakeAuditSink;
}

/** Repo temporário real: git init -b main + user local + commit inicial. */
export function createTempRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-git-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.name', 'Nexo Test']);
  git(dir, ['config', 'user.email', 'nexo-test@example.com']);
  writeRepoFile(dir, 'README.md', '# temp repo\n');
  git(dir, ['add', '.']);
  git(dir, ['commit', '-q', '-m', 'initial commit']);
  return dir;
}

/** Remote bare real em tmpdir (push/pull/fetch contra repo local, sem rede). */
export function createBareRemote(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-git-bare-'));
  git(dir, ['init', '-q', '--bare', '-b', 'main']);
  return dir;
}

/** Repo + origin bare vinculado e push inicial com upstream. */
export function createRepoWithRemote(): { dir: string; bare: string } {
  const dir = createTempRepo();
  const bare = createBareRemote();
  git(dir, ['remote', 'add', 'origin', bare]);
  git(dir, ['push', '-u', 'origin', 'main']);
  return { dir, bare };
}

/** Clone real do bare (simula "outro" colaborador nos cenários de pull/push). */
export function cloneRemote(bare: string): string {
  const parent = mkdtempSync(path.join(tmpdir(), 'nexo-git-clone-'));
  const dir = path.join(parent, 'work');
  git(parent, ['clone', '-q', bare, 'work']);
  git(dir, ['config', 'user.name', 'Other Dev']);
  git(dir, ['config', 'user.email', 'other-dev@example.com']);
  return dir;
}

export function writeRepoFile(dir: string, rel: string, content: string): void {
  const abs = path.join(dir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
}

export function makeHarness(dir: string): TestHarness {
  const sink = new FakeAuditSink();
  const executor = makeExecutor(dir, sink);
  const service = createGitService({ executorFactory: () => executor });
  return { dir, service, executor, sink };
}

export function cleanup(...dirs: Array<string | undefined>): void {
  for (const d of dirs) {
    if (d !== undefined) rmSync(d, { recursive: true, force: true });
  }
}

/** HEAD real do fixture (para expectedHead / verificações). */
export function headOf(dir: string, ref = 'HEAD'): string {
  return git(dir, ['rev-parse', ref]).trim();
}
