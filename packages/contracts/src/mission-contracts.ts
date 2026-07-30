/**
 * @sajja/forge-contracts - Mission lifecycle contracts and state definitions
 * Shared interfaces for mission execution across FORGE platform.
 */

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'tester' | 'archivist';

export interface MissionContract {
  id: string;
  title: string;
  goal: string;
  organizationId?: string;
  ownerId?: string;
  status: 'draft' | 'planning' | 'executing' | 'verifying' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
  agentRole?: AgentRole;
  planningEngine?: string; // Which planner was used
  estimatedDurationMs?: number; // In milliseconds
  artifacts?: ArtifactContract[];
}

export interface ArtifactContract {
  id: string;
  missionId: string;
  type: 'code' | 'prd' | 'diagram' | 'test_report' | 'spec' | 'architecture';
  version: number;
  uri: string; // URL or path to artifact content
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  signature?: string; // For integrity verification (SHA-256)
}

export interface ParallelDAG {
  id: string;
  goal: string;
  timestamp: string;
  author: string;
  modelUsed?: string;
  steps: string[];
  tasks: TaskNode[];
  parallelGroups: TaskNode[][];
  estimatedCompletionMs: number;
  status: 'planned' | 'pending' | 'executing' | 'completed' | 'failed';
}

export interface TaskNode {
  id: string;
  name: string;
  description: string;
  agentRole: AgentRole;
  dependencies: string[];
  estimatedTimeMs?: number;
  priority?: number;
  status: 'pending' | 'queued' | 'executing' | 'completed' | 'failed';
  output?: any;
}

// Policy evaluation types
export interface PolicyRule {
  id: string;
  name: string;
  enforce: (action: string, metadata?: any) => Promise<{ allowed: boolean; reason?: string }>;
}

export interface PolicyEvaluationRequest {
  action: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvaluationResponse {
  result: PolicyResult;
  timestamp: string;
}

export interface PolicyResult {
  allowed: boolean;
  ruleId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  requiresApproval?: boolean;
  approvalDeadline?: string;
}

export interface StreamingAgentResponse {
  success: boolean;
  chunks: Array<{ role: string; content: string }>;
  finalAnswer?: string;
  modelUsed?: string;
  processingTimeMs?: number;
  timestamp: string;
}

export default {
  type: 'mission-contracts',
  version: '1.0.0',
};