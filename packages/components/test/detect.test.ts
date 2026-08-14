/**
 * Deteccao de Native Project Components (08§5.1) + identidade estavel (08§6)
 * contra fixture REAL React+TSX+Tailwind.
 */

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

describe('component.list — deteccao AST de componentes nativos', () => {
  it('lista componentes reais com props extraidas do type/interface (08§10-12)', async () => {
    fixture = createReactFixture();
    const result = await fixture.service.list(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const names = result.value.map((c) => c.name).sort();
    expect(names).toEqual(['Badge', 'Button', 'Card', 'Leaky', 'Legacy']);
    for (const identity of result.value) {
      expect(identity.scope).toBe('Project');
      expect(identity.version).toBeNull();
    }
  });

  it('extrai props com tipo/required/default/description (Button)', async () => {
    fixture = createReactFixture();
    const list = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    if (!list.ok) throw new Error('list falhou');
    const button = list.value.find((c) => c.name === 'Button');
    if (button === undefined) throw new Error('Button nao detectado');

    const read = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: button.id,
    });
    expect(read.ok).toBe(true);
    if (!read.ok) return;

    const byName = new Map(read.value.props.map((p) => [p.name, p]));
    const label = byName.get('label');
    expect(label?.type).toBe('String');
    expect(label?.required).toBe(true);
    expect(label?.description).toBe('Texto exibido no botao');

    const variant = byName.get('variant');
    expect(variant?.type).toBe('Enum');
    expect(variant?.required).toBe(false);
    expect(variant?.validation).toBe('oneOf:primary|secondary');
    expect(variant?.default).toBe('primary');

    expect(byName.get('disabled')?.type).toBe('Boolean');
    // onClick e evento (08§9 events), nao prop (nao ha PropType funcao)
    expect(byName.has('onClick')).toBe(false);
    expect(read.value.events).toContain('onClick');
  });

  it('detecta slots composables (children ReactNode) no Card (08§14)', async () => {
    fixture = createReactFixture();
    const list = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    if (!list.ok) throw new Error('list falhou');
    const card = list.value.find((c) => c.name === 'Card');
    if (card === undefined) throw new Error('Card nao detectado');

    const read = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: card.id,
    });
    if (!read.ok) throw new Error('read falhou');
    expect(read.value.slots).toContainEqual({ name: 'children', kind: 'ComposableSlot' });
    const childrenProp = read.value.props.find((p) => p.name === 'children');
    expect(childrenProp?.type).toBe('Slot');
  });

  it('identidade estavel DENTRO do escopo entre reconciliacoes (08§6)', async () => {
    fixture = createReactFixture();
    const first = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    const second = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    if (!first.ok || !second.ok) throw new Error('list falhou');
    const idsFirst = new Map(first.value.map((c) => [c.name, c.id]));
    for (const c of second.value) {
      expect(c.id).toBe(idsFirst.get(c.name));
    }
  });
});
