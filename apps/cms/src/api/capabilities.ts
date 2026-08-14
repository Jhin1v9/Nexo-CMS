/**
 * Helpers PUROS sobre o discovery de capabilities (sem React — testáveis em
 * node). Regra 07§56 / Inv. 27: capability ausente/sem permissão -> controle
 * desabilitado com explicação, NUNCA escondido silenciosamente nem fingido.
 */

import type { AuthorizationDecision, DiscoveredCapability, JobStatus } from './client';

export type CapabilityAvailability =
  | { kind: 'available'; capability: DiscoveredCapability }
  /** Existe, mas exige aprovação explícita (risk DESTRUCTIVE/CRITICAL, policy). */
  | { kind: 'requires-approval'; capability: DiscoveredCapability }
  | { kind: 'denied'; capability: DiscoveredCapability; decision: AuthorizationDecision }
  | { kind: 'missing'; id: string };

export function indexById(capabilities: readonly DiscoveredCapability[]): Map<string, DiscoveredCapability> {
  return new Map(capabilities.map((c) => [c.id, c]));
}

/** Classifica a disponibilidade efetiva de uma capability para o ator atual. */
export function availabilityOf(capabilities: readonly DiscoveredCapability[], id: string): CapabilityAvailability {
  const capability = indexById(capabilities).get(id);
  if (capability === undefined) return { kind: 'missing', id };
  switch (capability.allowed) {
    case 'ALLOW':
      return { kind: 'available', capability };
    case 'REQUIRE_APPROVAL':
      return { kind: 'requires-approval', capability };
    default:
      return { kind: 'denied', capability, decision: capability.allowed };
  }
}

/** Uma capability é acionável quando ALLOW ou REQUIRE_APPROVAL (com diálogo). */
export function isActionable(a: CapabilityAvailability): boolean {
  return a.kind === 'available' || a.kind === 'requires-approval';
}

/** Motivo legível para tooltip de controle desabilitado (07§56). */
export function unavailabilityReason(a: CapabilityAvailability): string {
  switch (a.kind) {
    case 'missing':
      return `Capability '${a.id}' ausente no discovery do Control Plane (backend pendente).`;
    case 'denied':
      return `Sem permissão para '${a.capability.id}' (decisão: ${a.decision}).`;
    case 'requires-approval':
      return `'${a.capability.id}' exige aprovação explícita antes de executar.`;
    case 'available':
      return '';
  }
}

/** Agrupa descriptors por domínio (ordem de primeiro aparecimento estável). */
export function groupByDomain(
  capabilities: readonly DiscoveredCapability[],
): { domain: string; capabilities: DiscoveredCapability[] }[] {
  const groups = new Map<string, DiscoveredCapability[]>();
  for (const c of capabilities) {
    const list = groups.get(c.domain) ?? [];
    list.push(c);
    groups.set(c.domain, list);
  }
  return [...groups.entries()].map(([domain, caps]) => ({ domain, capabilities: caps }));
}

/** Alguma capability do prefixo existe? (gate de áreas inteiras, ex.: 'editor.') */
export function hasDomainCapabilities(capabilities: readonly DiscoveredCapability[], prefix: string): boolean {
  return capabilities.some((c) => c.id.startsWith(prefix));
}

/**
 * Intervalo de polling de um Job (ms) ou null quando terminal. Job NÃO expõe
 * progresso (SPEC §8) — a UI reflete apenas transições reais de estado.
 */
export function jobPollIntervalMs(status: JobStatus | undefined): number | null {
  if (status === 'QUEUED' || status === 'RUNNING') return 1_000;
  return null;
}

export function isJobTerminal(status: JobStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}
