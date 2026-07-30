const test = require('node:test');
const { assert, load } = require('./test-support');

test('k8s scenario checks planning, capacity, scheduling, and governance', async () => {
  const [
    { PlanningEngine },
    { ResourceManager },
    { FleetScheduler },
    { GovernanceControlPlane },
    { MissionRuntime },
    { ControlPlaneBrain },
  ] = await Promise.all([
    load('./services/planning-engine/src/index.ts'),
    load('./services/resource-manager/src/index.ts'),
    load('./services/scheduler/src/index.ts'),
    load('./services/governance-service/src/index.ts'),
    load('./packages/mission-runtime/src/index.ts'),
    load('./services/control-plane/src/index.ts'),
  ]);

  const planner = new PlanningEngine();
  const dag = await planner.generateExecutionDAG('Deploy Production Microservice to Kubernetes Cluster');
  assert.equal(dag.length, 4);
  assert.equal(dag[3].assignedAgentRole, 'tester');

  const resources = new ResourceManager();
  assert.equal(await resources.checkCapacity(50000, true), true);

  const governance = new GovernanceControlPlane();
  const policy = await governance.validateOrgPolicy('org-aurexon', 'deploy_k8s_manifests', 25);
  assert.equal(policy.allowed, true);

  const scheduler = new FleetScheduler();
  const worker = await scheduler.scheduleMissionTask(
    {
      id: 'm-k8s',
      title: 'Kubernetes deployment',
      goal: 'Deploy Helm Charts, HPA, & Ingress',
      organizationId: 'org-aurexon',
      workspaceId: 'workspace-public',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    'Helm Chart Deployment',
  );
  assert.ok(['gpu_node', 'sandbox_cluster', 'cloud_worker', 'laptop'].includes(worker.nodeType));
  assert.equal(worker.status, 'idle');

  const missionRuntime = new MissionRuntime();
  const mission = await missionRuntime.executeMission({
    id: 'm-k8s',
    title: 'Kubernetes Microservice Deployment',
    goal: 'Deploy Helm Charts, HPA, & Ingress',
    status: 'draft',
    executionGraph: dag.map((node) => node.title),
    artifactsGenerated: [],
  });
  assert.equal(mission.status, 'completed');

  const controlPlane = new ControlPlaneBrain();
  const twin = await controlPlane.getDigitalTwinState('org-aurexon');
  assert.equal(twin.activeMissions, 8);
  assert.ok(twin.activeWorkspaces >= 1);
});
