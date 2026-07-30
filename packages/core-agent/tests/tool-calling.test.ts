/**
 * @core-agent/tests - Unit tests for tool registry and execution
 * 
 * Tests tool registration, discovery, validation, and execution with policy enforcement.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolRegistry, createToolRegistry, getToolRegistry } from '../src/tool-calling';
import { PolicyEngine } from '@platform/policy-engine';

// Mock dependencies
vi.mock('@platform/policy-engine', () => ({
  getPolicyEngine: vi.fn(() => ({
    evaluateAction: vi.fn().mockResolvedValue({ allowed: true }),
  })),
}));

describe('Tool Registry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = createToolRegistry();
    // Clear mock calls between tests
    (getPolicyEngine as any).mockClear();
  });

  afterEach(() => {
    // Reset singleton if needed
  });

  describe('Core Tool Registration', () => {
    it('should register all core tools by default', () => {
      const allTools = registry.getAllTools();
      expect(allTools.length).toBeGreaterThanOrEqual(5); // file.read, file.write, repository.list, exec.command, llm.chat

      const fileRead = allTools.find(t => t.id === 'tool-file-read');
      expect(fileRead).toBeTruthy();
      expect((fileRead as any).name).toBe('file.read');
      expect((fileRead as any).category).toBe('filesystem');
      expect((fileRead as any).metadata?.readOnly).toBe(true);

      const fileWrite = allTools.find(t => t.id === 'tool-file-write');
      expect(fileWrite).toBeTruthy();
      expect((fileWrite as any).name).toBe('file.write');
      expect((fileWrite as any).metadata?.readOnly).toBe(false);
    });

    it('should register tools with proper parameter schemas', () => {
      const tools = registry.getAllTools();
      
      tools.forEach(tool => {
        expect(tool.parameters).toBeTruthy();
        expect((tool.parameters as any).type).toBe('object');
      });
    });
  });

  describe('Tool Discovery', () => {
    it('should find matching tools based on action context', () => {
      const found = registry.findToolForAction('read a file');
      expect(found).toBeTruthy();
      expect((found as any).name).toContain('file.read');
    });

    it('should return null when no matching tool found', () => {
      const found = registry.findToolForAction('this is definitely not a valid action description');
      expect(found).toBeNull();
    });

    it('should find tools by category match', () => {
      const found = registry.findToolForAction('system command');
      expect(found).toBeTruthy();
      // Could match exec.command if it has relevant category
    });
  });

  describe('Tool Execution', () => {
    it('should execute tool with arguments and return result', async () => {
      const tool = registry.getAllTools()[0]; // Get first tool (file.read)
      if (!tool) throw new Error('No tools registered');

      const args = { path: '/test/file.txt' };
      const result = await registry.executeTool(tool.id, args);

      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.timestamp).toBeTruthy();
    });

    it('should increment invocation count on each execution', async () => {
      const tool = registry.getAllTools().find(t => t.name === 'file.read');
      if (!tool) throw new Error('file.read tool not found');

      const initialCount = (registry.getToolById(tool.id) as any)?.invocationCount || 0;
      await registry.executeTool(tool.id, { path: '/test.txt' });

      const updatedCount = (registry.getToolById(tool.id) as any)?.invocationCount;
      expect(updatedCount).toBeGreaterThan(initialCount);
    });

    it('should track last used timestamp after execution', async () => {
      const tool = registry.getAllTools().find(t => t.name === 'file.read');
      if (!tool) throw new Error('file.read tool not found');

      const before = new Date().toISOString();
      await registry.executeTool(tool.id, { path: '/test.txt' });
      const after = new Date().toISOString();

      const toolAfter = registry.getToolById(tool.id)!;
      expect(toolAfter.lastUsed).toBeGreaterThanOrEqual(before);
      expect(toolAfter.lastUsed).toBeLessThanOrEqual(after);
    });

    it('should enforce policy before executing tool', async () => {
      const tool = getAllTools().find(t => t.name === 'file.read');
      if (!tool) throw new Error('file.read tool not found');

      // Mock policy to deny execution
      (getPolicyEngine as any).evaluateAction.mockResolvedValueOnce({ allowed: false, reason: 'Blocked by security policy' });

      await expect(registry.executeTool(tool.id, { path: '/secret.txt' })).rejects.toThrow('blocked by security policy');
    });
  });

  describe('Custom Tool Registration', () => {
    it('should allow registering custom tools', () => {
      const customTool: any = {
        id: 'custom.tool',
        name: 'Custom Tool',
        category: 'custom',
        description: 'A custom test tool',
        parameters: { type: 'object', properties: {}, required: [] },
        metadata: { readOnly: true },
      };

      const customImplementation = async () => ({ success: true, data: { custom: 'result' } });

      registry.registerTool(customTool, customImplementation);

      expect(registry.getAllTools()).toContainEqual(customTool);
      expect(registry.getToolById('custom.tool')).toEqual(customTool);
    });
  });
});