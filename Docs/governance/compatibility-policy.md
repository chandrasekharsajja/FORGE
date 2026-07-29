# Contract & Extension Compatibility Policy

## Semantic Versioning Rules

All platform contracts (`@platform/contracts`) and Developer SDKs (`@platform/sdk-*`) strictly follow Semantic Versioning (`MAJOR.MINOR.PATCH`):

- **MAJOR (`1.0.0 → 2.0.0`)**: Incompatible API or contract breaking changes. Requires a formal ADR and multi-stage deprecation cycle.
- **MINOR (`1.0.0 → 1.1.0`)**: Backwards-compatible new features, capabilities, or contract fields.
- **PATCH (`1.0.0 → 1.0.1`)**: Backwards-compatible bug fixes and performance optimizations.

---

## SDK & Marketplace Compatibility
- Extension packages in the Marketplace must declare supported contract versions (e.g., `"contracts": "^1.0.0"`).
- The Platform Runtime guarantees backward compatibility for all minor and patch releases within a major version.
