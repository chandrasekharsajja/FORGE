import { createWorkflow } from '@platform/sdk-workflow';

export const helloWorkflow = createWorkflow({
  id: 'wf-hello-workflow',
  name: 'Sample Developer Workflow',
  steps: [
    { id: '1', name: 'Lint & Audit', agentRole: 'reviewer' },
    { id: '2', name: 'Build & Package', agentRole: 'devops', dependencies: ['1'] }
  ]
});

console.log(`[Example] Initialized hello-workflow example with ${helloWorkflow.steps.length} steps.`);
