import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { GitStatusResult } from '../src/index.js';
import {
  cleanup,
  cloneRemote,
  createRepoWithRemote,
  createTempRepo,
  git,
  headOf,
  makeCtx,
  makeHarness,
  writeRepoFile,
} from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

function repo(): string {
  const d = createTempRepo();
  dirs.push(d);
  return d;
}

function asRepo(out: unknown): GitStatusResult {
  const o = out as GitStatusResult;
  expect(o.isRepo).toBe(true);
  return o;
}

describe('GitService.status (doc 10 §8/§10, repos reais)', () => {
  it('repo limpo -> CLEAN, branch main, sem tracking -> remoteState LOCAL', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = asRepo(r.value);
    expect(s.states).toContain('CLEAN');
    expect(s.branch).toBe('main');
    expect(s.detached).toBe(false);
    expect(s.head).toBe(headOf(dir));
    expect(s.repoRoot).toBe(dir);
    expect(s.tracking).toBeNull();
    expect(s.remoteState).toBe('LOCAL');
    expect(s.staged).toHaveLength(0);
    expect(s.unstaged).toHaveLength(0);
    expect(s.untracked).toHaveLength(0);
  });

  it('arquivo modificado -> MODIFIED com kind modified em unstaged', async () => {
    const dir = repo();
    writeRepoFile(dir, 'README.md', '# changed\n');
    const { service } = makeHarness(dir);
    const r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = asRepo(r.value);
    expect(s.states).toContain('MODIFIED');
    expect(s.states).not.toContain('CLEAN');
    expect(s.unstaged).toEqual([{ path: 'README.md', kind: 'modified' }]);
  });

  it('arquivo novo -> UNTRACKED listado', async () => {
    const dir = repo();
    writeRepoFile(dir, 'src/new-file.ts', 'export {}\n');
    const { service } = makeHarness(dir);
    const r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = asRepo(r.value);
    expect(s.states).toContain('UNTRACKED');
    expect(s.untracked).toContain('src/new-file.ts');
  });

  it('mudança staged -> STAGED com kind added/modified', async () => {
    const dir = repo();
    writeRepoFile(dir, 'added.txt', 'new\n');
    git(dir, ['add', 'added.txt']);
    writeRepoFile(dir, 'README.md', '# staged change\n');
    git(dir, ['add', 'README.md']);
    const { service } = makeHarness(dir);
    const r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = asRepo(r.value);
    expect(s.states).toContain('STAGED');
    const kinds = new Map(s.staged.map((c) => [c.path, c.kind]));
    expect(kinds.get('added.txt')).toBe('added');
    expect(kinds.get('README.md')).toBe('modified');
  });

  it('conflito real de merge -> CONFLICTED + conflicts[] + MERGE_IN_PROGRESS', async () => {
    const dir = repo();
    writeRepoFile(dir, 'conflict.txt', 'base\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'base']);
    git(dir, ['checkout', '-q', '-b', 'feature']);
    writeRepoFile(dir, 'conflict.txt', 'feature\n');
    git(dir, ['commit', '-qam', 'feature change']);
    git(dir, ['checkout', '-q', 'main']);
    writeRepoFile(dir, 'conflict.txt', 'main\n');
    git(dir, ['commit', '-qam', 'main change']);
    expect(() => git(dir, ['merge', 'feature'])).toThrow(); // conflito real

    const { service } = makeHarness(dir);
    const r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = asRepo(r.value);
    expect(s.states).toContain('CONFLICTED');
    expect(s.states).toContain('MERGE_IN_PROGRESS');
    expect(s.conflicts.map((c) => c.path)).toContain('conflict.txt');
    expect(s.conflicts[0]?.kind).toBe('unmerged');
  });

  it('detached HEAD -> DETACHED_HEAD, branch null, head = sha real', async () => {
    const dir = repo();
    const sha = headOf(dir);
    git(dir, ['checkout', '-q', sha]);
    const { service } = makeHarness(dir);
    const r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = asRepo(r.value);
    expect(s.states).toContain('DETACHED_HEAD');
    expect(s.detached).toBe(true);
    expect(s.branch).toBeNull();
    expect(s.head).toBe(sha);
  });

  it('diretório NÃO-repo -> isRepo false + NO_REPOSITORY (doc 10 §4: nunca fingir)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'nexo-git-norepo-'));
    dirs.push(dir);
    writeRepoFile(dir, 'file.txt', 'plain\n');
    const { service } = makeHarness(dir);
    const r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.isRepo).toBe(false);
    expect(r.value.states).toEqual(['NO_REPOSITORY']);
  });

  it('remoteState: REMOTE (0/0 com tracking), AHEAD, BEHIND, DIVERGED contra bare real', async () => {
    const { dir, bare } = createRepoWithRemote();
    dirs.push(dir, bare);
    const { service } = makeHarness(dir);

    // 0/0 com tracking -> REMOTE (escolha documentada: sincronizado).
    let r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (r.ok) {
      const s = asRepo(r.value);
      expect(s.tracking).toBe('origin/main');
      expect(s.remoteState).toBe('REMOTE');
    }

    // commit local sem push -> AHEAD.
    writeRepoFile(dir, 'ahead.txt', '1\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'ahead']);
    r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (r.ok) {
      const s = asRepo(r.value);
      expect(s.ahead).toBe(1);
      expect(s.behind).toBe(0);
      expect(s.remoteState).toBe('AHEAD');
    }

    // "outro" clone empurra commit -> DIVERGED (ahead=1, behind=1).
    const other = cloneRemote(bare);
    dirs.push(other);
    writeRepoFile(other, 'other.txt', 'x\n');
    git(other, ['add', '.']);
    git(other, ['commit', '-q', '-m', 'other commit']);
    git(other, ['push', '-q', 'origin', 'main']);
    git(dir, ['fetch', '-q', 'origin']);
    r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (r.ok) {
      const s = asRepo(r.value);
      expect(s.ahead).toBe(1);
      expect(s.behind).toBe(1);
      expect(s.remoteState).toBe('DIVERGED');
    }

    // alinhar local ao remoto -> BEHIND puro.
    git(dir, ['reset', '-q', '--hard', 'origin/main']);
    r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (r.ok) {
      const s = asRepo(r.value);
      expect(s.ahead).toBe(0);
      expect(s.behind).toBe(0);
      expect(s.remoteState).toBe('REMOTE');
    }
  });

  it('BEHIND puro: remoto avança, local só faz fetch', async () => {
    const { dir, bare } = createRepoWithRemote();
    dirs.push(dir, bare);
    const other = cloneRemote(bare);
    dirs.push(other);
    writeRepoFile(other, 'remote-only.txt', 'x\n');
    git(other, ['add', '.']);
    git(other, ['commit', '-q', '-m', 'remote ahead']);
    git(other, ['push', '-q', 'origin', 'main']);
    git(dir, ['fetch', '-q', 'origin']);

    const { service } = makeHarness(dir);
    const r = await service.status(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = asRepo(r.value);
    expect(s.behind).toBe(1);
    expect(s.ahead).toBe(0);
    expect(s.remoteState).toBe('BEHIND');
  });
});
