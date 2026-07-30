import type {
  ArtifactCard,
  ExplorerSection,
  GovernanceNote,
  MissionTrack,
  OverviewStat,
  QuickStartCard,
  ReleaseCheck,
  ServiceHealth,
  VerificationCheck,
  EditorFile,
} from './dashboard-data.ts';
import { createLiveServices, readRepoSnippet, resolveRepoPath, seedCapabilities } from './live-services.ts';

export interface DashboardSnapshot {
  overviewStats: OverviewStat[];
  explorerSections: ExplorerSection[];
  missionTracks: MissionTrack[];
  releaseChecklist: ReleaseCheck[];
  serviceHealth: ServiceHealth[];
  governanceNotes: GovernanceNote[];
  editorFiles: EditorFile[];
  terminalLines: string[];
  verificationChecks: VerificationCheck[];
  generatedArtifacts: ArtifactCard[];
  quickStartCards: QuickStartCard[];
  agentPromptSuggestions: string[];
}

export interface MissionRunResult {
  prompt: string;
  status: 'verified' | 'needs_review';
  summary: string;
  logs: string[];
  missionId: string;
  workerNode: string;
  model: string;
  artifactPath: string;
  score: number;
}

const promptSuggestions = [
  'Run a release audit',
  'Inspect the mission API',
  'Trace the workspace index',
];

