/**
 * @core-agent/planner - Mission planning and DAG generation engine
 * 
 * Plans execution sequences using LangChain for natural language understanding,
 * then generates parallel execution DAGs for agent workflow orchestration.
 */

import { createLangChainAdapter } from './langchain-adapter';
import { executeAgentWorkflow } from './graph';
import { ModelRegistry } from './model-registry';
import { getMemoryService } from '@platform/memory-service';

// CONTRACTS
import type { MissionContract, ParallelDAG } from '@sajja/contracts';

export interface PlanningContext {
  goal: string;
  organizationId?: string;
  constraints?: Record<string, unknown>;
  preferredModel?: string;
}

interface TaskNode {
  id: string;
  name: string;
  description: string;
  agentRole: 'planner' | 'coder' | 'reviewer' | 'tester' | 'archivist';
  dependencies: string[];
  estimatedTimeMs?: number;
  priority?: number;
  status: 'pending' | 'queued' | 'executing' | 'completed' | 'failed';
  output?: any;
}

export class MissionDAGPlanner {
  private langChainAdapter: any;
  private registry: ModelRegistry;

  constructor() {
    this.langChainAdapter = createLangChainAdapter();
    this.registry = ModelRegistry;
    console.log('[MissionDAGPlanner] Initialized with LangChain adapter');
  }

  /** Build a parallel execution DAG from a mission goal */
  async buildParallelDAG(missionGoal: string, context?: PlanningContext): Promise<ParallelDAG> {
    const missionId = context?.organizationId ? `org-${context.organizationId}-dag-${Date.now()}` : `dag-${Date.now()}`;
    
    // Use LangChain to understand the goal and break it down steps
    const planSteps = await this.analyzeGoalWithLLM(missionGoal, context);
    
    // Convert plan steps to DAG nodes
    const tasks = this.stepsToTasks(planSteps, missionId);
    
    // Determine parallel execution groups (tasks with no mutual dependencies can run in parallel)
    const parallelGroups = this.groupIntoParallelSets(tasks);
    
    return {
      id: missionId,
      goal: missionGoal,
      timestamp: new Date().toISOString(),
      author: 'system-planner',
      modelUsed: 'gpt-4o', // Would be selected based on context
      steps: planSteps,
      tasks,
      parallelGroups,
      estimatedCompletionMs: this.calculateEstimatedTime(tasks),
      status: 'planned',
    };
  }

  /** Analyze mission goal using LLM to generate human-readable plan steps */
  private async analyzeGoalWithLLM(goal: string, context?: PlanningContext): Promise<string[]> {
    // In a real implementation, this would call an LLM chain to understand the goal
    // For now, provide a simple heuristic-based breakdown
    
    const lowerGoal = goal.toLowerCase();
    const steps: string[] = [];

    if (lowerGoal.includes('api') || lowerGoal.includes('endpoint')) {
      steps.push('Analyze API requirements and design endpoints');
      steps.push('Generate API route implementations');
      steps.push('Create request/response validation schemas');
      steps.push('Write integration tests');
    } else if (lowerGoal.includes('frontend') || lowerGoal.includes('ui')) {
      steps.push('Design component architecture');
      steps.push('Implement UI components with TypeScript types');
      steps.push('Add state management hooks');
      steps.push('Create test coverage');
    } else if (lowerGoal.includes('database') || lowerGoal.includes('schema')) {
      steps.push('Design database schema');
      steps.push('Create migration scripts');
      steps.push('Implement repository patterns');
      steps.add('Build indexing strategy');
    } else {
      // Generic fallback - use LangChain adapter for more sophisticated analysis
      try {
        const selectionContext: SelectionContext = {
          requiredCapabilities: ['analysis', 'planning'],
        };
        const model = this.registry.selectBestForTask(selectionContext);
        
        // Simulate calling LangChain to parse complex goals
        if (model) {
          // This would actually make an API call to the LLM in production
          console.info('[Plan] Using LLM to parse complex goal:', goal.substring(0, 50) + '...');
          // In production: generate steps via LLM call
        }
      } catch (e) {
        console.warn('[Plan] Fallback to generic analysis:', e.message);
      }
      
      steps.push('Understand the requirement');
      steps.push('Design solution architecture');
      steps.push('Implement core functionality');
      steps.push('Test and validate');
      steps.push('Document and deploy');
    }

    // Add standard governance step if organization specified
    if (context?.organizationId) {
      steps.push('Verify compliance with organization policies');
    }

    return steps;
  }

