/**
 * ComponentDetail — Component Schema completo (component.read, M3-CONTRACTS §7):
 * identidade, props (tabela tipo/required/default), variants, slots, events,
 * assets, styles. UNSUPPORTED (stack não-React) chega como erro do backend e é
 * exibido honesto via ErrorState — nunca convertido em sucesso.
 */

import { Pencil, Trash2, Upload } from 'lucide-react';

import type { ComponentProp, ComponentSchema } from '../../api/hooks';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from '../../components/ui';
import { componentSourceLabel, propDefaultLabel, scopeTone, versionLabel } from './helpers';

export function PropsTable({ props }: { props: ComponentProp[] }) {
  if (props.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma prop declarada/detectada.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-2 py-1.5 font-medium">Nome</th>
            <th scope="col" className="px-2 py-1.5 font-medium">Tipo</th>
            <th scope="col" className="px-2 py-1.5 font-medium">Obrigatória</th>
            <th scope="col" className="px-2 py-1.5 font-medium">Default</th>
            <th scope="col" className="px-2 py-1.5 font-medium">Validação</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name} className="border-t border-border">
              <td className="px-2 py-1.5 font-mono text-foreground">{p.name}</td>
              <td className="px-2 py-1.5">
                <Badge tone={p.type === 'Unknown' ? 'warning' : 'neutral'} title={p.type === 'Unknown' ? 'Tipo TS indeterminável — nunca adivinhado (M3 §8.8)' : undefined}>
                  {p.type}
                </Badge>
              </td>
              <td className="px-2 py-1.5 text-muted-foreground">{p.required ? 'sim' : 'não'}</td>
              <td className="px-2 py-1.5 font-mono text-muted-foreground">{propDefaultLabel(p.default)}</td>
              <td className="px-2 py-1.5 font-mono text-muted-foreground">{p.validation ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StringList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-foreground">{label}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum(a).</p>
      ) : (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item} className="font-mono text-xs text-muted-foreground">{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface ComponentDetailProps {
  schema: ComponentSchema;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
}

export function ComponentDetail({ schema, onEdit, onDelete, onPublish }: ComponentDetailProps) {
  const { identity } = schema;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              {identity.name} <Badge tone={scopeTone(identity.scope)}>{identity.scope}</Badge>
            </span>
          }
          description={`${componentSourceLabel(identity.source)} · ${versionLabel(identity.version)}`}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={onEdit}>
                <Pencil aria-hidden="true" size={14} /> Editar
              </Button>
              <Button size="sm" variant="secondary" onClick={onPublish} disabled={identity.scope === 'Library'}>
                <Upload aria-hidden="true" size={14} /> Publish
              </Button>
              <Button size="sm" variant="danger" onClick={onDelete}>
                <Trash2 aria-hidden="true" size={14} /> Delete
              </Button>
            </div>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <section aria-label="Props">
            <h3 className="mb-1 text-sm font-medium text-foreground">Props ({schema.props.length})</h3>
            <PropsTable props={schema.props} />
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section aria-label="Variants">
              <h3 className="mb-1 text-sm font-medium text-foreground">Variants ({schema.variants.length})</h3>
              {schema.variants.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma variant.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {schema.variants.map((v) => (
                    <li key={v.name} className="text-xs text-muted-foreground">
                      <span className="font-mono text-foreground">{v.name}</span>: {v.values.join(' | ')}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="Slots">
              <h3 className="mb-1 text-sm font-medium text-foreground">Slots ({schema.slots.length})</h3>
              {schema.slots.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum slot.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {schema.slots.map((s) => (
                    <li key={s.name} className="text-xs text-muted-foreground">
                      <span className="font-mono text-foreground">{s.name}</span> <Badge tone="neutral">{s.kind}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StringList label={`Events (${schema.events.length})`} items={schema.events} />
            <StringList label={`Assets (${schema.assets.length})`} items={schema.assets} />
            <div>
              <h4 className="text-xs font-medium text-foreground">Styles ({schema.styles.length})</h4>
              {schema.styles.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum property source detectado.</p>
              ) : (
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {schema.styles.map((s, i) => (
                    <li key={`${s.kind}-${i}`} className="text-xs text-muted-foreground">
                      <Badge tone={s.kind === 'Unknown' ? 'warning' : 'neutral'}>{s.kind}</Badge>{' '}
                      <span className="font-mono">{s.reference}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function ComponentDetailEmpty() {
  return (
    <EmptyState
      title="Selecione um componente"
      description="Escolha um componente na lista para ler o Component Schema completo (08§9) com refresh da fonte."
    />
  );
}
