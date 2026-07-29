# Definition of Done (DoD) & Engineering Operating Model

This document establishes the mandatory **Definition of Done (DoD)** and **Operating Model** for all product engineering workstreams in the AI Engineering Operating System.

---

## 1. Workstream Organization

Engineering execution is divided into 5 parallel workstreams:

- **Workstream A (Core Runtime)**: Platform Runtime, Mission Runtime, Fleet Scheduler, Capability Fabric, Control Plane.
- **Workstream B (Reference Implementations)**: Delivery of RI-001 through RI-010 reference scenarios.
- **Workstream C (SDK & Developer Experience)**: `@platform/sdk-*`, CLI, documentation, examples, and templates.
- **Workstream D (Marketplace & Extensions)**: First-party capability packs (GitHub, Docker, K8s, AWS, Browser).
- **Workstream E (Enterprise Readiness)**: RBAC/ABAC, multi-tenancy isolation, SSO, Vault secrets, compliance.

---

## 2. Definition of Done (DoD) Checklist

A Reference Implementation or Feature Epic is marked **DONE** ONLY if it satisfies all 8 requirements:

- [ ] **1. Functional Implementation**: Feature/scenario is fully implemented.
- [ ] **2. Mission Test Harness Execution**: Passes `MissionTestHarness` verification cleanly.
- [ ] **3. Golden Snapshot Validation**: Snapshot generated and verified against expected output.
- [ ] **4. Provenance Record Sealed**: Immutable lineage signature recorded by `@platform/provenance`.
- [ ] **5. Quality & Evaluation Score**: Achieves required score via `@platform/evaluation`.
- [ ] **6. Performance Metrics Recorded**: Mission boot latency, scheduling overhead, and token usage logged.
- [ ] **7. Documentation & Example Updated**: User guide, README, and runnable example included.
- [ ] **8. CI Pipeline Passing**: GitHub Actions CI (`.github/workflows/ci.yml`) passes cleanly.

---

## 3. Sprint Roadmap to Feature Completeness (v0.4.0)

- **Sprint 1**: RI-002 (CRUD REST API) + Mission Harness Enhancements.
- **Sprint 2**: RI-003 (Blog Platform) + RI-004 (OAuth Login).
- **Sprint 3**: RI-005 (Payment Integration) + RI-006 (Kubernetes Deployment).
- **Sprint 4**: RI-007 (Bug Fix & Provenance) + RI-008 (Large Refactor & Temporal Persistence).
- **Sprint 5**: RI-009 (Browser Automation) + RI-010 (Multi-Repository Upgrade).

Upon completion of Sprint 5, the platform transitions to **v0.9.0 (Release Candidate / RC1)**.
