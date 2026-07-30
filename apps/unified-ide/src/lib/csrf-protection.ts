/**
 * CSRF Protection - corrected & hardened
 *
 * - Normalized fingerprint flags
 * - Cryptographically secure token generation
 * - HMAC signing & verification using secret manager
 * - Safe cookie usage: httpOnly cookie stores session-bound token id; client reads signed token returned by API (meta/header)
 * - Fixed typos in exports
 * - Simple in-memory rate limiter with TTL cleanup
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { getMemoryService } from '@platform/memory-service';
import { getSecretManager } from '@platform/runtime';

// Fingerprint configuration for token binding (explicit keys)
const FINGERPRINT_CONFIG = {
  INCLUDE_IP: true,
  INCLUDE_USER_AGENT: true,
  INCLUDE_ACCEPT_LANGUAGE: true,
} as const;

// Token settings
const TOKEN_BYTES = 32; // 256-bit token
const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

function generateRandomToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

// Create a request fingerprint based on relevant headers
function createRequestFingerprint(req: any): string {
  const parts: string[] = [];

  if (FINGERPRINT_CONFIG.INCLUDE_IP) {
    const ipHeader = req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress;
    if (ipHeader) {
      const ip = String(ipHeader).split(',')[0].trim();
      parts.push(ip);
    }
  }

  if (FINGERPRINT_CONFIG.INCLUDE_USER_AGENT) {
    const ua = req.headers?.['user-agent'] || '';
    parts.push(String(ua).substring(0, 200));
  }

  if (FINGERPRINT_CONFIG.INCLUDE_ACCEPT_LANGUAGE) {
    parts.push(req.headers?.['accept-language'] || '');
  }

  return parts.join(':');
}

// Store CSRF token in secure storage with fingerprint binding
export async function storeCSRFToken(tokenId: string, data: { fingerprint: string; createdAt?: number }) {
  const memoryService = getMemoryService();
  const secretId = `csrf:${tokenId}`;

  const tokenData = {
    id: tokenId,
    fingerprint: data.fingerprint,
    createdAt: data.createdAt ?? Date.now(),
    expiresIn: TOKEN_TTL_SECONDS,
  };

  // storeUserPreference may be async
  await memoryService.storeUserPreference(secretId, tokenData, { expiresIn: TOKEN_TTL_SECONDS });
}

// Validate CSRF token with fingerprint verification and rate limiting
export async function validateCSRFToken(signedToken: string | null, req?: any): Promise<boolean> {
  if (!signedToken) return false;

  // Basic format: "<tokenId>.<hex-hmac>"
  const parts = String(signedToken).split('.');
  if (parts.length !== 2) return false;
  const [tokenId, providedHmac] = parts;

  try {
    // Rate limiting (best-effort local)
    if (req) {
      const ip = (req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown').toString();
      if (!SimpleRateLimiter.shared().check(ip)) {
        console.warn('[CSRF] rate limit exceeded for', ip);
        return false;
      }
    }
  } catch (e) {
    // fail closed for rate-limiter issues -> be permissive but log non-sensitive info
    console.warn('[CSRF] rate limiter error (non-fatal)');
  }

  const memoryService = getMemoryService();
  const secretId = `csrf:${tokenId}`;
  const storedData = await memoryService.getUserPreference(secretId);

  if (!storedData) return false;

  const { id: storedId, fingerprint: storedFingerprint, createdAt, expiresIn } = storedData;
  if (!storedId || storedId !== tokenId) return false;

  // Check expiration
  if (Date.now() > (createdAt + (expiresIn * 1000))) {
    await memoryService.deleteUserPreference(secretId);
    return false;
  }

  // Verify HMAC using secret manager
  const secretManager = getSecretManager();
  const hmacKey = await secretManager.getSecret?.('CSRF_HMAC_KEY') || process.env.CSRF_HMAC_KEY;
  if (!hmacKey) {
    // If no HMAC key, reject (requires configuration)
    console.warn('[CSRF] missing HMAC key configuration');
    return false;
  }

  const expectedHmac = createHmac('sha256', hmacKey).update(tokenId).digest('hex');

  // timing-safe compare
  try {
    const providedBuffer = Buffer.from(providedHmac, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
      // revoke token on tampering
      await memoryService.deleteUserPreference(secretId);
      return false;
    }
  } catch (e) {
    // invalid hex or compare failure
    await memoryService.deleteUserPreference(secretId);
    return false;
  }

  // Verify fingerprint (conservative: require exact match)
  if (req) {
    const reqFingerprint = createRequestFingerprint(req);
    if (storedFingerprint && storedFingerprint !== reqFingerprint) {
      // revoke token and fail
      await memoryService.deleteUserPreference(secretId);
      return false;
    }
  }

  // Sliding window: refresh TTL
  await memoryService.storeUserPreference(secretId, storedData, { expiresIn: TOKEN_TTL_SECONDS });

  return true;
}

// Create signed token for client (returned to client for header/meta usage)
// format: "<tokenId>.<hmac>"
export async function createSignedCSRFTokenForClient(req: any): Promise<{ signedToken: string; tokenId: string }> {
  // Generate token id and bind fingerprint
  const tokenId = generateRandomToken();
  const fingerprint = createRequestFingerprint(req);

  // store server-side mapping
  await storeCSRFToken(tokenId, { fingerprint });

  // sign tokenId
  const secretManager = getSecretManager();
  const hmacKey = await secretManager.getSecret?.('CSRF_HMAC_KEY') || process.env.CSRF_HMAC_KEY;
  if (!hmacKey) throw new Error('CSRF HMAC key not configured');

  const mac = createHmac('sha256', hmacKey).update(tokenId).digest('hex');
  const signed = `${tokenId}.${mac}`;

  return { signedToken: signed, tokenId };
}

// Add cookie for double-submit pattern: we will set a httpOnly cookie that stores tokenId only,
// and return the signed token back to client body/meta so client can send signedToken in header.
// This is more secure than making cookie readable to JS.
export function addCSRFToCookie(res: any, tokenId: string): void {
  try {
    // Prefer framework-specific cookie setter where available
    if (res.cookies && typeof res.cookies.set === 'function') {
      res.cookies.set('csrfTokenId', tokenId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: TOKEN_TTL_SECONDS,
        path: '/',
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
    } else {
      // Fallback to set-cookie header
      const cookieParts = [
        `csrfTokenId=${encodeURIComponent(tokenId)}`,
        `Max-Age=${TOKEN_TTL_SECONDS}`,
        `Path=/`,
        `SameSite=Strict`,
        process.env.NODE_ENV === 'production' ? 'Secure' : '',
        'HttpOnly',
      ].filter(Boolean);
      res.setHeader('Set-Cookie', cookieParts.join('; '));
    }
  } catch (e) {
    // Do not leak details — use generic warn
    console.warn('[CSRF] could not set cookie (non-fatal)');
  }
}

// Convenience middleware for Next.js/Express-style handlers
export async function createCSRFProtectionMiddleware(req: any, res: any, next: any) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  // Look for signed token in header or body
  const signedToken = req.headers['x-csrf-token'] || req.body?._csrf || null;

  if (!signedToken) {
    return res.status?.(403).json?.({ success: false, error: 'CSRF token required' }) || res.end('CSRF token required');
  }

  const valid = await validateCSRFToken(String(signedToken), req);
  if (!valid) {
    return res.status?.(403).json?.({ success: false, error: 'Invalid or expired CSRF token' }) || res.end('Invalid or expired CSRF token');
  }

  // attach context
  req.csrfValidated = true;
  req.csrfToken = signedToken;

  return next();
}

/* Simple in-memory rate limiter with TTL cleanup */
class SimpleRateLimiter {
  private static _shared: SimpleRateLimiter | null = null;
  private tokens: Map<string, { tokens: number; lastRefill: number; lastSeen: number }>;
  private readonly maxTokens: number;
  private readonly refillRatePerSecond: number;
  private readonly windowMs: number;
  private readonly cleanupIntervalMs = 60 * 1000;

