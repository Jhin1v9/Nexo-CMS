import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ProjectModel } from '../src/index.js';
import { computeFingerprint, createProjectScanner } from '../src/index.js';

const FIXTURES = fileURLToPath(new URL('fixtures', import.meta.url));
const scanner = createProjectScanner();

let tmp: string;
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'nexo-intel-'));
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function scanOk(path: string): Promise<ProjectModel> {
  const r = await scanner.scan(path);
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

describe('ProjectScanner.scan — monorepo (workspaces field, glob 1 nível)', () => {
  it('workspaces packages/* -> isMonorepo + packageRoots reais', async () => {
    await writeFile(
      join(tmp, 'package.json'),
      JSON.stringify({ name: 'mono', private: true, workspaces: ['packages/*'] }),
    );
    await mkdir(join(tmp, 'packages', 'alpha'), { recursive: true });
    await mkdir(join(tmp, 'packages', 'beta'), { recursive: true });
    await writeFile(join(tmp, 'packages', 'alpha', 'package.json'), JSON.stringify({ name: 'alpha' }));

    const model = await scanOk(tmp);
    expect(model.root.confidence).toBe('CONFIRMED');
    expect(model.root.value?.isMonorepo).toBe(true);
    expect(model.root.value?.packageRoots).toEqual(['packages/alpha', 'packages/beta']);
    expect(model.root.evidence.some((e) => e.startsWith('package.json:workspaces='))).toBe(true);
  });

  it('workspace literal sem glob é aceito quando o dir existe', async () => {
    await writeFile(
      join(tmp, 'package.json'),
      JSON.stringify({ name: 'mono', workspaces: { packages: ['apps/web'] } }),
    );
    await mkdir(join(tmp, 'apps', 'web'), { recursive: true });
    const model = await scanOk(tmp);
    expect(model.root.value?.packageRoots).toEqual(['apps/web']);
  });
});

describe('ProjectScanner.scan — git detection read-only (sem spawn nesta wave)', () => {
  it('.git/HEAD com ref -> branch parseada', async () => {
    await writeFile(join(tmp, 'package.json'), JSON.stringify({ name: 'g' }));
    await mkdir(join(tmp, '.git'));
    await writeFile(join(tmp, '.git', 'HEAD'), 'ref: refs/heads/feat/minha-branch\n');
    const model = await scanOk(tmp);
    expect(model.git.value).toEqual({ isRepo: true, branch: 'feat/minha-branch' });
    expect(model.git.confidence).toBe('CONFIRMED');
  });

  it('HEAD detached (hash) -> branch null, nunca inventado', async () => {
    await mkdir(join(tmp, '.git'));
    await writeFile(join(tmp, '.git', 'HEAD'), '9fceb02d0ae598e95dc970b74767f19372d61af8\n');
    const model = await scanOk(tmp);
    expect(model.git.value).toEqual({ isRepo: true, branch: null });
    expect(model.git.evidence).toContain('git:HEAD detached');
  });
});

describe('ProjectScanner.scan — package.json inválido é erro estrito', () => {
  it('JSON quebrado -> INVALID_INPUT com resource', async () => {
    await writeFile(join(tmp, 'package.json'), '{ "name": ');
    const r = await scanner.scan(tmp);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('INVALID_INPUT');
      expect(r.error.resource).toContain('package.json');
    }
  });
});

describe('computeFingerprint — staleness (SPEC §7/§8)', () => {
  it('estável para o mesmo conteúdo; muda quando package.json muda', async () => {
    const src = join(FIXTURES, 'react-vite-tailwind');
    const copyA = join(tmp, 'a');
    const copyB = join(tmp, 'b');
    await cp(src, copyA, { recursive: true });
    await cp(src, copyB, { recursive: true });

    const fpA1 = await computeFingerprint(copyA);
    const fpA2 = await computeFingerprint(copyA);
    const fpB = await computeFingerprint(copyB);
    expect(fpA1).toMatch(/^[0-9a-f]{64}$/);
    expect(fpA1).toBe(fpA2);
    expect(fpA1).toBe(fpB);

    // muta a CÓPIA em tmpdir (nunca o fixture versionado)
    const pkgPath = join(copyA, 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as Record<string, unknown>;
    pkg['version'] = '0.0.1';
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

    const fpA3 = await computeFingerprint(copyA);
    expect(fpA3).not.toBe(fpA1);
    // cópia não modificada permanece igual
    expect(await computeFingerprint(copyB)).toBe(fpA1);
  });

  it('muda quando config conhecido muda (tsconfig.json)', async () => {
    const src = join(FIXTURES, 'react-vite-tailwind');
    const copy = join(tmp, 'c');
    await cp(src, copy, { recursive: true });
    const before = await computeFingerprint(copy);
    await writeFile(join(copy, 'tsconfig.json'), '{ "compilerOptions": { "strict": false } }\n');
    expect(await computeFingerprint(copy)).not.toBe(before);
  });
});
