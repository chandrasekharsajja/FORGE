import { CapabilityDescriptor, CapabilityType } from '@platform/capability-fabric';

export function createCapability(config: {
  id: string;
  name: string;
  type: CapabilityType;
  version: string;
  permissionsRequired?: string[];
  costPerInvocationUSD?: number;
  execute: (input: any) => Promise<any>;
}): CapabilityDescriptor & { execute: (input: any) => Promise<any> } {
  return {
    id: config.id,
    name: config.name,
    type: config.type,
    version: config.version,
    contractVersion: '1.0.0',
    permissionsRequired: config.permissionsRequired || [],
    costPerInvocationUSD: config.costPerInvocationUSD || 0.0,
    healthStatus: 'healthy',
    execute: config.execute
  };
}
