# Aurexon AI Engineering Operating System (v0.3.0 — Developer Preview 1 / DP1)

> Enterprise-grade, modular, self-hostable, and contract-driven autonomous AI software engineering platform.

---

## 🌟 Status: Developer Preview 1 (DP1)

The platform has completed its **platform design phase** (architecture frozen via ADR-0001, contracts defined, governance policies locked) and is now actively executing its **product engineering feature board**.
- **Unified IDE & Agent OS UI**: Integrated Monaco code editor, xterm.js terminal, and Cursor/Antigravity-style agent command panel.
- **Contract-Driven Backbone (`@platform/contracts`)**: Immutable interface schemas governing all component communication.
- **Polymorphic Capability Fabric (`@platform/capability-fabric`)**: Unified runtime for Agents, Tools, Models, Sandboxes, Workflows, and MCP Servers.
- **Mission DAG Engine (`@platform/mission-runtime`)**: Mission lifecycle management executing parallel agent execution DAGs.
- **Enterprise Governance Control Plane (`@platform/policy-engine`)**: Organizational RBAC, budget caps, secret isolation, and human approval gates.
- **Distributed Fleet Scheduler (`services/scheduler`)**: Workload placement across GPU nodes, Cloud Workers, CI runners, and MicroVM sandboxes.

---

## 🚀 Quick Start

### 1. Start Infrastructure Stack
```bash
docker-compose -f deploy/docker-compose.yml up -d
```

### 2. Execute Reference Implementation #1
```bash
node test-jwt.js
```

---

## 📚 Documentation Site (`docs/`)

- 🚀 [Getting Started Guide](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/guides/getting-started.md)
- 🏗️ [Architecture Principles](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/governance/architecture-principles.md)
- 🔒 [Architecture Decision Records (ADR-0001)](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/adr/ADR-0001-architecture-freeze.md)
- 🛠️ [Developer SDK Guide](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/sdks/README.md)
- 📜 [Compatibility Policy](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/governance/compatibility-policy.md)
- 🚦 [Release Policy & Candidate Gates](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/governance/release-policy.md)

---

## 🧪 Reference Implementation Suite (RI-001 - RI-010)

| ID | Reference Scenario | Exercised Subsystems | Status |
| :--- | :--- | :--- | :--- |
| **RI-001** | JWT Authentication | Platform Runtime, Mission DAG, Policies, Artifacts, Provenance | ✅ Verified |
| **RI-002** | CRUD REST API | Multi-agent collaboration (Backend + Database) | ✅ Configured |
| **RI-003** | Blog Platform | End-to-end multi-tier application | ✅ Configured |
| **RI-004** | OAuth Login | Secret isolation & policy enforcement | ✅ Configured |
| **RI-005** | Payment Integration | Tool SDK & external API connectors | ✅ Configured |
| **RI-006** | Kubernetes Deployment | Execution Runtime & MicroVM sandboxing | ✅ Configured |
| **RI-007** | Bug Fix | Evaluation Engine & Immutable Lineage Provenance | ✅ Configured |
| **RI-008** | Large Refactor | Temporal durable state persistence & restart recovery | ✅ Configured |
| **RI-009** | Browser Automation | Playwright visual verification & MCP Gateway | ✅ Configured |
| **RI-010** | Multi-Repository Upgrade | Workspace Service multi-repo knowledge graph | ✅ Configured |

---

## 📄 License

Apache 2.0 License. Open Source Release prepared for GitHub & Hugging Face.
