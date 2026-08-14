/**
 * Smoke SSR (renderToString, node — sem jsdom) dos componentes puros de
 * /components que não dependem de providers: PublishValidationView (as 6
 * verificações 08§74) e PropsTable (schema §7).
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PublishValidation } from '../../api/hooks';
import { PropsTable } from './ComponentDetail';
import { PublishValidationView } from './PublishValidationView';

describe('smoke SSR /components', () => {
  it('PublishValidationView: as 6 verificações com status real (pass/fail + detail)', () => {
    const validation: PublishValidation = {
      sourceIntegrity: { pass: true, detail: 'parse ok' },
      dependencyResolution: { pass: false, detail: 'dep X não declarada' },
      noSecretLeakage: { pass: true, detail: 'sem segredos' },
      noPrivateReferences: { pass: true, detail: 'sem refs privadas' },
      schemaValidity: { pass: true, detail: 'schema válido' },
      compatibility: { pass: false, detail: 'incompatível' },
    };
    const html = renderToString(<PublishValidationView validation={validation} />);
    expect(html).toContain('Source Integrity');
    expect(html).toContain('Dependency Resolution');
    expect(html).toContain('No Secret Leakage');
    expect(html).toContain('No Private References');
    expect(html).toContain('Schema Validity');
    expect(html).toContain('Compatibility');
    expect(html).toContain('dep X não declarada');
    expect(html).toContain(': falhou');
    expect(html).toContain(': passou');
  });

  it('PropsTable: tipo Unknown marcado honestamente; required/default visíveis', () => {
    const html = renderToString(
      <PropsTable
        props={[
          { name: 'title', type: 'String', required: true },
          { name: 'data', type: 'Unknown', required: false, default: 42 },
        ]}
      />,
    );
    expect(html).toContain('title');
    expect(html).toContain('Unknown');
    expect(html).toContain('sim');
    expect(html).toContain('42');
  });

  it('PropsTable vazia: mensagem honesta, sem linhas fabricadas', () => {
    expect(renderToString(<PropsTable props={[]} />)).toContain('Nenhuma prop');
  });
});
