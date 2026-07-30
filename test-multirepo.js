const test = require('node:test');
const { assert, load, callGet, callPost } = require('./test-support');

test('multirepo scenario validates the live dashboard and mission APIs together', async () => {
  const [
    { buildDashboardSnapshot },
    dashboardRoute,
    missionRoute,
  ] = await Promise.all([
    load('./apps/unified-ide/src/lib/dashboard-model.ts'),
    load('./apps/unified-ide/src/app/api/dashboard/route.ts'),
    load('./apps/unified-ide/src/app/api/mission/route.ts'),
  ]);

  const snapshot = await buildDashboardSnapshot();
  assert.equal(snapshot.quickStartCards.length, 3);
  assert.ok(snapshot.terminalLines.some((line) => line.includes('live shell snapshot')));

  const dashboard = await callGet(dashboardRoute);
  assert.equal(dashboard.overviewStats.length, snapshot.overviewStats.length);
  assert.equal(dashboard.generatedArtifacts.length, 3);

  const mission = await callPost(missionRoute, {
    prompt: 'Audit the public workspace flow and verify the live APIs.',
  });
  assert.equal(mission.status, 'verified');
  assert.ok(mission.logs[0].startsWith('[Session]'));
  assert.ok(mission.logs.some((line) => line.includes('[Sandbox]')));
  assert.equal(mission.model, 'Qwen3 Coder');
  assert.equal(mission.artifactPath, 'tests/mission-harness/runner.ts');
  assert.ok(mission.score > 0.9);
});
