/**
 * CapabilityArea — gate de área por discovery real (prompt M3 item 6; Inv. 27).
 *
 * - Discovery carregando -> loading específico (07 §62).
 * - Capability(ies) ausente(s) no Control Plane -> EmptyState honesto
 *   "Backend capability pendente" (NUNCA página "Em implementação" falsa).
 * - Presente -> children; na Wave 5a as áreas do editor ainda não têm UI,
 *   então o default é um estado honesto apontando a wave responsável.
 */

import { CloudOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { useCapabilities } from '../../api/hooks';
import { indexById } from '../../api/capabilities';
import { EmptyState, ErrorState, Spinner } from '../../components/ui';

export interface CapabilityAreaProps {
  title: string;
  icon: LucideIcon;
  /** Capabilities exigidas (ex.: ['editor.source.open']). */
  requires: string[];
  children?: ReactNode;
}

export function CapabilityArea({ title, icon: Icon, requires, children }: CapabilityAreaProps) {
  const caps = useCapabilities();

  if (caps.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner label={`Verificando capabilities de ${title}`} /> Verificando capabilities de {title}…
      </div>
    );
  }
  if (caps.isError) {
    return <ErrorState error={caps.error} operation="GET /v1/capabilities" />;
  }

  const byId = indexById(caps.data?.capabilities ?? []);
  const missing = requires.filter((id) => !byId.has(id));

  if (missing.length > 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={CloudOff}
          title={`${title}: backend capability pendente`}
          description={`As capabilities a seguir não constam no discovery do Control Plane: ${missing.join(
            ', ',
          )}. A interface desta área será habilitada automaticamente quando o backend registrá-las.`}
        />
      </div>
    );
  }

  if (children !== undefined && children !== null) return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        icon={Icon}
        title={`${title}: capabilities disponíveis`}
        description="O Control Plane já expõe as capabilities desta área; a interface correspondente será entregue nas waves 5b/5c do M3."
      />
    </div>
  );
}
