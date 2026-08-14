/**
 * CreateComponentWizard — Dialog multi-step de component.create (08§20-21):
 * 1) identidade (name PascalCase, description)
 * 2) props (editor dinâmico de CreatePropInput)
 * 3) revisão -> ApprovalDialog (D17) -> resultado REAL (filesChanged + diagnostics).
 * Erros do backend (ex.: UNSUPPORTED em stack não-React) aparecem com
 * nextAction — nunca escondidos (Inv. 6/25).
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { currentActorId } from '../../api/client';
import {
  useComponentCreate,
  type CreateComponentOutcome,
  type CreatePropInput,
  type PropType,
} from '../../api/hooks';
import { ApprovalDialog, Badge, Button, Dialog, ErrorState, Field, Input, Select, Textarea } from '../../components/ui';
import { PROP_TYPE_OPTIONS } from './helpers';

const STEPS = ['Identidade', 'Props', 'Revisão'] as const;

interface PropDraft {
  name: string;
  type: PropType;
  required: boolean;
  description: string;
}

const EMPTY_PROP: PropDraft = { name: '', type: 'String', required: false, description: '' };

export interface CreateComponentWizardProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (componentId: string) => void;
}

export function CreateComponentWizard({ projectId, open, onOpenChange, onCreated }: CreateComponentWizardProps) {
  const create = useComponentCreate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [props_, setProps] = useState<PropDraft[]>([]);
  const [approving, setApproving] = useState(false);
  const [outcome, setOutcome] = useState<CreateComponentOutcome | null>(null);

  const reset = () => {
    setStep(0);
    setName('');
    setDescription('');
    setProps([]);
    setApproving(false);
    setOutcome(null);
    create.reset();
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const nameValid = /^[A-Z][A-Za-z0-9]*$/.test(name);
  const propsValid = props_.every((p) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p.name));
  const canNext = step === 0 ? nameValid : step === 1 ? propsValid : true;

  const buildInput = () => ({
    projectId,
    name,
    ...(description.trim().length > 0 ? { description: description.trim() } : {}),
    props: props_.map<CreatePropInput>((p) => ({
      name: p.name,
      type: p.type,
      required: p.required,
      ...(p.description.trim().length > 0 ? { description: p.description.trim() } : {}),
    })),
  });

  const submit = (justification?: string) => {
    create.mutate(
      { ...buildInput(), approval: { approver: currentActorId(), ...(justification ? { justification } : {}) } },
      {
        onSuccess: (data) => {
          setApproving(false);
          setOutcome(data);
          onCreated(data.componentId);
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
        title="Criar componente"
        description="component.create — respeita as convenções detectadas do projeto (08§21); fluxo Persist → Re-analyze → Validate → Register (08§20)."
        className="max-w-2xl"
        footer={
          outcome === null ? (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => close(false)}>
                Cancelar
              </Button>
              <div className="flex items-center gap-2">
                {step > 0 ? (
                  <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                    Voltar
                  </Button>
                ) : null}
                {step < STEPS.length - 1 ? (
                  <Button variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                    Avançar
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => { create.reset(); setApproving(true); }} disabled={!canNext}>
                    Criar componente
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => close(false)}>
                Fechar
              </Button>
            </div>
          )
        }
      >
        {outcome !== null ? (
          <div className="flex flex-col gap-3" role="status">
            <p className="text-sm text-foreground">
              <Badge tone="success">{outcome.status}</Badge> Componente criado e registrado (verificação real).
            </p>
            <div>
              <h4 className="text-xs font-medium text-foreground">Arquivos alterados ({outcome.filesChanged.length})</h4>
              <ul className="mt-1 flex flex-col gap-0.5">
                {outcome.filesChanged.map((f) => (
                  <li key={f} className="font-mono text-xs text-muted-foreground">{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-foreground">
                Convenções aplicadas ({outcome.conventions.componentDir}, {outcome.conventions.fileExtension},{' '}
                {outcome.conventions.naming})
              </h4>
              {outcome.diagnostics.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {outcome.diagnostics.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground">{d}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Sem diagnósticos.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ol className="flex items-center gap-2" aria-label="Etapas">
              {STEPS.map((label, i) => (
                <li key={label} aria-current={i === step ? 'step' : undefined}>
                  <Badge tone={i === step ? 'primary' : i < step ? 'success' : 'neutral'}>
                    {i + 1}. {label}
                  </Badge>
                </li>
              ))}
            </ol>

            {create.isError ? <ErrorState error={create.error} operation="component.create" /> : null}

            {step === 0 ? (
              <>
                <Field label="Nome do componente" htmlFor="cc-name" required description="PascalCase (convenção React; validado no backend 08§21).">
                  <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="MeuComponente" />
                </Field>
                {name.length > 0 && !nameValid ? (
                  <p role="alert" className="text-xs text-danger">Nome inválido: use PascalCase (ex.: ProductCard).</p>
                ) : null}
                <Field label="Descrição" htmlFor="cc-desc">
                  <Textarea id="cc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </Field>
              </>
            ) : null}

            {step === 1 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Props ({props_.length})</h4>
                  <Button size="sm" variant="secondary" onClick={() => setProps((ps) => [...ps, { ...EMPTY_PROP }])}>
                    <Plus aria-hidden="true" size={14} /> Adicionar prop
                  </Button>
                </div>
                {props_.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma prop — o componente será criado sem props.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {props_.map((p, i) => (
                      <li key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <Field label="Nome" htmlFor={`cc-prop-name-${i}`} required>
                            <Input
                              id={`cc-prop-name-${i}`}
                              value={p.name}
                              onChange={(e) =>
                                setProps((ps) => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                              }
                            />
                          </Field>
                          <Field label="Tipo" htmlFor={`cc-prop-type-${i}`}>
                            <Select
                              id={`cc-prop-type-${i}`}
                              value={p.type}
                              onChange={(e) =>
                                setProps((ps) => ps.map((x, j) => (j === i ? { ...x, type: e.target.value as PropType } : x)))
                              }
                            >
                              {PROP_TYPE_OPTIONS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </Select>
                          </Field>
                          <div className="flex items-end justify-between gap-2 pb-1">
                            <label className="inline-flex items-center gap-1.5 text-xs text-foreground">
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
                          </div>
                        </div>
                        <Field label="Descrição" htmlFor={`cc-prop-desc-${i}`}>
                          <Input
                            id={`cc-prop-desc-${i}`}
                            value={p.description}
                            onChange={(e) =>
                              setProps((ps) => ps.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                            }
                          />
                        </Field>
                        {p.name.length > 0 && !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p.name) ? (
                          <p role="alert" className="text-xs text-danger">Nome de prop inválido.</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-col gap-2 text-sm">
                <p className="text-foreground">
                  <span className="font-medium">{name}</span> — escopo <Badge tone="primary">Project</Badge> (M3: create é
                  fluxo de projeto, 08§20).
                </p>
                <p className="text-xs text-muted-foreground">
                  {props_.length} prop(s). A criação escreve arquivos reais no Project Root (DESTRUCTIVE → aprovação
                  D17 na próxima etapa).
                </p>
                {description.trim().length > 0 ? (
                  <p className="text-xs text-muted-foreground">{description}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </Dialog>

      <ApprovalDialog
        open={approving}
        onOpenChange={(o) => setApproving(o)}
        title={`Criar componente '${name}'`}
        capabilityId="component.create"
        confirmLabel="Aprovar e criar"
        loading={create.isPending}
        onConfirm={(justification) => submit(justification)}
      >
        <p className="text-sm text-foreground">
          Cria <span className="font-medium">{name}</span> com {props_.length} prop(s) no escopo Project. Arquivos
          reais serão escritos no Project Root conforme as convenções detectadas (08§21).
        </p>
      </ApprovalDialog>
    </>
  );
}