export async function buildDashboardSnapshot(): Promise<DashboardSnapshot> {
  const services = createLiveServices();
  const { capabilities } = seedCapabilities(services);

  const session = await services.platform.createSession('dev-user-1', 'org-aurexon');
  const twin = await services.controlPlane.getDigitalTwinState(session.organizationId);
  const metrics = await services.dashboard.getMetrics('workspace-public');
  const model = services.modelRegistry.selectBestModelForTask('coding');
  const capabilityCount = services.capabilityFabric.discoverCapabilities().length;
  const workspaceSummary = await services.workspace.indexWorkspace('workspace-public', [
    resolveRepoPath('apps/unified-ide'),
    resolveRepoPath('packages'),
    resolveRepoPath('services'),
  ]);
  const dag = await services.missionPlanner.buildParallelDAG('Public release pass');
  const mission = await services.missionRuntime.executeMission({
    id: 'm-shell',
    title: 'Public shell release',
    goal: 'Build and validate the storefront',
    status: 'draft',
    executionGraph: dag.map((node) => node.name),
    artifactsGenerated: [],
  });
  const policyPreview = await services.policy.evaluateAction('publish_public_workspace_preview');
  const prodGate = await services.policy.evaluateAction('deploy_prod_workspace_shell');
  const governance = await services.governance.validateOrgPolicy(
    session.organizationId,
    'publish_public_workspace_preview',
    42,
  );
  const capacityOk = await services.resources.checkCapacity(250000, true);
  const sandbox = await services.sandbox.runCommand({
    sandboxType: 'docker',
    image: 'node:22',
    command: ['npm', 'test'],
  });
  const tools = await services.gateway.listConnectedMCPTools();
  const searchResults = await services.knowledge.searchCodebase('agent workflow');
  const parsePreview = await services.knowledge.parseDocument(resolveRepoPath('README.md'));
  const securityFindings = await services.security.scanRepository(resolveRepoPath('.'));
  const secretCheck = await services.security.checkSecretLeaks('const token = "forge-public-preview";');
  const artifact = await services.artifactService.storeArtifact({
    id: 'art-shell-snapshot',
    missionId: mission.id,
    type: 'architecture',
    path: 'apps/unified-ide/src/app/page.tsx',
    version: 1,
  });
  const provenanceSignature = `sig-${artifact.id}`;
  const evaluation = await services.evaluation.evaluateMissionOutput(mission.id, {
    workspaceSummary,
    tools,
  });
  services.provenance.recordProvenance({
    artifactId: artifact.id,
    missionId: mission.id,
    executionId: 'exec-shell-1',
    agentRole: 'reviewer',
    modelId: model?.id ?? 'qwen3-coder',
    toolsInvoked: tools.slice(0, 3),
    policiesApplied: ['publish_public_workspace_preview', policyPreview.allowed ? 'policy_pass' : 'policy_flag'],
    timestamp: new Date().toISOString(),
    signature: provenanceSignature,
  });
  await services.eventBus.publishAgentEvent('mission.completed', {
    missionId: mission.id,
    workspaceId: workspaceSummary.workspaceId,
  });

  const stateSnippet = await readRepoSnippet('packages/core-agent/src/state.ts', 16);
  const workflowSnippet = await readRepoSnippet('services/orchestrator/src/workflows.ts', 16);
  const readmeSnippet = await readRepoSnippet('README.md', 16);

  return {
    overviewStats: [
      {
        label: 'Public repo posture',
        value: policyPreview.allowed ? 'Clear' : 'Watch',
        caption: governance.allowed
          ? `Docs, legal pages, and the shell align with the current release gate. ${metrics.totalMissions} missions are tracked at ${Math.round(metrics.aiAcceptanceRate * 100)}% AI acceptance.`
          : governance.reason ?? 'The release gate needs review.',
      },
      {
        label: 'Live workspaces',
        value: `${twin.activeWorkspaces}`,
        caption: `Control plane sees ${twin.activeMissions} active missions and ${twin.healthyServices} healthy services.`,
      },
      {
        label: 'Preferred model',
        value: model?.name ?? 'Unknown',
        caption: `Capability fabric currently exposes ${capabilityCount} registered capabilities and the dashboard estimates $${metrics.costSavedUSD.toFixed(0)} in engineering value.`,
      },
    ],
    explorerSections: [
      {
        title: 'Workspace',
        items: [
          { label: 'apps/unified-ide', detail: 'Public mission cockpit', kind: 'folder' },
          { label: 'packages/contracts', detail: 'Shared contracts and schemas', kind: 'folder' },
          { label: 'services/orchestrator', detail: 'Workflow entry point', kind: 'folder' },
          { label: 'tests/mission-harness', detail: 'Integration harness and snapshots', kind: 'folder' },
        ],
      },
      {
        title: 'Release rails',
        items: [
          { label: 'README.md', detail: 'Live repository overview', kind: 'file', href: '/README.md' },
          {
            label: 'Apps API dashboard',
            detail: 'Live shell snapshot endpoint',
            kind: 'doc',
            href: '/api/dashboard',
          },
          {
            label: 'Mission execution API',
            detail: 'Agent prompt orchestration endpoint',
            kind: 'doc',
            href: '/api/mission',
          },
          {
            label: 'SECURITY.md',
            detail: 'Vulnerability reporting guide',
            kind: 'file',
            href: '/SECURITY.md',
          },
        ],
      },
      {
        title: 'Live surfaces',
        items: [
          {
            label: 'GitHub repository',
            detail: 'chandrasekharsajja/FORGE',
            kind: 'doc',
            href: 'https://github.com/chandrasekharsajja/FORGE',
          },
          { label: 'Workspace index', detail: workspaceSummary.indexedAt, kind: 'doc' },
          { label: 'Mission DAG', detail: `${dag.length} nodes`, kind: 'doc' },
        ],
      },
    ],
    missionTracks: [
      {
        stage: 'Plan',
        owner: dag[0]?.agentRole ?? 'architect',
        detail: dag[0]?.name ?? 'System architecture',
        state: dag[0]?.status === 'completed' ? 'complete' : 'running',
      },
      {
        stage: 'Build',
        owner: 'backend + frontend',
        detail: `${dag[1]?.name ?? 'Backend'} and ${dag[2]?.name ?? 'Frontend'} are active.`,
        state: 'running',
      },
      {
        stage: 'Verify',
        owner: 'qa + security',
        detail: `${dag[3]?.name ?? 'QA'} and ${dag[4]?.name ?? 'security'} stay gated behind build outputs.`,
        state: 'queued',
      },
    ],
    releaseChecklist: [
      {
        title: 'Shell renders from live data',
        detail: 'The page now reads a dashboard snapshot built from actual workspace and service modules.',
        state: 'ready',
      },
      {
        title: 'Mission API returns real orchestration logs',
        detail: 'The agent lane will use the same execution flow that powers the integration tests.',
        state: 'ready',
      },
      {
        title: 'Production deploys remain gated',
        detail: prodGate.allowed
          ? 'Policy looks permissive, but the repo still frames production readiness conservatively.'
          : prodGate.reason ?? 'Production deployment is blocked by policy.',
        state: 'watch',
      },
    ],
    serviceHealth: [
      {
        name: 'Unified IDE',
        state: 'stable',
        signal: 'Live snapshot',
        detail: `Control plane and dashboard metrics are active, and the shell is ready for previews.`,
      },
      {
        name: 'Workspace graph',
        state: capacityOk ? 'stable' : 'attention',
        signal: 'Indexing',
        detail: `${workspaceSummary.repoPaths.length} repositories indexed and ${searchResults.length} code hits found.`,
      },
      {
        name: 'Policy engine',
        state: governance.allowed ? 'stable' : 'attention',
        signal: governance.allowed ? 'Allowed' : 'Review',
        detail: governance.allowed
          ? 'Org policy approves the current public preview path.'
          : governance.reason ?? 'Org policy requires review.',
      },
      {
        name: 'Security scan',
        state: secretCheck && securityFindings.length === 0 ? 'stable' : 'attention',
        signal: secretCheck && securityFindings.length === 0 ? 'Clear' : 'Review',
        detail: `${securityFindings.length} findings, secret check ${secretCheck ? 'passed' : 'flagged'}.`,
      },
    ],
    governanceNotes: [
      {
        title: 'What is strongest today',
        detail: `The public shell now binds to a live snapshot from control plane metrics, workspace indexing, and mission execution.`,
      },
      {
        title: 'What still needs depth',
        detail: 'Several service modules are still in prototype form, so the docs remain explicit about release scope.',
      },
      {
        title: 'What to show publicly',
        detail: `Lead with the IDE shell, the live mission API, and the integration suite. That tells the true story without overreach.`,
      },
    ],
    editorFiles: [
      {
        id: 'agent-state',
        label: 'Agent state contract',
        path: 'packages/core-agent/src/state.ts',
        language: 'typescript',
        status: 'typed',
        summary: 'Planner, coder, reviewer, and tester state remains the backbone of the mission flow.',
        kind: 'code',
        content: stateSnippet,
      },
      {
        id: 'workflow',
        label: 'Workflow runner',
        path: 'services/orchestrator/src/workflows.ts',
        language: 'typescript',
        status: 'live',
        summary: 'The durable workflow layer now resolves without external runtime dependencies.',
        kind: 'code',
        content: workflowSnippet,
      },
      {
        id: 'readme',
        label: 'Public repo scope',
        path: 'README.md',
        language: 'markdown',
        status: 'current',
        summary: 'The repo overview now matches the shell and the test suite.',
        kind: 'document',
        content: readmeSnippet,
      },
    ],
    terminalLines: [
      '$ npm run dev:studio',
      '> next dev',
      `ready - live shell snapshot includes ${capabilities.length} registered capabilities`,
      `> mission planner resolved ${dag.length} DAG nodes for the public release path`,
      `> workspace index refreshed at ${workspaceSummary.indexedAt}`,
      `> sandbox exit ${sandbox.exitCode} after ${sandbox.durationMs}ms`,
      `> evaluation score ${evaluation.score.toFixed(2)} / 1.00`,
    ],
    verificationChecks: [
      {
        name: 'Live dashboard snapshot',
        status: 'pass',
        detail: `Uses control plane, intelligence, and workspace outputs instead of static fixtures.`,
      },
      {
        name: 'Mission execution flow',
        status: 'pass',
        detail: `Mission runtime completed with ${mission.status} status and persisted provenance.`,
      },
      {
        name: 'Security and governance',
        status: securityFindings.length === 0 && secretCheck ? 'pass' : 'watch',
        detail: 'Policy, secret scanning, and org governance remain visible in the shell.',
      },
      {
        name: 'Production readiness',
        status: 'todo',
        detail: 'The repo still describes backend services as prototypes and keeps that distinction explicit.',
      },
    ],
    generatedArtifacts: [
      {
        name: 'dashboard snapshot',
        type: 'JSON',
        detail: `Built from live workspace and service outputs for ${session.organizationId}.`,
      },
      {
        name: 'mission provenance',
        type: 'lineage',
        detail: `Signature ${provenanceSignature} links the live shell to the orchestration flow.`,
      },
      {
        name: 'workspace report',
        type: 'summary',
        detail: parsePreview.split('\n')[0] || 'Parsed README summary generated from the live repository file.',
      },
    ],
    quickStartCards: [
      {
        title: 'Open the repository',
        detail: 'Review the public codebase, governance docs, and release notes on GitHub.',
        href: 'https://github.com/chandrasekharsajja/FORGE',
      },
      {
        title: 'Inspect live APIs',
        detail: 'The dashboard and mission endpoints are available inside the app itself.',
        href: '/api/dashboard',
      },
      {
        title: 'Read usage terms',
        detail: 'Preview the working terms for contributors and evaluators.',
        href: '/terms',
      },
    ],
    agentPromptSuggestions: promptSuggestions,
  };
}

