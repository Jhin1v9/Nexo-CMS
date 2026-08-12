/**
 * Fingerprint de staleness (SPEC §7/§8) — Wave 5 (FIX 4): projetos estáticos
 * (sem package.json) cobrem index.html raiz + assets/configs estáticos
 * conhecidos. Antes do fix, editar index.html de um projeto html-static NÃO
 * mudava o fingerprint (cego) -> project.open nunca via STALE_CONTEXT.
 *
 * Regra de ouro: NUNCA mutar fixtures versionados — cópias em tmpdir.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { computeFingerprint } from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_HTML = join(HERE, 'fixtures', 'html-static');
const FIXTURE_REACT = join(HERE, 'fixtures', 'react-vite-tailwind');

describe('computeFingerprint (Wave 5 FIX 4 — estáticos)', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'nexo-fingerprint-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('html-static (sem package.json): editar index.html MUDA o fingerprint', async () => {
    const proj = join(workDir, 'html-static');
    cpSync(FIXTURE_HTML, proj, { recursive: true });

    const before = await computeFingerprint(proj);
    expect(before).toMatch(/^[0-9a-f]{64}$/);

    writeFileSync(join(proj, 'index.html'), `${readFileSync(join(proj, 'index.html'), 'utf8')}\n<!-- edit -->\n`, 'utf8');

    const after = await computeFingerprint(proj);
    expect(after).not.toBe(before); // fingerprint NÃO é mais cego a estáticos
  });

  it('html-static: editar styles.css (asset estático conhecido) também muda', async () => {
    const proj = join(workDir, 'html-static-css');
    cpSync(FIXTURE_HTML, proj, { recursive: true });

    const before = await computeFingerprint(proj);
    writeFileSync(join(proj, 'styles.css'), 'body { color: red; }\n', 'utf8');
    expect(await computeFingerprint(proj)).not.toBe(before);
  });

  it('com package.json presente o conjunto é INALTERADO (contrato M1): index.html não participa', async () => {
    const proj = join(workDir, 'react');
    cpSync(FIXTURE_REACT, proj, { recursive: true });

    const before = await computeFingerprint(proj);
    writeFileSync(join(proj, 'index.html'), `${readFileSync(join(proj, 'index.html'), 'utf8')}\n<!-- edit -->\n`, 'utf8');
    expect(await computeFingerprint(proj)).toBe(before); // index.html fora do conjunto com package.json

    writeFileSync(join(proj, 'package.json'), '{"name":"react-edited"}\n', 'utf8');
    expect(await computeFingerprint(proj)).not.toBe(before); // package.json sempre participa
  });

  it('estável: mesma árvore -> mesmo hash; determinístico entre chamadas', async () => {
    const proj = join(workDir, 'html-stable');
    cpSync(FIXTURE_HTML, proj, { recursive: true });
    expect(await computeFingerprint(proj)).toBe(await computeFingerprint(proj));
  });
});
