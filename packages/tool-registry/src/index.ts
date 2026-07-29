export class ToolRegistry {
  private tools = new Map<string, any>();

  registerTool(name: string, tool: any) {
    this.tools.set(name, tool);
    console.log(`[Tool Registry] Registered shared system/MCP tool: ${name}`);
  }

  getTool(name: string) {
    return this.tools.get(name);
  }
}
