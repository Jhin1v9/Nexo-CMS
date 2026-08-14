import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, createTempRepo, git, headOf, makeCtx, makeHarness, writeRepoFile } from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

function repo(): string {
  const d = createTempRepo();
  dirs.push(d);
  return d;
}

describe('GitService.diff (doc 10 §11, diffs REAIS — nunca aproximados, §12)', () => {
  it('WORKTREE_VS_HEAD (default): mudança não commitada com numstat correto', async () => {
    const dir = repo();
    writeRepoFile(dir, 'README.md', '# temp repo\nsecond line\n');
    const { service } = makeHarness(dir);
    const r = await service.diff(makeCtx(), {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.mode).toBe('WORKTREE_VS_HEAD');
    expect(r.value.diff).toContain('+second line');
    expect(r.value.files).toEqual([{ path: 'README.md', additions: 1, deletions: 0 }]);
  });

  it('STAGED_VS_HEAD: mudança staged aparece; worktree-vs-head fica vazio', async () => {
    const dir = repo();
    writeRepoFile(dir, 'staged.txt', 'a\nb\n');
    git(dir, ['add', 'staged.txt']);
    const { service } = makeHarness(dir);
    const staged = await service.diff(makeCtx(), { mode: 'STAGED_VS_HEAD' });
    expect(staged.ok).toBe(true);
    if (staged.ok) {
      expect(staged.value.files).toEqual([{ path: 'staged.txt', additions: 2, deletions: 0 }]);
      expect(staged.value.diff).toContain('+a');
    }
    const worktree = await service.diff(makeCtx(), { mode: 'WORKTREE_VS_HEAD' });
    expect(worktree.ok).toBe(true);
    if (worktree.ok) {
      expect(worktree.value.files).toEqual([{ path: 'staged.txt', additions: 2, deletions: 0 }]);
    }
  });

  it('COMMIT_VS_PARENT: diff do commit contra o pai real', async () => {
    const dir = repo();
    writeRepoFile(dir, 'version.txt', 'v1\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'add version']);
    const head = headOf(dir);
    const { service } = makeHarness(dir);
    const r = await service.diff(makeCtx(), { mode: 'COMMIT_VS_PARENT', from: head });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.files).toEqual([{ path: 'version.txt', additions: 1, deletions: 0 }]);
    expect(r.value.diff).toContain('+v1');
  });

  it('COMMITS: hashA..hashB com diferença real entre commits', async () => {
    const dir = repo();
    const first = headOf(dir);
    writeRepoFile(dir, 'delta.txt', 'one\ntwo\nthree\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'delta']);
    const second = headOf(dir);
    const { service } = makeHarness(dir);
    const r = await service.diff(makeCtx(), { mode: 'COMMITS', from: first, to: second });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.files).toEqual([{ path: 'delta.txt', additions: 3, deletions: 0 }]);
  });

  it('BRANCHES: branchA..branchB com divergência real', async () => {
    const dir = repo();
    git(dir, ['checkout', '-q', '-b', 'branchB']);
    writeRepoFile(dir, 'only-b.txt', 'b\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'b change']);
    git(dir, ['checkout', '-q', 'main']);
    const { service } = makeHarness(dir);
    const r = await service.diff(makeCtx(), { mode: 'BRANCHES', from: 'main', to: 'branchB' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.files).toEqual([{ path: 'only-b.txt', additions: 1, deletions: 0 }]);
  });

  it('path filter: só o arquivo filtrado entra no numstat/patch', async () => {
    const dir = repo();
    writeRepoFile(dir, 'a.txt', 'a\n');
    writeRepoFile(dir, 'b.txt', 'b\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'track both']);
    writeRepoFile(dir, 'a.txt', 'a changed\n');
    writeRepoFile(dir, 'b.txt', 'b changed\n');
    const { service } = makeHarness(dir);
    const r = await service.diff(makeCtx(), { path: 'a.txt' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.files).toEqual([{ path: 'a.txt', additions: 1, deletions: 1 }]);
    expect(r.value.diff).toContain('a.txt');
    expect(r.value.diff).not.toContain('b.txt');
  });

  it('numstat de remoção: deletions contadas do diff real', async () => {
    const dir = repo();
    writeRepoFile(dir, 'gone.txt', 'x\ny\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'add gone']);
    git(dir, ['rm', '-q', 'gone.txt']);
    const { service } = makeHarness(dir);
    const r = await service.diff(makeCtx(), {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.files).toEqual([{ path: 'gone.txt', additions: 0, deletions: 2 }]);
  });

  it('modo inválido sem from/to -> INVALID_INPUT (não executa git)', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.diff(makeCtx(), { mode: 'COMMITS', from: headOf(dir) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });
});
