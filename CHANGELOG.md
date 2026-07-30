# FORGE ChangeLog

All notable changes to the FORGE AI Engineering Operating System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.9.0-rc1] - 2026-07-29

### Added
- **Rebranding to FORGE by Sajja**: Rebranded project identity to FORGE AI Engineering OS published by Sajja (Software Architecture, Jobs, Journeys & Automation).
- **Package Namespaces**: Scoped all packages and SDKs under @sajja/forge-*.
- **Platform Architecture & Kernel**: Refactored platform-kernel to platform-runtime for multi-tenant RBAC and session management.
- **Mission Runtime & Multi-Agent DAG**: Added MissionDAGPlanner for 5-6 node parallel DAG generation across architect, backend, frontend, database, docs, and QA roles.
- **Polymorphic Capability Fabric**: CapabilityFabric with CapabilityDescriptor registrations for agents, tools, models, sandboxes, and workflows.
- **Contracts Layer**: @sajja/forge-contracts package enforcing strict architectural boundaries.
- **Developer SDK Suite**: Released @sajja/forge-sdk suite (Capability, Agent, Tool, Workflow, UI).
- **Reference Implementation Suite**: Executed and verified 10/10 reference scenarios (RI-001 through RI-010).
- **Mission Test Harness & Golden Snapshots**: Standardized MissionTestHarness with explicit simulatedMetrics: true flag and golden output JSON snapshots.
- **Pre-RC1 Hardening & Evidence Bundle**: Created release/rc1/ with archived SBOM, cross-platform reproducibility report, benchmark history, and RC1 exit decision.



## Unreleased (in progress)

### New Features

- feat: add strict shared tsconfig.json and upgrade CI workflow (**c6970ee)
- feat: add monorepo npm workspaces config and Implementation Status matrix (**3fd30d0)

### Bug Fixes

- fix: clean CI workflow YAML, enforce strict exit codes, add TS strict flags (**987948e)

### Maintenance

- chore: remove internal planning files from public repository and gitignore private archives (**5f84679)
- chore: archive internal implementation plans and clean duplicate test folders (**f7fd8f8)

## [0.9.0-rc1] - 2026-07-29

### Added
- **Rebranding to FORGE by Sajja**: Rebranded project identity to FORGE AI Engineering OS published by Sajja (Software Architecture, Jobs, Journeys & Automation).
- **Package Namespaces**: Scoped all packages and SDKs under @sajja/forge-*.
- **Platform Architecture & Kernel**: Refactored platform-kernel to platform-runtime for multi-tenant RBAC and session management.
- **Mission Runtime & Multi-Agent DAG**: Added MissionDAGPlanner for 5-6 node parallel DAG generation across architect, backend, frontend, database, docs, and QA roles.
- **Polymorphic Capability Fabric**: CapabilityFabric with CapabilityDescriptor registrations for agents, tools, models, sandboxes, and workflows.
- **Contracts Layer**: @sajja/forge-contracts package enforcing strict architectural boundaries.
- **Developer SDK Suite**: Released @sajja/forge-sdk suite (Capability, Agent, Tool, Workflow, UI).
- **Reference Implementation Suite**: Executed and verified 10/10 reference scenarios (RI-001 through RI-010).
- **Mission Test Harness & Golden Snapshots**: Standardized MissionTestHarness with explicit simulatedMetrics: true flag and golden output JSON snapshots.
- **Pre-RC1 Hardening & Evidence Bundle**: Created release/rc1/ with archived SBOM, cross-platform reproducibility report, benchmark history, and RC1 exit decision.

## Unreleased (in progress)
