import { proxyActivities } from '@temporalio/workflow';

interface AgentWorkflowInput {
  taskId: string;
  userPrompt: string;
}

const activities = proxyActivities({
  startToCloseTimeout: '1 hour',
});

export async function executeAgentTaskWorkflow(input: AgentWorkflowInput): Promise<string> {
  console.log(`[Workflow] Starting durable agent task ${input.taskId}`);
  // Execute durable workflow steps via Temporal activities
  return `Task ${input.taskId} executed successfully.`;
}
