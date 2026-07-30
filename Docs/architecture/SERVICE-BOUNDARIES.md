# Service Boundary Contracts & Integration Patterns

**Version**: 1.0  
**Purpose**: Define clear boundaries between services, interfaces for cross-service communication  
**Status**: Implementation Guide  

---

## Service Architecture Overview

FORGE follows a **distributed microservices architecture** with clearly defined boundaries. Each service owns its data and exposes typed APIs through interface contracts defined in `@sajja/contracts`.

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│     Unified IDE (Frontend)  │────▶│   API Gateway / Routes       │
│     (Next.js App Router)    │◄────│   (apps/unified-ide/api/)    │
└─────────────────────────────┘     └──────────────────────────────┘
                                        ▲         │         ▼
                            ┌───────────┼─────────┴──────────┐
                            ▼           ▼                    ▼
                   ┌────────────┐  ┌─────────────┐      ┌──────────────┐
                   │ Policy Eng.│  │ Artifact Sv. │      │  Memory Sv.  │
                   │ (@policy)  │  │ (@artifact)  │      │  (@memory)   │
                   └────────────┘  └─────────────┘      └──────────────┘
                            │            │                    │
                            ▼            ▼                    ▼
                   ┌────────────┐  ┌─────────────┐      ┌──────────────┐
                   │ Workspace Sv.│  │ Event Bus    │      │  Scheduler   │
                   │ (@workspace) │  │ (@event-bus) │      │  (@scheduler)│
                   └────────────┘  └─────────────┘      └──────────────┘
```

---

## Cross-Service Communication Methods

### 1. Direct Import (Recommended for Shared Package-Level Services)

Use when services share common logic or utility packages. Both services import from the shared package rather than depending on each other directly.

**Example**: `capability-fabric` package is imported by both `policy-engine` and `execution-engine` instead of those services importing each other.

```typescript
// packages/capability-fabric/src/index.ts
export class CapabilityFabric {
  register(descriptor: CapabilityDescriptor) { /* ... */ }
  discoverCapabilities(type?: CapabilityType) { /* ... */ }
}

// services/policy-engine/src/index.ts
import type { CapabilityDescriptor } from '@capability-fabric';
import { createPolicyEngine } from './index'; // imports fabric internally

// But policy engine does NOT have direct dependency on execution-engine
```

### 2. Service-to-Service RPC (Internal HTTP/gRPC)

For distributed deployment scenario, services can call each other via internal HTTP/gRPC calls. For monorepo development (local setup), use direct import pattern wrapped in adapter layer.

**Adapter Pattern**:

```typescript
// services/execution-engine/src/adapters/policy-adapter.ts
import { getPolicyEngine } from '@platform/policy-engine'; // direct import for dev

// When deployed separately, this would become an HTTP client:
// const response = await fetch(`${POLICY_SERVICE_URL}/evaluate`, { /* ... */ });

export class PolicyAdapter {
  async evaluate(action: string, context?: any) {
    return getPolicyEngine().evaluateAction(action, context);
  }
}
```

This allows switching from direct import to network call without changing business logic.

### 3. Event-Driven Communication (Event Bus)

Services should communicate asynchronously via events rather than direct calls where possible. This decouples services and enables better scalability.

**Example - Workflow**:
1. User submits mission → API route publishes `mission.submitted` event
2. Planner service listens to `mission.submitted` → generates DAG → publishes `plan.generated`
3. Scheduler service listens to `plan.generated` → assigns worker → publishes `scheduled`
4. Execution service listens to `scheduled` → starts task → publishes `executing`, then `completed`

```typescript
// Example event usage
import { getEventBus } from '@platform/event-bus';

const eventBus = getEventBus();

// Publisher
await eventBus.publishAgentEvent('mission.submitted', {
  missionId,
  userId,
  orgId,
  prompt,
});

// Subscriber (in planner service)
await eventBus.subscribeAgentEvent('mission.submitted', async (data) => {
  await generateExecutionDAG(data.missionId, data.prompt);
});
```

---

## Service Interface Contracts

Each service exports typed interfaces defining its public API surface. These should match corresponding contracts from `@sajja/contracts`.

### Policy Engine API Contract

**Defined in**: `@sajja/contracts/policy-contracts.ts`
**Implemented in**: `services/policy-engine/src/index.ts`

```typescript
export interface PolicyRule {
  id: string;
  name: string;
  enforce: (action: string, metadata?: any) => Promise<{ allowed: boolean; reason?: string }>;
}

