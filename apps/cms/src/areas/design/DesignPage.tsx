/**
 * DesignPage (/projects/$projectId/design) — doc 09§51-53/§66. Auto-gateada
 * por design.read. design.read -> painéis: tokens por tipo (origem file:line),
 * styling mechanism badge, temas detectados, property sources; mutations com
 * aprovação D17 e resultado verificado.
 */

import { useState } from 'react';
import { Palette, Rows3, SlidersHorizontal } from 'lucide-react';

import { useDesignModel, useThemes } from '../../api/hooks';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, Spinner, Tabs } from '../../components/ui';
import { CapabilityArea } from '../stubs/CapabilityArea';
import { DesignUpdateForm } from './DesignUpdateForm';
import { ThemesPanel } from './ThemesPanel';
import { TokensPanel } from './TokensPanel';
import { mechanismLabel, mechanismTone, propertySourceLabel, propertySourceTone } from './helpers';

function DesignBody({ projectId }: { projectId: string }) {
  const model = useDesignModel(projectId);
  const themes = useThemes(projectId);
  const [tab, setTab] = useState('tokens');

  if (model.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner label="Lendo Design Model" /> Lendo Design Model (design.read)…
      </p>
    );
  }
  if (model.isError) {
    return (
      <ErrorState
        error={model.error}
        operation="design.read"
        action={<Button variant="secondary" onClick={() => void model.refetch()}>Tentar novamente</Button>}
      />
    );
  }
  const m = model.data;
  if (m === undefined) {
    return <EmptyState icon={Palette} title="Design Model indisponível" description="O backend não retornou o modelo." />;
  }

  const styling = m.stylingMechanism;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Styling mechanism" description="Detectado por sinais reais de arquivo; sem sinais -> desconhecido (nunca inventado)." />
        <CardBody className="flex flex-wrap items-center gap-2">
          {styling.value !== null ? (
            <>
              <Badge tone={mechanismTone(styling.value.primary)}>{mechanismLabel(styling.value.primary)} (primário)</Badge>
              {styling.value.all
                .filter((x) => x !== styling.value?.primary)
                .map((x) => (
                  <Badge key={x} tone="neutral">{mechanismLabel(x)}</Badge>
                ))}
            </>
          ) : (
            <Badge tone="warning">Mecanismo desconhecido (confidence: {styling.confidence})</Badge>
          )}
          {m.propertySources.map((ps) => (
            <Badge key={ps} tone={propertySourceTone(ps)} title="Property source com evidência real (09§7)">
              {propertySourceLabel(ps)}
            </Badge>
          ))}
          {m.designSystem.value !== null && m.designSystem.value.detected ? (
            <Badge tone="success" title={m.designSystem.value.evidence.join('; ')}>
              Design system detectado — preservado, nunca substituído (09§54)
            </Badge>
          ) : null}
        </CardBody>
      </Card>

      <Tabs
        ariaLabel="Design"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'tokens', label: 'Tokens', icon: Rows3, panel: <TokensPanel projectId={projectId} model={m} /> },
          {
            value: 'themes',
            label: 'Temas',
            icon: Palette,
            panel: themes.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner label="Lendo temas" /> Lendo temas…
              </p>
            ) : themes.isError ? (
              <ErrorState error={themes.error} operation="theme.read" />
            ) : themes.data !== undefined ? (
              <ThemesPanel projectId={projectId} themes={themes.data} />
            ) : null,
          },
          {
            value: 'update',
            label: 'Atualizar estilo',
            icon: SlidersHorizontal,
            panel: <DesignUpdateForm projectId={projectId} />,
          },
        ]}
      />
    </div>
  );
}

/** Assinatura para o wiring do router: `<DesignPage projectId={projectId} />`. */
export function DesignPage({ projectId }: { projectId: string }) {
  return (
    <CapabilityArea
      title="Design"
      icon={Palette}
      requires={['design.read', 'design.token.update', 'theme.read', 'theme.update', 'design.update']}
    >
      <DesignBody projectId={projectId} />
    </CapabilityArea>
  );
}
