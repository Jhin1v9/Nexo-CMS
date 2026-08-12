export type {
  CapabilityDescriptor,
  CapabilityHandler,
  CapabilityRegistry,
  RegisteredCapability,
} from './registry.js';
export { createCapabilityRegistry, toDescriptor } from './registry.js';
export type { ControlPlane, ControlPlaneDeps, DiscoveredCapability } from './control-plane.js';
export { createControlPlane } from './control-plane.js';
export { asSecurityAuditSink, toStorageAuditEvent } from './audit-adapter.js';
