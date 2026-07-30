# Architectural Patterns & Conventions

**Version**: 1.0  
**Status**: Draft - Documentation of Intended Architecture  
**Last Updated**: July 30, 2026

---

## 1. Layered Architecture Overview

FORGE follows a layered architecture with clearly defined separation of concerns. The architecture is designed to scale from a single IDE experience to a distributed multi-agent engineering platform.

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER LAYER                             │
│  (Developers, Operators, Admins)                                │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 6: PRESENTATION / UI                        │
│  ─ apps/unified-ide/                                           │
│  (Next.js SPA, Monaco Editor, Side Panels)                      │
│  • RESPONSIBILITIES: User interaction, command routing, state   │
│    management for UI only                                       │
│  • NO DIRECT BUSINESS LOGIC                                     │
│  • COMMUNIQUÉS through API routes or service layer              │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 5: APPLICATION SHELL                        │
│  ─ lib/dashboard-model.ts, live-services.ts                     │
│  (Orchestration, Service Composition, Command Routing)          │
│  • RESPONSIBILITIES: Translate user actions to domain commands  │
│    coordinate multiple services                                 │
│  • MAY depend on any lower-layer service                        │
│  • NEVER exposed directly to users                              │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 4: DOMAIN LAYER                             │
│  ─ packages/contracts, packages/core-agent                      │
│  (Domain Models, Business Logic Boundaries, Contracts)          │
│  • RESPONSIBILITIES: Define core concepts (Mission, Agent,      │
│    Artifact, Policy), business rules invariant                 │
│  • SHOULD NOT depend on infrastructure or presentation layers   │
│  • Pure TypeScript, no runtime dependencies                     │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 3: INFRASTRUCTURE SERVICES                  │
│  ─ packages/capability-fabric, provenance, tool-registry         │
│  (Cross-Cutting Concerns, Capability System, Provenance)        │
│  • RESPONSIBILITIES: Provide reusable services consumed by      │
│    domain and application layers                                │
│  • MAY implement interfaces from domain layer                   │
│  • NO business logic; purely utility/support                    │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 2: PLATFORM SERVICES (Microservices)        │
│  ─ services/*                                                 │
│  (Execution Engine, Memory Service, Policy Engine, etc.)       │
│  • RESPONSIBILITIES: Implement actual business operations       │
│  MUST respect domain boundaries and contracts                   │
│  SHOULD expose typed APIs through interface definitions         │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 1: INFRASTRUCTURE / EXTERNAL SYSTEMS        │
│  Docker, PostgreSQL, Qdrant, LLM APIs, Git, Filesystem          │
│  (External systems, databases, cloud services)                  │
│  • Accessed through adapters/services in Layer 2                │
│  • Should never be imported directly into domain or app code    │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Dependency Direction Rules

### ✅ Allowed Import Directions

| From → To | Valid? | Reason |
|-----------|--------|--------|
| Presentation (app) → Application Shell | ✅ | Natural delegation |
| Application Shell → Domain (contracts) | ✅ | Domain provides interfaces |
| Application Shell → Infrastructure Services | ✅ | Orchestrator pattern |
| Domain (contracts) → Infrastructure Services | ❌ | **FORBIDDEN** |
| Domain → Presentation | ❌ | **FORBIDDEN** |
| Infrastructure → Domain (contract references) | ✅ | Service implements contract interface |
| Infrastructure → Other Infrastructure | ⚠️ **Limited** | Only if explicitly designed as dependency; document rationale |
| Apps ← Services | ❌ **Via direct import** | **FORBIDDEN** (must use API routes) |

### Strict Import Boundaries

```typescript
// packages/contracts/src/index.ts - CONTRACTS MUST BE PURE INTERFACES ONLY

// ❌ FORBIDDEN - DO NOT IMPORT FROM HERE:
import { Something } from '../../services/policy-engine'; // Infrastructure → Domain violation
import { Something } from '../../apps/unified-ide';        // Presentation → Domain violation
import { Something } from '../../packages/capability-fabric'; // Cross-package infra violation (unless peer)

// ✅ ALLOWED - ONLY THESE TYPES:
import type { MissionContract } from './mission-contract'; // Pure interface import
export interface IExecutionService { ... } // Interface declaration (no implementation)
```

```typescript
// services/policy-engine/src/index.ts - SERVICE IMPLEMENTATION CAN IMPORT DOMAIN CONTRACTS

// ✅ ALLOWED - Services can implement domain interfaces:
import type { PolicyContract } from '@sajja/contracts'; 

// ⚠️ OK - May import peer infrastructure:
import type { CapabilityDescriptor } from '@sajja/capability-fabric';

// ❌ FORBIDDEN - Services should not depend on other services directly:
import { Something } from '../execution-engine'; // Avoid tight coupling
```

## 3. Module Boundary Definitions

### Contracts Package (`@sajja/forge-contracts`)

**Purpose**: Single source of truth for all shared types across the platform.

**Public API Surface**: All exported types, interfaces, and classes in `src/index.ts`.

**Boundary Rule**: This package may only contain pure TypeScript types/interfaces. NO implementation logic, NO runtime dependencies, NO imports from outside the `packages/` directory (except peer packages for type augmentation).

**Package Structure**:
```
packages/contracts/
├── src/
│   ├── index.ts           ← PUBLIC API surface ONLY
│   ├── mission-contracts.ts
│   ├── agent-contracts.ts
│   ├── tool-contracts.ts
│   ├── policy-contracts.ts
│   └── artifact-contracts.ts
├── package.json
└── tsconfig.json          ← Extends tsconfig.base.json with rootDir/src
```

### Core Agent Package (`@sajja/forge-core-agent`)

**Purpose**: Defines agent roles, state machines, and graph execution primitives used throughout the platform.

**Boundary Rule**: Can import from `contracts` for type safety. Should not depend on `services` directory. Should remain framework-agnostic where possible.

### Capability Fabric (`@sajja/forge-capability-fabric`)

**Purpose**: Polymorphic capability registry supporting plugin/exension system.

**Boundary Rule**: May define interfaces extending contracts. Can register capabilities discovered by services. Does NOT contain business logic itself.

### Services Directory (`services/*`)

Each service represents a distinct microservice concern:

- `orchestrator/` - Workflow orchestration entry point
- `execution-engine/` - Sandbox/container execution
- `memory-service/` - Memory storage and vector search
- `policy-engine/` - Policy evaluation and enforcement
- `artifact-service/` - Artifact versioning and storage
- `knowledge-service/` - Knowledge representation and retrieval
- `workspace-service/` - Workspace and repository management
- `marketplace-service/` - Capability marketplace integration
- `event-bus/` - Event communication layer
- `control-plane/` - Global state management
- `intelligence-dashboard/` - Monitoring and metrics collection
- `observability/` - Telemetry configuration
- `scheduler/` - Task scheduling
- `planning-engine/` - Execution DAG generation
- `resource-manager/` - Resource allocation
- `evaluation/` - Quality assessment and benchmarks
- `governance-service/` - Governance compliance checks
- `model-router/` - Model routing configuration

**Service Pattern**: Each service should have a clear public API defined in `src/public-api.ts` that exports only what's safe for external consumption. Internal implementation details should remain private.

## 4. API Routing Pattern

For frontend-backend communication, use Next.js API routes as the sole entry point from the presentation layer:

```
/apps/unified-ide/src/app/api/mission/route.ts
├── handles POST: execute mission request
├── calls application shell (dashboard-model.ts)
├── which calls underlying services through proper channels
└── returns JSON response

/apps/unified-ide/src/app/api/dashboard/route.ts
├── handles GET: fetch dashboard snapshot data
├── queries various services through live-services.ts
└── returns pre-aggregated snapshot
```

This pattern prevents the frontend from making direct service imports, maintaining clean separation between presentation and backend.

## 5. Module Resolution Strategy

Use absolute path aliases configured in `tsconfig.base.json`:

```json
{
  "paths": {
    "@sajja/contracts": ["./packages/contracts/src"],
    "@sajja/core-agent": ["./packages/core-agent/src"],
    "@sajja/capability-fabric": ["./packages/capability-fabric/src"],
    "@platform/policy-engine": ["./services/policy-engine/dist"],
    "@platform/memory-service": ["./services/memory-service/dist"]
  }
}
```

**Usage Examples**:
```typescript
// In ANY TypeScript file - cleaner than relative imports
import { MissionContract } from '@sajja/contracts';
import { PolicyEngine } from '@platform/policy-engine';

// Good: Descriptive module name reflects responsibility
import { AgentRole } from '@sajja/core-agent';
```

## 6. Versioning and Contract Stability

Per ADR-0001 (Architecture Freeze), the foundational layer contracts are frozen. Any breaking changes to `@sajja/forge-contracts` require:

1. RFC submission following the 5-step process in governance
2. Community discussion period (30 days)
3. Unanimous maintainer vote for approval
4. Bumped to MAJOR version semver

Non-breaking additions (new interfaces, optional properties) within existing contracts can proceed via minor version update.

## 7. Documentation Standards

All new architectures or major structural changes must be documented as an Architectural Decision Record (ADR) in `docs/adr/`:

- ADR-0001-architecture-freeze.md (ACCEPTED - Frozen)
- Add new ADRs following same format for subsequent decisions

Each ADR should include: Title, Status, Context, Decision, Consequences, and Discussion Reference.

---

*This document is part of the FORGE Engineering Excellence Audit Phase 2 deliverables.*