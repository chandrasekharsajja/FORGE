/**
 * @apps/unified-ide - Authentication middleware for API routes
 * 
 Provides JWT-based authentication and authorization for internal API endpoints.
 */

import { type NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getPolicyEngine } from '@platform/policy-engine';
import { createMemoryService } from '@platform/memory-service';

// CONTRACTS
import type { JwtPayload } from '@sajja/contracts';

interface UserContext {
  userId: string;
  organizationId?: string;
  workspaceId?: string;
  role: 'admin' | 'editor' | 'viewer' | 'guest';
  permissions: string[];
}

export interface AuthenticatedRequest extends NextRequest {
  ctx: UserContext;
}

/** Extract JWT token from Authorization header */
export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  
  return authHeader.split(' ')[1];
}

/** Verify JWT token and decode payload */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    // Secret should come from environment/secrets manager
    const secret = process.env.JWT_SECRET || process.env.SECRET_KEY || 'dev-secret-change-in-prod';
    
    const decoded = jwt.verify(token, secret as Buffer | string) as JwtPayload;
    return decoded;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

/** Get user context from decoded payload */
export function createContext(decoded: JwtPayload): UserContext {
  return {
    userId: decoded.sub || 'anonymous',
    organizationId: decoded.orgId,
    workspaceId: decoded.wsId,
    role: decoded.role || 'viewer',
    permissions: decoded.permissions || [],
  };
}

/** Authentication middleware handler */
export async function authenticate(
  request: NextRequest, 
  requiredRole?: 'admin' | 'editor' | 'viewer' | 'guest'
): Promise<UserContext | null> {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    return null;
  }

  const context = createContext(decoded);

  // Check minimum required role if specified
  if (requiredRole && context.role !== requiredRole) {
    return null;
  }

  return context;
}

/** Express.js style middleware wrapper */
export function expressAuthMiddleware(
  requiredRole?: 'admin' | 'editor' | 'viewer' | 'guest'
) {
  return async (req: any, res: any, next: any) => {
    const context = await authenticate(req as NextRequest, requiredRole);
    
    if (!context) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    req.ctx = context;
    next();
  };
}

/** Next.js Route Handler decorator pattern */
export function withAuth<T extends NextResponse | Promise<NextResponse>>(
  handler: (req: NextRequest, ctx: UserContext) => T,
  requiredRole?: 'admin' | 'editor' | 'viewer' | 'guest'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const context = await authenticate(req as NextRequest, requiredRole);
    
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    return handler(req, context);
  };
}

// Rate limiting middleware (simple token bucket implementation)
class SimpleRateLimiter {
  private tokens: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private readonly refillsPerMinute = 100; // Default rate limit
  private readonly refillRate = 60 / this.refillsPerTokens; // Tokens per second

  constructor(refillsPerMinute: number = this.refillsPerMinute) {
    this.refillsPerMinute = refillsPerMinute;
    this.refillRate = refillsPerMinute / 60;
  }

  check(ip: string | UserId): boolean {
    const now = Date.now();
    const key = String(ip);
    
    let entry = this.tokens.get(key);
    if (!entry) {
      entry = { tokens: this.refillsPerMinute, lastRefill: now };
      this.tokens.set(key, entry);
    }

    // Refill tokens based on time elapsed
    const elapsedSeconds = (now - entry.lastRefill) / 1000;
    entry.tokens += elapsedSeconds * this.refillRate;
    entry.tokens = Math.min(entry.tokens, this.refillsPerMinute);
    entry.lastRefill = now;

    if (entry.tokens >= 1) {
      entry.tokens--;
      return true;
    }

    return false;
  }

  cleanup() {
    // Remove old entries - simplified implementation
    for (const [key, entry] of this.tokens.entries()) {
      if (Date.now() - entry.lastRefill > 60000) { // 1 minute idle
        this.tokens.delete(key);
      }
    }
  }
}

const globalRateLimiter = new SimpleRateLimiter(100); // 100 requests/minute per IP

/**
 * Apply rate limiting to protect backend services from abuse
 */
export async function rateLimitMiddleware(request: NextRequest): Promise<boolean> {
  const ip = request.headers.get('x-forwarded-for') || request.remoteAddress || 'unknown';
  
  if (!globalRateLimiter.check(ip)) {
    // Would typically throw a custom error object caught by caller
    console.warn(`Rate limit exceeded from ${ip}`);
    return false;
  }
  
  return true;
}

/** Enhanced request decorator combining auth + rate limiting */
export function rateLimitedAuth<T extends NextResponse | Promise<NextResponse>>(
  handler: (req: NextRequest, ctx: UserContext) => T,
  requiredRole?: 'admin' | 'editor' | 'viewer' | 'guest'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Check rate limit first
    if (!(await rateLimitMiddleware(req))) {
      return NextResponse.json(
        { success: false, error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    // Then check authentication
    const context = await authenticate(req as NextRequest, requiredRole);
    
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(req, context);
  };
}

export default { authenticate, extractToken, verifyToken, createContext, expressAuthMiddleware, withAuth, rateLimitMiddleware };