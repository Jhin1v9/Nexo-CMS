/**
 * Delete (08§51/§55/§50) contra fixture REAL.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createMediaRegistry } from '../src/index.js';

import { cleanupFixture, createFixtureProject, makeCtx, registerLocalAsset, writeFixtureFile, type Fixture } from './helpers.js';

let fixture: Fixture;

afterEach(() => {
  cleanupFixture(fixture);
});

describe('media.delete (08§51)', () => {
  it('com referências conhecidas e sem confirm -> bloqueado (CONFLICT + requiresApproval + refs)', async () => {
    fixture = createFixtureProject();
    const asset = registerLocalAsset(fixture, 'src/assets/hero.png', 100);
    const r = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: asset.id,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('CONFLICT');
      expect(r.error.requiresApproval).toBe(true);
      expect(r.error.details?.['mediaError']).toBe('DeleteBlockedByReferences');
      expect(r.error.details?.['referenceCount']).toBe(3);
    }
    // nada quebrado silenciosamente: arquivo continua no disco
    expect(existsSync(path.join(fixture.dir, 'src/assets/hero.png'))).toBe(true);
  });

  it('com referências e confirm:true -> deleta e REPORTA referências quebradas', async () => {
    fixture = createFixtureProject();
    const asset = registerLocalAsset(fixture, 'src/assets/hero.png', 100);
    const r = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: asset.id,
      confirm: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.deletedLocalFile).toBe(true);
    expect(r.value.removedFromRegistry).toBe(true);
    expect(r.value.verified).toBe(true);
    expect(r.value.brokenReferences).toHaveLength(3);
    expect(r.value.brokenReferences.map((b) => b.filePath).sort()).toEqual([
      'src/App.tsx',
      'src/App.tsx',
      'src/pages/About.tsx',
    ]);
    expect(existsSync(path.join(fixture.dir, 'src/assets/hero.png'))).toBe(false);
    // registry sem o asset
    const listed = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    expect(listed.ok && listed.value.every((a) => a.id !== asset.id)).toBe(true);
  });

  it('sem referências (scan completo) -> deleta sem confirm', async () => {
    fixture = createFixtureProject();
    writeFixtureFile(fixture.dir, 'public/orphan.png', Buffer.from([0x89, 0x50]));
    const asset = registerLocalAsset(fixture, 'public/orphan.png', 2);
    const r = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: asset.id,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.brokenReferences).toHaveLength(0);
      expect(r.value.deletedLocalFile).toBe(true);
    }
    expect(existsSync(path.join(fixture.dir, 'public/orphan.png'))).toBe(false);
  });

  it('uso Unknown (scan incompleto: arquivo >1MB ilegível ao scan) -> bloqueado COM explicação (08§50)', async () => {
    fixture = createFixtureProject();
    // arquivo de source grande demais para o scan => cobertura incompleta => Unknown
    writeFixtureFile(fixture.dir, 'src/huge.ts', 'x'.repeat(1024 * 1024 + 1));
    const asset = registerLocalAsset(fixture, 'public/orphan2.png', 2);
    writeFixtureFile(fixture.dir, 'public/orphan2.png', Buffer.from([0x89, 0x50]));
    const r = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: asset.id,
      confirm: true, // nem confirm destrava Unknown — Unknown NUNCA é Unused
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('UNKNOWN');
      expect(r.error.details?.['mediaError']).toBe('DeleteBlockedUsageUnknown');
      expect(r.error.details?.['skippedFiles']).toBe(1);
    }
    expect(existsSync(path.join(fixture.dir, 'public/orphan2.png'))).toBe(true);
  });

  it('asset remoto (ExternalURL) -> NUNCA deleta como local; remove apenas a referência do registry (08§55)', async () => {
    fixture = createFixtureProject();
    const now = new Date().toISOString();
    const source = { origin: 'ExternalURL' as const, url: 'https://cdn.example.com/x.png' };
    const remote = {
      id: crypto.randomUUID(),
      type: 'Image' as const,
      source,
      metadata: {
        name: 'x.png', type: 'Image' as const, mime: 'image/png', size: 0, source,
        createdAt: now, updatedAt: now, references: [],
      },
      references: [],
      scope: 'Project' as const,
      usage: { state: 'External' as const, confidence: 'HIGH_CONFIDENCE' as const },
    };
    createMediaRegistry(fixture.storage.repos.mediaAssets).upsert(fixture.projectId, remote);
    const r = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: remote.id,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.deletedLocalFile).toBe(false); // recurso remoto intocado
    expect(r.value.removedFromRegistry).toBe(true);
  });

  it('asset inexistente -> NOT_FOUND', async () => {
    fixture = createFixtureProject();
    const r = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      assetId: 'ghost',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('NOT_FOUND');
  });
});
