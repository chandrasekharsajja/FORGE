const test = require('node:test');
const { assert, load } = require('./test-support');

test('jwt mission flow uses the live platform, planner, and provenance services', async () => {
  const [
    { PlatformRuntime },
    { MissionDAGPlanner },
    { PolicyEngine },
    { CapabilityFabric },
    { createCapability },
    { FleetScheduler },
    { MissionRuntime },
    { ArtifactService },
    { ProvenanceTracker },
    { ControlPlaneBrain },
  ] = await Promise.all([
    load('./packages/platform-runtime/src/index.ts'),
    load('./packages/mission-runtime/src/dag.ts'),
    load('./services/policy-engine/src/index.ts'),
    load('./packages/capability-fabric/src/index.ts'),
    load('./packages/sdks/sdk-capability/src/index.ts'),
    load('./services/scheduler/src/index.ts'),
    load('./packages/mission-runtime/src/index.ts'),
    load('./services/artifact-service/src/index.ts'),
    load('./packages/provenance/src/index.ts'),
    load('./services/control-plane/src/index.ts'),
  ]);

  const platform = new PlatformRuntime();
  const session = await platform.createSession('dev-user-1', 'org-aurexon');
  assert.equal(session.organizationId, 'org-aurexon');
  assert.equal(session.tenantId, 'tenant-org-aurexon');
  assert.equal(session.role, 'developer');

  const planner = new MissionDAGPlanner();
  const dag = await planner.buildParallelDAG('Implement JWT Authentication');
  assert.equal(dag.length, 6);
  assert.ok(dag.some((node) => node.agentRole === 'security'));
  assert.ok(dag.some((node) => node.status === 'completed'));

  const policy = new PolicyEngine();
  assert.deepEqual(await policy.evaluateAction('execute_mission_dag'), { allowed: true });

  const fabric = new CapabilityFabric();
  const capability = createCapability({
    id: 'cap-jwt-backend',
    name: 'JWT Backend Generator',
    type: 'agent',
    version: '1.0.0',
    execute: async () => ({ status: 'ok' }),
  });
  fabric.registerCapability(capability);
  assert.equal(fabric.discoverCapabilities().length, 1);

  const scheduler = new FleetScheduler();
  const worker = await scheduler.scheduleMissionTask(
    {
      id: 'm-jwt',
      title: 'Implement JWT Authentication',
      goal: 'Add secure JWT endpoints',
      organizationId: session.organizationId,
      workspaceId: 'workspace-public',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    'Backend JWT Implementation',
  );
  assert.ok(worker.nodeId.length > 0);
  assert.ok(['gpu_node', 'sandbox_cluster', 'cloud_worker', 'laptop'].includes(worker.nodeType));
  assert.equal(worker.status, 'idle');

  const missionRuntime = new MissionRuntime();
  const mission = await missionRuntime.executeMission({
    id: 'm-jwt',
    title: 'Implement JWT Authentication',
    goal: 'Add secure JWT endpoints',
    status: 'draft',
    executionGraph: dag.map((node) => node.name),
    artifactsGenerated: [],
  });
  assert.equal(mission.status, 'completed');
  assert.equal(mission.executionGraph.length, dag.length);

  const artifactService = new ArtifactService();
  const artifact = await artifactService.storeArtifact({
    id: 'art-jwt-1',
    missionId: 'm-jwt',
    type: 'code',
    path: 'src/auth/jwt.ts',
    version: 1,
  });
  assert.equal(artifact.path, 'src/auth/jwt.ts');
  assert.equal(artifactService.getArtifact(artifact.id)?.version, 1);

  const provenance = new ProvenanceTracker();
  provenance.recordProvenance({
    artifactId: artifact.id,
    missionId: 'm-jwt',
    executionId: 'exec-jwt-1',
    agentRole: 'reviewer',
    modelId: 'qwen3-coder',
    toolsInvoked: ['workspace_index', 'mission_plan'],
    policiesApplied: ['execute_mission_dag'],
    timestamp: new Date().toISOString(),
    signature: 'sig-sha256-verified',
  });
  assert.equal(provenance.getProvenance(artifact.id)?.signature, 'sig-sha256-verified');

  const controlPlane = new ControlPlaneBrain();
  const twinState = await controlPlane.getDigitalTwinState(session.organizationId);
  assert.equal(twinState.orgId, session.organizationId);
  assert.ok(twinState.globalKnowledgeNodes > 40000);
});
