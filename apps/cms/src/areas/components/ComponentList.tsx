/**
 * ComponentList — tabela TanStack Table v9 de ComponentIdentity[]
 * (component.list, 08§6) com seleção de linha. Colunas: nome, escopo (Badge),
 * source (08§8), versão. Nunca fabrica linhas: vazio -> EmptyState honesto.
 */

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { Component } from 'lucide-react';

import type { ComponentIdentity } from '../../api/hooks';
import { Badge, EmptyState } from '../../components/ui';
import { componentSourceLabel, scopeTone, versionLabel } from './helpers';

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, ComponentIdentity>();

const columns = helper.columns([
  helper.accessor('name', {
    header: 'Nome',
    cell: (c) => <span className="font-medium text-foreground">{c.getValue()}</span>,
  }),
  helper.accessor('scope', {
    header: 'Escopo',
    cell: (c) => <Badge tone={scopeTone(c.getValue())}>{c.getValue()}</Badge>,
  }),
  helper.accessor('source', {
    header: 'Source',
    cell: (c) => <span className="text-muted-foreground">{componentSourceLabel(c.getValue())}</span>,
  }),
  helper.accessor('version', {
    header: 'Versão',
    cell: (c) => <span className="text-muted-foreground">{versionLabel(c.getValue())}</span>,
  }),
]);

export interface ComponentListProps {
  components: ComponentIdentity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ComponentList({ components, selectedId, onSelect }: ComponentListProps) {
  const table = useTable({ features, columns, data: components });

  if (components.length === 0) {
    return (
      <EmptyState
        icon={Component}
        title="Nenhum componente neste escopo"
        description="O projeto não tem componentes detectados/registrados neste escopo. Crie um componente (component.create) ou ajuste o filtro."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} scope="col" className="px-3 py-2 font-medium">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const selected = row.original.id === selectedId;
            const cells = row.getAllCells();
            return (
              <tr key={row.id} aria-selected={selected} className={selected ? 'bg-primary/5' : 'hover:bg-muted/40'}>
                {cells.map((cell, idx) => (
                  <td key={cell.id} className="border-t border-border px-3 py-2">
                    {idx === 0 ? (
                      <button
                        type="button"
                        onClick={() => onSelect(row.original.id)}
                        className="w-full rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        aria-label={`Abrir detalhes de ${row.original.name}`}
                      >
                        <table.FlexRender cell={cell} />
                      </button>
                    ) : (
                      <table.FlexRender cell={cell} />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
