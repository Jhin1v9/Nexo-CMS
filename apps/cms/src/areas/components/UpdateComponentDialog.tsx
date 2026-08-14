/**
 * UpdateComponentDialog — patch de metadata/props (component.update, 08§22).
 * Substituição de lista: o form parte do schema ATUAL (props carregadas,
 * `required` obrigatório no patch). O Diff retornado pelo backend é exibido
 * (arquivos + linhas adicionadas/removidas) — nunca fake success.
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { currentActorId } from '../../api/client';
import {
  useComponentUpdate,
  type ComponentProp,
  type ComponentSchema,
  type PropType,
  type UpdateComponentOutcome,
} from '../../api/hooks';
import { ApprovalDialog, Badge, Button, Dialog, ErrorState, Field, Input, Select, Textarea } from '../../components/ui';
import { PROP_TYPE_OPTIONS } from './helpers';

function DiffView({ outcome }: { outcome: UpdateComponentOutcome }) {
  return (
    <div className="flex flex-col gap-3" role="status">
      <p className="text-sm text-foreground">
        <Badge tone="success">Atualizado</Badge> Diff retornado pelo backend ({outcome.diff.files.length} arquivo(s)).
      </p>
      {outcome.diff.files.map((f) => (
        <div key={f.file} className="rounded-md border border-border">
          <p className="border-b border-border bg-muted/60 px-2 py-1 font-mono text-xs text-foreground">
            {f.file} <Badge tone={f.status === 'Added' ? 'success' : f.status === 'Removed' ? 'danger' : 'warning'}>{f.status}</Badge>
          </p>
          <div className="max-h-48 overflow-auto px-2 py-1">
            {f.removed.map((l, i) => (
              <p key={`r${i}`} className="font-mono text-xs text-danger">- {l}</p>
            ))}
            {f.added.map((l, i) => (
              <p key={`a${i}`} className="font-mono text-xs text-success">+ {l}</p>
            ))}
            {f.added.length === 0 && f.removed.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem linhas alteradas.</p>
            ) : null}
          </div>
        </div>
      ))}
      {outcome.diagnostics.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {outcome.diagnostics.map((d, i) => (
            <li key={i} className="text-xs text-muted-foreground">{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface UpdateComponentDialogProps {
  projectId: string;
  schema: ComponentSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateComponentDialog({ projectId, schema, open, onOpenChange }: UpdateComponentDialogProps) {
  const update = useComponentUpdate();
  const [description, setDescription] = useState('');
  const [props_, setProps] = useState<ComponentProp[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [approving, setApproving] = useState(false);
  const [outcome, setOutcome] = useState<UpdateComponentOutcome | null>(null);

  // Inicializa o form a partir do schema ATUAL ao abrir (substituição de lista).
  if (open && !initialized) {
    setDescription(typeof schema.metadata['description'] === 'string' ? (schema.metadata['description'] as string) : '');
    setProps(schema.props.map((p) => ({ ...p })));
    setInitialized(true);
    setOutcome(null);
    update.reset();
  }

  const close = (next: boolean) => {
    if (!next) {
      setInitialized(false);
      setApproving(false);
      setOutcome(null);
      update.reset();
    }
    onOpenChange(next);
  };

  const propsValid = props_.every((p) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p.name));

  const submit = (justification?: string) => {
    update.mutate(
      {
        projectId,
        componentId: schema.identity.id,
        patch: {
          ...(description.trim().length > 0 ? { description: description.trim() } : {}),
          props: props_,
        },
        approval: { approver: currentActorId(), ...(justification ? { justification } : {}) },
      },
      {
        onSuccess: (data) => {
          setApproving(false);
          setOutcome(data);
        },
        onError: () => setApproving(false),
      },
    );
  };

  return (
    <>
      <Dialog
        open={open && !approving}
        onOpenChange={close}
        title={`Editar '${schema.identity.name}'`}
        description="component.update — patch de descrição/props (substituição de lista, 08§22). O Diff real é exibido após a execução."
        className="max-w-2xl"
        footer={
          outcome === null ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
              <Button variant="primary" onClick={() => { update.reset(); setApproving(true); }} disabled={!propsValid}>
                Aplicar patch
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => close(false)}>Fechar</Button>
            </div>
          )
        }
      >
        {outcome !== null ? (
          <DiffView outcome={outcome} />
        ) : (
          <div className="flex flex-col gap-3">
            {update.isError ? <ErrorState error={update.error} operation="component.update" /> : null}
            <Field label="Descrição" htmlFor="uc-desc">
              <Textarea id="uc-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Props ({props_.length})</h4>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setProps((ps) => [...ps, { name: '', type: 'String', required: false }])}
              >
                <Plus aria-hidden="true" size={14} /> Adicionar prop
              </Button>
            </div>
            <ul className="flex max-h-64 flex-col gap-2 overflow-auto">
              {props_.map((p, i) => (
                <li key={i} className="flex items-end gap-2 rounded-md border border-border p-2">
                  <Field label="Nome" htmlFor={`uc-prop-name-${i}`} className="flex-1">
                    <Input
                      id={`uc-prop-name-${i}`}
                      value={p.name}
                      onChange={(e) => setProps((ps) => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    />
                  </Field>
                  <Field label="Tipo" htmlFor={`uc-prop-type-${i}`}>
                    <Select
                      id={`uc-prop-type-${i}`}
                      value={p.type === 'Unknown' ? 'String' : p.type}
                      onChange={(e) =>
                        setProps((ps) => ps.map((x, j) => (j === i ? { ...x, type: e.target.value as PropType } : x)))
                      }
                    >
                      {PROP_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <label className="inline-flex items-center gap-1.5 pb-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={p.required}
                      onChange={(e) =>
                        setProps((ps) => ps.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))
                      }
                    />
                    Obrigatória
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setProps((ps) => ps.filter((_, j) => j !== i))}
                    aria-label={`Remover prop ${p.name || i + 1}`}
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </Button>
                </li>
              ))}
            </ul>
            {!propsValid ? (
              <p role="alert" className="text-xs text-danger">Há props com nome inválido (identificador JS).</p>
            ) : null}
          </div>
        )}
      </Dialog>

      <ApprovalDialog
        open={approving}
        onOpenChange={(o) => setApproving(o)}
        title={`Editar '${schema.identity.name}'`}
        capabilityId="component.update"
        confirmLabel="Aprovar e aplicar"
        loading={update.isPending}
        onConfirm={(justification) => submit(justification)}
      >
        <p className="text-sm text-foreground">
          Aplica patch de descrição/props ({props_.length} prop(s)) em{' '}
          <span className="font-medium">{schema.identity.name}</span>. O schema é revalidado e o Diff real será
          retornado (08§22).
        </p>
      </ApprovalDialog>
    </>
  );
}
