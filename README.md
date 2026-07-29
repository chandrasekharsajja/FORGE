# Aurexon AI Engineering Operating System (v0.9.0-rc1)

> **Aurexon AI Engineering OS** is an open-source, enterprise-grade AI software engineering operating system created and maintained by **Chandra Sekhar Sajja** (under the **Sajja** organization umbrella).

---

## 💡 What is Aurexon?

Aurexon elevates AI software engineering from simple code-chat widgets to a full **Platform Engineering Operating System**. It provides a unified IDE, multi-agent mission runtime, capability fabric, fleet scheduler, policy engine, and immutable lineage tracking.

```text
                           AI Engineering Operating System
┌──────────────────────────────────────────────────────────────────────────────┐
│                  Unified Desktop / Web IDE & Agent Control Panel             │
├──────────────────────────────────────────────────────────────────────────────┤
│  Mission Runtime  │  Capability Fabric  │  Policy Engine  │ Fleet Scheduler  │
├──────────────────────────────────────────────────────────────────────────────┤
│  Platform Runtime │  Artifact Service   │  Provenance     │ Evaluation       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Capabilities

- **Multi-Agent Mission Runtime**: Dynamic 5–7 node parallel execution DAG generation across Architect, Backend, Frontend, Database, Docs, and QA roles.
- **Polymorphic Capability Fabric**: Pluggable discovery and registration of tools, agents, models, and sandboxes via `@platform/contracts`.
- **Fleet Scheduler**: Intelligent workload placement across local workers, GPU clusters, cloud runners, and sandboxes.
- **Immutable Lineage Provenance**: Cryptographic sha256 signing of generated patches and artifacts.
- **Temporal Resumability**: Durable state checkpointing and automatic recovery from worker failures.

---

## 🚀 Quick Start (Under 5 Minutes)

### 1. Installation
```bash
git clone https://github.com/<your-username>/aurexon-ai-os.git
cd aurexon-ai-os
npm install
```

### 2. Run Reference Scenarios
Run any of the 10 verified reference implementations:
```bash
# Run RI-001 (JWT Authentication)
node test-jwt.js

# Run RI-002 (CRUD REST API)
node test-crud.js

# Run RI-006 (Kubernetes Microservice Deployment)
node test-k8s.js
```

---

## 🏛️ Project Governance & Stewardship

- **Author & Maintainer**: **Chandra Sekhar Sajja** (Sajja Organization)
- **License**: [Apache 2.0 License](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/LICENSE)
- **Governance Baseline**: [docs/governance/PROJECT-GOVERNANCE.md](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/governance/PROJECT-GOVERNANCE.md)
- **RC1 Evidence Package**: [release/rc1/README.md](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/release/rc1/README.md)
- **Security SLA**: Report vulnerabilities privately to `security@aurexon.ai` ([SECURITY.md](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/SECURITY.md))
