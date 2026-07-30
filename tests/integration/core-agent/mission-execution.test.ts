/**
 * Integration tests for Mission Execution - end-to-end validation of full workflow with service coordination
 */

import { expect, test, describe, vi } from 'vitest';
import { executeAgentWorkflow } from '@core-agent/graph';
import { getPolicyEngine } from '@platform/policy-engine';
import { getMemoryService } from '@platform/memory-service';
import { getArtifactService } from '@platform/artifact-service';
import { getWorkspaceService } from '@platform/workspace-service';

// Mock external dependencies for integration test
vi.mock('@platform/policy-engine', () => ({
  getPolicyEngine: vi.fn(() => ({
    evaluateAction: vi.fn().mockResolvedValue({ allowed: true }),
  })),
}));

vi.mock('@platform/memory-service', () => ({
  getMemoryService: vi.fn(() => ({
    storeUserPreference: vi.fn(),
    getUserPreference: vi.fn(),
  })),
}));

vi.mock('@platform/artifact-service', () => ({
  getArtifactService: vi.fn(() => ({
    storeArtifact: vi.fn(),
    updateArtifact: vi.fn(),
    getArtifact: vi.fn(),
    getArtifactsByMission: vi.fn(),
  })),
}));

vi.mock('@platform/workspace-service', () => ({
  getWorkspaceService: vi.fn(() => ({
    getWorkspace: vi.fn(),
  })),
}));

describe('Mission Execution Integration', () => {
  it('should coordinate multiple services through complete mission lifecycle', async () => {
    const mission = {
      id: 'test-mission-123',
      goal: 'Create user management API',
      title: 'User API Development',
      organizationId: 'org-test-456',
      status: 'draft',
    };

    // Execute the full workflow
    const result = await executeAgentWorkflow(mission);

    // Should complete successfully
    expect(result.success).toBe(true);
    
    // Should have processed through various phases
    expect(result.finalState.status).toBe('completed');
    expect(result.finalState.currentStep).toBe('complete');

    // Service interactions should have occurred
    const policyEval = getPolicyEngine().evaluateAction;
    expect(policyEval).toHaveBeenCalled(); // Policy was checked during workflow
    
    const artifactStore = getArtifactService().storeArtifact;
    expect(artifactStore).toHaveBeenCalledWith( // At least one artifact stored
      expect.objectContaining({ type: 'code' })
    );
    
    // Memory usage for context tracking
    const memoryPref = getMemoryService().storeUserPreference;
    expect(memoryPref).toHaveBeenCalled(); // For session/persistence tracking
  });

  it('should handle policy enforcement decisions correctly in workflow', async () => {
    // Simulate a scenario where policy denies an action
    (getPolicyEngine() as any).evaluateAction.mockResolvedValueOnce({ allowed: false, reason: 'Access denied by policy' });

    const mission = { id: 'denied-123', goal: 'Something restricted', organizationId: 'restricted-org' };

    // The workflow should handle this gracefully (either block or route to human approval)
    try {
      await executeAgentWorkflow(mission);
      // Should not reach here due to policy denial
      expect.unreachable('Should have thrown on policy denial');
    } catch (error: any) {
      // Expected behavior - workflow should catch policy violations
      expect(error.message).toContain('policy');
    }
  });

  it('should persist artifacts across different mission types', async () => {
    const missions = [
      { id: 'm1', goal: 'Write component code', title: 'Component', organizationId: 'org-a', type: 'coding' },
      { id: 'm2', goal: 'Generate documentation', title: 'Docs', organizationId: 'org-a', type: 'writing' },
      { id: 'm3', goal: 'Design architecture', title: 'Architecture', organizationId: 'org-b', type: 'design' },
    ];

    // Execute each mission
    for (const mission of missions) {
      const result = await executeAgentWorkflow(mission);
      if (result.success) {
        // Each should produce at least some artifact(s)
        expect(result.finalState.artifacts.length).toBeGreaterThan(0);
      }
    }

    // Verify each mission's artifacts are stored separately
    // (In a real implementation we'd query the artifact service per mission ID)
    expect(getArtifactService().storeArtifact).toHaveBeenCalledTimes(missions.length); // At least one call per mission
  });

  it('should maintain message history throughout mission execution', async () => {
    const mission = { id: 'msg-test-1', goal: 'Test messaging', title: 'Messaging Test', organizationId: 'org-test' };
    const result = await executeAgentWorkflow(mission);

    expect(result.finalState.messages.length).toBeGreaterThan(0);
    // Should have system messages and assistant messages at various stages
    const hasSystemMsg = result.finalState.messages.some(m => m.type === 'system');
    const hasAssistantMsg = result.finalState.messages.some(m => m.type === 'assistant');
    expect(hasSystemMsg).toBeTruthy();
    expect(hasAssistantMsg).toBeTruthy();
  });
});