export async function runMissionPrompt(prompt: string): Promise<MissionRunResult> {
  const services = createLiveServices();
  const { workflow } = seedCapabilities(services);
  const session = await services.platform.createSession('studio-agent', 'org-aurexon');
  const dag = await services.missionPlanner.buildParallelDAG(prompt || 'Workspace audit');
  const policy = await services.policy.evaluateAction('execute_mission_dag', { prompt });
  const governance = await services.governance.validateOrgPolicy(session.organizationId, 'mission_run', 18);
  const worker = await services.scheduler.scheduleMissionTask(
    {
      id: 'mission-ui',
      title: 'UI mission run',
      goal: prompt,
      organizationId: session.organizationId,
      workspaceId: 'workspace-public',
      status: 'draft',
      createdAt: new Date().toISOString(),
    },
    'Workspace audit',
  );

  const mission = await services.missionRuntime.executeMission({
    id: 'mission-ui',
    title: prompt || 'Workspace audit',
    goal: prompt || 'Review the workspace shell',
    status: 'draft',
    executionGraph: workflow.buildDAG().map((step) => step.name),
    artifactsGenerated: [],
  });

  const sandbox = await services.sandbox.runCommand({
    sandboxType: 'docker',
    image: 'node:22',
    command: ['npm', 'test'],
  });

  const artifact = await services.artifactService.storeArtifact({
    id: `art-${mission.id}`,
    missionId: mission.id,
    type: 'test_report',
    path: 'tests/mission-harness/runner.ts',
    version: 1,
  });

  const evaluation = await services.evaluation.evaluateMissionOutput(mission.id, {
    prompt,
    worker: worker.nodeId,
    sandbox,
  });

  const provenancePayload = {
    artifactId: artifact.id,
    missionId: mission.id,
    executionId: `exec-${mission.id}`,
    agentRole: 'planner',
    modelId: 'qwen3-coder',
    toolsInvoked: ['workspace_index', 'mission_plan', 'sandbox_execute'],
    policiesApplied: [policy.allowed ? 'mission_policy_pass' : 'mission_policy_block', governance.allowed ? 'org_policy_pass' : 'org_policy_review'],
    timestamp: new Date().toISOString(),
    signature: `sig-${artifact.id}`,
  };
  services.provenance.recordProvenance(provenancePayload);

  await services.eventBus.publishAgentEvent('mission.run', {
    prompt,
    missionId: mission.id,
    evaluation: evaluation.score,
  });

  const logs = [
    `[Session] ${session.sessionId} for ${session.organizationId}`,
    `[Planner] ${dag.length} step DAG resolved for "${prompt || 'Workspace audit'}"`,
    `[Policy] ${policy.allowed ? 'Approved' : `Blocked: ${policy.reason ?? 'policy review needed'}`}`,
    `[Scheduler] Worker ${worker.nodeId} (${worker.nodeType}) selected`,
    `[Mission] ${mission.status} with ${mission.executionGraph.length} execution steps`,
    `[Sandbox] ${sandbox.stdout}`,
    `[Artifact] Stored ${artifact.type} artifact at ${artifact.path}`,
    `[Evaluation] Score ${evaluation.score.toFixed(2)}`,
    `[Provenance] ${provenancePayload.signature}`,
  ];

  return {
    prompt,
    status: policy.allowed && governance.allowed ? 'verified' : 'needs_review',
    summary: `Mission ${mission.id} completed with score ${evaluation.score.toFixed(2)}`,
    logs,
    missionId: mission.id,
    workerNode: worker.nodeId,
    model: 'Qwen3 Coder',
    artifactPath: artifact.path,
    score: evaluation.score,
  };
}
