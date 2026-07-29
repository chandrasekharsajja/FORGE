export class AgentRegistry {
  private registeredAgents = new Map<string, any>();

  registerAgent(role: string, agentDefinition: any) {
    this.registeredAgents.set(role, agentDefinition);
    console.log(`[Agent Registry] Dynamically registered agent plugin for role: ${role}`);
  }

  getAgent(role: string) {
    return this.registeredAgents.get(role);
  }
}
