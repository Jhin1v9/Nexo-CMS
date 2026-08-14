/**
 * Viewport registry (09§24-26) + breakpoint detection (09§22) — sem browser.
 */

import { mkdtemp } from 'node:fs/promises';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createStorage, type Storage } from '@nexo/storage';

import { createViewportRegistry, detectProjectBreakpoints, DEFAULT_VIEWPORT_PRESETS } from '../src/index.js';
import { FIXTURE_TEMPLATE } from './helpers.js';

describe('ViewportRegistry (09§24-26)', () => {
  let dataDir: string;
  let storage: Storage;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'nexo-vp-'));
    const s = createStorage(dataDir);
    if (!s.ok) throw new Error(s.error.message);
    storage = s.value;
  });

  afterEach(async () => {
    storage.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('seeda presets configuráveis (Mobile/Tablet/Laptop/Desktop/WideDesktop) e persiste no storage', () => {
    const reg = createViewportRegistry(storage);
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const names = reg.value.list().map((v) => v.name);
    for (const p of DEFAULT_VIEWPORT_PRESETS) expect(names).toContain(p.name);
    expect(reg.value.list().every((v) => v.isPreset === true)).toBe(true);
  });

  it('presets são CONFIGURÁVEIS (09§25): lista custom substitui os defaults', () => {
    const reg = createViewportRegistry(storage, {
      presets: [{ name: 'Kiosk', width: 800, height: 480, orientation: 'Landscape' }],
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const names = reg.value.list().map((v) => v.name);
    expect(names).toEqual(['Kiosk']);
  });

  it('dimensões arbitrárias obrigatórias (09§26): 375x812 e 1366x768', () => {
    const reg = createViewportRegistry(storage, { seedPresets: false });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const a = reg.value.create({ width: 375, height: 812, dpr: 3 });
    const b = reg.value.create({ width: 1366, height: 768 });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.orientation).toBe('Portrait'); // derivada: altura >= largura
      expect(b.value.orientation).toBe('Landscape');
      expect(a.value.isPreset).toBe(false);
    }
  });

  it('create/read/delete round-trip; delete de inexistente -> NOT_FOUND honesto', () => {
    const reg = createViewportRegistry(storage, { seedPresets: false });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const created = reg.value.create({ name: 'custom', width: 500, height: 500 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const read = reg.value.read(created.value.id);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value.width).toBe(500);
      expect(read.value.name).toBe('custom');
    }
    expect(reg.value.delete(created.value.id).ok).toBe(true);
    const gone = reg.value.read(created.value.id);
    expect(gone.ok).toBe(false);
    if (!gone.ok) expect(gone.error.details?.['reason']).toBe('VIEWPORT_NOT_FOUND');
    const delGone = reg.value.delete(created.value.id);
    expect(delGone.ok).toBe(false);
  });

  it('rejeita dimensões inválidas com INVALID_INPUT (nunca crash)', () => {
    const reg = createViewportRegistry(storage, { seedPresets: false });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    expect(reg.value.create({ width: 0, height: 100 }).ok).toBe(false);
    expect(reg.value.create({ width: 100.5, height: 100 }).ok).toBe(false);
    expect(reg.value.create({ width: 100, height: 100, dpr: 0 }).ok).toBe(false);
  });
});

describe('detectProjectBreakpoints (09§22)', () => {
  it('lê breakpoints REAIS do projeto (fixture usa 700px) e NUNCA assume 640/768/1024/1280', async () => {
    const r = await detectProjectBreakpoints(FIXTURE_TEMPLATE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.breakpoints.value).toEqual([700]);
    expect(r.value.breakpoints.value).not.toContain(640);
    expect(r.value.breakpoints.value).not.toContain(768);
    expect(r.value.breakpoints.value).not.toContain(1024);
    expect(r.value.breakpoints.value).not.toContain(1280);
    expect(r.value.breakpoints.evidence.length).toBeGreaterThan(0);
  });

  it('projeto sem media queries -> UNKNOWN com value null (nunca inventa)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nexo-bp-'));
    try {
      await fs.writeFile(path.join(dir, 'styles.css'), 'body { margin: 0; }', 'utf8');
      const r = await detectProjectBreakpoints(dir);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.breakpoints.value).toBeNull();
      expect(r.value.breakpoints.confidence).toBe('UNKNOWN');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('root inexistente -> NOT_FOUND honesto', async () => {
    const r = await detectProjectBreakpoints('/definitely/not/a/project');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.details?.['reason']).toBe('PROJECT_NOT_FOUND');
  });
});
