export interface ModelDescriptor {
  id: string;
  name: string;
  provider: string;
  capabilities: ('coding' | 'reasoning' | 'vision' | 'planning' | 'embedding')[];
}

export class ModelRegistry {
  private models: ModelDescriptor[] = [
    { id: 'qwen3-coder', name: 'Qwen3 Coder', provider: 'vLLM', capabilities: ['coding', 'reasoning'] },
    { id: 'qwen-agent-world', name: 'Qwen AgentWorld', provider: 'vLLM', capabilities: ['planning', 'reasoning'] }
  ];

  selectBestModelForTask(capability: 'coding' | 'reasoning' | 'vision' | 'planning'): ModelDescriptor | undefined {
    return this.models.find(m => m.capabilities.includes(capability));
  }
}
