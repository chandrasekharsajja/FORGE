export type CapabilityType = 'agent' | 'tool' | 'model' | 'sandbox' | 'workflow' | 'mcp_server';

export interface CapabilityDescriptor {
  id: string;
  name: string;
  type: CapabilityType;
  version: string;
  contractVersion: string;
  permissionsRequired: string[];
  costPerInvocationUSD: number;
  healthStatus: 'healthy' | 'degraded' | 'unavailable';
}

export class CapabilityFabric {
  private registry = new Map<string, CapabilityDescriptor>();

  registerCapability(descriptor: CapabilityDescriptor): void {
    this.registry.set(descriptor.id, descriptor);
    console.log(`[Capability Fabric] Registered Unified Capability [${descriptor.type}]: ${descriptor.name} (${descriptor.id})`);
  }

  discoverCapabilities(type?: CapabilityType): CapabilityDescriptor[] {
    const list = Array.from(this.registry.values());
    if (type) return list.filter(c => c.type === type);
    return list;
  }
}
