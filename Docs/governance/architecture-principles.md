# Architecture Principles & Contribution Invariants

This document outlines the mandatory invariants for contributing to the AI Engineering Operating System.

---

## 1. Core Invariants (Non-Negotiable)

1. **Contract Isolation**: Never bypass `@platform/contracts` to import implementation types directly across package boundaries.
2. **Polymorphic Capabilities**: All tools, agents, sandboxes, and workflows must register as polymorphic descriptors with `@platform/capability-fabric`.
3. **Mission Lifecycle Integrity**: Every mission must flow through `Mission → Planner → Execution Graph → Verification → Artifacts → Memory → Completion`.
4. **Immutable Lineage**: All generated artifacts must be signed and recorded by `@platform/provenance`.
5. **Policy & Budget Limits**: All actions must be authorized by `@platform/platform-runtime` and evaluated against `@platform/policy-engine`.

---

## 2. Mandatory Release Gates

To merge into `main`, code must satisfy:
- **Gate 1 (Architecture)**: Zero contract breaking changes without an approved ADR.
- **Gate 2 (Quality)**: All unit, integration, and Mission Test Harness golden snapshot tests PASS.
- **Gate 3 (Documentation)**: README, API reference, and example included.
- **Gate 4 (Benchmarks)**: Zero unacceptable performance regressions.