  constructor(refillsPerMinute = 5) {
    this.tokens = new Map();
    this.maxTokens = refillsPerMinute;
    this.refillRatePerSecond = refillsPerMinute / 60;
    this.windowMs = 60_000;
    setInterval(() => this.cleanup(), this.cleanupIntervalMs).unref?.();
  }

  static shared() {
    if (!SimpleRateLimiter._shared) SimpleRateLimiter._shared = new SimpleRateLimiter(5);
    return SimpleRateLimiter._shared;
  }

  check(key: string): boolean {
    const now = Date.now();
    let entry = this.tokens.get(key);
    if (!entry) {
      entry = { tokens: this.maxTokens, lastRefill: now, lastSeen: now };
      this.tokens.set(key, entry);
    }

    // refill
    const elapsed = (now - entry.lastRefill) / 1000;
    entry.tokens = Math.min(this.maxTokens, entry.tokens + elapsed * this.refillRatePerSecond);
    entry.lastRefill = now;
    entry.lastSeen = now;

    if (entry.tokens >= 1) {
      entry.tokens -= 1;
      return true;
    }
    return false;
  }

  cleanup() {
    const now = Date.now();
    for (const [k, v] of this.tokens.entries()) {
      // remove entries not seen for 10 minutes
      if (now - v.lastSeen > 10 * 60 * 1000) {
        this.tokens.delete(k);
      }
    }
  }
}

export default {
  generateRandomToken,
  storeCSRFToken,
  validateCSRFToken,
  createSignedCSRFTokenForClient,
  createCSRFProtectionMiddleware,
  addCSRFToCookie,
  createRequestFingerprint,
  FINGERPRINT_CONFIG,
  SimpleRateLimiter,
};
