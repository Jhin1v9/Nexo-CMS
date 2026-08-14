/**
 * component.update (08§22): patch de props/metadata + sourceEdits via
 * transformer AST; retorna Diff real; re-analyze pos-mutacao.
 */

import { readFileSync } from 'node:fs';
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

async function createHero(fx: Fixture): Promise<string> {
  const created = await fx.service.create(makeCtx(fx.projectId), {
    projectId: fx.projectId,
    name: 'Hero',
    props: [{ name: 'title', type: 'String', required: true }],
  });
  if (!created.ok) throw new Error('create do setup falhou');
  return created.value.componentId;
}

describe('component.update', () => {
  it('sourceEdit via transformer retorna Diff real e re-analisa (08§22)', async () => {
    fixture = createReactFixture();
    const componentId = await createHero(fixture);

    const updated = await fixture.service.update(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId,
      sourceEdits: [
        { op: 'setJsxProp', elementSelector: { jsxTag: 'div' }, propName: 'className', value: 'hero hero--main' },
      ],
      patch: { description: 'Secao hero atualizada' },
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    // diff real do arquivo
    expect(updated.value.diff.files).toHaveLength(1);
    const fileDiff = updated.value.diff.files[0];
    expect(fileDiff?.file).toBe('src/components/Hero.tsx');
    expect(fileDiff?.status).toBe('Modified');
    expect(fileDiff?.added.some((l) => l.includes('className="hero hero--main"'))).toBe(true);

    // persistido de verdade
    const content = readFileSync(path.join(fixture.dir, 'src/components/Hero.tsx'), 'utf8');
    expect(content).toContain('className="hero hero--main"');

    // patch de metadata aplicado
    expect(updated.value.schema.metadata['description']).toBe('Secao hero atualizada');

    // read devolve estado reconciliado com a fonte
    const read = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId,
    });
    if (!read.ok) throw new Error('read falhou');
    expect(read.value.metadata['description']).toBe('Secao hero atualizada');
    expect(read.value.props.map((p) => p.name)).toEqual(['title']);
  });

  it('patch de props substitui o schema com validacao previa (08§12)', async () => {
    fixture = createReactFixture();
    const componentId = await createHero(fixture);

    const invalid = await fixture.service.update(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId,
      patch: { props: [{ name: 'bad name!', type: 'String', required: true }] },
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.error.details?.['componentError']).toBe('InvalidDefinition');

    const valid = await fixture.service.update(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId,
      patch: {
        props: [
          { name: 'title', type: 'String', required: true },
          { name: 'ctaUrl', type: 'URL', required: false },
        ],
      },
    });
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;
    expect(valid.value.schema.props.map((p) => p.name)).toEqual(['title', 'ctaUrl']);
  });

  it('patch.metadata com chave identity => rejeitado (08§6)', async () => {
    fixture = createReactFixture();
    const componentId = await createHero(fixture);
    const result = await fixture.service.update(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId,
      patch: { metadata: { identity: 'hacked' } },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details?.['componentError']).toBe('InvalidDefinition');
  });

  it('componente inexistente => ComponentNotFound', async () => {
    fixture = createReactFixture();
    const result = await fixture.service.update(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: 'nao-existe',
      patch: { description: 'x' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });
});
