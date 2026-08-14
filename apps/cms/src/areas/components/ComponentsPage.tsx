/**
 * ComponentsPage (/projects/$projectId/components) — doc 08§33-40.
 * Auto-gateada: CapabilityArea exige component.list no discovery (Inv. 27).
 * Lista TanStack (filtro por escopo server-side via component.list scope) +
 * read (schema completo) + create wizard + update/delete/publish.
 * UNSUPPORTED de stack não-React vem do backend e aparece via ErrorState
 * (nunca disfarçado — M3 §8.8).
 */

import { useState } from 'react';
import { Component, Plus } from 'lucide-react';

import { useComponent, useComponentList, type ComponentScope } from '../../api/hooks';
import { Button, EmptyState, ErrorState, Field, Select, Spinner } from '../../components/ui';
import { CapabilityArea } from '../stubs/CapabilityArea';
import { ComponentDetail, ComponentDetailEmpty } from './ComponentDetail';
import { ComponentList } from './ComponentList';
import { CreateComponentWizard } from './CreateComponentWizard';
import { DeleteComponentDialog } from './DeleteComponentDialog';
import { PublishComponentDialog } from './PublishComponentDialog';
import { UpdateComponentDialog } from './UpdateComponentDialog';

const SCOPE_OPTIONS: { value: ComponentScope | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os escopos' },
  { value: 'Project', label: 'Project' },
  { value: 'Workspace', label: 'Workspace' },
  { value: 'Library', label: 'Library' },
];

function ComponentsBody({ projectId }: { projectId: string }) {
  const [scope, setScope] = useState<ComponentScope | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const list = useComponentList(projectId, scope === 'all' ? undefined : scope);
  const detail = useComponent(projectId, selectedId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Escopo" htmlFor="cmp-scope" className="w-56">
          <Select
            id="cmp-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as ComponentScope | 'all')}
          >
            {SCOPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden="true" size={14} /> Criar componente
        </Button>
      </div>

      {list.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner label="Carregando componentes" /> Carregando componentes…
        </div>
      ) : list.isError ? (
        <ErrorState error={list.error} operation="component.list" action={<Button variant="secondary" onClick={() => void list.refetch()}>Tentar novamente</Button>} />
      ) : (
        <ComponentList components={list.data ?? []} selectedId={selectedId} onSelect={setSelectedId} />
      )}

      <section aria-label="Detalhe do componente">
        {selectedId === null ? (
          <ComponentDetailEmpty />
        ) : detail.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner label="Lendo Component Schema" /> Lendo Component Schema…
          </div>
        ) : detail.isError ? (
          <ErrorState
            error={detail.error}
            operation="component.read"
            action={<Button variant="secondary" onClick={() => void detail.refetch()}>Tentar novamente</Button>}
          />
        ) : detail.data !== undefined ? (
          <ComponentDetail
            schema={detail.data}
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteOpen(true)}
            onPublish={() => setPublishOpen(true)}
          />
        ) : (
          <EmptyState title="Componente não encontrado" description="O schema não foi retornado pelo backend." />
        )}
      </section>

      <CreateComponentWizard
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedId(id)}
      />
      {detail.data !== undefined ? (
        <>
          <UpdateComponentDialog projectId={projectId} schema={detail.data} open={editOpen} onOpenChange={setEditOpen} />
          <DeleteComponentDialog
            projectId={projectId}
            schema={detail.data}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={() => setSelectedId(null)}
          />
          <PublishComponentDialog projectId={projectId} schema={detail.data} open={publishOpen} onOpenChange={setPublishOpen} />
        </>
      ) : null}
    </div>
  );
}

/** Assinatura para o wiring do router: `<ComponentsPage projectId={projectId} />`. */
export function ComponentsPage({ projectId }: { projectId: string }) {
  return (
    <CapabilityArea
      title="Components"
      icon={Component}
      requires={['component.list', 'component.read', 'component.create', 'component.update', 'component.delete', 'component.publish']}
    >
      <ComponentsBody projectId={projectId} />
    </CapabilityArea>
  );
}
