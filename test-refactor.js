const test = require('node:test');
const { assert, load } = require('./test-support');

test('refactor scenario exercises durable workflow, registries, and mission replay', async () => {
  const [
    { MissionDAGPlanner },
    { MissionRuntime },
    { createWorkflow },
    { createAgent },
    { createTool },
    { AgentRegistry },
    { ToolRegistry },
    { EventBus },
  ] = await Promise.all([
    load('./packages/mission-runtime/src/dag.ts'),
    load('./packages/mission-runtime/src/index.ts'),
    load('./packages/sdks/sdk-workflow/src/index.ts'),
    load('./packages/sdks/sdk-agent/src/index.ts'),
    load('./packages/sdks/sdk-tool/src/index.ts'),
    load('./packages/agent-registry/src/index.ts'),
    load('./packages/tool-registry/src/index.ts'),
    load('./services/event-bus/src/index.ts'),
  ]);

  const planner = new MissionDAGPlanner();
  const dag = await planner.buildParallelDAG('Perform Large-Scale Codebase Refactoring across Monorepo');
  assert.equal(dag.length, 6);
  assert.ok(dag.some((node) => node.agentRole === 'devops'));

  const workflow = createWorkflow({
    id: 'refactor',
    name: 'Durable refactor workflow',
    steps: [
      { id: 'plan', name: 'Plan refactor', agentRole: 'planner' },
      { id: 'build', name: 'Rewrite modules', agentRole: 'coder', dependencies: ['plan'] },
      { id: 'verify', name: 'Regression validation', agentRole: 'reviewer', dependencies: ['build'] },
    ],
  });
  assert.equal(workflow.buildDAG().length, 3);

  const agent = createAgent({
    role: 'refactorer',
    systemPrompt: 'Refactor monorepo modules safely',
    allowedTools: ['workspace_diff'],
    supportedModels: ['qwen3-coder'],
  });
  const tool = createTool({
    name: 'workspace_diff',
    description: 'Generate a workspace diff',
    parametersSchema: { type: 'object', properties: {} },
    handler: async (args) => ({ status: 'success', args }),
  });

  const agentRegistry = new AgentRegistry();
  agentRegistry.registerAgent('refactorer', agent);
  assert.equal(agentRegistry.getAgent('refactorer'), agent);

  const toolRegistry = new ToolRegistry();
  toolRegistry.registerTool('workspace_diff', tool);
  assert.equal(toolRegistry.getTool('workspace_diff'), tool);

  assert.equal((await agent.executeStep({ taskId: 'm-refactor' })).status, 'success');
  assert.equal((await tool.execute({ path: 'packages/core/src/index.ts' })).status, 'success');

  const missionRuntime = new MissionRuntime();
  const mission = await missionRuntime.executeMission({
    id: 'm-refactor',
    title: 'Monorepo Refactoring Mission',
    goal: 'Index, Refactor, Checkpoint, & Resume',
    status: 'draft',
    executionGraph: dag.map((node) => node.name),
    artifactsGenerated: [],
  });
  assert.equal(mission.status, 'completed');

  const eventBus = new EventBus();
  await eventBus.publishAgentEvent('refactor.completed', { missionId: mission.id });
  assert.equal(eventBus.getPublishedEvents()[0].topic, 'refactor.completed');
});
