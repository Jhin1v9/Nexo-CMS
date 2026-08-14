/**
 * PublishComponentDialog — component.publish (08§25/§74): validação §74 com
 * as 6 verificações exibidas uma a uma com status REAL. Bloqueio -> o
 * PublishValidation viaja em error.details.publishValidation e é exibido com
 * o nextAction do backend. Sucesso -> nova identidade Library (08§87).
 */

import { useState } from 'react';

import { currentActorId, ControlPlaneError } from '../../api/client';
import { useComponentPublish, type ComponentSchema, type PublishComponentOutcome } from '../../api/hooks';
import { ApprovalDialog, Badge, Button, Dialog, ErrorState, Field, Input, Textarea } from '../../components/ui';
import { PublishValidationView } from './PublishValidationView';
import { publishValidationFromDetails } from './helpers';

export interface PublishComponentDialogProps {
  projectId: string;
  schema: ComponentSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishComponentDialog({ projectId, schema, open, onOpenChange }: PublishComponentDialogProps) {
  const publish = useComponentPublish();
  const [version, setVersion] = useState('');
  const [changes, setChanges] = useState('');
  const [approving, setApproving] = useState(false);
  const [outcome, setOutcome] = useState<PublishComponentOutcome | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setVersion('');
      setChanges('');
      setApproving(false);
      setOutcome(null);
      publish.reset();
    }
    onOpenChange(next);
  };

  const submit = (justification?: string) => {
    publish.mutate(
      {
        projectId,
        componentId: schema.identity.id,
        ...(version.trim().length > 0 ? { version: version.trim() } : {}),
        ...(changes.trim().length > 0
          ? { changes: changes.split('\n').map((c) => c.trim()).filter((c) => c.length > 0) }
          : {}),
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

  const err = publish.error instanceof ControlPlaneError ? publish.error : null;
  const blockedValidation = err !== null ? publishValidationFromDetails(err.shape.details) : undefined;

  return (
    <>
      <Dialog
        open={open && !approving}
        onOpenChange={close}
        title={`Publish '${schema.identity.name}'`}
        description="component.publish — promove Project Component para o escopo Library com validação 08§74. Publish gera NOVA identidade no escopo Library (08§87)."
        footer={
          outcome === null ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
              <Button variant="primary" onClick={() => { publish.reset(); setApproving(true); }}>
                Publicar
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
          <div className="flex flex-col gap-3" role="status">
            <p className="text-sm text-foreground">
              <Badge tone="success">{outcome.status}</Badge> Publicado como{' '}
              <span className="font-mono">{outcome.libraryComponentId}</span> v{outcome.version}.
            </p>
            <PublishValidationView validation={outcome.validation} />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone={outcome.compatibility === 'COMPATIBLE' ? 'success' : outcome.compatibility === 'UNKNOWN' ? 'warning' : 'danger'}>
                Compatibilidade: {outcome.compatibility}
              </Badge>
              <Badge tone="neutral">Portabilidade: {outcome.portability}</Badge>
            </div>
            {outcome.dependencies.length > 0 ? (
              <div>
                <h4 className="text-xs font-medium text-foreground">Dependências ({outcome.dependencies.length})</h4>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {outcome.dependencies.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      <Badge tone={d.declared ? 'success' : 'warning'}>{d.declared ? 'declarada' : 'não declarada'}</Badge>{' '}
                      <span className="font-mono">{d.name}</span> ({d.kind})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Versão (semver, opcional)" htmlFor="pub-version" description="Default: bump de patch na linhagem (08§26).">
              <Input id="pub-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </Field>
            <Field label="Mudanças (uma por linha, opcional)" htmlFor="pub-changes">
              <Textarea id="pub-changes" rows={3} value={changes} onChange={(e) => setChanges(e.target.value)} />
            </Field>
            {publish.isError ? (
              <div className="flex flex-col gap-2">
                {blockedValidation !== undefined ? (
                  <div role="alert" className="flex flex-col gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2">
                    <p className="text-sm font-medium text-danger">Publish bloqueado: validação §74 falhou</p>
                    <PublishValidationView validation={blockedValidation} />
                  </div>
                ) : null}
                <ErrorState error={publish.error} operation="component.publish" />
              </div>
            ) : null}
          </div>
        )}
      </Dialog>

      <ApprovalDialog
        open={approving}
        onOpenChange={(o) => setApproving(o)}
        title={`Publish '${schema.identity.name}'`}
        capabilityId="component.publish"
        confirmLabel="Aprovar e publicar"
        loading={publish.isPending}
        onConfirm={(j) => submit(j)}
      >
        <p className="text-sm text-foreground">
          Publica <span className="font-medium">{schema.identity.name}</span> no escopo Library. As 6 verificações
          08§74 (Source Integrity, Dependencies, No Secret Leakage, No Private Refs, Schema, Compatibility) serão
          executadas de verdade; qualquer falha bloqueia o publish com diagnóstico.
        </p>
      </ApprovalDialog>
    </>
  );
}
