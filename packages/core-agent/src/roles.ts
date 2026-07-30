/**
 * @core-agent/roles - Agent role definitions and capability specifications
 * 
 * Defines all agent roles available in the FORGE platform with their
 permitted actions, skills, and operational boundaries.
 */

// CONTRACTS
import type { AgentRole as ContractAgentRole } from '@sajja/contracts';

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'tester' | 'archivist';

// Role permissions matrix (who can do what)
const rolePermissions: Record<AgentRole, string[]> = {
  planner: [
    'analyze_mission',
    'generate_plan',
    'create_workflow',
    'define_dependencies',
    'set_estimates',
  ],
  coder: [
    'write_code',
    'modify_file',
    'generate_component',
    'call_api',
    'execute_command',
  ],
  reviewer: [
    'review_code',
    'check_quality',
    'provide_feedback',
    'approve_revision',
    'validate_requirements',
  ],
  tester: [
    'create_test_suite',
    'execute_tests',
    'verify_pass_fail',
    'report_results',
    'generate_coverage_report',
  ],
  archivist: [
    'archive_artifact',
    'generate_dokument',
    'seal_provenance',
    'publish_release',
    'update_documentation',
  ],
};

// Role skill profiles (what they're good at)
const roleSkills: Record<AgentRole, string[]> = {
  planner: ['requirement_analysis', 'workflow_design', 'dependency_mapping', 'estimation', 'risk_assessment'],
  coder: ['programming', 'framework_usage', 'api_integration', 'code_generation', 'tool_chaining'],
  reviewer: ['code_review', 'quality_assurance', 'pattern_matching', 'best_practices_enforcement', 'feedback_generation'],
  tester: ['test_design', 'test_execution', 'debugging', 'verification', 'reporting'],
  archivist: ['documentation', 'version_control', 'artifact_management', 'process_capture', 'knowledge_preservation'],
};

// Role descriptions for UI/documentation
const roleDescriptions: Record<AgentRole, string> = {
  planner: 'Mission analyst responsible for breaking down goals into executable tasks, creating workflow plans, and estimating effort.',
  coder: 'Implementation specialist that writes code, generates components, and executes technical tasks based on plan specifications.',
  reviewer: 'Quality assurance expert who reviews implementations, checks against standards, provides feedback, and approves revisions.',
  tester: 'Verification engineer who creates test suites, executes tests, verifies outcomes, and reports quality metrics.',
  archivist: 'Documentation and process specialist who archives artifacts, seals provenance records, and maintains knowledge repositories.',
};

// Role color themes for UI representation
const roleThemes: Record<AgentRole, string> = {
  planner: '#3b82f6', // blue
  coder: '#10b981',   // green
  reviewer: '#f59e0b', // amber
  tester: '#ef4444',   // red
  archivist: '#8b5cf6', // violet
};

/** Export typed role information for documentation/UI consumption */
export const getRoleInfo = (role: AgentRole): {
  id: AgentRole;
  description: string;
  colors: string;
  permissions: string[];
  skills: string[];
} => ({
  id: role,
  description: roleDescriptions[role] || 'Unknown agent role',
  colors: roleThemes[role] || '#6b7280', // gray fallback
  permissions: rolePermissions[role] || [],
  skills: roleSkills[role] || [],
});

/** Get all valid agent roles */
export function getAllAgentRoles(): AgentRole[] {
  return Object.keys(roleDescriptions).map(r => r as AgentRole);
}

/** Check if given role is valid */
export function isValidAgentRole(role: any): role is AgentRole {
  return getAllAgentRoles().includes(role as AgentRole);
}

/** Get permission check utility */
export const hasPermission = (role: AgentRole, action: string): boolean => {
  return rolePermissions[role].includes(action);
};

// Example usage comment:
/*
const plannerInfo = getRoleInfo('planner');
console.log(plannerInfo.permissions); // ['analyze_mission', 'generate_plan', ...]
console.log(hasPermission('coder', 'write_code')); // true
*/

export default { getRoleInfo, getAllAgentRoles, isValidAgentRole, hasPermission };