import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, createTempRepo, git, headOf, makeCtx, makeHarness, writeRepoFile } from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

function repo(): string {
  const d = createTempRepo();
  dirs.push(d);
  return d;
}

describe('GitService.history (doc 10 §41, git log REAL)', () => {
  it('commits com parents, refs, autor/committer e datas reais', async () => {
    const dir = repo();
    const first = headOf(dir);
    writeRepoFile(dir, 'second.txt', '2\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'second commit']);
    const second = headOf(dir);

    const { service } = makeHarness(dir);
    const r = await service.history(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);

    const [head, initial] = r.value;
    expect(head!.hash).toBe(second);
    expect(head!.message).toBe('second commit');
    expect(head!.parents).toEqual([first]);
    expect(head!.authorName).toBe('Nexo Test');
    expect(head!.authorEmail).toBe('nexo-test@example.com');
    expect(head!.committerName).toBe('Nexo Test');
    expect(head!.committerEmail).toBe('nexo-test@example.com');
    expect(head!.dateISO).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // refs do HEAD incluem a branch atual (formato %D: "HEAD -> main").
    expect(head!.refs.some((ref) => ref.includes('main'))).toBe(true);

    expect(initial!.hash).toBe(first);
    expect(initial!.message).toBe('initial commit');
    expect(initial!.parents).toEqual([]);
  });

  it('limit é respeitado e clampado em [1,100] (doc 10 §43)', async () => {
    const dir = repo();
    for (let i = 0; i < 3; i++) {
      writeRepoFile(dir, `f${i}.txt`, `${i}\n`);
      git(dir, ['add', '.']);
      git(dir, ['commit', '-q', '-m', `commit ${i}`]);
    }
    const { service } = makeHarness(dir);

    const two = await service.history(makeCtx(), { limit: 2 });
    expect(two.ok).toBe(true);
    if (two.ok) expect(two.value).toHaveLength(2);

    // limit 0 -> clamp para 1 (nunca inventar histórico além do pedido).
    const zero = await service.history(makeCtx(), { limit: 0 });
    expect(zero.ok).toBe(true);
    if (zero.ok) expect(zero.value).toHaveLength(1);

    // limit acima do máximo -> clamp para 100 (repo tem 4 commits no total).
    const huge = await service.history(makeCtx(), { limit: 500 });
    expect(huge.ok).toBe(true);
    if (huge.ok) expect(huge.value).toHaveLength(4);
  });

  it('ref específico: histórico da branch pedida', async () => {
    const dir = repo();
    git(dir, ['checkout', '-q', '-b', 'side']);
    writeRepoFile(dir, 'side.txt', 's\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'side commit']);
    git(dir, ['checkout', '-q', 'main']);

    const { service } = makeHarness(dir);
    const r = await service.history(makeCtx(), { ref: 'side' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]!.message).toBe('side commit');
  });

  it('history em não-repo -> NOT_FOUND RepositoryNotFound com operationId do ctx', async () => {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const path = await import('node:path');
    const dir = mkdtempSync(path.join(tmpdir(), 'nexo-git-norepo-'));
    dirs.push(dir);
    const { service } = makeHarness(dir);
    const ctx = makeCtx();
    const r = await service.history(ctx);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
    expect(r.error.details?.['gitError']).toBe('RepositoryNotFound');
    expect(r.error.operationId).toBe(ctx.operationId);
  });
});
