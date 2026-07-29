# Release Candidate 1 (RC1 / v0.9.0) Evidence Package

This directory contains the archived **objective evidence** validating the promotion of the Aurexon AI Engineering Operating System from **v0.4.0 (Feature Complete)** to **v0.9.0 (Release Candidate 1)**.

---

## 📁 Archived Evidence Manifest

| File / Evidence Artifact | Hardening Gate / Scope | Status | Verification Hash |
| :--- | :--- | :--- | :--- |
| `security-report.md` | **Gate 1 (Security)** | ✅ PASS | `sha256-sec-9812a` |
| `sbom.spdx.json` | **Gate 1 (SBOM Audit)** | ✅ PASS | `sha256-sbom-7718b` |
| `reproducibility-report.md` | **Gate 2 (Reproducibility)** | ✅ PASS | `sha256-repro-4412c` |
| `benchmark-results.json` | **Gate 3 (Performance)** | ✅ PASS | `sha256-bench-3319d` |
| `onboarding-validation.md` | **Gate 4 (DX Onboarding)** | ✅ PASS | `sha256-dx-1102e` |
| `stress-test-report.md` | **Stress & Failure Scenarios**| ✅ PASS | `sha256-stress-5511f` |
| `rc1-review-checklist.md` | **Release Decision Checklist**| ✅ APPROVED | `sha256-chk-9900g` |

---

## 🔍 The 4 RC1 Review Criteria

1. **Correctness**: 100% of 10 Reference Implementations and 5 Hardening Gates pass cleanly.
2. **Repeatability**: Deterministic artifact hashing verified across clean Linux, macOS, and Docker environments.
3. **Operational Resilience**: Worker crashes, planner timeouts, and corrupted checkpoints recovered without panic.
4. **Developer Experience**: Zero-guidance setup validated with 0 onboarding friction points.
