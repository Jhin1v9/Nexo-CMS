/**
 * CapabilityRegistry (SPEC.md §8): registro + discovery de capabilities.
 * Discovery é filtrado por authorize() no ControlPlane (não aqui — o registry
 * é puro; a decisão de segurança pertence ao AuthorizationBoundary, Inv. 49).
 */

import type { CapabilityContract, CapabilityId } from '@nexo/core';
import type { Result } from '@nexo/shared';

/** Handler de domínio: recebe input JÁ validado pelo inputSchema (zod) do contrato. */
export type CapabilityHandler = (
  input: unknown,
  ctx: import('@nexo/core').ExecutionContext,
) => Promise<Result<unknown>>;

export interface RegisteredCapability {
  contract: CapabilityContract;
  handler: CapabilityHandler;
}

/**
 * Descriptor público de discovery (SPEC §8: { id, domain, description, risk, allowed }).
 * `allowed` é preenchido pelo ControlPlane.discover via authorize(); aqui fica
 * ausente (registry não decide segurança).
 */
export interface CapabilityDescriptor {
  id: CapabilityId;
  version: 1;
  domain: string;
  description: string;
  requiredPermission: string;
  risk: CapabilityContract['risk'];
  sideEffects: boolean;
  async: 'sync' | 'job';
  timeoutMs: number;
}

export interface CapabilityRegistry {
  register(c: RegisteredCapability): void;
  get(id: CapabilityId): RegisteredCapability | undefined;
  list(): CapabilityDescriptor[];
}

export function toDescriptor(contract: CapabilityContract): CapabilityDescriptor {
  return {
    id: contract.id,
    version: contract.version,
    domain: contract.domain,
    description: contract.description,
    requiredPermission: contract.requiredPermission,
    risk: contract.risk,
    sideEffects: contract.sideEffects,
    async: contract.async,
    timeoutMs: contract.timeoutMs,
  };
}

class InMemoryCapabilityRegistry implements CapabilityRegistry {
  private readonly byId = new Map<CapabilityId, RegisteredCapability>();

  register(c: RegisteredCapability): void {
    if (this.byId.has(c.contract.id)) {
      throw new Error(`CapabilityRegistry: capability duplicada id="${c.contract.id}"`);
    }
    this.byId.set(c.contract.id, c);
  }

  get(id: CapabilityId): RegisteredCapability | undefined {
    return this.byId.get(id);
  }

  /** Ordem de registro: discovery determinístico. */
  list(): CapabilityDescriptor[] {
    return [...this.byId.values()].map((c) => toDescriptor(c.contract));
  }
}

export function createCapabilityRegistry(): CapabilityRegistry {
  return new InMemoryCapabilityRegistry();
}
