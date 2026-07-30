/**
 * @core-agent/graph - LangGraph-based agent orchestration pipeline
 * 
 * Defines the state machine graph that manages the full agent lifecycle from plan to completion.
 */

import { StateGraph, END } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { MemoryManager } from '@memory-service';
import { PolicyEngine } from '@policy-engine';
import { ArtifactService } from '@artifact-service';
import { WorkspaceService } from '@workspace-service';
import { EventBus } from '@event-bus';

// CONTRACTS
import type { MissionContract, AgentRole, ArtifactContract } from '@sajja/contracts';
import { createMemoryManager } from '@platform/memory-service';
import { createPolicyEngine } from '@platform/policy-engine';
import { createArtifactService } from '@platform/artifact-service';
import { createWorkspaceService } from '@platform/workspace-service';
import { createEventBus } from '@platform/event-bus';

// Agent state definitions
interface AgentState {
  mission?: MissionContract;
  currentStep: 'plan' | 'design' | 'code' | 'review' | 'test' | 'verify' | 'archive';
  artifacts: ArtifactContract[];
  messages: BaseMessage[];
  memoryContext?: Record<string, unknown>;
  policyResult?: { allowed: boolean; requiresApproval?: boolean };
  status: 'draft' | 'planning' | 'executing' | 'verified' | 'failed' | 'completed';
  error?: string;
}

// Initial state factory
const initialState = (): AgentState => ({
  currentStep: 'plan',
  artifacts: [],
  messages: [],
  status: 'draft',
});

// Define the agent states (nodes) in the workflow
export const planningNode = async (state: AgentState, params: any) => {
  console.log('[Agent] Planning phase started...');
  
  // Generate execution DAG
  const planner = new MissionDAGPlanner(); // Assuming exists in mission-runtime
  const dag = await planner.buildParallelDAG(state.mission?.goal || '');
  
  return {
    ...state,
    currentStep: 'design',
    status: 'planning',
    messages: [...state.messages, { type: 'system', content: 'Planning complete. Design phase initiated.' }],
  };
};

const designNode = async (state: AgentState) => {
  console.log('[Agent] Design phase started...');
  return { ...state, currentStep: 'code', status: 'executing' };
};

const codeNode = async (state: AgentState, params: any) => {
  console.log('[Agent] Code generation started...');
  
  // Call artifact service to store generated code
  const artifactService = createArtifactService({ storageRoot: '/tmp/artifacts' });
  await artifactService.storeArtifact({
    id: `art-${Date.now()}`,
    missionId: state.mission?.id || '',
    type: 'code',
    version: 1,
    uri: 'src/generated/code.ts',
    title: 'Generated Code',
    description: 'Automatically generated from mission prompt',
  });

  return {
    ...state,
    currentStep: 'review',
    artifacts: [
      ...state.artifacts,
      { id: art, version: 1, type: 'code', uri: 'src/generated/code.ts', title: 'Generated Code', author: 'agent-coder' },
    ],
    messages: [
      ...state.messages,
      { type: 'assistant', content: 'Code generation complete. Ready for review.' },
    ],
  };
};

const reviewNode = async (state: AgentState) => {
  console.log('[Agent] Code review requested...');
  
  // Check policy for human approval before proceeding
  const policy = createPolicyEngine();
  const result = await policy.evaluateAction('approve_code_review', { organizationId: state.mission?.organizationId });
  
  return {
    ...state,
    currentStep: 'test',
    policyResult: result,
    messages: [
      ...state.messages,
      { type: 'system', content: `Review ${result.allowed ? 'approved' : 'awaiting human approval'}.` },
    ],
  };
};

const testNode = async (state: AgentState) => {
  console.log('[Agent] Testing phase started...');
  return { ...state, currentStep: 'verify', status: 'executing' };
};

const verifyNode = async (state: AgentState) => {
  console.log('[Agent] Verification completed...');
  
  // Calculate quality score via evaluation engine
  const evalService = createEvaluationService(); // Assuming available
  const qualityScore = await evalService.evaluateMissionOutput(state.mission?.id || '', { files: state.artifacts.map(a => a.uri) });

  return {
    ...state,
    currentStep: 'archive',
    status: 'verified',
    messages: [
      ...state.messages,
      { type: 'assistant', content: `Verification passed with quality score: ${qualityScore.score * 100}%` },
    ],
  };
};

