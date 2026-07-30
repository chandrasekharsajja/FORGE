/**
 * @core-agent/tool - Unified tool calling framework for agents
 * 
 * Enables agents to discover, select, and execute tools with automatic
 parameter validation, type safety, and result formatting.
 */

import { v4 as uuidv4 } from 'uuid';

// CONTRACTS
import type { ToolDefinition, ToolExecutionResult } from '@sajja/contracts';
import { getMemoryService } from '@platform/memory-service';
import { getPolicyEngine } from '@platform/policy-engine';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: string;
  agentRole: AgentRole;
}

export interface ToolRegistryItem {
  definition: ToolDefinition;
  implementation: (...args: unknown[]) => Promise<ToolExecutionResult>;
  lastUsed?: string;
  invocationCount: number;
}

export class ToolRegistry {
  private tools: Map<string, ToolRegistryItem> = new Map();

  constructor() {
    this.registerCoreTools();
    console.log('[ToolRegistry] Initialized with core tools');
  }

  /** Register a new tool */
  registerTool(definition: ToolDefinition, implementation: (...args: unknown[]) => Promise<ToolExecutionResult>): void {
    const toolId = definition.id || `tool-${uuidv4()}`;
    
    // Validate required fields
    if (!definition.name) {
      throw new Error('Tool must have a name');
    }
    if (!definition.description) {
      throw new Error('Tool must have a description');
    }

    this.tools.set(toolId, {
      definition,
      implementation,
      invocationCount: 0,
      lastUsed: undefined,
    });

    console.log(`[Tool] Registered tool: ${definition.name} (${definition.category})`);
  }

  /** Deregister a tool */
  deregisterTool(toolId: string): void {
    if (this.tools.delete(toolId)) {
      console.log(`[Tool] Deregistered tool: ${toolId}`);
    }
  }

  /** Get all registered tools */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /** Get tool by ID */
  getToolById(toolId: string): ToolDefinition | undefined {
    const tool = this.tools.get(toolId);
    return tool ? tool.definition : undefined;
  }

  /** Find best matching tool based on request context */
  findToolForAction(context: string, capabilities?: string[]): ToolDefinition | null {
    const tools = this.getAllTools();
    
    // Simple heuristic: match tool name or description to context
    const matching = tools.filter(t => 
      context.toLowerCase().includes(t.name.toLowerCase()) ||
      (t.category && context.toLowerCase().includes(t.category.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(context.toLowerCase()))
    );
    
    if (matching.length === 0) return null;
    
    // Prefer first matching tool (could add more sophisticated scoring later)
    return matching[0];
  }

  /** Execute a tool with its arguments */
  async executeTool(toolId: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // Increment invocation count
    tool.invocationCount++;
    tool.lastUsed = new Date().toISOString();

    // Check policy before execution (enforce security gates)
    const policy = getPolicyEngine();
    const actionName = `execute_tool_${toolId}`;
    const policyResult = await policy.evaluateAction(actionName, {
      organizationId: tool.definition.metadata?.organizationId || '',
      workspaceId: tool.definition.metadata?.workspaceId || '',
    });

    if (!policyResult.allowed) {
      throw new Error(`Tool execution blocked by policy: ${policyResult.reason}`);
    }

    try {
      console.log(`[Tool] Executing tool: ${tool.definition.name} with args:`, JSON.stringify(args));
      const result = await tool.implementation(args);
      
      // Record outcome
      tool.definition.lastExecuted = new Date().toISOString();
      tool.definition.lastResult = result.success ? 'success' : 'failure';

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[Tool] Execution failed for ${tool.definition.name}:`, err.message);
      
      tool.definition.lastExecuted = new Date().toISOString();
      tool.definition.lastResult = 'error';
      
      throw new Error(`Tool execution failed: ${err.message}`);
    }
  }

  /** Register built-in core tools */
  private registerCoreTools(): void {
    // File system read tool
    this.registerTool({
      id: 'tool-file-read',
      name: 'file.read',
      category: 'filesystem',
      description: 'Read file content from the workspace',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' },
        },
        required: ['path'],
      },
      metadata: { category: 'filesystem', readOnly: true },
    }, async ({ path }: { path: string }) => {
      // Implementation would use file system abstraction layer
      // For now, simulate reading a file
      return {
        success: true,
        data: { path, content: `// Content of ${path}\n// This is simulated file content from FORGE agent`, size: 1024 },
      };
    });

    // File system write tool
    this.registerTool({
      id: 'tool-file-write',
      name: 'file.write',
      category: 'filesystem',
      description: 'Write content to a file in the workspace',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write to' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
      metadata: { category: 'filesystem', readOnly: false },
    }, async ({ path, content }: { path: string; content: string }) => {
      return {
        success: true,
        data: { path, bytesWritten: content.length },
      };
    });

    // Repository list tool
    this.registerTool({
      id: 'tool-repo-list',
      name: 'repository.list',
      category: 'version-control',
      description: 'List repositories in current workspace',
      parameters: {
        type: 'object',
        properties: {},
      },
      metadata: { category: 'version-control', readOnly: true },
    }, async () => {
      // Implementation would query workspace service
      return {
        success: true,
        data: { repos: [{ name: 'core', url: 'git://forge-core', branch: 'main' }] },
      };
    });

    // Terminal exec tool
    this.registerTool({
      id: 'tool-exec',
      name: 'exec.command',
      category: 'terminal',
      description: 'Execute shell command in workspace terminal',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
        },
        required: ['command'],
      },
      metadata: { category: 'terminal', readOnly: false },
    }, async ({ command }: { command: string }) => {
      // In production, this would call Dockerode or similar for sandboxed execution
      return {
        success: true,
        data: { output: `Executing: ${command}\nCommand completed successfully`, statusCode: 0 },
      };
    });

    // LLM chat tool
    this.registerTool({
      id: 'tool-llm-chat',
      name: 'llm.chat',
      category: 'ai',
      description: 'Send message to configured LLM model',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Prompt message' },
          model: { type: 'string', description: 'Model ID to use (optional)' },
        },
        required: ['message'],
      },
      metadata: { category: 'ai', readOnly: true },
    }, async ({ message, model }: { message: string; model?: string }) => {
      // Would integrate with model registry and actual LLM API calls
      return {
        success: true,
        data: { response: `LLM response to: "${message}" (simulated)`, modelUsed: model || 'default' },
      };
    });
  }
}

// Singleton instance
let instance: ToolRegistry | null = null;

export function createToolRegistry(): ToolRegistry {
  if (!instance) {
    instance = new ToolRegistry();
  }
  return instance;
}

export function getToolRegistry(): ToolRegistry {
  if (!instance) {
    throw new Error('Tool registry not initialized. Call createToolRegistry() first.');
  }
  return instance;
}

export default createToolRegistry;