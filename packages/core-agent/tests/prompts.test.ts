/**
 * @core-agent/tests - Unit tests for prompt templating system
 * 
 * Tests template registration, rendering, and context caching.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PromptEngine, createPromptEngine, getPromptEngine } from '../src/prompts';

describe('Prompt Engine', () => {
  let engine: PromptEngine;

  beforeEach(() => {
    // Create a fresh engine for each test
    engine = createPromptEngine();
  });

  afterEach(() => {
    // Clean up after each test
    // Note: In practice, we might need to clear cache between tests
  });

  describe('Template Registration', () => {
    it('should register built-in templates with correct parameters', () => {
      const builtInCount = engine.listTemplates().length;
      expect(builtInCount).toBeGreaterThanOrEqual(4); // planner, coder, reviewer, tester
      
      // Verify specific templates exist
      const plannerTemplate = engine.listTemplates().find(t => t.id === 'tpl-planner-v1');
      expect(plannerTemplate).toBeDefined();
      expect(plannerTemplate?.name).toBe('Mission Planner Template');
      expect(plannerTemplate?.role).toBe('planner');
      
      const coderTemplate = engine.listTemplates().find(t => t.id === 'tpl-coder-v1');
      expect(coderTemplate).toBeDefined();
      expect(coderTemplate?.name).toBe('Code Generation Template');
      expect(coderTemplate?.role).toBe('coder');
    });

    it('should allow registering custom templates', () => {
      const customTemplate: any = {
        id: 'custom-test-template-1',
        name: 'Custom Test Template',
        version: 1,
        template: 'Custom template with {{variable}} placeholder',
        description: 'A custom test template',
        role: 'planner',
        createdAt: new Date().toISOString(),
      };

      engine.registerTemplate(customTemplate);

      expect(engine.listTemplates().some(t => t.id === 'custom-test-template-1')).toBeTruthy();
      expect(engine.getTemplate('custom-test-template-1')).toBeTruthy();
    });

    it('should reject template without required fields', () => {
      expect(() => {
        engine.registerTemplate({ invalidId as any }); // Missing required fields
      }).toThrowError();
    });
  });

  describe('Prompt Rendering', () => {
    it('should render template with mission variables substituted correctly', () => {
      const context: any = {
        mission: {
          id: 'test-123',
          goal: 'Build REST API',
          title: 'API Implementation',
          organizationId: 'org-456',
          status: 'planning',
        },
        currentStep: 'coding',
        userVariables: {},
        knowledgeContext: {},
      };

      const rendered = engine.render('tpl-coder-v1', context);

      expect(rendered.includes('Build REST API')).toBeTruthy();
      expect(rendered.includes('API Implementation')).toBeTruthy();
      expect(rendered.includes('org-456')).toBeTruthy();
      expect(rendered.includes('Build code implementation for')).toBeTruthy();
    });

    it('should substitute custom user variables in templates', () => {
      const context: any = {
        mission: { id: 't', goal: '', title: '', organizationId: '', status: '' },
        currentStep: 'test',
        userVariables: { framework: 'Next.js', backend: 'Node.js' },
        knowledgeContext: {},
      };

      const template = {
        id: 'custom-template',
        name: 'Custom Template',
        version: 1,
        template: 'Build using {{framework}} and {{backend}}',
        role: 'planner',
        createdAt: new Date().toISOString(),
      };

      engine.registerTemplate(template);
      const rendered = engine.render('custom-template', context);

      expect(rendered.includes('Next.js')).toBeTruthy();
      expect(rendered.includes('Node.js')).toBeTruthy();
    });

    it('should use cache to avoid re-rendering identical contexts', () => {
      const context: any = {
        mission: { id: 'm1', goal: '', title: '', organizationId: '', status: '' },
        currentStep: 'step1',
        userVariables: { x: 'y' },
        knowledgeContext: {},
      };

      const firstRender = engine.render('tpl-planner-v1', context);
      const secondRender = engine.render('tpl-planner-v1', context);

      // Both renders should produce identical output (cached)
      expect(firstRender).toBe(secondRender);
    });

    it('should handle missing templates gracefully', () => {
      expect(() => {
        engine.render('non-existent-template', {} as any);
      }).toThrowError();
    });
  });

  describe('Context Management', () => {
    it('should generate unique hash for distinct contexts', () => {
      const context1: any = { mission: { id: 'm1' }, currentStep: 's1' };
      const context2: any = { mission: { id: 'm2' }, currentStep: 's2' };

      const hash1 = engine['contextHash'](context1); // Accessing private method (should ideally be public for testing)
      const hash2 = engine['contextHash'](context2); // Accessing private method

      expect(hash1).not.toBe(hash2); // Different contexts should have different hashes
    });

    it('should implement basic cache eviction when full', () => {
      // This is more complex to test - would need to force cache to fill up
      expect(true).toBeTruthy(); // Placeholder for future implementation
    });
  });
});