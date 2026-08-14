/**
 * component.delete (08§23): impact analysis obrigatoria (References, Routes,
 * Pages, Other Components, Assets, Exports, Tests); bloqueio com referencias
 * ativas ate confirm:true; sem cascata automatica; orfao deleta direto.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

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

describe('component.delete', () => {
  it('com referencias ativas => bloqueado com impacto classificado (08§23)', async () => {
    fixture = createReactFixture();
    const ids = await listIds(fixture);
    const buttonId = ids.get('Button');
    if (buttonId === undefined) throw new Error('Button nao detectado');

    const result = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: buttonId,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
    expect(result.error.details?.['componentError']).toBe('DeleteBlockedByReferences');
    expect(result.error.requiresApproval).toBe(true);

    const impact = result.error.details?.['impact'] as Record<string, string[]>;
    expect(impact['tests']).toEqual(['src/components/Button.test.tsx']);
    expect(impact['exports']).toEqual(['src/components/index.ts']);
    expect(impact['otherComponents']).toEqual(['src/components/Card.tsx']);

    // NADA foi deletado (sem cascata silenciosa)
    expect(existsSync(path.join(fixture.dir, 'src/components/Button.tsx'))).toBe(true);
  });

  it('com confirm:true deleta e reporta referencias quebradas (sem cascata)', async () => {
    fixture = createReactFixture();
    const ids = await listIds(fixture);
    const buttonId = ids.get('Button');
    if (buttonId === undefined) throw new Error('Button nao detectado');

    const result = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: buttonId,
      confirm: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.deletedFiles).toEqual(['src/components/Button.tsx']);
    expect(result.value.removedFromRegistry).toBe(true);
    expect(result.value.verified).toBe(true);
    expect(result.value.brokenReferences.length).toBeGreaterThan(0);
    // App.tsx (referencia generica) NUNCA foi tocado — sem cascata (08§23)
    expect(existsSync(path.join(fixture.dir, 'src/App.tsx'))).toBe(true);
    expect(existsSync(path.join(fixture.dir, 'src/components/Button.tsx'))).toBe(false);

    // fora do registry e da listagem
    const list = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    if (!list.ok) throw new Error('list falhou');
    expect(list.value.some((c) => c.name === 'Button')).toBe(false);
  });

  it('pagina que referencia o componente aparece em impact.pages', async () => {
    fixture = createReactFixture();
    const ids = await listIds(fixture);
    const cardId = ids.get('Card');
    if (cardId === undefined) throw new Error('Card nao detectado');

    const result = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: cardId,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const impact = result.error.details?.['impact'] as Record<string, string[]>;
    expect(impact['pages']).toEqual(['src/pages/Home.tsx']);
  });

  it('componente orfao => delete direto, sem confirm', async () => {
    fixture = createReactFixture();
    const created = await fixture.service.create(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      name: 'Orphan',
      props: [],
    });
    if (!created.ok) throw new Error('create do setup falhou');

    const result = await fixture.service.delete(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: created.value.componentId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedFiles).toEqual(['src/components/Orphan.tsx']);
    expect(result.value.brokenReferences).toEqual([]);
    expect(existsSync(path.join(fixture.dir, 'src/components/Orphan.tsx'))).toBe(false);
  });
});
