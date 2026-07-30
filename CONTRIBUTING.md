# Contributing to FORGE AI Engineering Operating System

Thank you for your interest in contributing to FORGE by Sajja!

---

## 🏛️ Contribution Invariants & Guidelines

All contributions MUST preserve our core architectural invariants:
1. **Strict Contract Layer**: All cross-package communication must occur exclusively via `@sajja/forge-contracts`. Direct package implementation imports across boundaries are prohibited.
2. **Polymorphic Capability Discovery**: All tools, agents, and sandboxes must be registered as `CapabilityDescriptor` objects with `@sajja/forge-capability-fabric`.
3. **Definition of Done (DoD)**: Every pull request must satisfy the 8-point Definition of Done ([Docs/governance/definition-of-done.md](Docs/governance/definition-of-done.md)).

---

## 🚀 Getting Started

1. Fork the repository: `https://github.com/chandrasekharsajja/FORGE`.
2. Clone locally: `git clone https://github.com/<your-username>/FORGE.git`.
3. Install dependencies: `npm install`.
4. Run the public UI shell: `npm run dev:studio`.
5. Run tests: `npm test` or `node test-jwt.js`.

---

## 🛑 Defect Triage & Severity

When filing issues, classify severity per our governance model ([Docs/governance/release-readiness-board.md](Docs/governance/release-readiness-board.md)):
- **P0**: Data corruption, panic, scheduler deadlock, contract break (**Release Blocker**).
- **P1**: Performance regression, clean install failure (**High Priority**).
- **P2**: UI ergonomics, documentation typos (**Normal**).
- **P3**: Enhancements & new connectors (**Post-v1.0**).

---

## 📝 Commit Message Conventions (Conventional Commits)

FORGE uses the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This enables automatic changelog generation and semantic versioning.

### Format

```
<type>[optional scope]: <description>
```

Or optionally with a body:

```
<type>[optional scope]: <description]

[optional body]
Optional footer discussing issues breaking changes or PR references.
```

### Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(auth): add OAuth2 support` |
| `fix` | Bug fix | `fix(core-agent): resolve memory leak` |
| `perf` | Performance improvement | `perf(execution-engine): optimize sandbox startup` |
| `docs` | Documentation only | `docs: update installation guide` |
| `style` | Code style/formatting | `style(preprocess): fix indentation` |
| `refactor` | Refactoring (no new bug fixes/features) | `refactor(platform-runtime): split modules` |
| `test` | Adding/changing tests | `test(jwt): add token refresh tests` |
| `chore` | Maintenance task | `chore: update dependencies` |
| `build` | Build system changes | `build(ci): upgrade GitHub Actions` |
| `ci` | CI/CD pipeline changes | `ci: add generate-changelog step` |
| `revert` | Reverting a previous commit | `revert: feat(auth): remove OAuth2` |

### Scope (Optional)

The scope can be used to indicate which package/module the change affects:
- `feat(auth)`: changes in authentication subsystem
- `feat(unified-ide)`: changes in the IDE shell
- `core-agent`: changes in the core agent package

Example: `feat(auth): add CSRF protection middleware`

### Benefits

Follows these conventions provides:
- **Automatic Changelog Generation**: Running `npm run generate-changelog` creates structured CHANGELOG.md entries
- **Semantic Versioning**: Release scripts can determine bump type based on commits (feat → minor, fix → patch)
- **Better Code History**: Clear, searchable commit history by type and scope
- **CI Integration**: Commit-msg hook validates format automatically

The husky commit-msg hook enforces this format on every commit.

