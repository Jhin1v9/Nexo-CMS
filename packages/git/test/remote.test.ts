import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanup,
  cloneRemote,
  createRepoWithRemote,
  git,
  headOf,
  makeCtx,
  makeHarness,
  writeRepoFile,
} from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

function setup(): { dir: string; bare: string } {
  const s = createRepoWithRemote();
  dirs.push(s.dir, s.bare);
  return s;
}

function otherPushes(bare: string, file: string, content: string, message: string): string {
  const other = cloneRemote(bare);
  dirs.push(other);
  writeRepoFile(other, file, content);
  git(other, ['add', '.']);
  git(other, ['commit', '-q', '-m', message]);
  git(other, ['push', '-q', 'origin', 'main']);
  return other;
}

describe('push/pull/fetch contra bare remote REAL (doc 10 §24-§28)', () => {
  it('push sobe o commit: rev-parse no bare confirma + verified:true (doc 10 §59)', async () => {
    const { dir, bare } = setup();
    writeRepoFile(dir, 'pushed.txt', 'p\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'to push']);
    const head = headOf(dir);

    const { service } = makeHarness(dir);
    const r = await service.push(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.pushed).toBe(true);
    expect(r.value.remote).toBe('origin');
    expect(r.value.branch).toBe('main');
    expect(r.value.verified).toBe(true);
    // Verificação independente no bare (No Fake Success).
    expect(git(bare, ['rev-parse', 'main']).trim()).toBe(head);
  });

  it('push com branch explícita usa -u e vincula upstream (doc 10 §63)', async () => {
    const { dir, bare } = setup();
    git(dir, ['checkout', '-q', '-b', 'topic']);
    writeRepoFile(dir, 'topic.txt', 't\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'topic work']);

    const { service } = makeHarness(dir);
    const r = await service.push(makeCtx(), { branch: 'topic' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.branch).toBe('topic');
    expect(git(bare, ['rev-parse', 'topic']).trim()).toBe(headOf(dir));
    expect(git(dir, ['rev-parse', '--abbrev-ref', 'topic@{u}']).trim()).toBe('origin/topic');
  });

  it('push sem tracking e sem branch explícita -> NoTrackingBranch (doc 10 §63)', async () => {
    const { dir } = setup();
    git(dir, ['checkout', '-q', '-b', 'no-upstream']);
    writeRepoFile(dir, 'n.txt', 'n\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'no upstream work']);

    const { service } = makeHarness(dir);
    const r = await service.push(makeCtx());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.details?.['gitError']).toBe('NoTrackingBranch');
    expect(r.error.details?.['nextAction']).toBe('push-with-explicit-remote-branch');
  });

  it('NonFastForward: histórico divergente -> CONFLICT com nextAction fetch-and-pull', async () => {
    const { dir, bare } = setup();
    otherPushes(bare, 'theirs.txt', 'theirs\n', 'other advanced');
    writeRepoFile(dir, 'mine.txt', 'mine\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'local diverges']);

    const { service } = makeHarness(dir);
    const r = await service.push(makeCtx());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('CONFLICT');
    expect(r.error.details?.['gitError']).toBe('NonFastForward');
    expect(r.error.details?.['nextAction']).toBe('fetch-and-pull');
    // Commit local preservado (doc 10 §24: push falho não apaga commit).
    expect(git(dir, ['log', '-1', '--format=%s']).trim()).toBe('local diverges');
  });

  it('pull ALREADY_UP_TO_DATE quando remoto não mudou', async () => {
    const { dir } = setup();
    const { service } = makeHarness(dir);
    const r = await service.pull(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.result).toBe('ALREADY_UP_TO_DATE');
    expect(r.value.piRefreshRecommended).toBe(false);
    expect(r.value.head).toBe(headOf(dir));
  });

  it('pull UPDATED: commit de "outro" clone chega ao working tree + piRefreshRecommended (doc 10 §49/§60)', async () => {
    const { dir, bare } = setup();
    otherPushes(bare, 'from-other.txt', 'arrived\n', 'other work');
    const before = headOf(dir);

    const { service } = makeHarness(dir);
    const r = await service.pull(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.result).toBe('UPDATED');
    expect(r.value.piRefreshRecommended).toBe(true);
    expect(r.value.head).not.toBe(before);
    expect(r.value.head).toBe(headOf(dir));
    // Working tree realmente atualizado (doc 10 §60).
    const st = await service.status(makeCtx());
    if (st.ok && st.value.isRepo) expect(st.value.states).toContain('CLEAN');
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(`${dir}/from-other.txt`, 'utf8')).toBe('arrived\n');
  });

  it('pull com working tree dirty -> CONFLICT WorkingTreeDirty ANTES de executar (doc 10 §26/§47)', async () => {
    const { dir, bare } = setup();
    otherPushes(bare, 'remote-new.txt', 'r\n', 'remote new');
    writeRepoFile(dir, 'README.md', 'dirty local\n');
    const head = headOf(dir);

    const { service } = makeHarness(dir);
    const r = await service.pull(makeCtx());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('CONFLICT');
    expect(r.error.details?.['gitError']).toBe('WorkingTreeDirty');
    // Pull NÃO executado: HEAD intacto e mudança local preservada.
    expect(headOf(dir)).toBe(head);
  });

  it('pull com conflito real de merge -> CONFLICT MergeConflict + arquivos conflitados (doc 10 §35)', async () => {
    const { dir, bare } = setup();
    writeRepoFile(dir, 'shared.txt', 'base\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'shared base']);
    git(dir, ['push', '-q', 'origin', 'main']);

    otherPushes(bare, 'shared.txt', 'their version\n', 'their edit');
    writeRepoFile(dir, 'shared.txt', 'my version\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'my edit']);

    const { service } = makeHarness(dir);
    const r = await service.pull(makeCtx());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('CONFLICT');
    expect(r.error.details?.['gitError']).toBe('MergeConflict');
    expect(r.error.details?.['conflicts']).toEqual(['shared.txt']);
    // Estado real: merge em progresso com conflito registrado (não fingir merge completo).
    const st = await service.status(makeCtx());
    if (st.ok && st.value.isRepo) {
      expect(st.value.states).toContain('CONFLICTED');
      expect(st.value.states).toContain('MERGE_IN_PROGRESS');
    }
  });

  it('fetch atualiza refs remotos SEM tocar working tree (doc 10 §27)', async () => {
    const { dir, bare } = setup();
    otherPushes(bare, 'fetch-me.txt', 'f\n', 'fetchable');
    const head = headOf(dir);

    const { service } = makeHarness(dir);
    const r = await service.fetch(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.fetched).toBe(true);
    expect(r.value.remote).toBe('origin');
    // Working tree intacto; HEAD inalterado; ref remoto atualizado (BEHIND).
    expect(headOf(dir)).toBe(head);
    const st = await service.status(makeCtx());
    if (st.ok && st.value.isRepo) {
      expect(st.value.states).toContain('CLEAN');
      expect(st.value.remoteState).toBe('BEHIND');
    }
    const { existsSync } = await import('node:fs');
    expect(existsSync(`${dir}/fetch-me.txt`)).toBe(false);
  });

  it('fetch em remote inexistente -> NOT_FOUND RemoteNotFound', async () => {
    const { dir } = setup();
    const { service } = makeHarness(dir);
    const r = await service.fetch(makeCtx(), { remote: 'no-such-remote' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
    expect(r.error.details?.['gitError']).toBe('RemoteNotFound');
  });
});
