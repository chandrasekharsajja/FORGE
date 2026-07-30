# FORGE Security Architecture Document

**Version**: 1.0  
**Classification**: Internal (to be public upon GA)  
**Date**: July 30, 2026  

---

## Executive Summary

This document outlines the security architecture of the FORGE AI Engineering Operating System, covering authentication, authorization, secret management, input validation, rate limiting, and compliance considerations designed to protect against OWASP Top 10 vulnerabilities and enterprise-grade threats.

---

## Security Design Principles

1. **Least Privilege**: Every component operates with only the permissions it absolutely needs
2. **Defense in Depth**: Multiple overlapping security controls at each layer
3. **Zero Trust Architecture**: Never trust, always verify - every request authenticated and authorized
4. **Security by Design**: Security controls built into architecture from inception, not added as afterthoughts
5. **Fail-Safe Defaults**: Deny by default; explicitly allow required operations
6. **Auditability**: All security-relevant actions logged for forensic analysis

---

## Threat Model Overview

### Primary Threat Actors
| Actor | Capability | Motivation | Risk Level |
|-------|------------|------------|-----------|
| External attacker | Network access | Data theft, service disruption | High |
| Insider threat | System access | Malicious activity / negligence | Medium |
| Automated bots | Programmatic access | Resource exhaustion, credential scraping | Medium |
| Compromised device | User-level access | Lateral movement, data exfiltration | Low-Medium |

### Attack Vectors Mitigated
- ✅ Authentication bypass
- ✅ Broken object level authorization (BOLA)
- ✅ Injection attacks (SQL, NoSQL, command)
- ✅ Sensitive data exposure
- ✅ Missing function-level authorization
- ✅ Security misconfiguration
- ✅ Cross-site scripting (XSS)
- ❌ Distributed Denial of Service (requires external WAF/load balancer)

---

## Authentication Architecture

### Token-Based Authentication Strategy

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client    │────▶│  Auth Service    │────▶│  Identity Store │
│ (Browser)   │ JWT │ (Middleware Layer)│ (Redis/DynamoDB)│
└─────────────┘     └──────────────────┘     └─────────────────┘
       ▲                    ▲                           ▲
       │                    │                           │
       │                    ▼                           │
    ┌─────────────┐      ┌──────────────┐            │
│ API Gateway   │◀─────│  Middleware    │            │
│ (Next.js API) │      │ (Auth Checks)  │            │
└─────────────┘      └──────────────┘            │
                                                │
                                        ← Token Refresh ←
```

### Access Tokens (JWT)
- **Lifespan**: 15 minutes (short-lived)
- **Contents**: Subject (user ID), Organization ID, Workspace ID, Role, Permissions
- **Signature**: HMAC-SHA256 with secret from environment/secrets manager
- **Storage**: HTTP-only, Secure, SameSite=Strict cookies (browser clients)

### Refresh Tokens
- **Lifespan**: 7 days (longer-lived but rotated)
- **Rotation**: Single-use + sliding window expiration
- **Storage**: Encrypted database-backed session store
- **Revocation**: Immediate invalidation on logout/password change

### Implementation Details
- See `apps/unified-ide/src/lib/auth-strategy.ts` - Full JWT strategy implementation
- See `apps/unified-ide/src/lib/auth-middleware.ts` - Route protection middleware
- See `services/platform-runtime/src/lib/secrets.ts` - Secret management

---

## Authorization Framework

### Policy-Based Access Control (PBAC) System

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REQUEST FLOW                                    │
│                                                                     │
│ [User Request] → [API Gateway] → [Auth Middleware] → [Policy Engine]│
│                   │                     │                           │
│                   ↓ (validated user)    ↓ (policy decision)         │
│               [Enforcement Gate] ←─────────────────────────────────┘
│                         │                                             │
│                   ALLOW / DENY                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Built-in Policy Rules

#### Rule 1: Human Approval Gate (Critical Operations)
- **Trigger**: Actions involving production environments, deployment releases
- **Requirement**: Explicit human approval before execution
- **Fallback**: Timeout-based automatic rejection if no response within SLA

#### Rule 2: Secret Leak Prevention
- **Trigger**: Commands or outputs containing patterns matching sensitive data
- **Action**: Block operation and alert security team
- **Examples**: Passwords, API keys, tokens in code generation output

#### Rule 3: Cost Cap Enforcement
- **Trigger**: Estimated cost exceeds predefined budget threshold
- **Action**: Require additional approval or automatically throttle
- **Budgets**: Per-user, per-organization, per-mission configurable limits

#### Rule 4: Rate Limiting
- **Per-IP**: 100 requests/minute basic limit
- **Per-User**: Higher limits for authenticated users based on role  
- **Endpoint-specific**: Different limits for expensive vs cheap operations

### Policy Evaluation Flow
1. Extract action name and metadata from request context
2. Evaluate all registered policy rules sequentially
3. First denying rule causes immediate rejection
4. All rules pass → Proceed with operation
5. Log evaluation results for audit trail

See `services/policy-engine/src/index.ts` for full implementation.

---

## Input Validation & Sanitization

### Multi-Layer Validation Strategy

```
Layer 1: Client-side (UX convenience only - never trusted)
    ↓
