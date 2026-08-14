/**
 * MediaService: list/read/search/update (M3-CONTRACTS §3.3) contra fixture REAL.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  b64,
  cleanupFixture,
  createFixtureProject,
  makeCtx,
  makePng,
  registerLocalAsset,
  type Fixture,
} from './helpers.js';

let fixture: Fixture;

afterEach(() => {
  cleanupFixture(fixture);
});

async function uploadBanner(fx: Fixture): Promise<string> {
  const r = await fx.service.upload(makeCtx(fx.projectId), {
    projectId: fx.projectId,
    fileName: 'banner.png',
    contentBase64: b64(makePng()),
    targetPath: 'src/assets',
  });
  if (!r.ok) throw new Error('upload do setup falhou');
  return r.value.asset.id;
}

describe('media.list / media.read / media.search / media.update', () => {
  it('list com filtro por tipo e usage state', async () => {
    fixture = createFixtureProject();
    registerLocalAsset(fixture, 'src/assets/hero.png', 100); // usage Unknown (nunca escaneado)
    const bannerId = await uploadBanner(fixture); // usage Unused (scan completo, 0 refs)

    const all = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    expect(all.ok && all.value).toHaveLength(2);

    const images = await fixture.service.list(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      filter: { type: 'Image' },
    });
    expect(images.ok && images.value).toHaveLength(2);

    const unused = await fixture.service.list(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      filter: { usageState: 'Unused' },
    });
    expect(unused.ok).toBe(true);
    if (unused.ok) {
      expect(unused.value).toHaveLength(1);
      expect(unused.value[0]?.id).toBe(bannerId);
    }
    // Unknown nunca aparece como Unused (08§50)
    const unknown = await fixture.service.list(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      filter: { usageState: 'Unknown' },
    });
    expect(unknown.ok && unknown.value).toHaveLength(1);
  });

  it('read: sem includeContent não retorna binário; com includeContent retorna base64 real', async () => {
    fixture = createFixtureProject();
    const png = makePng();
    const up = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'banner.png',
      contentBase64: b64(png),
      targetPath: 'src/assets',
    });
    if (!up.ok) throw new Error('setup');
    const assetId = up.value.asset.id;

    const plain = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId,
    });
    expect(plain.ok).toBe(true);
    if (plain.ok) {
      expect(plain.value.contentBase64).toBeUndefined();
      expect(plain.value.asset.metadata.mime).toBe('image/png');
    }

    const full = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId,
      includeContent: true,
    });
    expect(full.ok).toBe(true);
    if (full.ok) {
      expect(full.value.contentBase64).toBe(b64(png));
      expect(Buffer.from(full.value.contentBase64 ?? '', 'base64').equals(png)).toBe(true);
    }
  });

  it('read de asset remoto com includeContent -> UNSUPPORTED (08§55)', async () => {
    fixture = createFixtureProject();
    const { createMediaRegistry } = await import('../src/index.js');
    const now = new Date().toISOString();
    const source = { origin: 'CDN' as const, url: 'https://cdn.example.com/a.png' };
    const remote = {
      id: crypto.randomUUID(),
      type: 'Image' as const,
      source,
      metadata: {
        name: 'a.png', type: 'Image' as const, mime: 'image/png', size: 0, source,
        createdAt: now, updatedAt: now, references: [],
      },
      references: [],
      scope: 'Project' as const,
      usage: { state: 'External' as const, confidence: 'HIGH_CONFIDENCE' as const },
    };
    createMediaRegistry(fixture.storage.repos.mediaAssets).upsert(fixture.projectId, remote);
    const metaOnly = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: remote.id,
    });
    expect(metaOnly.ok).toBe(true);
    const withContent = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: remote.id,
      includeContent: true,
    });
    expect(withContent.ok).toBe(false);
    if (!withContent.ok) expect(withContent.error.code).toBe('UNSUPPORTED');
  });

  it('search por nome, tipo e referência', async () => {
    fixture = createFixtureProject();
    const hero = registerLocalAsset(fixture, 'src/assets/hero.png', 100);
    await uploadBanner(fixture);

    const byName = await fixture.service.search(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      query: 'banner',
    });
    expect(byName.ok && byName.value).toHaveLength(1);
    if (byName.ok) expect(byName.value[0]?.matchedOn[0]?.field).toBe('name');

    const byType = await fixture.service.search(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      query: 'image',
    });
    expect(byType.ok && byType.value.length).toBeGreaterThanOrEqual(2);

    // referência: hero registrado sem refs no registry -> scan fresco não roda
    // no search (operação SAFE de leitura do registry); refs vêm do asset
    const withRefs = await fixture.service.replace(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: hero.id,
      fileName: 'hero.png',
      contentBase64: b64(makePng()),
    });
    expect(withRefs.ok).toBe(true);
    const byRef = await fixture.service.search(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      query: 'About.tsx',
    });
    expect(byRef.ok && byRef.value).toHaveLength(1);
    if (byRef.ok) expect(byRef.value[0]?.matchedOn.some((m) => m.field === 'reference')).toBe(true);
  });

  it('update: patch de metadata (altText, caption, name) persistido e verificado (08§82)', async () => {
    fixture = createFixtureProject();
    const assetId = await uploadBanner(fixture);
    const r = await fixture.service.update(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId,
      patch: { altText: 'banner acessível', caption: 'hero da home', name: 'Banner Principal' },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.metadata.altText).toBe('banner acessível');
    expect(r.value.metadata.caption).toBe('hero da home');
    expect(r.value.metadata.name).toBe('Banner Principal');
    // name de exibição NÃO renomeia o arquivo (decisão documentada — rename = replace/move)
    expect(r.value.source.path).toBe('src/assets/banner.png');
    // persistido de verdade
    const again = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId,
    });
    expect(again.ok && again.value.asset.metadata.altText).toBe('banner acessível');
  });

  it('projectId desconhecido -> NOT_FOUND com operationId propagado', async () => {
    fixture = createFixtureProject();
    const ctx = makeCtx('ghost');
    const r = await fixture.service.upload(ctx, {
      projectId: 'ghost',
      fileName: 'a.png',
      contentBase64: b64(makePng()),
      targetPath: 'src/assets',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('NOT_FOUND');
      expect(r.error.operationId).toBe(ctx.operationId);
    }
  });

  it('metadata nunca contém secrets (08§82): campos conhecidos apenas', async () => {
    fixture = createFixtureProject();
    const assetId = await uploadBanner(fixture);
    const r = await fixture.service.read(makeCtx(fixture.projectId), { projectId: fixture.projectId, assetId });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const keys = Object.keys(r.value.asset.metadata).sort();
    expect(keys).toEqual(
      ['createdAt', 'dimensions', 'mime', 'name', 'references', 'size', 'source', 'type', 'updatedAt'].sort(),
    );
  });
});
