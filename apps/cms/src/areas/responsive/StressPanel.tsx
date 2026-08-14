/**
 * StressPanel — responsive.stressTest (09§32-33): conteúdo desafiador injetado
 * SOMENTE no DOM temporário (runtime only). O aviso "nunca persiste source" é
 * visível; o resultado carrega a prova de integridade (hash antes/depois) —
 * mutated=true seria reportado como bug grave, nunca escondido.
 */

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';

import {
  useResponsiveStressTest,
  type EditorViewport,
  type StressProfileId,
  type StressTestResult,
} from '../../api/hooks';
import { Badge, Button, ErrorState, Field, Input, Select, Spinner } from '../../components/ui';
import { IssuesTable } from './IssuesTable';
import { STRESS_PROFILE_OPTIONS } from './helpers';
import { ViewportPicker } from './ViewportsPanel';

export function StressPanel({ projectId, knownViewports }: { projectId: string; knownViewports: EditorViewport[] }) {
  const stress = useResponsiveStressTest();
  const [viewportId, setViewportId] = useState('');
  const [route, setRoute] = useState('/');
  const [profile, setProfile] = useState<StressProfileId>('longHeading');
  const [result, setResult] = useState<StressTestResult | null>(null);

  const run = () => {
    stress.mutate(
      { projectId, viewportId, profile, ...(route.trim().length > 0 ? { route: route.trim() } : {}) },
      { onSuccess: (data) => setResult(data) },
    );
  };

  const selected = STRESS_PROFILE_OPTIONS.find((p) => p.id === profile);

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground" role="note">
        Stress test NUNCA persiste conteúdo no Source Project (09§33): a mutação é aplicada somente no DOM temporário
        do browser e o resultado inclui a prova de integridade do source (hash antes/depois).
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ViewportPicker knownViewports={knownViewports} viewportId={viewportId} onChange={setViewportId} idPrefix="st" />
        <Field label="Rota" htmlFor="st-route">
          <Input id="st-route" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="/" className="font-mono" />
        </Field>
        <Field label="Perfil (fixos — D14)" htmlFor="st-profile" description={selected?.description}>
          <Select id="st-profile" value={profile} onChange={(e) => setProfile(e.target.value as StressProfileId)}>
            {STRESS_PROFILE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <Button variant="primary" onClick={run} disabled={viewportId.length === 0 || stress.isPending}>
          <FlaskConical aria-hidden="true" size={14} /> Rodar stress test
        </Button>
      </div>
      {stress.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner label="Stress test em execução" /> Executando no browser real — pode demorar (timeout 180s).
        </p>
      ) : null}
      {stress.isError ? <ErrorState error={stress.error} operation="responsive.stressTest" /> : null}
      {result !== null ? (
        <section aria-label="Resultado do stress test" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="primary">{result.profile}</Badge>
            <span className="text-muted-foreground">{result.appliedMutation}</span>
          </div>
          <p className="text-xs">
            {result.sourceIntegrity.mutated ? (
              <Badge tone="danger">FALHA DE ISOLAMENTO: source foi mutado (bug grave — 09§33)</Badge>
            ) : (
              <Badge tone="success" title={`${result.sourceIntegrity.scope.hashedFiles} arquivos hashados; excluídos: ${result.sourceIntegrity.scope.excludedDirs.join(', ')}`}>
                Source intacto (hash antes = depois)
              </Badge>
            )}
          </p>
          <IssuesTable issues={result.issues} />
        </section>
      ) : null}
    </div>
  );
}
