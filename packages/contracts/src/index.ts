export interface MissionContract {
  id: string;
  title: string;
  goal: string;
  organizationId: string;
  workspaceId: string;
  status: 'draft' | 'planning' | 'scheduled' | 'executing' | 'verifying' | 'completed' | 'failed';
  createdAt: string;
}

export interface AgentContract {
  role: string;
  capabilities: string[];
  supportedModels: string[];
  permissions: string[];
}

export interface ToolContract {
  name: string;
  version: string;
  schema: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<any>;
}

export interface PolicyContract {
  ruleId: string;
  actionPattern: string;
  enforce: (context: any) => Promise<{ allowed: boolean; reason?: string }>;
}

export interface ArtifactContract {
  id: string;
  missionId: string;
  type: 'code' | 'architecture' | 'prd' | 'diagram' | 'test_report';
  version: number;
  uri: string;
}
