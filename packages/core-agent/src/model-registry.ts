/**
 * @core-agent/model - Model abstraction and selection layer
 * 
 * Provides unified interface to multiple LLM providers (OpenAI, Anthropic, Gemini, etc.)
 with capability-based routing and fallback strategies.
 */

import { v4 as uuidv4 } from 'uuid';

// CONTRACTS
import type { ModelCapability, ModelProvider, SelectionContext } from '@sajja/contracts';

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'local' | customProvider;
  apiKey?: string; // Should come from environment/secrets manager in production
  baseUrl?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  capabilities: ModelCapability[];
  costPerToken?: { input: number; output: number };
  isActive: boolean;
  priority?: number; // Lower = higher priority when multiple match
}

export class ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();
  private capabilities: Map<string, Set<string>> = new Map(); // capabilityId -> model IDs that support it

  constructor() {
    this.registerDefaultModels();
    console.log('[ModelRegistry] Initialized with default models');
  }

  /** Register a new model configuration */
  registerModel(config: ModelConfig): void {
    const modelId = config.id || `model-${uuidv4()}`;
    this.models.set(modelId, config);
    
    // Index by capability
    for (const cap of config.capabilities) {
      if (!this.capabilities.has(cap)) {
        this.capabilities.set(cap, new Set());
      }
      this.capabilities.get(cap)!.add(modelId);
    }

    console.log(`[Model] Registered model: ${config.name} (${config.provider})`);
  }

  /** Deregister a model */
  deregisterModel(modelId: string): void {
    if (!this.models.has(modelId)) return;
    
    const model = this.models.get(modelId)!;
    this.models.delete(modelId);
    
    // Remove from capability index
    for (const cap of model.capabilities) {
      const set = this.capabilities.get(cap);
      if (set) {
        set.delete(modelId);
        if (set.size === 0) {
          this.capabilities.delete(cap);
        }
      }
    }

    console.log(`[Model] Deregistered model: ${model.name}`);
  }

  /** Find best model matching given context */
  selectBestForTask(context: SelectionContext): ModelConfig | null {
    // Match required capabilities
    const matchingModels: ModelConfig[] = [];
    
    for (const [capabilityId, modelIds] of this.capabilities.entries()) {
      // If context requires this capability AND none of our matching models have it yet, skip all models that don't have it
      if (context.requiredCapabilities?.includes(capabilityId)) {
        for (const modelId of modelIds) {
          const model = this.models.get(modelId);
          if (model && model.isActive) {
            matchingModels.push(model);
          }
        }
      }
    }

    if (matchingModels.length === 0) return null;

    // Sort by priority (lower number = higher priority), then by relevance
    matchingModels.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    // Return first matching active model
    return matchingModels[0];
  }

  /** Get all active models */
  getAllActiveModels(): ModelConfig[] {
    return Array.from(this.models.values()).filter(m => m.isActive);
  }

  /** Get model by ID */
  getModelById(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  /** List all registered models */
  listModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /** Toggle model activation state */
  toggleModelActivation(id: string): void {
    const model = this.models.get(id);
    if (model) {
      model.isActive = !model.isActive;
      console.log(`[Model] ${model.name} is now ${model.isActive ? 'active' : 'inactive'}`);
    }
  }

  /** Update model configuration */
  updateModelConfig(id: string, updates: Partial<Omit<ModelConfig, 'id'>>): void {
    const model = this.models.get(id);
    if (model) {
      // Re-index capabilities if they changed
      if (updates.capabilities && JSON.stringify(updates.capabilities) !== JSON.stringify(model.capabilities)) {
        // Remove old capability index
        for (const cap of model.capabilities) {
          const set = this.capabilities.get(cap);
          if (set) set.delete(id);
        }
        // Add new capability index
        for (const cap of updates.capabilities!) {
          if (!this.capabilities.has(cap)) {
            this.capabilities.set(cap, new Set());
          }
          this.capabilities.get(cap)!.add(id);
        }
      }

      Object.assign(model, updates);
      console.log(`[Model] Updated model config for ${id}`);
    }
  }

  /** Register built-in default models */
  private registerDefaultModels(): void {
    // OpenAI GPT-4o (general purpose)
    this.registerModel({
      id: 'model-gpt4o',
      name: 'GPT-4o',
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      capabilities: ['coding', 'analysis', 'writing'],
      costPerToken: { input: 0.015, output: 0.03 },
      isActive: true,
      priority: 1,
    });

    // Anthropic Claude 3.5 Sonnet (best for code)
    this.registerModel({
      id: 'model-claude35',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      capabilities: ['coding', 'reasoning', 'long_context'],
      costPerToken: { input: 0.008, output: 0.04 },
      isActive: true,
      priority: 2,
    });

    // Google Gemini Pro (balanced)
    this.registerModel({
      id: 'model-gemini-pro',
      name: 'Gemini Pro',
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      capabilities: ['coding', 'multimodal'],
      costPerToken: { input: 0.007, output: 0.02 },
      isActive: true,
      priority: 3,
    });

    // Local Ollama model (for offline/fallback)
    this.registerModel({
      id: 'model-llama3',
      name: 'Llama 3 (Local)',
      provider: 'ollama',
      baseUrl: http://localhost:11434,
      capabilities: ['coding', 'local'],
      costPerToken: { input: 0, output: 0 }, // Free locally
      isActive: true,
      priority: 99, // Last resort
    });
  }
}

// Singleton instance
let instance: ModelRegistry | null = null;

export function createModelRegistry(): ModelRegistry {
  if (!instance) {
    instance = new ModelRegistry();
  }
  return instance;
}

export function getModelRegistry(): ModelRegistry {
  if (!instance) {
    throw new Error('Model registry not initialized. Call createModelRegistry() first.');
  }
  return instance;
}

export default createModelRegistry;