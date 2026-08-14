/**
 * Helpers PUROS da área /responsive (sem React — testáveis em node).
 * 09§36: certainty/sempre visível; falso positivo nunca vira fato.
 */

import type { BadgeTone } from '../../components/ui';
import type {
  DiagnosticCertainty,
  DiagnosticIssue,
  DiagnosticSeverity,
  EditorViewport,
  StressProfileId,
} from '../../api/hooks';

/**
 * Viewport retornado por responsive.viewport.create. EditorViewport (Wave 5b)
 * cobre os campos centrais; o service real (@nexo/responsive types.ts) inclui
 * também isPreset/createdAt — estendidos aqui (opcionais, nunca inventados).
 */
export type KnownViewport = EditorViewport & {
  isPreset?: boolean;
  createdAt?: string;
};

/** Ordem de severidade (maior = mais grave) para ordenação de issues. */
export function severityRank(severity: DiagnosticSeverity): number {
  switch (severity) {
    case 'CRITICAL':
      return 3;
    case 'ERROR':
      return 2;
    case 'WARNING':
      return 1;
    case 'INFO':
      return 0;
  }
}

/** Ordena issues por severidade desc (estável). */
export function sortIssuesBySeverity(issues: readonly DiagnosticIssue[]): DiagnosticIssue[] {
  return [...issues].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

export function severityTone(severity: DiagnosticSeverity): BadgeTone {
  switch (severity) {
    case 'CRITICAL':
    case 'ERROR':
      return 'danger';
    case 'WARNING':
      return 'warning';
    case 'INFO':
      return 'neutral';
  }
}

/** Certainty (09§36) — texto sempre ao lado da cor. */
export function certaintyTone(certainty: DiagnosticCertainty): BadgeTone {
  switch (certainty) {
    case 'ConfirmedIssue':
      return 'danger';
    case 'PotentialIssue':
      return 'warning';
    case 'Unknown':
      return 'neutral';
  }
}

export function certaintyLabel(certainty: DiagnosticCertainty): string {
  switch (certainty) {
    case 'ConfirmedIssue':
      return 'Confirmado';
    case 'PotentialIssue':
      return 'Potencial';
    case 'Unknown':
      return 'Desconhecido';
  }
}

/** Viewport -> rótulo curto (nome ou dimensões). */
export function viewportLabel(v: EditorViewport): string {
  const dims = `${v.width}×${v.height}`;
  return v.name !== undefined && v.name.length > 0 ? `${v.name} (${dims})` : dims;
}

export function previewStateTone(state: 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED'): BadgeTone {
  switch (state) {
    case 'RUNNING':
      return 'success';
    case 'STARTING':
      return 'warning';
    case 'FAILED':
      return 'danger';
    case 'STOPPED':
      return 'neutral';
  }
}

/** Perfis fixos (D14 — enum exato do contrato); descrições são as do doc 09§32. */
export const STRESS_PROFILE_OPTIONS: { id: StressProfileId; label: string; description: string }[] = [
  { id: 'longHeading', label: 'longHeading', description: 'Título extremamente longo (conteúdo desafiador, 09§32).' },
  { id: 'longButtonText', label: 'longButtonText', description: 'Texto de botão extremamente longo.' },
  { id: 'manyItems', label: 'manyItems', description: 'Listas/grids com muitos itens.' },
  { id: 'missingImage', label: 'missingImage', description: 'Imagem ausente/quebrada.' },
  { id: 'extremeViewport', label: 'extremeViewport', description: 'Viewport extremo (muito estreito/largo).' },
];

/** Percentual de diff formatado (0..100 sobre a região comparada — 09§45). */
export function formatDiffPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** Chave estável para viewports conhecidos na sessão (registry global, 09§24). */
export function viewportKey(v: EditorViewport): string {
  return v.id;
}
