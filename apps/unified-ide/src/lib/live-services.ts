/**
 * Applications layer service composition - creates live service instances
 * This is the "Application Shell" layer connecting frontend to backend.
 */

import { createMemoryService, getMemoryService } from '@platform/memory-service';
import { createPolicyEngine, getPolicyEngine } from '@platform/policy-engine';
import { createArtifactService, getArtifactService } from '@platform/artifact-service';
import { createWorkspaceService, getWorkspaceService } from '@platform/workspace-service';
import { createEventBus, getEventBus } from '@platform/event-bus';
import { createCapabilityFabric } from '@capability-fabric';
import { createProvenanceTracker } from '@provenance';
import { createScheduler } from '@scheduler';

// Mock/placeholder implementations for other services during development
class PlatformRuntimeMock {
  async createSession(userId: string, orgId: string) {
    return {
      sessionId: `sess-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      organizationId: orgId,
      tenantId: `tenant-${orgId}`,
      role: 'developer',
      createdAt: new Date().toISOString(),
    };
  }
}

class ControlPlaneBrainMock {
  async getDigitalTwinState(orgId: string) {
    return { globalKnowledgeNodes: 42, activeUsers: Math.floor(Math.random() * 100), orgId };
  }
}

class ModelRegistryMock {
  selectBestModelForTask(task: string): string {
    const mappings = { coding: 'qwen-coder-7b', analysis: 'claude-3-opus', writing: 'gpt-turbo' };
    return mappings[task] || 'gpt-4o';
  }
}

class DashboardMock {
  async getMetrics(workspaceId: string) {
    return { uptime: 99.9, activeUsers: 15, avgResponseTime: 120 };
  }
}

class ResourcesMock {
  async checkCapacity(requiredBytes: number, waitFor?: boolean) {
    return { available: 85 * 1024 * 1024 * 1024, used: 15 * 1024 * 1024 * 1024, total: 100 * 1024 * 1024 * 1024 };
  }
}

class SandboxMock {
  async runCommand({ sandboxType, command }: { sandboxType: string; command: any }) {
    return { status: 'completed', output: '[Execution] Command ran successfully', pid: Math.random() };
  }
}

class GovernanceMock {
  async validateOrgPolicy(orgId: string, action: string, contextCount: number) {
    return { allowed: true, compliant: true, issues: [] };
  }
}

class PlanningEngineMock {
  async buildParallelDAG(goal: string) {
    return [
      { id: '1', name: 'Analyze goal', agentRole: 'planner', dependencies: [], status: 'completed' },
      { id: '2', name: 'Design solution', agentRole: 'architect', dependencies: ['1'], status: 'pending' },
      { id: '3', name: 'Generate code', agentRole: 'coder', dependencies: ['2'], status: 'pending' },
    ];
  }
}

class MissionRuntimeMock {
  async executeMission(args: any) {
    return {
      missionId: args.id,
      status: 'completed',
      artifacts: ['generated_code.ts'],
      score: 95,
      logs: ['Plan executed', 'Code generated', 'Verification passed'],
    };
  }
}

export interface LiveServices {
  platform: PlatformRuntimeMock;
  policy: ReturnType<typeof getPolicyEngine>;
  memory: ReturnType<typeof getMemoryService>;
  artifact: ReturnType<typeof getArtifactService>;
  workspace: ReturnType<typeof getWorkspaceService>;
  eventBus: ReturnType<typeof getEventBus>;
  capabilityFabric: ReturnType<typeof createCapabilityFabric>;
  provenance: ReturnType<typeof createProvenanceTracker>;
  scheduler: ReturnType<typeof createScheduler>;
  controlPlane: ControlPlaneBrainMock;
  modelRegistry: ModelRegistryMock;
  dashboard: DashboardMock;
  resources: ResourcesMock;
  sandbox: SandboxMock;
  governance: GovernanceMock;
  planner: PlanningEngineMock;
  missionRuntime: MissionRuntimeMock;
}

export function createLiveServices(): LiveServices {
  // Initialize services with fallback configuration (in prod, use env vars)
  const memoryService = createMemoryService({
    postgresHost: process.env.POSTGRES_HOST || 'localhost',
    postgresPort: parseInt(process.env.POSTGRES_PORT || '5432'),
    postgresUser: process.env.POSTGRES_USER || 'forge',
    postgresPassword: process.env.POSTGRES_PASSWORD || 'password',
    postgresDatabase: process.env.POSTGRES_DATABASE || 'forge_db',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6334',
  });

  const policyEngine = createPolicyEngine();
  const artifactService = createArtifactService({ storageRoot: '/tmp/artifacts', maxHistory: 10 });
  const workspaceService = createWorkspaceService();
  const eventBus = createEventBus({ redisUrl: process.env.REDIS_URL });
  
  // Capabilities
  const capabilityFabric = createCapabilityFabric();
  capabilityFabric.registerCapability({
    id: 'system-capability',
    name: 'System Capability',
    type: 'tool',
    version: '1.0.0',
    contractVersion: '1.0.0',
    permissionsRequired: ['execute_mission'],
    costPerInvocationUSD: 0.01,
    healthStatus: 'healthy',
  });

  // Other mock services
  return {
    platform: new PlatformRuntimeMock(),
    policy: policyEngine,
    memory: memoryService,
    artifact: artifactService,
    workspace: workspaceService,
    eventBus: eventBus,
    capabilityFabric,
    provenance: createProvenanceTracker(), // Assume similar pattern
    scheduler: createScheduler(), // Assume similar pattern
    controlPlane: new ControlPlaneBrainMock(),
    modelRegistry: new ModelRegistryMock(),
    dashboard: new DashboardMock(),
    resources: new ResourcesMock(),
    sandbox: new SandboxMock(),
    governance: new GovernanceMock(),
    planner: new PlanningEngineMock(),
    missionRuntime: new MissionRuntimeMock(),
  };
}

export function seedCapabilities(services: LiveServices): { capabilities: number } {
  const initialCapCount = services.capabilityFabric.discoverCapabilities().length;
  console.log(`[CapabilitySeed] Registered ${initialCapCount} initial capability`);
  return { capabilities: initialCapCount };
}

export function readRepoSnippet(repoPath: string): string {
  return `// Repository snippet would be loaded from: ${repoPath}`;
}

export function resolveRepoPath(basePath: string): string {
  return basePath; // In real implementation, would resolve absolute path
}