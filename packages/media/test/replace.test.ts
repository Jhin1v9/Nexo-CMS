/**
 * Replace (08§48) contra fixture REAL: referências textuais reais em 2
 * arquivos são reescritas e verificadas por re-leitura.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { b64, cleanupFixture, createFixtureProject, makeCtx, makePng, makeWebp, registerLocalAsset, type Fixture } from './helpers.js';

let fixture: Fixture;

afterEach(() => {
  cleanupFixture(fixture);
});

describe('media.replace (08§48: Resolve → Find Refs → Select → Validate → Update Refs → Persist → Re-analyze → Verify)', () => {
  it('mesmo formato (png->png): conteúdo substituído no mesmo path, verificado', async () => {
    fixture = createFixtureProject();
    const asset = registerLocalAsset(fixture, 'src/assets/hero.png', 100);
    const newPng = makePng(8, 8);
    const r = await fixture.service.replace(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: asset.id,
      fileName: 'hero.png',
      contentBase64: b64(newPng),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verified).toBe(true);
    expect(r.value.newPath).toBe('src/assets/hero.png');
    expect(r.value.filesChanged).toHaveLength(0); // path inalterado: referências não mudam
    const onDisk = readFileSync(path.join(fixture.dir, 'src/assets', 'hero.png'));
    expect(onDisk.equals(newPng)).toBe(true);
    expect(r.value.asset.metadata.size).toBe(newPng.length);
    expect(r.value.asset.dimensions).toEqual({ width: 8, height: 8 });
    // Re-analyze: scan fresco encontra as 2 referências reais => Used
    expect(r.value.asset.usage.state).toBe('Used');
    expect(r.value.asset.references).toHaveLength(3);
  });

  it('mudança de formato (png->webp): referências reescritas em 2 arquivos e verificadas', async () => {
    fixture = createFixtureProject();
    const asset = registerLocalAsset(fixture, 'src/assets/hero.png', 100);
    const r = await fixture.service.replace(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: asset.id,
      fileName: 'hero.webp',
      contentBase64: b64(makeWebp(9, 11)),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.newPath).toBe('src/assets/hero.webp');
    expect(r.value.filesChanged.map((f) => f.filePath).sort()).toEqual([
      'src/App.tsx',
      'src/pages/About.tsx',
    ]);
    // Verify real: reler os arquivos do disco
    const app = readFileSync(path.join(fixture.dir, 'src', 'App.tsx'), 'utf8');
    const about = readFileSync(path.join(fixture.dir, 'src', 'pages', 'About.tsx'), 'utf8');
    expect(app).toContain('/src/assets/hero.webp');
    expect(app).not.toContain('/src/assets/hero.png');
    expect(about).toContain('/src/assets/hero.webp');
    expect(about).not.toContain('/src/assets/hero.png');
    // arquivo antigo removido, novo existe com o conteúdo certo
    expect(existsSync(path.join(fixture.dir, 'src', 'assets', 'hero.png'))).toBe(false);
    expect(existsSync(path.join(fixture.dir, 'src', 'assets', 'hero.webp'))).toBe(true);
    // registry persistiu o novo path e o scan fresco
    expect(r.value.asset.source.path).toBe('src/assets/hero.webp');
    expect(r.value.asset.usage.state).toBe('Used');
  });

  it('replacement incompatível (Image -> PDF) -> IncompatibleReplacement, disco intacto', async () => {
    fixture = createFixtureProject();
    const asset = registerLocalAsset(fixture, 'src/assets/hero.png', 100);
    const { makePdf } = await import('./helpers.js');
    const r = await fixture.service.replace(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: asset.id,
      fileName: 'hero.pdf',
      contentBase64: b64(makePdf()),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.details?.['mediaError']).toBe('IncompatibleReplacement');
    expect(existsSync(path.join(fixture.dir, 'src', 'assets', 'hero.png'))).toBe(true);
  });

  it('replace de asset remoto -> UNSUPPORTED (08§55)', async () => {
    fixture = createFixtureProject();
    const { createMediaRegistry } = await import('../src/index.js');
    const now = new Date().toISOString();
    const source = { origin: 'ExternalURL' as const, url: 'https://cdn.example.com/hero.png' };
    const remote = {
      id: crypto.randomUUID(),
      type: 'Image' as const,
      source,
      metadata: {
        name: 'hero.png', type: 'Image' as const, mime: 'image/png', size: 0, source,
        createdAt: now, updatedAt: now, references: [],
      },
      references: [],
      scope: 'Project' as const,
      usage: { state: 'External' as const, confidence: 'HIGH_CONFIDENCE' as const },
    };
    createMediaRegistry(fixture.storage.repos.mediaAssets).upsert(fixture.projectId, remote);
    const r = await fixture.service.replace(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: remote.id,
      fileName: 'hero.png',
      contentBase64: b64(makePng()),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('UNSUPPORTED');
      expect(r.error.details?.['mediaError']).toBe('ExternalAssetMutation');
    }
  });

  it('asset inexistente -> NOT_FOUND', async () => {
    fixture = createFixtureProject();
    const r = await fixture.service.replace(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: 'ghost',
      fileName: 'x.png',
      contentBase64: b64(makePng()),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('NOT_FOUND');
  });
});
