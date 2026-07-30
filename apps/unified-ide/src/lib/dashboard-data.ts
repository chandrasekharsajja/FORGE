export type NodeKind = 'folder' | 'file' | 'doc';
export type HealthState = 'stable' | 'attention' | 'prototype';
export type ReleaseState = 'ready' | 'watch' | 'blocked';
export type RunState = 'complete' | 'running' | 'queued';

export interface ExplorerItem {
  label: string;
  detail: string;
  kind: NodeKind;
  href?: string;
}

export interface ExplorerSection {
  title: string;
  items: ExplorerItem[];
}

export interface OverviewStat {
  label: string;
  value: string;
  caption: string;
}

export interface MissionTrack {
  stage: string;
  owner: string;
  detail: string;
  state: RunState;
}

export interface ReleaseCheck {
  title: string;
  detail: string;
  state: ReleaseState;
}

export interface ServiceHealth {
  name: string;
  state: HealthState;
  signal: string;
  detail: string;
}

export interface GovernanceNote {
  title: string;
  detail: string;
}

export interface EditorFile {
  id: string;
  label: string;
  path: string;
  language: string;
  status: string;
  summary: string;
  kind: 'code' | 'document';
  content: string;
}

export interface VerificationCheck {
  name: string;
  status: 'pass' | 'watch' | 'todo';
  detail: string;
}

export interface ArtifactCard {
  name: string;
  type: string;
  detail: string;
}

export interface QuickStartCard {
  title: string;
  detail: string;
  href: string;
}

export const overviewStats: OverviewStat[] = [
  {
    label: 'Public repo posture',
    value: 'Clear',
    caption: 'Docs, legal pages, and app shell now align with what ships in the repo.',
  },
  {
    label: 'Reference scenarios',
    value: '10 flows',
    caption: 'Narrative mission runs cover auth, CRUD, payments, browser work, and multi-repo tasks.',
  },
  {
    label: 'Active focus',
    value: 'UI shell',
    caption: 'The most concrete artifact in the repo is the unified IDE workspace experience.',
  },
];

export const explorerSections: ExplorerSection[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'apps/unified-ide', detail: 'Public mission cockpit', kind: 'folder' },
      { label: 'packages/contracts', detail: 'Shared contracts', kind: 'folder' },
      { label: 'services/orchestrator', detail: 'Temporal workflow entry point', kind: 'folder' },
      { label: 'tests/mission-harness', detail: 'Golden mission harness', kind: 'folder' },
    ],
  },
  {
    title: 'Release rails',
    items: [
      {
        label: 'README.md',
        detail: 'Public-facing scope and quick start',
        kind: 'file',
        href: 'https://github.com/chandrasekharsajja/FORGE/blob/main/README.md',
      },
      {
        label: 'Docs/governance/release-policy.md',
        detail: 'Release policy and gates',
        kind: 'doc',
        href: 'https://github.com/chandrasekharsajja/FORGE/blob/main/Docs/governance/release-policy.md',
      },
      {
        label: 'SECURITY.md',
        detail: 'Vulnerability reporting',
        kind: 'file',
        href: 'https://github.com/chandrasekharsajja/FORGE/blob/main/SECURITY.md',
      },
    ],
  },
  {
    title: 'Public links',
    items: [
      {
        label: 'GitHub repository',
        detail: 'chandrasekharsajja/FORGE',
        kind: 'doc',
        href: 'https://github.com/chandrasekharsajja/FORGE',
      },
      { label: 'Privacy', detail: 'Workspace privacy notes', kind: 'doc', href: '/privacy' },
      { label: 'Terms', detail: 'Preview usage terms', kind: 'doc', href: '/terms' },
    ],
  },
];

export const missionTracks: MissionTrack[] = [
  {
    stage: 'Triage',
    owner: 'Platform reviewer',
    detail: 'Audit the repo surface and identify the parts that are real versus aspirational.',
    state: 'complete',
  },
  {
    stage: 'Shell hardening',
    owner: 'Frontend systems',
    detail: 'Ship a public-facing IDE shell with honest copy, accessibility, and usable states.',
    state: 'running',
  },
  {
    stage: 'Validation',
    owner: 'Release lane',
    detail: 'Run the narrative reference scenarios and verify no docs or package scripts drifted.',
    state: 'queued',
  },
];

export const releaseChecklist: ReleaseCheck[] = [
  {
    title: 'Interactive panels use Next client boundaries correctly',
    detail: 'The old mock used hooks inside server components. The shell now separates client state cleanly.',
    state: 'ready',
  },
  {
    title: 'Public docs match delivered scope',
    detail: 'The repo now states that the app shell is the strongest artifact and the services are prototypes.',
    state: 'ready',
  },
  {
    title: 'Backend services remain prototype-grade',
    detail: 'Most services still model architecture more than runtime behavior and should be presented that way.',
    state: 'watch',
  },
];

export const serviceHealth: ServiceHealth[] = [
  {
    name: 'Unified IDE',
    state: 'stable',
    signal: 'Ready for demos',
    detail: 'Interactive shell, editor, run lane, legal pages, and release framing are in place.',
  },
  {
    name: 'Mission runtime',
    state: 'prototype',
    signal: 'Reference logic',
    detail: 'The runtime packages describe orchestration flow but do not yet back a live distributed system.',
  },
  {
    name: 'Policy engine',
    state: 'attention',
    signal: 'Scenario-driven',
    detail: 'Policy checks exist in service primitives and tests, but not as a production policy service.',
  },
  {
    name: 'Memory and knowledge services',
    state: 'prototype',
    signal: 'Interface stage',
    detail: 'The abstractions are useful for product design, but persistence and retrieval remain skeletal.',
  },
];

