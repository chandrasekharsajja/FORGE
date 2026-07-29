# Contributing to Aurexon AI Engineering Operating System

Thank you for your interest in contributing to Aurexon!

---

## 🏛️ Contribution Invariants & Guidelines

All contributions MUST preserve our core architectural invariants:
1. **Strict Contract Layer**: All cross-package communication must occur exclusively via `@platform/contracts`. Direct package implementation imports across boundaries are prohibited.
2. **Polymorphic Capability Discovery**: All tools, agents, and sandboxes must be registered as `CapabilityDescriptor` objects with `@platform/capability-fabric`.
3. **Definition of Done (DoD)**: Every pull request must satisfy the 8-point Definition of Done ([docs/governance/definition-of-done.md](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/governance/definition-of-done.md)).

---

## 🚀 Getting Started

1. Fork the repository: `https://github.com/aurexon/aurexon-ai-os`.
2. Clone locally: `git clone https://github.com/<your-username>/aurexon-ai-os.git`.
3. Install dependencies: `npm install`.
4. Run tests: `npm test` or `node test-jwt.js`.

---

## 🛑 Defect Triage & Severity

When filing issues, classify severity per our governance model ([docs/governance/release-readiness-board.md](file:///Volumes/Kingston_240_GB_SSD/Aurexon/AI%20local%20OS/docs/governance/release-readiness-board.md)):
- **P0**: Data corruption, panic, scheduler deadlock, contract break (**Release Blocker**).
- **P1**: Performance regression, clean install failure (**High Priority**).
- **P2**: UI ergonomics, documentation typos (**Normal**).
- **P3**: Enhancements & new connectors (**Post-v1.0**).
