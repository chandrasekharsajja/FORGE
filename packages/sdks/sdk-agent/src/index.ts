export function createAgent(config: {
  role: string;
  systemPrompt: string;
  allowedTools: string[];
  supportedModels: string[];
}) {
  return {
    role: config.role,
    systemPrompt: config.systemPrompt,
    tools: config.allowedTools,
    models: config.supportedModels,
    executeStep: async (context: any) => {
      console.log(`[Agent SDK] Executing step for role ${config.role}...`);
      return { status: 'success', thought: `[${config.role}]: Step executed.` };
    }
  };
}
