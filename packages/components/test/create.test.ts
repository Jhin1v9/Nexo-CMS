/**
 * component.create (08§20/§21/§34/§79 + D6): arquivo real persistido,
 * re-parseado e registrado; convencoes do projeto; duplicata; UNSUPPORTED
 * em stack nao-React.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupFixture,
  createHtmlFixture,
  createReactFixture,
  makeCtx,
  type Fixture,
} from './helpers.js';

let fixture: Fixture;

afterEach(() => {
  cleanupFixture(fixture);
});

describe('component.create', () => {
  it('cria arquivo real que RE-PARSEIA, segue convencoes e registra (08§20/§21)', async () => {
    fixture = createReactFixture();
    const result = await fixture.service.create(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      name: 'Hero',
      description: 'Secao hero',
      props: [
        { name: 'title', type: 'String', required: true, description: 'Titulo principal' },
        { name: 'highlighted', type: 'Boolean', required: false, default: false },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('Created');
    expect(result.value.filesChanged).toEqual(['src/components/Hero.tsx']);
    expect(result.value.conventions.source).toBe('detected');
    expect(result.value.conventions.targetDir).toBe('src/components');
    expect(result.value.conventions.exportStyle).toBe('named');
    expect(result.value.conventions.styling).toBe('tailwind');

    // arquivo real no disco, com named export e interface (convencao do fixture)
    const abs = path.join(fixture.dir, 'src/components/Hero.tsx');
    expect(existsSync(abs)).toBe(true);
    const content = readFileSync(abs, 'utf8');
    expect(content).toContain('export interface HeroProps');
    expect(content).toContain('export function Hero(');
    expect(content).toContain('title: string;');
    expect(content).toContain('highlighted?: boolean;');

    // registrado: aparece em component.list com id estavel igual ao retornado
    const list = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    if (!list.ok) throw new Error('list falhou');
    const hero = list.value.find((c) => c.name === 'Hero');
    expect(hero?.id).toBe(result.value.componentId);
    expect(hero?.scope).toBe('Project');

    // read devolve schema com props re-analisados da FONTE
    const read = await fixture.service.read(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      componentId: result.value.componentId,
    });
    if (!read.ok) throw new Error('read falhou');
    expect(read.value.props.map((p) => p.name).sort()).toEqual(['highlighted', 'title']);
    expect(read.value.metadata['class']).toBe('GeneratedProjectComponent');
  });

  it('duplicata de nome => CONFLICT (08§79 duplication prevention)', async () => {
    fixture = createReactFixture();
    const result = await fixture.service.create(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      name: 'Button',
      props: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
    expect(result.error.details?.['componentError']).toBe('DuplicateComponent');
    // nada foi escrito
    expect(existsSync(path.join(fixture.dir, 'src/components/Button-2.tsx'))).toBe(false);
  });

  it('stack nao-React => UNSUPPORTED honesto (D6)', async () => {
    fixture = createHtmlFixture();
    const result = await fixture.service.create(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      name: 'Widget',
      props: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNSUPPORTED');
    expect(result.error.details?.['componentError']).toBe('UnsupportedStack');
    expect(existsSync(path.join(fixture.dir, 'src/components/Widget.tsx'))).toBe(false);
  });

  it('scope Library => UNSUPPORTED (create e fluxo de projeto — 08§20)', async () => {
    fixture = createReactFixture();
    const result = await fixture.service.create(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      name: 'GlobalThing',
      scope: 'Library',
      props: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNSUPPORTED');
    expect(result.error.details?.['componentError']).toBe('UnsupportedScope');
  });
});
