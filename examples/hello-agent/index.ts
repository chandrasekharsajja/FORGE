import { createAgent } from '@platform/sdk-agent';

export const customArchitectAgent = createAgent({
  role: 'architect',
  systemPrompt: 'You are an enterprise software architect. Generate clean, modular system designs.',
  allowedTools: ['tree_sitter_parse', 'vector_search'],
  supportedModels: ['qwen3-coder', 'claude-3-5-sonnet']
});

console.log(`[Example] Initialized hello-agent example with role: ${customArchitectAgent.role}`);