export const governanceNotes: GovernanceNote[] = [
  {
    title: 'What is solid today',
    detail: 'The repo tells a coherent product story through a polished shell, reference scenarios, and governance docs.',
  },
  {
    title: 'What still needs implementation',
    detail: 'Most service packages need real adapters, transport, persistence, and error handling before they can claim production readiness.',
  },
  {
    title: 'What to show publicly',
    detail: 'Lead with the IDE shell, the scenario suite, and the architectural contracts. Frame the rest as the next build-out layer.',
  },
];

export const editorFiles: EditorFile[] = [
  {
    id: 'agent-state',
    label: 'Agent state contract',
    path: 'packages/core-agent/src/state.ts',
    language: 'typescript',
    status: 'typed',
    summary: 'Planner, coder, reviewer, and tester state remains the backbone of the mission flow.',
    kind: 'code',
    content: `export interface AgentState {
  taskId: string;
  userPrompt: string;
  plan: string[];
  currentStepIndex: number;
  thoughtStream: string[];
  codeEdits: Array<{
    filePath: string;
    diffContent: string;
    status: 'pending' | 'accepted' | 'rejected';
  }>;
  terminalLogs: string[];
  isCompleted: boolean;
}

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'tester';`,
  },
  {
    id: 'workflow',
    label: 'Durable workflow entry',
    path: 'services/orchestrator/src/workflows.ts',
    language: 'typescript',
    status: 'prototype',
    summary: 'The workflow layer still reads as a platform stub, which is why the public app now speaks plainly about scope.',
    kind: 'code',
    content: `import { proxyActivities } from '@temporalio/workflow';

interface AgentWorkflowInput {
  taskId: string;
  userPrompt: string;
}

const activities = proxyActivities({
  startToCloseTimeout: '1 hour',
});

export async function executeAgentTaskWorkflow(
  input: AgentWorkflowInput,
): Promise<string> {
  console.log(\`[Workflow] Starting durable agent task \${input.taskId}\`);
  return \`Task \${input.taskId} executed successfully.\`;
}`,
  },
  {
    id: 'public-scope',
    label: 'Public repo scope',
    path: 'README.md',
    language: 'markdown',
    status: 'current',
    summary: 'The README now clearly separates the polished shell from the prototype service layer.',
    kind: 'document',
    content: `## Current state

As of July 29, 2026, FORGE is best understood as a strong product shell plus
architectural scaffolding. It is not yet a fully operational multi-service
platform.

- apps/unified-ide is the most complete surface and is the best place to start
- packages/* and services/* are mostly lightweight primitives, contracts, and stubs
- test-*.js scripts are narrative reference implementations`,
  },
];

export const terminalLines = [
  '$ npm run dev:studio',
  '> next dev',
  'ready - local shell mounted at http://localhost:3000',
  '$ npm test',
  'PASS reference scenario suite (10 of 10 narrative flows)',
  '$ git status',
  'modified: apps/unified-ide/*, README.md, CONTRIBUTING.md, package.json',
];

export const verificationChecks: VerificationCheck[] = [
  {
    name: 'Client component boundaries',
    status: 'pass',
    detail: 'Interactive panels explicitly opt into client execution for App Router compatibility.',
  },
  {
    name: 'Accessibility coverage',
    status: 'pass',
    detail: 'Skip link, focus rings, semantic landmarks, and keyboard-safe controls are in the shell.',
  },
  {
    name: 'Prototype service honesty',
    status: 'watch',
    detail: 'Docs now state the truth, but the service layer still needs real implementations.',
  },
  {
    name: 'Deployment docs',
    status: 'todo',
    detail: 'A production deployment guide for the studio app is still missing.',
  },
];

export const generatedArtifacts: ArtifactCard[] = [
  {
    name: 'Public shell',
    type: 'Next.js app',
    detail: 'A responsive mission cockpit with editor, run lane, release board, and legal pages.',
  },
  {
    name: 'Scope-aligned README',
    type: 'Documentation',
    detail: 'Quick start and expectations now match what a public visitor will actually find.',
  },
  {
    name: 'Workspace scripts',
    type: 'Monorepo tooling',
    detail: 'Root scripts now expose dev, build, and start commands for the studio package.',
  },
];

export const quickStartCards: QuickStartCard[] = [
  {
    title: 'Open the repository',
    detail: 'Review the public codebase, governance docs, and release notes on GitHub.',
    href: 'https://github.com/chandrasekharsajja/FORGE',
  },
  {
    title: 'Check privacy',
    detail: 'See how the demo shell frames local prompts, logs, and repository data.',
    href: '/privacy',
  },
  {
    title: 'Read usage terms',
    detail: 'Preview the working terms for contributors and evaluators.',
    href: '/terms',
  },
];

export const agentPromptSuggestions = [
  'Audit this release for production risks',
  'Stage a safer README for public visitors',
  'Review the mission runtime contract surface',
];
