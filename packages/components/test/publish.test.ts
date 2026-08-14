/**
 * component.publish (08§25 pipeline + §74 validacao completa + §26 version
 * record + §63 portability + §65 sem dependencia oculta + §87 Project !=
 * Library + §79 duplication prevention).
 */

import { afterEach, describe, expect, it } from 'vitest';

import type { PublishValidation } from '../src/index.js';
import {
  cleanupFixture,
  createReactFixture,
  makeCtx,
  type Fixture,
} from './helpers.js';

let fixture: Fixture;

afterEach(() => {
  cleanupFixture(fixture);
});

async function listIds(fx: Fixture): Promise<Map<string, string>> {
  const list = await fx.service.list(makeCtx(fx.projectId), { projectId: fx.projectId });
  if (!list.ok) throw new Error('list falhou');
  return new Map(list.value.map((c) => [c.name, c.id]));
}

describe('component.publish', () => {
  it('componente limpo => Library Component com version record (08§25/§26)', async () => {
    fixture = createReactFixture();
    const ids = await listIds(fixture);
    const badgeId = ids.get('Badge');
    if (badgeId === undefined) throw new Error('Badge nao detectado');

    const result = await fixture.service.publish(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: badgeId,
      changes: ['publicacao inicial'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('Published');
    expect(result.value.version).toBe('1.0.0');
    expect(result.value.compatibility).toBe('COMPATIBLE');
    expect(result.value.portability).toBe('Portable');

    // validacao §74 completa — todas as seis verificacoes passaram
    const v: PublishValidation = result.value.validation;
    expect(v.sourceIntegrity.pass).toBe(true);
    expect(v.dependencyResolution.pass).toBe(true);
    expect(v.noSecretLeakage.pass).toBe(true);
    expect(v.noPrivateReferences.pass).toBe(true);
    expect(v.schemaValidity.pass).toBe(true);
    expect(v.compatibility.pass).toBe(true);

    // Project Component != Library Component (08§87)
    expect(result.value.libraryComponentId).not.toBe(badgeId);

    // Library entry via component.list scope=Library
    const library = await fixture.service.list(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      scope: 'Library',
    });
    if (!library.ok) throw new Error('list Library falhou');
    const published = library.value.find((c) => c.name === 'Badge');
    expect(published?.id).toBe(result.value.libraryComponentId);
    expect(published?.scope).toBe('Library');
    expect(published?.version).toBe('1.0.0');

    // version record persistido com snapshot + hash (08§26/§62)
    const read = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: result.value.libraryComponentId,
    });
    if (!read.ok) throw new Error('read Library falhou');
    expect(read.value.identity.source.kind).toBe('LibraryPackage');
    expect(read.value.metadata['publishedFrom']).toBe(badgeId);

    const versions = fixture.storage.repos.components.listVersions(result.value.libraryComponentId);
    expect(versions).toHaveLength(1);
    const record = versions[0]?.record as { version?: string; source?: { snapshot?: string; contentHash?: string } };
    expect(record?.version).toBe('1.0.0');
    expect(record?.source?.snapshot).toContain('export function Badge');
    expect(record?.source?.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('re-publish da mesma linhagem bumpa patch (semver simples, 08§26)', async () => {
    fixture = createReactFixture();
    const ids = await listIds(fixture);
    const badgeId = ids.get('Badge');
    if (badgeId === undefined) throw new Error('Badge nao detectado');

    const first = await fixture.service.publish(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: badgeId,
    });
    if (!first.ok) throw new Error('primeiro publish falhou');
    const second = await fixture.service.publish(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: badgeId,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.libraryComponentId).toBe(first.value.libraryComponentId);
    expect(second.value.version).toBe('1.0.1');
    const versions = fixture.storage.repos.components.listVersions(first.value.libraryComponentId);
    expect(versions.map((v) => v.version)).toEqual(['1.0.0', '1.0.1']);
  });

  it('import privado (../utils/private) => BLOQUEADO com diagnostico (08§25/§65)', async () => {
    fixture = createReactFixture();
    const ids = await listIds(fixture);
    const legacyId = ids.get('Legacy');
    if (legacyId === undefined) throw new Error('Legacy nao detectado');

    const result = await fixture.service.publish(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: legacyId,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('FORBIDDEN');
    expect(result.error.details?.['componentError']).toBe('PublishBlockedPrivateReferences');
    const validation = result.error.details?.['publishValidation'] as PublishValidation;
    expect(validation.noPrivateReferences.pass).toBe(false);
    expect(validation.noPrivateReferences.detail).toContain('../utils/private');

    // NADA publicado (zero fake success)
    const library = await fixture.service.list(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      scope: 'Library',
    });
    if (!library.ok) throw new Error('list Library falhou');
    expect(library.value.some((c) => c.name === 'Legacy')).toBe(false);
  });

  it('segredo no source (process.env.API_KEY) => BLOQUEADO (08§74 No Secret Leakage)', async () => {
    fixture = createReactFixture();
    const ids = await listIds(fixture);
    const leakyId = ids.get('Leaky');
    if (leakyId === undefined) throw new Error('Leaky nao detectado');

    const result = await fixture.service.publish(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: leakyId,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('FORBIDDEN');
    expect(result.error.details?.['componentError']).toBe('PublishBlockedSecretLeakage');
    const validation = result.error.details?.['publishValidation'] as PublishValidation;
    expect(validation.noSecretLeakage.pass).toBe(false);
    expect(validation.noSecretLeakage.detail).toContain('process.env');
  });

  it('componente com dep de outro componente => PartiallyPortable (08§63)', async () => {
    fixture = createReactFixture();
    const ids = await listIds(fixture);
    const cardId = ids.get('Card');
    if (cardId === undefined) throw new Error('Card nao detectado');

    const result = await fixture.service.publish(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: cardId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.portability).toBe('PartiallyPortable');
    expect(result.value.dependencies).toContainEqual({
      kind: 'component',
      name: 'src/components/Button.tsx',
      declared: true,
    });
  });
});