  /** Convert plan steps to typed DAG task nodes */
  private stepsToTasks(steps: string[], missionId: string): TaskNode[] {
    const roles: Record<string, AgentRole> = {
      'design': 'planner',
      'architecture': 'planner',
      'implementation': 'coder',
      'generate': 'coder',
      'write': 'coder',
      'create': 'coder',
      'test': 'tester',
      'validate': 'tester',
      'check': 'reviewer',
      'review': 'reviewer',
      'analyze': 'planner',
      'verify': 'reviewer',
      'deploy': 'archivist',
      'document': 'archivist',
    };

    return steps.map((step, index) => {
      const roleGuess = this.guessAgentRole(step);
      return {
        id: `${missionId}-task-${index + 1}`,
        name: `Task ${index + 1}: ${step}`,
        description: step,
        agentRole: roleGuess,
        dependencies: index > 0 ? [`${missionId}-task-${index}`] : [],
        estimatedTimeMs: this.estimateStepDuration(step),
        priority: index + 1,
        status: 'pending',
        output: undefined,
      };
    });
  }

  /** Estimate duration of a task based on complexity */
  private estimateStepDuration(step: string): number {
    const lower = step.toLowerCase();
    if (lower.includes('test') || lower.includes('validation') || lower.includes('verify')) return 30000; // 30 min
    if (lower.includes('code') || lower.includes('implement') || lower.includes('write')) return 60000; // 60 min
    if (lower.includes('design') || lower.includes('architecture') || lower.includes('plan')) return 45000; // 45 min
    return 18000; // 18 min default
  }

  /** Guess which agent role should handle this task */
  private guessAgentRole(step: string): AgentRole {
    const lower = step.toLowerCase();
    if (lower.includes('plan') || lower.includes('analyze') || lower.includes('design') || lower.includes('requirements')) {
      return 'planner';
    }
    if (lower.includes('code') || lower.includes('implement') || lower.includes('write') || lower.includes('generate')) {
      return 'coder';
    }
    if (lower.includes('test') || lower.includes('verify') || lower.includes('review') || lower.includes('check')) {
      return 'reviewer';
    }
    if (lower.includes('deploy') || lower.includes('release') || lower.includes('archive')) {
      return 'archivist';
    }
    return 'planner'; // Default
  }

  /** Group tasks into parallel execution sets */
  private groupIntoParallelSets(tasks: TaskNode[]): TaskNode[][] {
    // Simple topological grouping - groups containing mutually independent tasks
    const groups: TaskNode[][] = [];
    const visited = new Set<string>();

    while (visited.size < tasks.length) {
      const group: TaskNode[] = [];
      
      for (const task of tasks) {
        if (!visited.has(task.id) && task.dependencies.every(dep => visited.has(dep))) {
          group.push(task);
          visited.add(task.id);
        }
      }

      if (group.length === 0 && visited.size < tasks.length) {
        // Unresolved dependency (cycle or missing deps) - put remaining in last group
        const remaining = tasks.filter(t => !visited.has(t.id));
        groups.push(remaining);
        visited.add(...remaining.map(t => t.id));
      } else {
        groups.push(group);
      }
    }

    return groups;
  }

  /** Calculate total estimated completion time considering parallelism */
  private calculateEstimatedTime(tasks: TaskNode[]): number {
    // Find longest path through DAG (critical path method)
    const memo: Map<string, number> = new Map();

    function longestPath(task: TaskNode): number {
      if (memo.has(task.id)) return memo.get(task.id)!;
      
      if (task.dependencies.length === 0) {
        return task.estimatedTimeMs || 0;
      }
      
      const maxDepTime = Math.max(
        ...task.dependencies.map(depId => {
          const depTask = tasks.find(t => t.id === depId);
          return depId ? (longestPath(depTask!) || 0) : 0;
        })
      );
      
      const result = maxDepTime + (task.estimatedTimeMs || 0);
      memo.set(task.id, result);
      return result;
    }

    // Find root tasks (no dependencies) and take the longest path
    const rootTasks = tasks.filter(t => t.dependencies.length === 0);
    if (rootTasks.length > 0) {
      return Math.max(...rootTasks.map(longestPath));
    }

    // If all have dependencies (unlikely but possible), just sum them all
    return tasks.reduce((sum, t) => sum + (t.estimatedTimeMs || 0), 0);
  }
}

export default MissionDAGPlanner;