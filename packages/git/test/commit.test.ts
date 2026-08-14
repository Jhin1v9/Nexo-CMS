import { chmodSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, createTempRepo, git, headOf, makeCtx, makeHarness, writeRepoFile } from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

function repo(): string {
  const d = createTempRepo();
  dirs.push(d);
  return d;
}

function committedFiles(dir: string, ref = 'HEAD'): string[] {
  return git(dir, ['diff-tree', '--no-commit-id', '--name-only', '-r', ref])
    .split('\n')
    .filter((l) => l.length > 0);
}

describe('GitService.commit (doc 10 §19-§22, fluxo completo + verificação §58)', () => {
  it('default = somente staged: unstaged NÃO entra no commit (D5, doc 10 §20)', async () => {
    const dir = repo();
    writeRepoFile(dir, 'staged.txt', 'staged\n');
    git(dir, ['add', 'staged.txt']);
    writeRepoFile(dir, 'README.md', 'unstaged change\n');

    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'only staged' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verified).toBe(true);
    expect(r.value.commit.message).toBe('only staged');
    expect(r.value.commit.author).toBe('Nexo Test <nexo-test@example.com>');
    expect(committedFiles(dir)).toEqual(['staged.txt']);
    // README continua modificado e não commitado.
    const st = await service.status(makeCtx());
    expect(st.ok && st.value.isRepo && st.value.unstaged.map((c) => c.path)).toBeTruthy();
    if (st.ok && st.value.isRepo) {
      expect(st.value.unstaged.map((c) => c.path)).toContain('README.md');
    }
  });

  it('files[] = staging explícito: arquivo não listado NÃO entra (D5)', async () => {
    const dir = repo();
    writeRepoFile(dir, 'a.txt', 'a\n');
    writeRepoFile(dir, 'b.txt', 'b\n');
    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'only a', files: ['a.txt'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(committedFiles(dir, r.value.commit.hash)).toEqual(['a.txt']);
  });

  it('all=true: tudo entra (opt-in explícito) e tree fica CLEAN', async () => {
    const dir = repo();
    writeRepoFile(dir, 'a.txt', 'a\n');
    writeRepoFile(dir, 'README.md', 'changed\n');
    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'all in', all: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(committedFiles(dir, r.value.commit.hash).sort()).toEqual(['README.md', 'a.txt']);
    const st = await service.status(makeCtx());
    if (st.ok && st.value.isRepo) expect(st.value.states).toContain('CLEAN');
  });

  it("files + all juntos -> INVALID_INPUT (escopo ambíguo)", async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'x', files: ['a.txt'], all: true });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('expectedHead correto -> commit ocorre; hash novo existe de verdade (cat-file)', async () => {
    const dir = repo();
    writeRepoFile(dir, 'e.txt', 'e\n');
    git(dir, ['add', '.']);
    const { service } = makeHarness(dir);
    const before = headOf(dir);
    const r = await service.commit(makeCtx(), { message: 'expected ok', expectedHead: before });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.commit.hash).not.toBe(before);
    expect(git(dir, ['cat-file', '-t', r.value.commit.hash]).trim()).toBe('commit');
    expect(git(dir, ['rev-parse', 'HEAD']).trim()).toBe(r.value.commit.hash);
  });

  it('expectedHead divergente -> CONFLICT Expected HEAD mismatch (doc 10 §66/§67)', async () => {
    const dir = repo();
    const stale = headOf(dir);
    writeRepoFile(dir, 'external.txt', 'external\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'external change']); // mudança externa após a leitura
    writeRepoFile(dir, 'mine.txt', 'mine\n');
    git(dir, ['add', '.']);

    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'mine', expectedHead: stale });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('CONFLICT');
    expect(r.error.message).toContain('Expected HEAD mismatch');
    expect(r.error.details?.['expectedHead']).toBe(stale);
    expect(r.error.details?.['actualHead']).toBe(headOf(dir));
  });

  it("expectedHead com lixo -> INVALID_INPUT InvalidReference", async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'x', expectedHead: 'not-a-hash!!' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
    expect(r.error.details?.['gitError']).toBe('InvalidReference');
  });

  it('nada a commitar -> INVALID_INPUT "nothing to commit" mapeado do git real', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'empty' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
    expect(r.error.message).toContain('nothing to commit');
  });

  it('mensagem vazia -> INVALID_INPUT (doc 10 §21: mensagem explícita)', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: '   ' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('pre-commit hook que falha -> HookFailed, INTERNAL, hookFailed=true, SEM commit (doc 10 §54/§57)', async () => {
    const dir = repo();
    const hooksDir = path.join(dir, '.git', 'hooks');
    const hook = path.join(hooksDir, 'pre-commit');
    writeFileSync(hook, '#!/bin/sh\necho "pre-commit hook rejected by policy" >&2\nexit 1\n', { mode: 0o755 });
    chmodSync(hook, 0o755);
    writeRepoFile(dir, 'hooked.txt', 'h\n');
    git(dir, ['add', '.']);
    const before = headOf(dir);

    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'should be rejected' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INTERNAL');
    expect(r.error.details?.['gitError']).toBe('HookFailed');
    expect(r.error.details?.['hookFailed']).toBe(true);
    expect(String(r.error.details?.['stderr'])).toContain('hook');
    // HEAD não avançou: o commit rejeitado pelo hook não existe.
    expect(headOf(dir)).toBe(before);
  });

  it('commit em não-repo -> NOT_FOUND RepositoryNotFound', async () => {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const pathMod = await import('node:path');
    const dir = mkdtempSync(pathMod.join(tmpdir(), 'nexo-git-norepo-'));
    dirs.push(dir);
    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'x', all: true });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
    expect(r.error.details?.['gitError']).toBe('RepositoryNotFound');
  });
});
