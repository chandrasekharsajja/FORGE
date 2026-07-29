# Changelog

All notable changes to the Aurexon AI Engineering Operating System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.9.0-rc1] - 2026-07-29

### Added
- **Platform Architecture & Kernel**: Refactored `platform-kernel` to `platform-runtime` for multi-tenant RBAC and session management.
- **Mission Runtime & Multi-Agent DAG**: Added `MissionDAGPlanner` for 5-6 node parallel DAG generation across architecture, backend, frontend, database, docs, and QA roles.
- **Polymorphic Capability Fabric**: `CapabilityFabric` with `CapabilityDescriptor` registrations for agents, tools, models, sandboxes, and workflows.
- **Contracts Layer**: `@platform/contracts` package enforcing strict architectural boundaries.
- **Developer SDK Suite**: Released `@platform/sdk-capability`, `@platform/sdk-agent`, `@platform/sdk-tool`, `@platform/sdk-workflow`, and `@platform/sdk-ui`.
- **Reference Implementation Suite**: Executed and verified 10/10 reference scenarios (RI-001 through RI-010).
- **Mission Test Harness & Golden Snapshots**: Standardized `MissionTestHarness` with explicit `simulatedMetrics: true` flag and golden output JSON snapshots.
- **Pre-RC1 Hardening & Evidence Bundle**: Created `release/rc1/` with archived SBOM, cross-platform reproducibility report, benchmark history, and RC1 exit decision.
