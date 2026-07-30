# API Route Architecture Standard

**Version**: 1.0  
**Purpose**: Define standard patterns for Next.js API routes in unified IDE  
**Status**: Implementation Guide  

---

## Design Principles

1. **Single Responsibility**: Each API route handles exactly one business operation or resource endpoint.
2. **Authentication First**: All routes that access protected services should verify auth first.
3. **Policy Enforcement**: Routes should call `policyMiddleware` before executing state-changing operations.
4. **Error Handling**: Consistent error responses with status codes and machine-readable error fields.
5. **Response Standardization**: Consistent success/error response shapes across all endpoints.
6. **CORS Security**: Proper CORS configuration when needed.
7. **Rate Limiting**: Apply rate limiting per IP/user where appropriate.

---

## Standard API Route Template

Create reusable middleware in `apps/unified-ide/src/lib/api-middleware.ts`:

```typescript
// apps/unified-ide/src/lib/api-middleware.ts
import { type NextRequest } from 'next/server';
import { getPolicyEngine } from '@platform/policy-engine';
import { getWorkspaceService } from '@platform/workspace-service';
import { getArtifactService } from '@platform/artifact-service';

export async function authenticate(req: NextRequest): Promise<{ userId?: string, orgId?: string } | null> {
  // Extract JWT from Authorization header or cookies
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.split(' ')[1];
  // Verify token (implementation depends on auth service)
  try {
    const decoded = await verifyToken(token); // Placeholder function
    return { userId: decoded.userId, orgId: decoded.orgId };
  } catch (e) {
    console.error('Auth failed:', e);
    return null;
  }
}

export async function enforcePolicy(action: string, context?: any) {
  const policy = getPolicyEngine();
  const result = await policy.evaluateAction(action, context);
  if (!result.allowed) {
    throw new Error(`Policy violation: ${result.reason}`);
  }
  return result;
}

// Response shape helpers
export const ok = (data: unknown) => Response.json({ success: true, data });
export const error = (message: string, status = 400) => 
  Response.json({ success: false, error: message }, { status });
```

---

## Example: Mission Execution API Route

**File**: `apps/unified-ide/src/app/api/mission/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-middleware';
import { enforcePolicy } from '@/lib/api-middleware';
import { runMissionPrompt } from '@/lib/dashboard-model';

export async function POST(req: NextRequest) {
  // 1. Authenticate request
  const auth = await authenticate(req);
  if (!auth) {
    return error('Unauthorized', 401);
  }

  // 2. Parse body
  const body = await req.json();
  const { prompt, missionType = 'coding' } = body || {};

  if (!prompt || typeof prompt !== 'string') {
    return error('Prompt required', 400);
  }

  // 3. Enforce policy
  try {
    await enforceAction('execute_mission', { organizationId: auth.orgId });
  } catch (e) {
    return error(e.message, 403);
  }

  // 4. Execute mission
  try {
    const result = await runMissionPrompt(prompt, missionType, auth);
    return ok(result);
  } catch (e) {
    console.error('Mission execution failed:', e);
    return error('Internal server error', 500);
  }
}

// GET health check endpoint
export async function GET() {
  return ok({ status: 'healthy', timestamp: new Date().toISOString() });
}
```

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* your payload */ },
  "timestamp": "2026-07-30T12:00:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE_ENUMERABLE", // Machine-readable code
  "details": { /* optional extra info */ },
  "timestamp": "2026-07-30T12:00:00Z"
}
```

Common error codes:
- `UNAUTHORIZED` - Missing/invalid credentials
- `FORBIDDEN` - Authenticated but not allowed
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Conflict with existing state
- `INTERNAL_SERVER_ERROR` - Server-side failure

---

## Complete API Endpoint Reference

| Endpoint | Method | Description | Requires Auth | Policy Action |
|----------|--------|-------------|---------------|---------------|
| `/api/mission` | POST | Submit mission for execution | Yes | `execute_mission` |
| `/api/dashboard` | GET | Get dashboard snapshot | No | - |
| `/api/workspace` | GET | List workspaces for org | Yes | `view_workspace` |
| `/api/workspace/:id` | GET | Get workspace details | Yes | `view_workspace` |
| `/api/workspace` | POST | Create new workspace | Yes | `create_workspace` |
| `/api/artifacts` | GET | List artifacts | Yes | `view_artifacts` |
| `/api/artifacts/:id` | GET | Get artifact details | Yes | `view_artifact` |
| `/api/events/stream` | GET | WebSocket/SSE stream events | Yes | `subscribe_events` |

---

## CORS Configuration

For frontend-backend communication within same origin, no special CORS needed. For cross-origin scenarios (future multi-deployment), configure:

```typescript
// In api-middleware or global config
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function applyCorsHeaders(res: Response) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.headers.set(key, value);
  });
}

// Use in route handlers
export async function OPTIONS(req: NextRequest) {
  applyCorsHeaders(new Response(null));
  return new Response(null, { status: 204 });
}
```

---

## Rate Limiting Strategy (Future Implementation)

When added, implement using Redis:
- Per-user limit: 100 requests/minute
- Per-IP limit: 50 requests/minute  
- Exceed → return 429 Too Many Requests with Retry-After header

Use a wrapper middleware:

```typescript
export async function rateLimit(userId: string, ip: string) {
  const redis = getRedisClient(); // Implement singleton
  const key = `rate_limit:${userId}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60); // Reset after 60 seconds
  if (count > 100) throw new Error('Rate limit exceeded');
}
```

---

## Security Best Practices

1. **Input Validation**: Always validate incoming request bodies with Zod or Joi schema validation.
2. **SQL Injection Prevention**: Use parameterized queries (pg does this automatically).
3. **XSS Prevention**: Sanitize any user input rendered in HTML/JSON responses.
4. **Secret Management**: Never log tokens, passwords, or secrets. Use environment variables.
5. **HTTPS Only**: Enforce HTTPS in production (Next.js does this automatically when deployed with proper config).

---

*API Route Architecture Standard — Part of FORGE Engineering Excellence Audit Phase 4*