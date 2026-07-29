export interface AgentState {
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

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'tester';

export interface AgentAction {
  role: AgentRole;
  thought: string;
  toolCall?: {
    name: string;
    arguments: Record<string, any>;
  };
}
