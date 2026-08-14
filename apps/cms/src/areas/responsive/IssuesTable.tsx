/**
 * IssuesTable — DiagnosticIssue[] (09§34-36): severity Badge, certainty
 * (Confirmado|Potencial|Desconhecido), elemento (selector DOM — DOM ≠ Source,
 * 09§49), descrição, evidência medida em px e suggested fixes marcados como
 * HIPÓTESES (09§59 — nunca apresentadas como verificadas).
 */

import type { DiagnosticIssue } from '../../api/hooks';
import { Badge, EmptyState } from '../../components/ui';
import { CircleCheck } from 'lucide-react';
import { certaintyLabel, certaintyTone, severityTone, sortIssuesBySeverity } from './helpers';

function EvidenceView({ issue }: { issue: DiagnosticIssue }) {
  const measurements = Object.entries(issue.evidence.measurements);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{issue.evidence.observed}</p>
      {measurements.length > 0 ? (
        <p className="font-mono text-xs text-muted-foreground">
          {measurements.map(([k, v]) => `${k}: ${v}px`).join(' · ')}
        </p>
      ) : null}
      {issue.sourceMapping !== undefined ? (
        <p className="font-mono text-xs text-muted-foreground">
          source: {issue.sourceMapping.filePath}
          {issue.sourceMapping.line !== undefined ? `:${issue.sourceMapping.line}` : ''} ({issue.sourceMapping.confidence})
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Sem source mapping confiável para este elemento (nunca adivinhado — 09§50).</p>
      )}
      {issue.suggestedFixes !== undefined && issue.suggestedFixes.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-foreground">Hipóteses de causa (não verificadas — 09§59):</p>
          <ul className="mt-0.5 flex list-disc flex-col gap-0.5 pl-4">
            {issue.suggestedFixes.map((f, i) => (
              <li key={i} className="text-xs text-muted-foreground">{f}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function IssuesTable({ issues }: { issues: DiagnosticIssue[] }) {
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Nenhum issue encontrado"
        description="O diagnóstico no browser real não encontrou problemas neste viewport/rota."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2" aria-label="Issues de diagnóstico">
      {sortIssuesBySeverity(issues).map((issue) => (
        <li key={issue.id} className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
            <Badge tone={certaintyTone(issue.certainty)} title="Certeza do diagnóstico (09§36)">
              {certaintyLabel(issue.certainty)}
            </Badge>
            <Badge tone="neutral">{issue.kind}</Badge>
            <span className="text-xs text-muted-foreground">
              viewport {issue.viewport.width}×{issue.viewport.height}
            </span>
          </div>
          <p className="text-sm text-foreground">{issue.description}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {issue.element.selector}
            {issue.element.textPreview !== undefined ? ` — “${issue.element.textPreview}”` : ''}
          </p>
          <EvidenceView issue={issue} />
        </li>
      ))}
    </ul>
  );
}
