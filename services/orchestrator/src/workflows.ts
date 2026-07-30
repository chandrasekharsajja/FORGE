interface AgentWorkflowInput {
  taskId: string;
  userPrompt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  completed: boolean;
}

export interface WorkflowRunSummary {
  taskId: string;
  userPrompt: string;
  steps: WorkflowStep[];
  status: 'scheduled' | 'running' | 'completed';
}

export async function executeAgentTaskWorkflow(input: AgentWorkflowInput): Promise<WorkflowRunSummary> {
  console.log(`[Workflow] Starting durable agent task ${input.taskId}`);
  const steps: WorkflowStep[] = [
    { id: 'plan', name: 'Planner review', completed: true },
    { id: 'build', name: 'Code generation', completed: true },
    { id: 'verify', name: 'Verification pass', completed: true },
  ];

  return {
    taskId: input.taskId,
    userPrompt: input.userPrompt,
    steps,
    status: 'completed',
  };
}
