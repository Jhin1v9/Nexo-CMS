/**
 * design.update (09§7/§74-79): roteamento por PropertySource, guarda 09§56
 * (detach), impact report e erros honestos (Unknown => escolha explicita).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupFixture,
  createPlainCssFixture,
  createTailwindV4Fixture,
  makeCtx,
  writeFixtureFile,
  type Fixture,
} from './helpers.js';

let fixtures: Fixture[] = [];
afterEach(() => {
  for (const f of fixtures) cleanupFixture(f);
  fixtures = [];
});

describe('design.update — rota TailwindUtility', () => {
  it('troca utility da instancia via setUtilityClass + setJsxProp (verificado no disco)', async () => {
    const fx = createTailwindV4Fixture();
    fixtures.push(fx);
    // App.tsx: <div className="bg-primary text-white"> — unico <div> com className bg-primary
    const result = await fx.service.update(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      target: {
        kind: 'element',
        file: 'src/App.tsx',
        elementSelector: { jsxTag: 'div' },
        propertySource: 'TailwindUtility',
        classList: 'bg-primary text-white',
      },
      property: 'color',
      value: 'amber-200',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.route).toBe('tailwind-utility');
    expect(result.value.filesChanged).toEqual(['src/App.tsx']);
    expect(result.value.verified).toBe(true);

    const tsx = readFileSync(path.join(fx.dir, 'src/App.tsx'), 'utf8');
    expect(tsx).toContain('className="bg-primary text-amber-200"');
    expect(tsx).not.toContain('text-white');

    // impact report: classe removida ('text-white') compartilhada? evidencia listada
    expect(result.value.impact.target).toContain('text-white');
  });

  it('utility token-ligada -> valor arbitrario exige explicitDetach (09§56)', async () => {
    const fx = createTailwindV4Fixture();
    fixtures.push(fx);
    const input = {
      projectId: fx.projectId,
      target: {
        kind: 'element' as const,
        file: 'src/App.tsx',
        elementSelector: { jsxTag: 'div' },
        propertySource: 'TailwindUtility' as const,
        classList: 'bg-primary text-white',
      },
      property: 'background-color',
      value: '#ff0000',
    };
    const blocked = await fx.service.update(makeCtx(fx.projectId), input);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error.code).toBe('CONFLICT');
    expect(blocked.error.details?.designError).toBe('DetachRequiresIntent');
    expect(blocked.error.details?.nextAction).toBe('confirm-explicitDetach-or-update-token-source');
    expect(blocked.error.requiresApproval).toBe(true);
    // arquivo intocado
    expect(readFileSync(path.join(fx.dir, 'src/App.tsx'), 'utf8')).toContain('bg-primary');

    // com intencao explicita: aplica
    const applied = await fx.service.update(makeCtx(fx.projectId), {
      ...input,
      target: { ...input.target, explicitDetach: true },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const tsx = readFileSync(path.join(fx.dir, 'src/App.tsx'), 'utf8');
    expect(tsx).toContain('bg-[#ff0000]');
    expect(tsx).not.toContain('bg-primary');
    // impact da classe compartilhada bg-primary: Card.tsx tambem usa
    expect(applied.value.impact.affectedComponents).toContain('src/components/Card.tsx');
  });
});

describe('design.update — rota DirectValue', () => {
  it('setJsxProp com propName explicito (instance-scoped)', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    writeFixtureFile(
      fx.dir,
      'src/components/Logo.tsx',
      ['export function Logo() {', '  return <img width="300" src="/logo.svg" />;', '}', ''].join('\n'),
    );
    const result = await fx.service.update(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      target: {
        kind: 'element',
        file: 'src/components/Logo.tsx',
        elementSelector: { jsxTag: 'img' },
        propertySource: 'DirectValue',
        propName: 'width',
      },
      property: 'width',
      value: '480',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.route).toBe('jsx-prop');
    const tsx = readFileSync(path.join(fx.dir, 'src/components/Logo.tsx'), 'utf8');
    expect(tsx).toContain('width="480"');
  });
});

describe('design.update — fontes tokenizadas e erros honestos', () => {
  it('DesignToken com tokenRef delega para a FONTE do token (09§8)', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.update(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      target: {
        kind: 'element',
        file: 'src/components/Badge.tsx',
        elementSelector: { jsxTag: 'span' },
        propertySource: 'CssVariable',
        tokenRef: '--brand-primary',
      },
      property: 'color',
      value: '#224466',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.route).toBe('token-source');
    const css = readFileSync(path.join(fx.dir, 'src/styles.css'), 'utf8');
    expect(css).toContain('--brand-primary: #224466;');
    // o USO (Badge.tsx) nao foi tocado — 09§56: elemento segue anexado ao token
    const tsx = readFileSync(path.join(fx.dir, 'src/components/Badge.tsx'), 'utf8');
    expect(tsx).toContain("var(--brand-primary)");
  });

  it('PropertySource Unknown -> erro exigindo escolha explicita (09§7)', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.update(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      target: {
        kind: 'element',
        file: 'src/components/Panel.tsx',
        elementSelector: { jsxTag: 'div' },
        propertySource: 'Unknown',
      },
      property: 'color',
      value: 'red',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNKNOWN');
    expect(result.error.details?.designError).toBe('UnknownPropertySource');
    expect(result.error.details?.nextAction).toBe('resolve-property-source-explicitly');
  });

  it('InlineStyle -> UNSUPPORTED honesto (transformer nao emite objeto style)', async () => {
    const fx = createPlainCssFixture();
    fixtures.push(fx);
    const result = await fx.service.update(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      target: {
        kind: 'element',
        file: 'src/components/Badge.tsx',
        elementSelector: { jsxTag: 'span' },
        propertySource: 'InlineStyle',
      },
      property: 'color',
      value: 'red',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNSUPPORTED');
    expect(result.error.details?.designError).toBe('UnsupportedMechanism');
  });

  it('TailwindUtility sem classList -> MissingInput (nunca re-deriva atributo)', async () => {
    const fx = createTailwindV4Fixture();
    fixtures.push(fx);
    const result = await fx.service.update(makeCtx(fx.projectId), {
      projectId: fx.projectId,
      target: {
        kind: 'element',
        file: 'src/App.tsx',
        elementSelector: { jsxTag: 'div' },
        propertySource: 'TailwindUtility',
      },
      property: 'color',
      value: 'amber-200',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details?.designError).toBe('MissingInput');
  });
});
