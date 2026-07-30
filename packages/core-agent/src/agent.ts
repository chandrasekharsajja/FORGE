/**
 * @core-agent/agent - Agent state definitions and lifecycle management
 * 
* Defines the core agent interface, state machine, and execution context for autonomous agents.
 */

// CONTRACTS
import type { AgentRole } from '@sajja/contracts';

export interface AgentState {
  role: AgentRole;
  mission?: any;
  currentStep: 'planning' | 'designing' | 'coding' | 'reviewing' | 'testing' | 'verifying' | 'archiving' | 'completed';
  messages: Message[];
  artifacts: Artifact[];
  memoryContext?: Record<string, unknown>;
  status: 'idle' | 'running' | 'paused' | 'failed';
  error?: Error;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  type: 'code' | 'prd' | 'diagram' | 'test_report' | 'spec' | 'architecture';
  title: string;
  description?: string;
  uri: string;
  version: number;
  author: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export class AutonomousAgent {
  private state: AgentState;
  private readonly allowedSteps: Record<AgentRole, string[]> = {
    planner: ['planning', 'designing'],
    coder: ['designing', 'coding'],
    reviewer: ['coding', 'reviewing'],
    tester: ['reviewing', 'testing'],
    archivist: ['testing', 'verifying', 'archiving'],
  };

  constructor(initialRole: AgentRole, initialMission?: any) {
    this.state = {
      role: initialRole,
      mission: initialMission,
      currentStep: 'planning',
      messages: [],
      artifacts: [],
      memoryContext: {},
      status: 'idle',
      error: undefined,
    };
  }

  /** Start executing the agent with a mission */
  async execute(mission: any): Promise<AgentState> {
    this.state.mission = mission;
    this.state.status = 'running';
    this.state.currentStep = 'planning';

    // Initialize with planning step
    await this.runPlanningPhase();

    // Continue through workflow based on capabilities
    if (this.canProceedTo('coding')) {
      await this.runCodingPhase();
    }

    this.state.status = 'completed';
    return this.state;
  }

  /** Run planning phase */
  private async runPlanningPhase(): Promise<void> {
    this.addMessage({
      role: 'system',
      content: `Starting planning phase for mission: ${this.state.mission?.goal}`,
      timestamp: new Date().toISOString(),
    });

    // In production, would call planning engine/LangChain
    console.log(`[Agent ${this.state.role}] Planning: analyzing mission goal`);
    
    // Simulate some processing
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /** Run coding phase */
  private async runCodingPhase(): Promise<void> {
    this.state.currentStep = 'coding';
    this.addMessage({
      role: 'assistant',
      content: 'Beginning code generation phase...',
      timestamp: new Date().toISOString(),
    });

    // Would invoke actual code generation via LLM/tool
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /** Check if agent can proceed to next step based on its role */
  private canProceedTo(nextStep: string): boolean {
    const allowed = this.allowedSteps[this.state.role] || [];
    return allowed.includes(nextStep);
  }

  /** Add message to conversation history */
  private addMessage(msg: Omit<Message, 'id'>): void {
    this.state.messages.push({
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  /** Get current state */
  getState(): AgentState {
    return { ...this.state };
  }

  /** Reset agent to idle state */
  reset(): void {
    this.state = {
      role: this.state.role,
      mission: this.state.mission,
      currentStep: 'planning',
      messages: [],
      artifacts: [],
      memoryContext: {},
      status: 'idle',
      error: undefined,
    };
  }
}

// Export factory functions
export function createPlAgent(mission?: any): AutonomousAgent {
  return new AutonomousAgent('planner', mission);
}

export function createCoder(mission?: any): AutonomousAgent {
  return new AutonomousAgent('coder', mission);
}

export function createReviewer(mission?: any): AutonomousAgent {
  return new AutonomousAgent('reviewer', mission);
}

export function createTester(mission?: any): AutonomousAgent {
  return new AutonomousAgent('tester', mission);
}

export default { createPlAgent, createCoder, createReviewer, createTester };