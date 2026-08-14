/** Helpers puros de /components (node, sem DOM). */

import { describe, expect, it } from 'vitest';

import type { ComponentImpact, PublishValidation } from '../../api/hooks';
import {
  blockedImpactFromError,
  componentSourceLabel,
  filterByScope,
  impactBlocks,
  propDefaultLabel,
  publishCheckEntries,
  publishValidationFromDetails,
  scopeTone,
  versionLabel,
} from './helpers';

describe('scopeTone / versionLabel', () => {
  it('escopos mapeiam para tons distintos', () => {
    expect(scopeTone('Project')).toBe('primary');
    expect(scopeTone('Workspace')).toBe('warning');
    expect(scopeTone('Library')).toBe('success');
  });

  it('versão null vira marcador honesto', () => {
    expect(versionLabel(null)).toBe('sem versão');
    expect(versionLabel('1.2.3')).toBe('1.2.3');
  });
});

describe('componentSourceLabel', () => {
  it('cobre a união discriminada 08§8 sem inventar', () => {
    expect(componentSourceLabel({ kind: 'ProjectFile', path: 'src/Button.tsx' })).toBe('src/Button.tsx');
    expect(componentSourceLabel({ kind: 'LibraryPackage', packageName: '@x/ui', version: '2.0.0' })).toBe('@x/ui@2.0.0');
    expect(componentSourceLabel({ kind: 'MultipleProjectFiles', paths: ['a.tsx', 'b.tsx'] })).toContain('2 arquivos');
  });
});

describe('propDefaultLabel', () => {
  it('undefined vira —; literais serializam', () => {
    expect(propDefaultLabel(undefined)).toBe('—');
    expect(propDefaultLabel('x')).toBe('"x"');
    expect(propDefaultLabel(3)).toBe('3');
    expect(propDefaultLabel(true)).toBe('true');
  });
});

const validation: PublishValidation = {
  sourceIntegrity: { pass: true, detail: 'ok' },
  dependencyResolution: { pass: false, detail: 'dep não declarada' },
  noSecretLeakage: { pass: true, detail: 'ok' },
  noPrivateReferences: { pass: true, detail: 'ok' },
  schemaValidity: { pass: true, detail: 'ok' },
  compatibility: { pass: true, detail: 'ok' },
};

describe('publishCheckEntries', () => {
  it('retorna as 6 verificações 08§74 na ordem fixa, nenhuma omitida', () => {
    const entries = publishCheckEntries(validation);
    expect(entries).toHaveLength(6);
    expect(entries.map((e) => e.key)).toEqual([
      'sourceIntegrity',
      'dependencyResolution',
      'noSecretLeakage',
      'noPrivateReferences',
      'schemaValidity',
      'compatibility',
    ]);
    expect(entries[1]?.check.pass).toBe(false);
  });
});

describe('publishValidationFromDetails', () => {
  it('extrai validation de details.publishValidation; ausente -> undefined', () => {
    expect(publishValidationFromDetails({ publishValidation: validation })).toBe(validation);
    expect(publishValidationFromDetails({})).toBeUndefined();
    expect(publishValidationFromDetails(undefined)).toBeUndefined();
  });
});

const impact: ComponentImpact = {
  references: [{ file: 'src/App.tsx', line: 3, kind: 'jsx-usage', confidence: 'EXACT', context: '<Button />' }],
  routes: ['/home'],
  pages: [],
  otherComponents: [],
  exports: [],
  tests: ['src/Button.test.tsx'],
  assets: [],
  scannedFiles: 10,
  skippedFiles: 0,
  complete: true,
};

describe('impactBlocks', () => {
  it('lista somente blocos não-vazios com contagens', () => {
    const blocks = impactBlocks(impact);
    expect(blocks.map((b) => b.label)).toEqual(['Referências (1)', 'Rotas (1)', 'Testes (1)']);
    expect(blocks[0]?.items).toEqual(['src/App.tsx:3']);
  });

  it('impacto vazio -> sem blocos (mensagem de "sem referências" é da UI)', () => {
    expect(impactBlocks({ ...impact, references: [], routes: [], tests: [] })).toEqual([]);
  });
});

describe('blockedImpactFromError', () => {
  it('extrai impacto de DeleteBlockedByReferences', () => {
    const error = {
      shape: {
        details: {
          componentError: 'DeleteBlockedByReferences',
          referenceCount: 1,
          references: [{ file: 'a.tsx', line: 1, kind: 'import' }],
          impact: { routes: ['/'], pages: [], otherComponents: [], exports: [], tests: [], assets: [] },
        },
      },
    };
    const blocked = blockedImpactFromError(error);
    expect(blocked?.kind).toBe('blocked');
    if (blocked?.kind === 'blocked') {
      expect(blocked.impact.referenceCount).toBe(1);
      expect(blocked.impact.routes).toEqual(['/']);
    }
  });

  it('DeleteBlockedImpactUnknown -> unknown-impact (sem caminho de bypass)', () => {
    const blocked = blockedImpactFromError({
      shape: { details: { componentError: 'DeleteBlockedImpactUnknown', scannedFiles: 5, skippedFiles: 2 } },
    });
    expect(blocked).toEqual({ kind: 'unknown-impact', scannedFiles: 5, skippedFiles: 2 });
  });

  it('erros sem details -> null', () => {
    expect(blockedImpactFromError(new Error('x'))).toBeNull();
    expect(blockedImpactFromError(null)).toBeNull();
  });
});

describe('filterByScope', () => {
  const list = [
    { id: '1', name: 'A', scope: 'Project' as const, source: { kind: 'ProjectFile' as const, path: 'a.tsx' }, version: null },
    { id: '2', name: 'B', scope: 'Library' as const, source: { kind: 'LibraryPackage' as const, packageName: 'x', version: '1' }, version: '1' },
  ];
  it("'all' não filtra; escopo filtra", () => {
    expect(filterByScope(list, 'all')).toHaveLength(2);
    expect(filterByScope(list, 'Library').map((c) => c.id)).toEqual(['2']);
  });
});
