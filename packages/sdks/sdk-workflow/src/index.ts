export function createWorkflow(config: {
  id: string;
  name: string;
  steps: Array<{ id: string; name: string; agentRole: string; dependencies?: string[] }>;
}) {
  return {
    id: config.id,
    name: config.name,
    steps: config.steps,
    buildDAG: () => config.steps
  };
}
