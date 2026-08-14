import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, createTempRepo, git, makeCtx, makeHarness, writeRepoFile } from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

function repo(): string {
  const d = createTempRepo();
  dirs.push(d);
  return d;
}

describe('security probes (anti flag-injection + contenção de paths)', () => {
  it('branch name com flag injection -> INVALID_INPUT sem criar branch', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    for (const bad of ['-x', '--help', '--upload-pack=evil']) {
      const r = await service.branchCreate(makeCtx(), { name: bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INVALID_INPUT');
    }
    expect(git(dir, ['branch', '--list']).split('\n').filter(Boolean)).toEqual(['* main']);
  });

  it("path '../escape' em files do commit -> INVALID_INPUT; nada staged/commitado", async () => {
    const dir = repo();
    writeRepoFile(dir, 'ok.txt', 'ok\n');
    const { service } = makeHarness(dir);
    const r = await service.commit(makeCtx(), { message: 'escape', files: ['../escape.txt'] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
    expect(git(dir, ['status', '--porcelain']).trim().length).toBeGreaterThan(0); // ok.txt segue untracked
  });

  it('path absoluto e null byte em files -> INVALID_INPUT', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const abs = await service.commit(makeCtx(), { message: 'x', files: ['/etc/passwd'] });
    expect(abs.ok).toBe(false);
    if (!abs.ok) expect(abs.error.code).toBe('INVALID_INPUT');
    const nul = await service.commit(makeCtx(), { message: 'x', files: ['a\0b'] });
    expect(nul.ok).toBe(false);
    if (!nul.ok) expect(nul.error.code).toBe('INVALID_INPUT');
  });

  it('ref com flag injection em history/diff/revParse -> INVALID_INPUT', async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const h = await service.history(makeCtx(), { ref: '--all-malicious' });
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.error.code).toBe('INVALID_INPUT');
    const d = await service.diff(makeCtx(), { mode: 'COMMITS', from: '--output=/tmp/x', to: 'HEAD' });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error.code).toBe('INVALID_INPUT');
  });

  it("push branch '--force' -> INVALID_INPUT (force NUNCA via args, doc 10 §25)", async () => {
    const dir = repo();
    const { service } = makeHarness(dir);
    const r = await service.push(makeCtx(), { branch: '--force' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_INPUT');
  });
});

describe('audit (SPEC §0: todo processo git registrado pelo executor)', () => {
  it('sink fake registra eventos ALLOW dos processos git com actor correto', async () => {
    const dir = repo();
    const { service, sink } = makeHarness(dir);
    await service.status(makeCtx());
    writeRepoFile(dir, 'a.txt', 'a\n');
    await service.commit(makeCtx(), { message: 'audited', all: true });

    expect(sink.events.length).toBeGreaterThan(0);
    for (const e of sink.events) {
      expect(e.what).toBe('runtime.command.execute');
      expect(e.decision).toBe('ALLOW');
      expect(e.who.id).toBe('git-test');
      expect(e.context.operationId).toBeTruthy();
      expect(e.resource).toMatch(/^git /);
    }
    const resources = sink.events.map((e) => e.resource ?? '');
    expect(resources.some((r) => r.startsWith('git status'))).toBe(true);
    expect(resources.some((r) => r.startsWith('git commit'))).toBe(true);
    expect(sink.events.every((e) => e.at.length > 0 && e.id.length > 0)).toBe(true);
  });
});
