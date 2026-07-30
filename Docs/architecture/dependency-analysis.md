# Dependency Analysis Report (Phase 2)

**Date**: July 30, 2026  
**Repository Version**: v0.9.0-rc1  
**Analysis Method**: Manual Package & Service Inspection

## Overview

This report documents the observed dependency structure across the FORGE monorepo, identifying module boundaries, potential circular dependencies, and architectural coupling concerns.

## Directory Structure Summary

```text
├── apps/
│   └── unified-ide/          ← Next.js IDE frontend
├── packages/
│   ├── contracts/            ← Shared type interfaces (CRITICAL)
│   ├── core-agent/           ← Agent state & planning
│   ├── capability-fabric/    ← Polymorphic capability registry
│   ├── mission-runtime/      ← Mission lifecycle helpers
│   ├── provenance/           ← Artifact signing & lineage
│   ├── tool-registry/        ← Tool catalog
│   ├── agent-registry/       ← Plugin registration
│   ├── model-registry/       ← Model selection
│   ├── security/             ← Security utilities
│   ├── schema/               ← Schema definitions (empty?)
│   ├── mcp-sdk/              ← MCP SDK stubs (empty?)
│   └── sdks/                 ← SDK wrappers
├── services/
│   ├── orchestrator/         ← Workflow execution
│   ├── execution-engine/     ← Sandbox/container runner
│   ├── memory-service/       ← Memory storage & search
│   ├── policy-engine/        ← Policy evaluation
│   ├── artifact-service/     ← Artifact storage
│   ├── knowledge-service/    ← Knowledge management
│   ├── workspace-service/    ← Workspace management
│   ├── marketplace-service/  ← Marketplace integration
│   ├── event-bus/            ← Event communication
│   ├── control-plane/        ← Global state management
│   ├── intelligence-dashboard← Monitoring/UI
│   ├── observability/        ← Metrics/tracing config
│   ├── scheduler/            ← Task scheduling
│   ├── planning-engine/      ← DAG generation
│   ├── resource-manager/     ← Resource allocation
│   ├── evaluation/           ← Quality assessment
│   ├── governance-service/   ← Governance enforcement
│   └── model-router/         ← Model routing config
├── tests/                    ← Integration tests & harness
├── examples/                 ← Demo scenarios
└── docs/                     ← Architecture docs
```

## Critical Dependencies Analysis

### Core Package → Service Dependencies

| Package | Depends On | Direction | Valid? | Notes |
|---------|------------|-----------|--------|-------|
| `apps/unified-ide` → `packages/core-agent` | Forward | ✅ OK | Presentation layer consuming domain logic |
| `apps/unified-ide` → `services/policy-engine` | Forward | ✅ OK | UI checking policy decisions |
| `apps/unified-ide` → `services/memory-service` | Forward | ✅ OK | UI accessing memory service |
| `packages/core-agent` → `packages/capability-fabric` | Peer-to-peer | ⚠️ Risk | Both in packages directory - should be explicit interface |
| `services/*` → `packages/contracts` | Infrastructure → Domain | ✅ OK | Services implementing domain contracts |
| `packages/contracts` → `services/*` | Domain → Infrastructure | ❌ **VIOLATION** | Should NOT import from services! |

### Key Finding: Contract Package Must Be Import-Only

The `@sajja/forge-contracts` package should contain **only interface/type declarations** and must NOT import from implementation packages (services, apps). This creates a clean boundary between contracts (domain) and implementations (infrastructure/platform).

## Potential Circular Dependencies

Based on code inspection of key files, here are potential circular dependency risks:

1. **Core-Agent ↔ CapabilityFabric**
   - `core-agent/src/index.ts` exports types used by others
   - `capability-fabric/src/index.ts` uses `AgentRole` from contracts but may transitively depend on core-agent
   - **Risk**: Medium - needs actual build-time verification

2. **Orchestrator ↔ ExecutionEngine**
   - Orchestrator calls ExecutionEngine for task execution
   - ExecutionEngine may reference Orchestrator for workflow coordination
   - **Risk**: Low - likely intended parallel composition

3. **PolicyEngine ↔ PlatformRuntime**
   - PolicyEngine evaluates actions from PlatformRuntime
   - PlatformRuntime calls PolicyEngine for authorization
   - **Risk**: High - this could be true circular dependency if not properly decoupled

## Architectural Boundaries Violation Detection

### Forbidden Import Patterns to Enforce:

```typescript
// ❌ FORBIDDEN: Infrastructure imports into domain
import { SomeImplementation } from '@platform/execution-engine'; 
// in packages/contracts/src/index.ts

// ❌ FORBIDDEN: Service imports into packages/services folder boundary violation
import { AnotherService } from '../../services/another-service';
// in services/policy-engine/src/index.ts

// ❌ FORBIDDEN: App services importing other app services
import { ServiceB } from '../services/service-b';
// in apps/unified-ide/src/lib/some-module.ts

// ✅ ALLOWED: Domain → Infrastructure (one-way flow only)
// contracts can define interfaces that services implement
// But contracts cannot import FROM services
```

## Recommended Architecture Enforcement Strategy

To enforce these rules without build-time tooling (madge unavailable), we'll implement a pre-commit hook that validates import directions using static analysis.

Create file: `.husky/validate-architecture.js`

## Dependency Graph Summary

| Layer | Packages/Services | Responsibility | Stability Level |
|-------|------------------|----------------|-----------------|
| **Presentation** | apps/unified-ide | User interface, dashboard, editor | Evolving |
| **Application Shell** | lib/dashboard-model.ts, live-services.ts | Application orchestration, service composition | Prototype |
| **Domain** | packages/contracts, packages/core-agent | Type definitions, agent state, mission contracts | Stable (frozen per ADR-0001) |
| **Infrastructure** | packages/capability-fabric, packages/provenance, packages/tool-registry | Cross-cutting concerns, capability system | Medium |
| **Platform Services** | services/* | Microservices, business logic | Early Implementation |

## Critical Recommendations

1. **Enforce One-Way Dependency Direction**: All flows should go from outer layers inward (App → Packages → Services). Never allow Services → Packages or Apps → Services except through well-defined contract boundaries.

2. **Create Architecture Validation Script**: Implement a pre-commit hook that parses TypeScript source files and checks for forbidden import patterns (Section "Forbidden Import Patterns").

3. **Define Explicit Module Contracts**: Use `package.json` `"types"` field to declare public API surfaces. Anything outside declared public types should be considered private/internal.

4. **Document Service Interfaces Clearly**: Each service should have a documented API surface (`public-api.ts` export list) that other modules can depend on, rather than internal implementation details.

5. **Plan for Future Tooling**: Once Node/npm environment becomes available, install `madge` and `dependency-cruiser` to generate automated dependency graphs and detect cycles programmatically.

## Next Steps

Implement the architectural validation hook as part of Phase 2, then continue to Phase 3 (Frontend Audit) implementation once boundary enforcement is established.

---
*Report generated automatically from repository inspection.*