Layer 2: API Gateway route handlers (Zod schema validation)
    ↓
Layer 3: Service layer internal checks (defensive programming)
    ↓
Layer 4: Database constraints (last line of defense)
```

### Validation Middleware

Located at `apps/unified-ide/src/lib/validation-middleware.ts`:

- Uses Zod schemas from `@sajja/contracts/validation-schemas.ts`
- Returns detailed error messages for failed validations
- Supports passthrough vs strict mode
- Integrates easily with Next.js API routes

Example usage:
```typescript
// See api/mission/create/route.ts for complete example
import { withValidation } from '@/lib/validation-middleware';
import { MissionCreateSchema } from '@sajja/contracts';

export async function POST(request: NextRequest) {
  return withValidation(MissionCreateSchema, async (req, validatedBody) => {
    // validatedBody is already type-safe and cleaned
    // Proceed with business logic knowing input is valid
  });
}
```

### Sanitization Techniques

- Automatic stripping of non-conforming fields when `stripUnknown: true`
- HTML escaping for any text rendered back to browsers
- SQL parameterization for all database queries (pg library handles automatically)
- Command injection prevention via child_process usage avoidance

---

## Secret Management

### Three-Tier Secret Hierarchy

| Tier | Contents | Storage Location | Access Control |
|------|----------|------------------|----------------|
| **Tier 1** (High) | JWT_SECRET, API Keys, DB passwords | HashiCorp Vault / AWS Secrets Manager | Restricted IAM roles, mTLS |
| **Tier 2** (Medium) | Service connection strings, Cache secrets | Encrypted environment variables at rest | Runtime decryption |
| **Tier 3** (Low) | Feature flags, Toggles | Feature stores / Config services | Application config reload |

### Implementation

See `services/platform-runtime/src/lib/secrets.ts`:

- Abstract backend interface (memory for dev, vault/cloud for prod)
- Automatic masking in logs for sensitive fields
- Rotation support for long-running processes
- Auditing of secret access

### Environment Variable Best Practices

`.env.example` file committed with placeholders, `.env.local` excluded from git:

```bash
# NEVER commit actual secrets!
OPENAI_API_KEY=your-api-key-here           # ← Add to .env.local, NOT committed
JWT_SECRET=change-this-secret-in-production # ← Generate fresh for each deployment
DATABASE_PASSWORD=strong-password-hash      # ← From vault at runtime
```

---

## Rate Limiting Implementation

### Sliding Window Algorithm

- Configurable max requests per time window (default: 100/min)
- Uses token bucket with periodic refills based on real-time consumption
- Graceful degradation: fails open on storage failure to prevent outages
- Exposes `Retry-After` header when quota exceeded

### Protection Scenarios

| Threat | Mitigation | Configuration |
|--------|------------|---------------|
| Brute force login attempts | Strict per-IP limit | 5 attempts/minute |
| API scraping | Moderate per-user limit | 100 requests/hour authenticated |
| DoS attacks | Adaptive thresholds | Dynamic based on capacity metrics |

Implementation in `services/platform-runtime/src/lib/rate-limiting.ts`.

---

## Security Testing During Development

### Pre-commit Hooks

1. **Linting (ESLint)** - Catches potential security anti-patterns
2. **Formatting (Prettier)** - Ensures consistent code style  
3. **Type Checking (tsc)** - Prevents type-related bugs
4. **Secret Scanning (.husky/pre-commit-security-hook.js)** - Detects accidental credential commits

### CI Pipeline Security Gates

```yaml
security-scan:
  name: Security Scan
  steps:
    - npm audit --audit-level=critical           # Dependency vulnerabilities
    - grep scan for hardcoded secrets            # Static code analysis  
    - dependency-cruiser                         # Forbidden import detection
    - jest/security-tests                        # Unit tests with vulnerability mocks
