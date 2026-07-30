const test = require('node:test');
const { assert, load } = require('./test-support');

test('blog scenario wires registries, models, workflow, and tools', async () => {
  const [
    { EngineeringIntelligenceDashboard },
    { ModelRegistry },
    { createWorkflow },
    { createAgent },
    { createTool },
    { AgentRegistry },
    { ToolRegistry },
  ] = await Promise.all([
    load('./services/intelligence-dashboard/src/index.ts'),
    load('./packages/model-registry/src/index.ts'),
    load('./packages/sdks/sdk-workflow/src/index.ts'),
    load('./packages/sdks/sdk-agent/src/index.ts'),
    load('./packages/sdks/sdk-tool/src/index.ts'),
    load('./packages/agent-registry/src/index.ts'),
    load('./packages/tool-registry/src/index.ts'),
  ]);

  const dashboard = new EngineeringIntelligenceDashboard();
  const metrics = await dashboard.getMetrics('workspace-public');
  assert.equal(metrics.totalMissions, 142);
  assert.ok(metrics.aiAcceptanceRate > 0.9);
  assert.ok(metrics.technicalDebtScore > 90);

  const modelRegistry = new ModelRegistry();
  assert.equal(modelRegistry.selectBestModelForTask('coding')?.id, 'qwen3-coder');

  const workflow = createWorkflow({
    id: 'blog-pipeline',
    name: 'Blog publishing workflow',
    steps: [
      { id: 'draft', name: 'Draft post', agentRole: 'planner' },
      { id: 'review', name: 'Review copy', agentRole: 'reviewer', dependencies: ['draft'] },
      { id: 'publish', name: 'Publish post', agentRole: 'coder', dependencies: ['review'] },
    ],
  });
  assert.equal(workflow.buildDAG().length, 3);

  const agent = createAgent({
    role: 'blog-writer',
    systemPrompt: 'Write concise engineering updates',
    allowedTools: ['render_preview'],
    supportedModels: ['qwen3-coder'],
  });
  const tool = createTool({
    name: 'render_preview',
    description: 'Render a blog preview',
    parametersSchema: { type: 'object', properties: {} },
    handler: async (args) => ({ ok: true, input: args }),
  });

  const agentRegistry = new AgentRegistry();
  agentRegistry.registerAgent('writer', agent);
  assert.equal(agentRegistry.getAgent('writer'), agent);

  const toolRegistry = new ToolRegistry();
  toolRegistry.registerTool('render_preview', tool);
  assert.equal(toolRegistry.getTool('render_preview'), tool);

  const stepResult = await agent.executeStep({ topic: 'blog launch' });
  assert.equal(stepResult.status, 'success');

  const toolResult = await tool.execute({ title: 'Blog launch' });
  assert.equal(toolResult.ok, true);
});
