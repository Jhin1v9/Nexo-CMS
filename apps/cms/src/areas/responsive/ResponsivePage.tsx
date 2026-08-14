/**
 * ResponsivePage (/projects/$projectId/responsive) — doc 09§24-47 (Responsive
 * Lab). Auto-gateada por responsive.viewport.create. Viewports criados na
 * sessão são compartilhados entre as abas (o Control Plane M3 não expõe
 * listagem do registry — gap documentado no ViewportsPanel). Todas as
 * operações de diagnóstico são SAFE e longas (browser real, 09§46).
 */

import { useState } from 'react';
import { Camera, Columns2, FlaskConical, MonitorSmartphone, Play, Stethoscope } from 'lucide-react';

import type { KnownViewport } from './helpers';
import { Tabs } from '../../components/ui';
import { CapabilityArea } from '../stubs/CapabilityArea';
import { ComparePanel } from './ComparePanel';
import { DiagnosePanel } from './DiagnosePanel';
import { PreviewPanel } from './PreviewPanel';
import { SnapshotsPanel } from './SnapshotsPanel';
import { StressPanel } from './StressPanel';
import { ViewportsPanel } from './ViewportsPanel';

function ResponsiveBody({ projectId }: { projectId: string }) {
  const [knownViewports, setKnownViewports] = useState<KnownViewport[]>([]);
  const addViewport = (v: KnownViewport) =>
    setKnownViewports((prev) => (prev.some((x) => x.id === v.id) ? prev : [...prev, v]));

  return (
    <Tabs
      ariaLabel="Responsive Lab"
      items={[
        {
          value: 'viewports',
          label: 'Viewports',
          icon: MonitorSmartphone,
          panel: <ViewportsPanel projectId={projectId} knownViewports={knownViewports} onCreated={addViewport} />,
        },
        {
          value: 'preview',
          label: 'Preview',
          icon: Play,
          panel: <PreviewPanel projectId={projectId} knownViewports={knownViewports} />,
        },
        {
          value: 'diagnose',
          label: 'Diagnostics',
          icon: Stethoscope,
          panel: <DiagnosePanel projectId={projectId} knownViewports={knownViewports} />,
        },
        {
          value: 'stress',
          label: 'Stress test',
          icon: FlaskConical,
          panel: <StressPanel projectId={projectId} knownViewports={knownViewports} />,
        },
        {
          value: 'compare',
          label: 'Compare',
          icon: Columns2,
          panel: <ComparePanel projectId={projectId} knownViewports={knownViewports} />,
        },
        {
          value: 'snapshots',
          label: 'Snapshots',
          icon: Camera,
          panel: <SnapshotsPanel projectId={projectId} knownViewports={knownViewports} />,
        },
      ]}
    />
  );
}

/** Assinatura para o wiring do router: `<ResponsivePage projectId={projectId} />`. */
export function ResponsivePage({ projectId }: { projectId: string }) {
  return (
    <CapabilityArea
      title="Responsive"
      icon={MonitorSmartphone}
      requires={[
        'responsive.viewport.create',
        'responsive.preview',
        'responsive.diagnose',
        'responsive.stressTest',
        'responsive.compare',
        'responsive.snapshot',
      ]}
    >
      <ResponsiveBody projectId={projectId} />
    </CapabilityArea>
  );
}
