/**
 * AdapterRegistry (SPEC §6): register + detectAll(ctx) -> DetectedTechnology[].
 *
 * Regras:
 *  - detect() retornando value null -> NENHUMA detecção é emitida
 *    (ausência ≠ UNKNOWN inventado; INVARIANTS #6/#25).
 *  - support deriva do capability level declarado pelo adapter
 *    (ver capabilityLevelToSupport — mapeamento documentado).
 *  - Execução sequencial na ordem de registro: resultado determinístico.
 */

import type { Adapter, AdapterIdentity, DetectedTechnology, DetectionContext } from './types.js';
import { capabilityLevelToSupport } from './types.js';
import type { AdapterDetectionValue } from './types.js';
import { createM1Adapters } from './m1-adapters.js';

export class AdapterRegistry {
  private readonly adapters: Adapter[] = [];

  register(adapter: Adapter): void {
    if (this.adapters.some((a) => a.identity.id === adapter.identity.id)) {
      throw new Error(`AdapterRegistry: adapter duplicado id="${adapter.identity.id}"`);
    }
    this.adapters.push(adapter);
  }

  list(): AdapterIdentity[] {
    return this.adapters.map((a) => ({ ...a.identity }));
  }

  async detectAll(ctx: DetectionContext): Promise<DetectedTechnology[]> {
    const out: DetectedTechnology[] = [];
    for (const adapter of this.adapters) {
      const d = await adapter.detect(ctx);
      if (d.value === null) continue; // sem sinais -> sem detecção (nunca inventar)
      const value = d.value as AdapterDetectionValue;
      out.push({
        technology: adapter.identity.name,
        category: adapter.identity.category,
        confidence: d.confidence,
        support: capabilityLevelToSupport(adapter.getCapabilities()),
        evidence: [...d.evidence],
        version: value.version ?? null,
        adapterId: adapter.identity.id,
        adapterVersion: adapter.identity.adapterVersion,
      });
    }
    return out;
  }
}

/** Registry padrão com todos os adapters de detecção M1 (SPEC §6). */
export function createDefaultAdapterRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  for (const adapter of createM1Adapters()) {
    registry.register(adapter);
  }
  return registry;
}
