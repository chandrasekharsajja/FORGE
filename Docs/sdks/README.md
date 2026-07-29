# Developer SDK Suite Documentation

Welcome to the **AI Engineering Operating System Developer SDK** documentation.

## SDK Packages

- **`@platform/sdk-capability`**: Polymorphic capability creator for tools, agents, sandboxes, and models.
- **`@platform/sdk-agent`**: Custom agent role definition and prompt binding.
- **`@platform/sdk-tool`**: CLI, REST, and MCP tool connector helper.
- **`@platform/sdk-workflow`**: Execution DAG workflow builder.
- **`@platform/sdk-ui`**: Extension interfaces for custom IDE sidebars and editor widgets.

## Quick Start Example: Custom Agent

```typescript
import { createAgent } from '@platform/sdk-agent';

export const customAgent = createAgent({
  role: 'security_auditor',
  systemPrompt: 'Inspect code for OWASP Top 10 vulnerabilities.',
  allowedTools: ['semgrep_scan', 'gitleaks_check'],
  supportedModels: ['qwen3-coder']
});
```

## Contract Compatibility Guarantees

- **Semantic Versioning**: All SDK interfaces follow strictly enforced Semantic Versioning.
- **Contract Integrity**: SDKs target explicit, immutable contract versions exported by `@platform/contracts`.
