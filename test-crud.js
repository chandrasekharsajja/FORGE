const test = require('node:test');
const { assert, load } = require('./test-support');

test('crud scenario exercises workspace indexing, planning, and artifact storage', async () => {
  const [
    { PlanningEngine },
    { WorkspaceService },
    { KnowledgeEngine },
    { ArtifactService },
    { EvaluationEngine },
  ] = await Promise.all([
    load('./services/planning-engine/src/index.ts'),
    load('./services/workspace-service/src/index.ts'),
    load('./services/knowledge-service/src/index.ts'),
    load('./services/artifact-service/src/index.ts'),
    load('./services/evaluation/src/index.ts'),
  ]);

  const workspace = new WorkspaceService();
  const summary = await workspace.indexWorkspace('workspace-crud', [
    'apps/unified-ide',
    'packages',
    'services',
  ]);
  assert.equal(summary.workspaceId, 'workspace-crud');
  assert.equal(workspace.getLastIndexSummary()?.repoPaths.length, 3);

  const planner = new PlanningEngine();
  const dag = await planner.generateExecutionDAG('Generate Full CRUD REST API for User Resource');
  assert.equal(dag.length, 4);
  assert.equal(dag[0].assignedAgentRole, 'planner');
  assert.equal(dag[3].title, 'Run unit & integration tests');

  const knowledge = new KnowledgeEngine();
  await knowledge.indexRepository(process.cwd());
  const searchResults = await knowledge.searchCodebase('create user');
  assert.equal(searchResults.length, 1);
  const parsed = await knowledge.parseDocument('README.md');
  assert.match(parsed, /Parsed Content/);

  const artifactService = new ArtifactService();
  const artifact = await artifactService.storeArtifact({
    id: 'art-crud-1',
    missionId: 'm-crud-api',
    type: 'test_report',
    path: 'tests/crud-report.json',
    version: 1,
  });
  assert.equal(artifactService.listArtifacts().length, 1);
  assert.equal(artifact.type, 'test_report');

  const evaluation = await new EvaluationEngine().evaluateMissionOutput('m-crud-api', {
    rows: 12,
  });
  assert.equal(evaluation.pass, true);
  assert.ok(evaluation.score > 0.9);
});