```

---

## Compliance Considerations

### GDPR / Data Privacy
- User data encryption at rest (database columns with sensitive info)
- Right to be implemented (delete endpoint purges all user artifacts)
- Export functionality available for data portability
- Consent tracking for analytics/opt-ins

### SOC2 Type II Ready Requirements
- Audit logging implemented (all security decisions logged)
- Access reviews documented (RBAC matrix defined)
- Incident response process outlined (see SECURITY.md template)
- Change control enforced (ADR process for architectural changes)

### OWASP Top 10 Coverage
| Category | Status | Implementation |
|----------|--------|----------------|
| Broken Auth | ✅ Implemented | JWT strategy + rotation |
| Sensitive Data Exposure | ✅ Planned | Encryption at rest planned for v1.1 |
| Injection | ✅ Mitigated | Parameterized queries, validation |
| XXE | N/A | Not applicable (no XML processing) |
| Broken Access Control | ✅ Enforced | Policy engine authorization |
| Security Misconfig | ⚠️ Ongoing | Hardening docs being prepared |
| Vulnerable Components | ✅ CI scans automated | Dependabot integration |
| Insufficient Logging | ⚠️ Partial | Basic audit logging complete |
| SSRF | ⚠️ Pending | Network restriction planned |
| Deserialization | ✅ Avoided | No serialization used |

---

## Roadmap for Future Security Enhancements

| Phase | Item | Priority | Target |
|-------|------|----------|--------|
| v1.0 | Complete audit logging | Critical | Released |
| v1.0 | Add CSRF protection (anti-XSRF tokens) | Medium | Released |
| v1.0 | Implemented encryption-at-rest (AES-256-GCM) for sensitive columns in database | High | Implemented - See @sajja/forge-security/encryption.ts |
| v1.2 | Add Web Application Firewall (WAF) integration | Low | Planning |
| v1.2 | Implement comprehensive penetration testing program | High | Planning |
| v2.0 | Add hardware-backed key storage (HSM/TPM) | Low | Research |

---

## Emergency Response Procedures

In case of security incident:

1. **Containment**: Disable affected components, rotate compromised credentials
2. **Investigation**: Review audit logs, identify root cause and scope
3. **Notification**: Follow disclosure policy per SECURITY.md
4. **Remediation**: Patch vulnerability, enhance monitoring
5. **Post-mortem**: Document lessons learned, update security practices

Full incident response procedure documented in separate `docs/governance/INCIDENT-RESPONSE.md` (to be created).

---

## Conclusion

FORGE implements a robust multi-layered security architecture following industry best practices for secure software development. The combination of token-based authentication, policy-driven authorization, input validation, secret management, and runtime protections provides strong defense against common attack vectors while remaining flexible enough for future security enhancements.

*Security Architecture v1.0 — Part of FORGE Engineering Excellence Audit Phase 7*