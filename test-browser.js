const test = require('node:test');
const { assert, load, callGet } = require('./test-support');

test('browser scenario talks to the live dashboard snapshot and MCP gateway', async () => {
  const [
    { MCPGateway },
    { buildDashboardSnapshot },
    dashboardRoute,
  ] = await Promise.all([
    load('./services/mcp-gateway/src/index.ts'),
    load('./apps/unified-ide/src/lib/dashboard-model.ts'),
    load('./apps/unified-ide/src/app/api/dashboard/route.ts'),
  ]);

  const gateway = new MCPGateway();
  const tools = await gateway.listConnectedMCPTools();
  assert.ok(tools.includes('github_create_pull_request'));

  const interaction = await gateway.navigateAndInteract('https://github.com/chandrasekharsajja/FORGE', [
    'open repository',
  ]);
  assert.equal(interaction.status, 200);
  assert.equal(interaction.pageTitle, 'Application UI Preview');

  const snapshot = await buildDashboardSnapshot();
  assert.ok(snapshot.agentPromptSuggestions.length >= 3);
  assert.ok(snapshot.overviewStats.length >= 3);

  const dashboard = await callGet(dashboardRoute);
  assert.equal(dashboard.agentPromptSuggestions.length, snapshot.agentPromptSuggestions.length);
  assert.equal(dashboard.serviceHealth[0].name, 'Unified IDE');
});