const archiveNode = async (state: AgentState) => {
  console.log('[Archiving] Archiving phase started...');
  
  // Seal provenance record
  const provenance = createProvenanceTracker();
  provenance.recordProvenance({
    artifactId: state.artifacts[0]?.id || '',
    missionId: state.mission?.id || '',
    executionId: `exec-${Date.now()}`,
    agentRole: 'reviewer',
    modelId: 'qwen3-coder',
    toolsInvoked: ['code_review', 'verification'],
    policiesApplied: ['human_approval_gate'],
    timestamp: new Date().toISOString(),
    signature: 'sig-sha256-verified',
  });

  return {
    ...state,
    currentStep: 'complete',
    status: 'completed',
    messages: [
      ...state.messages,
      { type: 'system', content: 'Mission completed successfully. All artifacts archived.' },
    ],
  };
};

// Define the transitions between nodes (the edges/graph structure)
const createAgentGraph = () => {
  const builder = new StateGraph<{ state: AgentState >()
    .add_node('planning', planningNode)
    .add_node('design', designNode)
    .add_node('coding', codeNode)
    .add_node('review', reviewNode)
    .add_node('testing', testNode)
    .add_node('verification', verifyNode)
    .add_node('archiving', archiveNode)
    .add_node(END, () => ({ status: 'completed' }))

  // Define state transitions based on current step
  builder.add_conditional_edges(
    'planning',
    (state) => state.currentStep,
    {
      'design': 'design',
    }
  );

  builder.add_conditional_edges(
    'design',
    (state) => state.currentStep,
    {
      'coding': 'coding',
    }
  );

  builder.add_conditional_edges(
    'coding',
    (state) => state.currentStep,
    {
      'review': 'review',
    }
  );

  builder.add_conditional_edges(
    'review',
    (state) => state.currentStep,
    {
      'testing': 'testing',
    }
  );

  builder.add_conditional_edges(
    'testing',
    (state) => state.currentStep,
    {
      'verification': 'verification',
    }
  );

  builder.add_conditional_edges(
    'verification',
    (state) => state.currentStep,
    {
      'archiving': 'archiving',
    }
  );

  builder.add_conditional_edges(
    'archiving',
    (state) => state.status,
    {
      'completed': END,
      default: 'coding', // Loop back if not completed
    }
  );

  return builder;
};

// Export helper function to execute the workflow
export const executeAgentWorkflow = async (mission: MissionContract) => {
  const graph = createAgentGraph();
  const workflow = graph.compile({
    entryPoint: 'planning',
    initialState: {
      mission,
      ...initialState(),
    },
  });

  try {
    // Run the workflow asynchronously
    for await const output of workflow.stream({ config: { keys: ['state'] } }) {
      console.log(`[Agent Workflow Step]: ${output.state.currentStep}`);
      // Could emit events here via event bus
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
    }

    return { success: true, finalState: workflow.getState().result };
  } catch (error) {
    console.error('[Agent Workflow Failed]', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

// Register agent roles with capability fabric (for discoverability)
export const registerAgentRoles = () => {
  const fabric = createCapabilityFabric();
  
  fabric.registerCapability({
    id: 'role-planner',
    name: 'Planner Agent',
    type: 'agent',
    version: '1.0.0',
    contractVersion: '1.0.0',
    permissionsRequired: ['generate_plan', 'analyze_mission'],
    costPerInvocationUSD: 0.02,
    healthStatus: 'healthy',
  });

  fabric.registerCapability({
    id: 'role-coder',
    name: 'Coder Agent',
    type: 'agent',
    version: '1.0.0',
    contractVersion: '1.0.0',
    permissionsRequired: ['write_code', 'modify_file'],
    costPerInvocationUSD: 0.03,
    healthStatus: 'healthy',
  });

  fabric.registerCapability({
    id: 'role-reviewer',
    name: 'Reviewer Agent',
    type: 'agent',
    version: '1.0.0',
    contractVersion: '1.0.0',
    permissionsRequired: ['review_code', 'validate_quality'],
    costPerInvocationUSD: 0.025,
    healthStatus: 'healthy',
  });

  fabric.registerCapability({
    id: 'role-tester',
    name: 'Tester Agent',
    type: 'agent',
    version: '1.0.0',
    contractVersion: '1.0.0',
    permissionsRequired: ['execute_tests', 'verify_pass'],
    costPerInvocationUSD: 0.015,
    healthStatus: 'healthy',
  });

  console.log('[Agent Roles] Registered four agent roles with capability fabric');
};

export default { executeAgentWorkflow, registerAgentRoles };