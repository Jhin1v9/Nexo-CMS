import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createScopedFilesystem, type ScopedFilesystem } from '../src/index.js';

describe('ScopedFilesystem (SPEC §4)', () => {
  let root: string;
  let outside: string;
  let fsx: ScopedFilesystem;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'nexo-root-'));
    outside = await mkdtemp(path.join(tmpdir(), 'nexo-outside-'));
    await writeFile(path.join(root, 'hello.txt'), 'hello nexo', 'utf8');
    await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'src', 'index.ts'), 'export {};\n', 'utf8');
    await writeFile(path.join(outside, 'secret.txt'), 'top secret', 'utf8');
    fsx = createScopedFilesystem(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });

  it('readFile dentro do root funciona', async () => {
    const r = await fsx.readFile('hello.txt');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('hello nexo');
  });

  it("escape '../' é rejeitado com SCOPE_VIOLATION", async () => {
    const r = await fsx.readFile('../outside/secret.txt'.replace('outside', path.basename(outside)));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('SCOPE_VIOLATION');
      expect(r.error.retryable).toBe(false);
    }
    const r2 = await fsx.readFile('../../etc/passwd');
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe('SCOPE_VIOLATION');
  });

  it('absolute path escape é rejeitado com SCOPE_VIOLATION', async () => {
    const r = await fsx.readFile(path.join(outside, 'secret.txt'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCOPE_VIOLATION');
  });

  it('symlink DENTRO do root apontando para fora é rejeitado (realpath)', async () => {
    await symlink(path.join(outside, 'secret.txt'), path.join(root, 'evil-link'));
    const r = await fsx.readFile('evil-link');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCOPE_VIOLATION');

    const st = await fsx.stat('evil-link');
    expect(st.ok).toBe(false);
    if (!st.ok) expect(st.error.code).toBe('SCOPE_VIOLATION');
  });

  it('symlink de DIRETÓRIO para fora: writeFile através dele é rejeitado', async () => {
    await symlink(outside, path.join(root, 'dir-link'));
    const w = await fsx.writeFile('dir-link/pwned.txt', 'x', { overwrite: true });
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.error.code).toBe('SCOPE_VIOLATION');
  });

  it('symlink para alvo DENTRO do root é permitido', async () => {
    await symlink(path.join(root, 'hello.txt'), path.join(root, 'good-link'));
    const r = await fsx.readFile('good-link');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('hello nexo');
  });

  it('readFile inexistente -> NOT_FOUND', async () => {
    const r = await fsx.readFile('nope.txt');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('writeFile sem overwrite em arquivo existente -> CONFLICT', async () => {
    const w = await fsx.writeFile('hello.txt', 'changed', { overwrite: false });
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.error.code).toBe('CONFLICT');
    // conteúdo preservado (Invariante: não ser máquina de sobrescrever)
    expect(await readFile(path.join(root, 'hello.txt'), 'utf8')).toBe('hello nexo');
  });

  it('writeFile com overwrite explícito sobrescreve; arquivo novo cria', async () => {
    const w = await fsx.writeFile('hello.txt', 'changed', { overwrite: true });
    expect(w.ok).toBe(true);
    expect(await readFile(path.join(root, 'hello.txt'), 'utf8')).toBe('changed');

    const w2 = await fsx.writeFile('new.txt', 'brand new', { overwrite: false });
    expect(w2.ok).toBe(true);
    expect(await readFile(path.join(root, 'new.txt'), 'utf8')).toBe('brand new');
  });

  it('listDir retorna entradas com kind correto', async () => {
    await symlink(path.join(root, 'hello.txt'), path.join(root, 'lk'));
    const r = await fsx.listDir('.');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const byName = new Map(r.value.map((e) => [e.name, e.kind]));
      expect(byName.get('hello.txt')).toBe('file');
      expect(byName.get('src')).toBe('dir');
      expect(byName.get('lk')).toBe('symlink');
      for (const e of r.value) expect(e.mtime).toBeTruthy();
    }
  });

  it('listDir em diretório inexistente -> NOT_FOUND', async () => {
    const r = await fsx.listDir('no-such-dir');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('exists: true dentro, false para inexistente e false para escape', async () => {
    expect(await fsx.exists('hello.txt')).toBe(true);
    expect(await fsx.exists('nope.txt')).toBe(false);
    expect(await fsx.exists('../../etc/passwd')).toBe(false);
  });

  it('stat retorna DirEntry com size/mtime', async () => {
    const r = await fsx.stat('hello.txt');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.kind).toBe('file');
      expect(r.value.size).toBe('hello nexo'.length);
      expect(r.value.mtime).toBeTruthy();
    }
  });
});
