/**
 * @core-agent/prompt - Prompt templating and context management system
 * 
 * Provides structured prompt templates with variable substitution,
 caching, versioning, and context preservation across agent steps.
 */

import { v4 as uuidv4 } from 'uuid';

// CONTRACTS
import type { MissionContract } from '@sajja/contracts';

export interface PromptTemplate {
  id: string;
  name: string;
  version: number;
  template: string; // String with {{variable}} placeholders
  description?: string;
  role: 'planner' | 'coder' | 'reviewer' | 'tester' | 'system';
  createdAt: string;
  updatedAt?: string;
}

export interface PromptContext {
  mission: MissionContract;
  currentStep: string;
  previousResults?: Record<string, unknown>;
  userVariables?: Record<string, unknown>;
  knowledgeContext?: Record<string, unknown>;
}

export class PromptEngine {
  private templates: Map<string, PromptTemplate> = new Map();
  private cache: Map<string, string> = new Map(); // Rendered prompts keyed by context hash

  constructor() {
    this.registerBuiltinTemplates();
    console.log('[PromptEngine] Initialized with built-in templates');
  }

  /** Register a custom prompt template */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    console.log(`[Prompt] Registered template: ${template.name} (v${template.version})`);
  }

  /** Get a template by ID */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /** List all registered templates */
  listTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /** Render prompt template with context variables */
  async render(templateId: string, context: PromptContext): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Generate context hash for caching
    const contextHash = this.contextHash(context);
    
    // Check cache first
    if (this.cache.has(contextHash)) {
      console.log('[Prompt] Cache hit for context hash:', contextHash.substring(0, 16));
      return this.cache.get(contextHash)!;
    }

    // Substitute variables in template
    let rendered = template.template;

    // Replace known system variables
    rendered = rendered.replace(/{{mission\.id}}/g, context.mission.id || '');
    rendered = rendered.replace(/{{mission\.goal}}/g, context.mission.goal || '');
    rendered = rendered.replace(/{{mission\.title}}/g, context.mission.title || '');
    rendered = rendered.replace(/{{mission\.organizationId}}/g, context.mission.organizationId || '');
    rendered = rendered.replace(/{{mission\.status}}/g, context.mission.status || '');

    // Replace user-provided variables
    if (context.userVariables) {
      for (const [key, value] of Object.entries(context.userVariables)) {
        rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), String(value));
      }
    }

    // Include knowledge context if available
    if (context.knowledgeContext) {
      for (const [key, value] of Object.entries(context.knowledgeContext)) {
        rendered = rendered.replace(new RegExp(`{{\\s*knowledge\\.${key}\\s*}}`, 'gi'), JSON.stringify(value));
      }
    }

    // Store in cache (LRU-like with max size 100)
    if (this.cache.size >= 100) {
      // Remove oldest entries (simple implementation)
      const iter = this.cache.keys();
      const oldKey = iter.next().value;
      this.cache.delete(oldKey);
    }
    this.cache.set(contextHash, rendered);

    console.log(`[Prompt] Rendered template '${template.name}' (v${template.version})`);
    return rendered;
  }

  /** Generate execution plan based on prompt template */
  generatePlanFromPrompt(promptTemplateId: string, context: PromptContext): Promise<string[]> {
    // This would integrate with planning engine in future
    // For now, returns static plan based on role
    const role = context?.role || 'planner';
    switch (role) {
      case 'planner': return ['Analyze requirements', 'Create task breakdown', 'Identify dependencies'];
      case 'coder': return ['Review design', 'Write initial implementation', 'Add comments'];
      case 'reviewer': return['Perform code review', 'Check quality metrics', 'Provide feedback'];
      case 'tester': return['Create test suite', 'Execute tests', 'Report results'];
      default: return ['Initialize task', 'Gather context', 'Begin processing'];
    }
  }

  /** Context hashing function for prompt rendering cache */
  private contextHash(context: PromptContext): string {
    const parts = [
      context.mission.id,
      context.currentStep,
      Object.entries(context.userVariables || {}).map(([k, v]) => `${k}:${v}`).join('|'),
      Object.entries(context.knowledgeContext || {}).map(([k, v]) => `${k}:${v}`).join('|'),
    ].join('||');
    return `ctx-${uuidv4()}-${parts}`; // Simple hash (would use proper hash function in production)
  }

  /** Load templates from configuration file (future implementation) */
  async loadFromFile(filepath: string): Promise<void> {
    // TODO: Implement template loading from JSON/YAML files
    console.warn('[PromptEngine] Template loading from file not yet implemented');
  }
}

// Singleton instance
let instance: PromptEngine | null = null;

export function createPromptEngine(): PromptEngine {
  if (!instance) {
    instance = new PromptEngine();
  }
  return instance;
}

export function getPromptEngine(): PromptEngine {
  if (!instance) {
    throw new Error('Prompt engine not initialized. Call createPromptEngine() first.');
  }
  return instance;
}

// Built-in templates registration (these would be loaded from config in production)
PromptEngine.prototype.registerBuiltinTemplates = function() {
  // Planner template
  this.registerTemplate({
    id: 'tpl-planner-v1',
    name: 'Mission Planner Template',
    version: 1,
    template: "Analyze the following mission goal: {{mission.goal}}. Break it down into actionable tasks considering organization constraints {{mission.organizationId}}. Consider potential risks and dependencies.",
    description: 'Template used by planning agent to break down mission goals',
    role: 'planner',
    createdAt: new Date().toISOString(),
  });

  // Coder template
  this.registerTemplate({
    id: 'tpl-coder-v1',
    name: 'Code Generation Template',
    version: 1,
    template: "Generate code implementation for: {{mission.title}}. Goal: {{mission.goal}}. Requirements include organization constraints: {{mission.organizationId}}. Follow best practices and add appropriate error handling.",
    description: 'Template used by coding agent to implement mission tasks',
    role: 'coder',
    createdAt: new Date().toISOString(),
  });

  // Reviewer template
  this.registerTemplate({
    id: 'tpl-reviewer-v1',
    name: 'Code Review Template',
    version: 1,
    template: "Review the generated code for mission: {{mission.title}}. Check against requirements: {{mission.goal}}. Ensure adherence to organization standards: {{mission.organizationId}}. Provide constructive feedback.",
    description: 'Template used by reviewer agent for quality assurance',
    role: 'reviewer',
    createdAt: new Date().toISOString(),
  });

  // Tester template
  this.registerTemplate({
    id: 'tpl-tester-v1',
    name: 'Testing Template',
    version: 1,
    template: "Design and execute tests for mission implementation: {{mission.title}}. Validate against requirements: {{mission.goal}}. Check coverage for organization-specific concerns: {{mission.organizationId}}. Report any issues found.",
    description: 'Template used by testing agent to create verification suites',
    role: 'tester',
    createdAt: new Date().toISOString(),
  });
};

export default createPromptEngine;