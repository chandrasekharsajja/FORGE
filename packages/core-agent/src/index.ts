/**
 * @sajja/forge-core-agent - Core agent definitions, state management, and orchestration
 * 
 Provides LangGraph-based autonomous agent support with mission lifecycle capabilities for FORGE AI Engineering Operating System.
 */

// Re-exports from individual modules
export * from './agent';
export * from './roles';
export * from './state';
export * from './planner';
export * from './graph';
export * from './prompts';
export * from './streaming';
export * from './model-registry';
export * from './tool-calling';
export * from './langchain-adapter';

// Main classes/interfaces
export { AgentState } from './agent';
export { MissionState, ExecutionStatus } from './state';
export { ParallelDAG } from '@sajja/contracts'; // Re-export contract type

// Service factories
export { createMemoryService } from '@platform/memory-service';
export { createPolicyEngine } from '@platform/policy-engine';
export { createArtifactService } from '@platform/artifact-service';
export { getWorkspaceService } from '@platform/workspace-service';
export { getEventBus } from '@platform/event-bus';

// Default exports for convenience
export { executeAgentWorkflow, registerAgentRoles } from './graph';
export { createPromptEngine } from './prompts';
export { createStreamingAgent } from './streaming';
export { createModelRegistry } from './model-registry';
export { createToolRegistry } from './tool-calling';
export { createLangChainAdapter } from './langchain-adapter';
export { MissionDAGPlanner } from './planner';

export default {
  executeAgentWorkflow,
  registerAgentRoles,
  createPromptEngine,
  createStreamingAgent,
  createModelRegistry,
  createToolRegistry,
  createLangChainAdapter,
  MissionDAGPlanner,
};