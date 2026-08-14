/**
 * DesignUpdateForm — design.update (09§7/§74-79): form target/property/value
 * com PropertySource exibido. Target 'token' edita a fonte do token; target
 * 'element' exige file + elementSelector + propertySource. PropertySource
 * Unknown -> orientação explícita (nunca escondido). Resultado exibe rota
 * resolvida, PropertySource efetivo e impact report verificado.
 */

import { useState } from 'react';

import { currentActorId } from '../../api/client';
import {
  useDesignUpdate,
  type DesignPropertySource,
  type DesignUpdateInput,
  type DesignUpdateResult,
} from '../../api/hooks';
import { ApprovalDialog, Badge, Button, ErrorState, Field, Input, Select } from '../../components/ui';
import { isPlausibleTokenRef, PROPERTY_SOURCE_OPTIONS, propertySourceLabel, propertySourceTone } from './helpers';

export function DesignUpdateForm({ projectId }: { projectId: string }) {
  const update = useDesignUpdate();
  const [targetKind, setTargetKind] = useState<'token' | 'element'>('token');
  const [tokenRef, setTokenRef] = useState('');
  const [file, setFile] = useState('');
  const [jsxTag, setJsxTag] = useState('');
  const [componentName, setComponentName] = useState('');
  const [propertySource, setPropertySource] = useState<DesignPropertySource>('DirectValue');
  const [classList, setClassList] = useState('');
  const [propName, setPropName] = useState('');
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
  const [approving, setApproving] = useState(false);
  const [result, setResult] = useState<DesignUpdateResult | null>(null);

  const selectorFilled = jsxTag.trim().length > 0 || componentName.trim().length > 0;
  const valid =
    property.trim().length > 0 &&
    (targetKind === 'token'
      ? isPlausibleTokenRef(tokenRef)
      : file.trim().length > 0 && selectorFilled);

  const buildInput = (): DesignUpdateInput => ({
    projectId,
    target:
      targetKind === 'token'
        ? { kind: 'token', tokenRef: tokenRef.trim() }
        : {
            kind: 'element',
            file: file.trim(),
            elementSelector: {
              ...(componentName.trim().length > 0 ? { componentName: componentName.trim() } : {}),
              ...(jsxTag.trim().length > 0 ? { jsxTag: jsxTag.trim() } : {}),
            },
            propertySource,
            ...(classList.trim().length > 0 ? { classList: classList.trim() } : {}),
            ...(propName.trim().length > 0 ? { propName: propName.trim() } : {}),
          },
    property: property.trim(),
    value,
  });

  const submit = (justification?: string) => {
    update.mutate(
      { ...buildInput(), approval: { approver: currentActorId(), ...(justification ? { justification } : {}) } },
      {
        onSuccess: (data) => {
          setApproving(false);
          setResult(data);
        },
        onError: () => setApproving(false),
      },
    );
  };

  if (result !== null) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="text-sm text-foreground">
          <Badge tone="success">Atualizado e verificado</Badge> rota <Badge tone="primary">{result.route}</Badge>{' '}
          property source{' '}
          <Badge tone={propertySourceTone(result.propertySource)}>{propertySourceLabel(result.propertySource)}</Badge>
        </p>
        <div className="rounded-md border border-border px-3 py-2">
          <h4 className="text-xs font-medium text-foreground">
            Impact report (09§79): {result.impact.usagesCount} uso(s) em {result.impact.affectedFiles.length} arquivo(s)
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {result.impact.scannedFiles} arquivo(s) varridos · componentes: {result.impact.affectedComponents.length} ·
            páginas: {result.impact.affectedPages.length} · instâncias: {result.impact.affectedInstances}.
          </p>
          {result.impact.notes.map((n, i) => (
            <p key={i} className="mt-0.5 text-xs text-muted-foreground">{n}</p>
          ))}
        </div>
        {result.token !== undefined ? (
          <p className="text-xs text-muted-foreground">
            Fonte do token: <span className="font-mono">{result.token.previousValue}</span> →{' '}
            <span className="font-mono">{result.token.value}</span> em{' '}
            <span className="font-mono">{result.token.file}:{result.token.line}</span>.
          </p>
        ) : null}
        {result.filesChanged.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {result.filesChanged.map((f) => (
              <li key={f} className="font-mono text-xs text-muted-foreground">{f}</li>
            ))}
          </ul>
        ) : null}
        <div>
          <Button variant="secondary" onClick={() => { setResult(null); update.reset(); }}>
            Nova atualização
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tipo de alvo" htmlFor="du-kind">
          <Select id="du-kind" value={targetKind} onChange={(e) => setTargetKind(e.target.value as 'token' | 'element')}>
            <option value="token">Token (edita a fonte)</option>
            <option value="element">Elemento (instância)</option>
          </Select>
        </Field>
        <Field label="Propriedade CSS canônica" htmlFor="du-property" required>
          <Input id="du-property" value={property} onChange={(e) => setProperty(e.target.value)} placeholder="color" />
        </Field>
      </div>

      {targetKind === 'token' ? (
        <Field label="Token ref" htmlFor="du-tokenref" required description="Ex.: --color-primary ou colors.primary (v3).">
          <Input id="du-tokenref" value={tokenRef} onChange={(e) => setTokenRef(e.target.value)} placeholder="--color-primary" className="font-mono" />
        </Field>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Arquivo (relativo ao Project Root)" htmlFor="du-file" required>
              <Input id="du-file" value={file} onChange={(e) => setFile(e.target.value)} placeholder="src/App.tsx" className="font-mono" />
            </Field>
            <Field label="Property Source" htmlFor="du-ps" required>
              <Select id="du-ps" value={propertySource} onChange={(e) => setPropertySource(e.target.value as DesignPropertySource)}>
                {PROPERTY_SOURCE_OPTIONS.map((ps) => (
                  <option key={ps} value={ps}>{propertySourceLabel(ps)}</option>
                ))}
              </Select>
            </Field>
          </div>
          {propertySource === 'Unknown' ? (
            <p role="note" className="rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-xs text-foreground">
              Property Source desconhecido (09§7): identifique como a propriedade é definida (Tailwind utility, CSS
              variable, valor direto…) antes de atualizar — o backend resolve o escopo com base nesta informação
              (09§74-78).
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tag JSX (elementSelector)" htmlFor="du-tag">
              <Input id="du-tag" value={jsxTag} onChange={(e) => setJsxTag(e.target.value)} placeholder="button" />
            </Field>
            <Field label="Componente (elementSelector)" htmlFor="du-comp">
              <Input id="du-comp" value={componentName} onChange={(e) => setComponentName(e.target.value)} placeholder="Button" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="classList atual" htmlFor="du-class" description="Obrigatório para TailwindUtility.">
              <Input id="du-class" value={classList} onChange={(e) => setClassList(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Prop JSX alvo" htmlFor="du-prop" description="Obrigatório para DirectValue/ComponentProp.">
              <Input id="du-prop" value={propName} onChange={(e) => setPropName(e.target.value)} />
            </Field>
          </div>
        </>
      )}

      <Field label="Novo valor (verbatim)" htmlFor="du-value" required>
        <Input id="du-value" value={value} onChange={(e) => setValue(e.target.value)} className="font-mono" />
      </Field>

      {update.isError ? <ErrorState error={update.error} operation="design.update" /> : null}

      <div>
        <Button variant="primary" onClick={() => { update.reset(); setApproving(true); }} disabled={!valid}>
          Aplicar update
        </Button>
      </div>

      <ApprovalDialog
        open={approving}
        onOpenChange={setApproving}
        title="design.update"
        capabilityId="design.update"
        confirmLabel="Aprovar e aplicar"
        loading={update.isPending}
        onConfirm={(j) => submit(j)}
      >
        <p className="text-sm text-foreground">
          Atualiza <span className="font-mono">{property || '—'}</span> para{' '}
          <span className="font-mono">{value || '—'}</span>{' '}
          {targetKind === 'token'
            ? `na fonte do token ${tokenRef || '—'}`
            : `no elemento de ${file || '—'} (property source: ${propertySourceLabel(propertySource)})`}
          . O backend resolve o escopo (09§74-78) e retorna o impact report real antes de qualquer cascata (09§79).
        </p>
      </ApprovalDialog>
    </div>
  );
}
