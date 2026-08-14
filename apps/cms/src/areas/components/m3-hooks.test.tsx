/**
 * Testes dos hooks M3 (Wave 5c) com CLIENT STUB (vi.spyOn no singleton
 * controlPlane) em ambiente node — SEM jsdom (não instalado; ver RELATORIO).
 *
 * Técnica: os hooks são capturados dentro de um harness renderizado com
 * renderToString (dispatcher de hooks presente; nenhum efeito/DOM necessário).
 * - Mutações: `mutateAsync` executa a mutationFn fora de efeitos — validamos
 *   capability id, input e merge de approval (D17) contra o client stub.
 * - Queries: SSR não dispara fetch; validamos o registro da queryKey no cache
 *   (alinhamento com m3QueryKeys) e o gate por capability (enabled).
 */

import { QueryClient, QueryClientProvider, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

import { controlPlane, type DiscoveredCapability } from '../../api/client';
import {
  m3QueryKeys,
  queryKeys,
  useComponentCreate,
  useComponentList,
  useDesignTokenUpdate,
  useMediaList,
  type ComponentIdentity,
  type CreateComponentInput,
  type CreateComponentOutcome,
  type DesignTokenUpdateInput,
  type DesignTokenUpdateResult,
} from '../../api/hooks';
import type { Approval } from '../../api/client';

function cap(id: string, allowed: DiscoveredCapability['allowed'] = 'ALLOW'): DiscoveredCapability {
  const [domain = ''] = id.split('.');
  return {
    id,
    version: 1,
    domain,
    description: id,
    requiredPermission: id,
    risk: allowed === 'REQUIRE_APPROVAL' ? 'DESTRUCTIVE' : 'SAFE',
    sideEffects: allowed === 'REQUIRE_APPROVAL',
    async: 'sync',
    timeoutMs: 1000,
    allowed,
  };
}

function clientWith(caps: DiscoveredCapability[]): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(queryKeys.capabilities, { capabilities: caps });
  return qc;
}

/** Renderiza o harness SSR e retorna o valor capturado do hook. */
function captureHook<T>(qc: QueryClient, useHook: () => T): T {
  let captured: T | undefined;
  function Harness(): ReactElement | null {
    captured = useHook();
    return null;
  }
  renderToString(<QueryClientProvider client={qc}>{<Harness />}</QueryClientProvider>);
  if (captured === undefined) throw new Error('hook não capturado');
  return captured;
}

afterEach(() => vi.restoreAllMocks());

describe('queries M3 (gate por capability + queryKey)', () => {
  it('useComponentList registra a queryKey correta e fica gated sem capability', () => {
    const spy = vi.spyOn(controlPlane, 'invoke');

    const qcDenied = clientWith([]);
    const denied = captureHook(qcDenied, () => useComponentList('p1'));
    expect(denied.fetchStatus).toBe('idle'); // capability ausente -> não busca (Inv. 27)
    expect(spy).not.toHaveBeenCalled();

    const qcOk = clientWith([cap('component.list')]);
    const components: ComponentIdentity[] = [
      { id: 'c1', name: 'Button', scope: 'Project', source: { kind: 'ProjectFile', path: 'src/Button.tsx' }, version: null },
    ];
    qcOk.setQueryData(m3QueryKeys.componentList('p1', undefined), components);
    const okQuery = captureHook(qcOk, () => useComponentList('p1'));
    expect(okQuery.data).toEqual(components);
    expect(qcOk.getQueryCache().find({ queryKey: m3QueryKeys.componentList('p1', undefined) })).toBeDefined();
  });

  it('useMediaList passa o filtro para a queryKey', () => {
    const qc = clientWith([cap('media.list')]);
    captureHook(qc, () => useMediaList('p1', { usageState: 'Unknown' }));
    expect(qc.getQueryCache().find({ queryKey: m3QueryKeys.mediaList('p1', { usageState: 'Unknown' }) })).toBeDefined();
    expect(qc.getQueryCache().find({ queryKey: m3QueryKeys.mediaList('p1', undefined) })).toBeUndefined();
  });
});

describe('mutações M3 (client stub + approval D17)', () => {
  it('useComponentCreate invoca component.create com approval mesclada no envelope', async () => {
    const outcome: CreateComponentOutcome = {
      componentId: 'c9',
      filesChanged: ['src/components/Card.tsx'],
      diagnostics: [],
      status: 'Created',
      conventions: { componentDir: 'src/components', fileExtension: '.tsx', naming: 'PascalCase', evidence: [] },
    };
    const spy = vi.spyOn(controlPlane, 'invoke').mockResolvedValue(outcome);
    const qc = clientWith([cap('component.create', 'REQUIRE_APPROVAL')]);

    const mutation = captureHook(qc, () => useComponentCreate());
    const input: CreateComponentInput & { approval?: Approval } = {
      projectId: 'p1',
      name: 'Card',
      props: [{ name: 'title', type: 'String', required: true }],
      approval: { approver: 'cli:local', justification: 'criar Card' },
    };
    const result = await mutation.mutateAsync(input);
    expect(result).toEqual(outcome);
    expect(spy).toHaveBeenCalledTimes(1);
    const [id, body] = spy.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('component.create');
    expect(body['projectId']).toBe('p1');
    // approval NUNCA vaza para dentro do input de domínio — vai como chave irmã.
    expect(body['approval']).toEqual({ approver: 'cli:local', justification: 'criar Card' });
    expect((body['props'] as unknown[]).length).toBe(1);
  });

  it('useDesignTokenUpdate invoca design.token.update sem approval quando não fornecida', async () => {
    const updated: DesignTokenUpdateResult = {
      tokenRef: '--color-primary',
      previousValue: '#000',
      value: '#111',
      representation: 'hex',
      file: 'src/app.css',
      line: 3,
      filesChanged: ['src/app.css'],
      impact: {
        target: '--color-primary',
        usagesCount: 2,
        scannedFiles: 10,
        affectedFiles: ['src/app.css'],
        affectedComponents: [],
        affectedPages: [],
        affectedTokens: [],
        affectedInstances: 0,
        entries: [],
        notes: [],
      },
      verified: true,
    };
    const spy = vi.spyOn(controlPlane, 'invoke').mockResolvedValue(updated);
    const qc = clientWith([cap('design.token.update', 'REQUIRE_APPROVAL')]);

    const mutation: UseMutationResult<DesignTokenUpdateResult, Error, DesignTokenUpdateInput & { approval?: Approval }> =
      captureHook(qc, () => useDesignTokenUpdate());
    await mutation.mutateAsync({ projectId: 'p1', tokenRef: '--color-primary', value: '#111' });
    const [id, body] = spy.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('design.token.update');
    expect(body).toEqual({ projectId: 'p1', tokenRef: '--color-primary', value: '#111' });
    expect('approval' in body).toBe(false);
  });

  it('erro do client stub propaga como erro da mutation (nunca engolido)', async () => {
    vi.spyOn(controlPlane, 'invoke').mockRejectedValue(new Error('UNSUPPORTED: stack não-React'));
    const qc = clientWith([cap('component.create', 'REQUIRE_APPROVAL')]);
    const mutation = captureHook(qc, () => useComponentCreate());
    await expect(
      mutation.mutateAsync({ projectId: 'p1', name: 'X', props: [] }),
    ).rejects.toThrow('UNSUPPORTED');
  });
});

// Garante ao typechecker que os tipos de retorno dos hooks de query estão corretos.
type _AssertQuery = UseQueryResult<ComponentIdentity[]> extends ReturnType<typeof useComponentList> ? true : never;
const _assert: _AssertQuery = true;
void _assert;
