# FORGE AI Engineering Operating System (v0.9.0-rc1)

> **FORGE** is an open-source, enterprise-grade AI software engineering operating system developed and maintained by **Chandra Sekhar Sajja** under the **Sajja** organization umbrella (**Software Architecture, Jobs, Journeys & Automation**).

---

## 🛠️ What is FORGE?

FORGE elevates AI software engineering from simple code-chat widgets to a full **Platform Engineering Operating System**. It provides a unified IDE, multi-agent mission runtime, capability fabric, fleet scheduler, policy engine, and immutable lineage tracking.

```text
                                SAJJA
                                  │
                       FORGE AI Engineering OS
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
- **Polymorphic Capability Fabric**: Pluggable discovery and registration of tools, agents, models, and sandboxes via `@sajja/forge-contracts`.
- **Fleet Scheduler**: Intelligent workload placement across local workers, GPU clusters, cloud runners, and sandboxes.
- **Immutable Lineage Provenance**: Cryptographic sha256 signing of generated patches and artifacts.
- **Temporal Resumability**: Durable state checkpointing and automatic recovery from worker failures.

---

## 📦 Package Namespaces (`@sajja/forge-*`)

All official packages and SDKs are published under the `@sajja` organization scope:
- `@sajja/forge-contracts`: Core interfaces and architectural contract boundaries.
- `@sajja/forge-sdk`: Unified Developer SDK suite (Capability, Agent, Tool, Workflow, UI).
- `@sajja/forge-runtime`: Mission Runtime, Platform Runtime, and Capability Fabric.

---

## 📊 Implementation Status & Maturity Matrix

To provide complete transparency for contributors and developers evaluating FORGE:

```text
Architecture & Contracts    ██████████ 100% (Complete)
Governance & RC1 Evidence   ██████████ 100% (Complete)
Reference Implementation    ██████████ 100% (10 of 10 Verified)
Core Runtime Engine         ███████░░░  70% (Active Release Candidate)
Developer Platform & SDKs   █████░░░░░  50% (Active Release Candidate)
Production Cloud Fabric     ██░░░░░░░░  20% (Post-v1.0 Roadmap)
```

---

## 🚀 Quick Start (Under 5 Minutes)

### 1. Installation
```bash
git clone https://github.com/chandrasekharsajja/FORGE.git
cd FORGE
npm install
```

### 2. Run Test Suite
Run all 10 verified reference implementation scenarios with a single command:
```bash
npm test
```


---

## 🏛️ Project Governance & Stewardship

- **Author & Maintainer**: **Chandra Sekhar Sajja** (**Sajja** — *Software Architecture, Jobs, Journeys & Automation*)
- **License**: [Apache 2.0 License](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/LICENSE)
- **Governance Baseline**: [docs/governance/PROJECT-GOVERNANCE.md](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/governance/PROJECT-GOVERNANCE.md)
- **RC1 Evidence Package**: [release/rc1/README.md](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/release/rc1/README.md)
- **Security SLA**: Report vulnerabilities privately to `security@sajja.ai` ([SECURITY.md](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/SECURITY.md))