export interface PolicyResult {
  allowed: boolean;
  ruleId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface PolicyEvaluationRequest {
  action: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvaluationResponse {
  result: PolicyResult;
  timestamp: string;
}
```

**Usage example** (from API route):
```typescript
try {
  const evaluation = await policyEngine.evaluateAction('execute_mission', { organizationId });
  if (!evaluation.allowed) {
    throw new Error(`Policy denied: ${evaluation.reason}`);
  }
} catch (e) {
  // Handle policy error
}
```

### Memory Service API Contract

**Defined in**: `@sajja/contracts/memory-contracts.ts`
**Implemented in**: `services/memory-service/src/index.ts`

```typescript
export interface UserPreference {
  userId: string;
  key: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface EpisodicNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

export interface SemanticVectorSearchQuery {
  collection: string;
  query: string;
  topK?: number;
}

export interface SemanticVector {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
  score?: number;
}
```

### Artifact Service API Contract

**Defined in**: `@sajja/contracts/artifact-contracts.ts`
**Implemented in**: `services/artifact-service/src/index.ts`

```typescript
export interface ArtifactInput {
  id?: string;
  missionId: string;
  type: ArtifactType; // 'code' | 'prd' | 'diagram' | 'test_report' | 'spec'
  version?: number;
  uri: string; // URL to artifact
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  signature?: string; // SHA-256 hash
}

export interface ArtifactOutput extends Omit<ArtifactInput, 'version'> {
  version: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  signature?: string;
}

export interface ArtifactListOptions {
  missionId?: string;
  type?: ArtifactType;
  limit?: number;
  offset?: number;
}
```

---

## Service Boundary Rules

To prevent architectural violations, enforce these rules at build time (via our `.husky/validate-architecture.js` hook):

| Rule | Forbidden From → To | Enforcement Method |
|------|---------------------|-------------------|
| Contracts cannot depend on implementation | `packages/contracts/` → `services/*` | Static import analysis |
| Services should not import from other services directly | `services/A/` → `services/B/` | Adapter/Event bus pattern |
| Frontend apps should not directly import services | `apps/unified-ide/` → `services/*` | Must use API routes only |
| Core packages should remain framework-agnostic | `packages/core-agent/` → Next.js code | No Next.js deps in core |
| Services should be polyglot-friendly | Any service → specific tech stack | Use language-agnostic protocols |

---

## Dependency Injection Strategy

Services should accept dependencies via constructor injection for testability and flexibility.

**Example - Policy Engine Constructor Injection**:

```typescript
export class PolicyEngine {
  private rules: PolicyRule[] = [
    // built-in rules
  ];

  constructor(private secretStore?: { getSecret(key: string): Promise<string> }) {}
  
  async evaluateAction(action: string, context?: any) {
    // Can use secretStore for accessing sensitive info during evaluation
    if (this.secretStore && action.includes('secret')) {
      const secret = await this.secretStore.getSecret('policy-secret-key');
      // Use secret...
    }
    // ...rest of evaluation
  }
}

// In production:
const policyEngine = new PolicyEngine(secretStoreClient);

// In tests:
const mockSecretStore = { getSecret: vi.fn() };
const policyEngine = new PolicyEngine(mockSecretStore);
```

This pattern makes unit testing possible without real external dependencies.

---

## Health Check Endpoint Pattern

Every service should implement a health check endpoint for monitoring and readiness probes.

**Template** (`services/{service-name}/src/health.ts`):

```typescript
import { Request, Response } from 'express'; // or Next.js Route Handler
import { getPolicyEngine } from './index';

export async function healthHandler(req: Request, res: Response) {
  try {
    // Check all required dependencies
    const policyReady = !!getPolicyEngine();
    
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        policy_engine: policyReady,
      },
    };

    if (Object.values(status.checks).every(c => c)) {
      res.status(200).json(status);
    } else {
      res.status(503).json({ status: 'degraded', ...status });
    }
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
}

// Register in main entry point
// app.get('/health', healthHandler);
```

**In Next.js**, create API route `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'unified-ide' 
  });
}
```

Kubernetes/Helm deployments will use `/health` or `/ready` endpoints for liveness/readiness probes.

---

## Configuration Management

Services should read configuration from environment variables at startup, not hardcoded values.

**Example - Memory Service Config**:

```typescript
// services/memory-service/src/index.ts
import type { MemoryServiceConfig } from './types';

const config: MemoryServiceConfig = {
  postgresHost: process.env.POSTGRES_HOST || 'localhost',
  postgresPort: parseInt(process.env.POSTGRES_PORT || '5432'),
  postgresUser: process.env.POSTGRES_USER || 'forge',
  postgresPassword: process.env.POSTGRES_PASSWORD || process.env.PG_PASSWORD || '',
  postgresDatabase: process.env.POSTGRES_DATABASE || 'forge',
  redisUrl: process.env.REDIS_URL,
  qdrantUrl: process.env.QDRANT_URL,
  qdrantApiKey: process.env.QDRANT_API_KEY,
};

export function initialize(): MemoryManager {
  const manager = new MemoryManager(config);
  void manager.initialize();
  return manager;
}
```

**Recommended `.env.example` template** (should be committed):

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=forge
POSTGRES_PASSWORD=change-in-production
POSTGRES_DATABASE=forge

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant Vector DB
QDRANT_URL=http://localhost:6334
QDRANT_API_KEY=optional-api-key-for-auth
```

⚠️ Never commit actual secrets to git — add `.env` to `.gitignore`.

---

## Service Lifecycle

Each service should support:
- **Startup**: Initialize connections, load config, prepare state
- **Graceful Shutdown**: Listen for SIGTERM/SIGINT, close connections, drain pending tasks
- **Health Checks**: Respond to `/health` endpoint
- **Metrics Export**: Optionally expose Prometheus metrics on `/metrics`

**Example graceful shutdown handler**:

```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await memoryService.close();
  await eventBus.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await memoryService.close();
  await eventBus.close();
  process.exit(0);
});
```

---

*Service Boundaries & Integration Patterns — Part of FORGE Engineering Excellence Audit Phase 4*