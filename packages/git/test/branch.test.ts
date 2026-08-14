import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, createTempRepo, git, makeCtx, makeHarness, writeRepoFile } from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

function repo(): string {
  const d = createTempRepo();
  dirs.push(d);
  return d;
}

describe('branches (doc 10 §14-§18, git real)', () => {
  it('list: flag current na branch atual', async () => {
    const dir = repo();
    git(dir, ['checkout', '-q', '-b', 'other']);
    git(dir, ['checkout', '-q', 'main']);
    const { service } = makeHarness(dir);
    const r = await service.branchList(makeCtx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const names = r.value.map((b) => b.name);
    expect(names).toEqual(expect.arrayContaining(['main', 'other']));
    expect(r.value.find((b) => b.name === 'main')?.current).toBe(true);
    expect(r.value.find((b) => b.name === 'other')?.current).toBe(false);
    expect(r.value.find((b) => b.name === 'main')?.head).toBe(git(dir, ['rev-parse', 'main']).trim());
  });

  it('create: nome válido cria branch real; checkout opcional', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.branchCreate(makeCtx(), { name: 'feature/x' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ created: true, name: 'feature/x', checkedOut: false });
    expect(git(dir, ['branch', '--list', 'feature/x']).trim()).toBe('feature/x');

    const r2 = await service.branchCreate(makeCtx(), { name: 'with-checkout', checkout: true });
    expect(r2.ok).toBe(true);
    expect(git(dir, ['branch', '--show-current']).trim()).toBe('with-checkout');
  });

  it("create: nome inválido '..bad' -> InvalidReference (check-ref-format real, doc 10 §15)", async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.branchCreate(makeCtx(), { name: '..bad' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
    expect(r.error.details?.['gitError']).toBe('InvalidReference');
    expect(git(dir, ['branch', '--list']).trim()).not.toContain('..bad');
  });

  it("create: nome '-x' -> INVALID_INPUT (anti flag-injection, sem executar git)", async () => {
    const dir = repo();
    const { service, sink } = makeHarness(dir);
    const before = sink.events.length;
    const r = await service.branchCreate(makeCtx(), { name: '-x' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
    // check-ref-format do client valida nome, mas '-x' é barrado antes de qualquer execução de branch.
    const branchExecs = sink.events.slice(before).filter((e) => e.resource?.startsWith('git branch '));
    expect(branchExecs).toHaveLength(0);
  });

  it('switch: tree limpa -> SWITCHED e branch atual muda de verdade', async () => {
    const dir = repo();
    git(dir, ['checkout', '-q', '-b', 'target']);
    git(dir, ['checkout', '-q', 'main']);
    const { service } = makeHarness(dir);
    const r = await service.branchSwitch(makeCtx(), { name: 'target' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.result).toBe('SWITCHED');
    expect(r.value.branch).toBe('target');
    expect(git(dir, ['branch', '--show-current']).trim()).toBe('target');
  });

  it('switch: dirty conflitante -> REQUIRES_COMMIT SEM descartar mudanças (doc 10 §16)', async () => {
    const dir = repo();
    git(dir, ['checkout', '-q', '-b', 'other']);
    writeRepoFile(dir, 'README.md', 'other version\n');
    git(dir, ['commit', '-qam', 'other readme']);
    git(dir, ['checkout', '-q', 'main']);
    writeRepoFile(dir, 'README.md', 'local uncommitted\n');

    const { service } = makeHarness(dir);
    const r = await service.branchSwitch(makeCtx(), { name: 'other' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(['REQUIRES_COMMIT', 'BLOCKED']).toContain(r.value.result);
    // Mudança local INTACTA e ainda na branch original (Inv. 47, doc 10 §16).
    expect(readFileSync(path.join(dir, 'README.md'), 'utf8')).toBe('local uncommitted\n');
    expect(git(dir, ['branch', '--show-current']).trim()).toBe('main');
  });

  it('switch: branch inexistente -> NOT_FOUND BranchNotFound', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.branchSwitch(makeCtx(), { name: 'no-such-branch' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NOT_FOUND');
    expect(r.error.details?.['gitError']).toBe('BranchNotFound');
  });

  it('delete: branch mergeada -> removida de verdade', async () => {
    const dir = repo();
    git(dir, ['branch', 'merged-branch']);
    const { service } = makeHarness(dir);
    const r = await service.branchDelete(makeCtx(), { name: 'merged-branch' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ deleted: true, name: 'merged-branch' });
    expect(git(dir, ['branch', '--list', 'merged-branch']).trim()).toBe('');
  });

  it('delete: branch ATUAL -> INVALID_INPUT', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.branchDelete(makeCtx(), { name: 'main' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
    expect(git(dir, ['branch', '--list', 'main', '--format=%(refname:short)']).trim()).toBe('main');
  });

  it('delete: não mergeada sem force -> CONFLICT (git recusa de verdade)', async () => {
    const dir = repo();
    git(dir, ['checkout', '-q', '-b', 'unmerged']);
    writeRepoFile(dir, 'unmerged.txt', 'u\n');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-q', '-m', 'unmerged work']);
    git(dir, ['checkout', '-q', 'main']);
    const { service } = makeHarness(dir);
    const r = await service.branchDelete(makeCtx(), { name: 'unmerged' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('CONFLICT');
    expect(git(dir, ['branch', '--list', 'unmerged']).trim()).toBe('unmerged');
  });

  it("delete: force=true -> UNSUPPORTED apontando capability reservada 'git.branch.deleteForce' (D3, doc 10 §17/§70)", async () => {
    const dir = repo();
    git(dir, ['branch', 'some-branch']);
    const { service } = makeHarness(dir);
    const r = await service.branchDelete(makeCtx(), { name: 'some-branch', force: true });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('UNSUPPORTED');
    expect(r.error.requiredCapability).toBe('git.branch.deleteForce');
    // Branch NÃO deletada: force nunca é executado no M2.
    expect(git(dir, ['branch', '--list', 'some-branch']).trim()).toBe('some-branch');
  });
});
