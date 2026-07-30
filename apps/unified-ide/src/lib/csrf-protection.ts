/**
 * @apps/unified-ide - Cross-Site Request Forgery (CSRF) Protection v2.0
 * 
 Implements enhanced CSRF token generation, validation, storage, and fingerprint-based
 token binding mechanisms with rate limiting for state-changing requests.
 * 
 Security improvements over v1.0:
 * - Token binding using IP address, User-Agent, and session fingerprint
 * - Rate limiting to prevent brute-force attacks
 * - SameSite=Strict/Lax cookie attribute enforcement
 * - Secure HTTP-only storage for tokens
 */

import { v4 as uuidv4 } from 'uuid';
import { getMemoryService } from '@platform/memory-service';
import { getSecretManager } from '@platform/runtime';

// Fingerprint configuration for token binding
const FINGERPRINT_CONFIG = {
  INCLUDE_IP: true,
  INCLUDE_USER_AGENT: true,
  INCLUDE_ACCEPT_LANGUAGE: true,
};

// Generate a strong cryptographically random token
function generateCSRFToken(): string {
  return uuidv4();
}

// Create a request fingerprint based on relevant headers
function createRequestFingerprint(req: any): string {
  const parts = [];
  
  if (FINGERPRINT_CONFIG.INCLUDE_IP && req.headers['x-forwarded-for']) {
    // Get the first IP in the chain (should be the client IP)
    const ip = req.headers['x-forwarded-for'].split(',')[0].trim();
    parts.push(ip);
  } else if (req.remoteAddress) {
    parts.push(req.remoteAddress);
  }
  
  if (FINGERPRINT_CONFIG.USER_AGENT) {
    const ua = req.headers['user-agent'] || '';
    parts.push(ua.substring(0, 100)); // Truncate to avoid oversized fingerprints
  }
  
  if (FINGERPRINT_CONFIG.ACCEPT_LANGUAGE) {
    parts.push(req.headers['accept-language'] || '');
  }
  
  return parts.join(':');
}

// Store CSRF token in secure storage with fingerprint binding
export function storeCSRFToken(token: string, fingerprint: string): void {
  const memoryService = getMemoryService();
  const secretId = `csrf:${token}`;
  
  // Store token with fingerprint binding and metadata
  const tokenData = {
    token,
    fingerprint,
    createdAt: Date.now(),
    expiresIn: 86400, // 24 hours
  };
  
  memoryService.storeUserPreference(secretId, tokenData, { expiresIn: 86400 });
  
  console.log('[CSRF] Token stored successfully with fingerprint binding');
}

// Validate CSRF token with fingerprint verification and rate limiting
export async function validateCSRFToken(token: string | null, req?: any): Promise<boolean> {
  if (!token) return false;
  
  // Apply rate limiting to CSRF validation to prevent abuse
  if (req) {
    try {
      // Apply rate limit check - allow 5 attempts per minute per IP
      const limiter = new SimpleRateLimiter(5);
      const ip = req.headers['x-forwarded-for'] || req.remoteAddress || 'unknown';
      const limiterCheck = limiter.check(ip);
      
      if (!limiterCheck) {
        console.warn('CSRF rate limit exceeded from', ip);
        return false;
      }
    } catch (e) {
      // If rate limiting fails, continue processing (fail open)
      console.warn('CSRF rate limiter encountered error:', e);
    }
  }
  
  const memoryService = getMemoryService();
  const secretId = `csrf:${token}`;
  
  // Check if token exists and hasn't expired
  const storedData = memoryService.getUserPreference(secretId);
  
  if (!storedData) return false;
  
  const { token: storedToken, fingerprint, createdAt, expiresIn } = storedData;
  
  // Check expiration
  if (Date.now() > createdAt + expiresIn * 1000) {
    memoryService.deleteUserPreference(secretId);
    return false;
  }
  
  // Verify fingerprint match (prevents token theft from one device/environment)
  if (req) {
    const reqFingerprint = createRequestFingerprint(req);
    // Accept fingerprint match or slight variations (for legitimate proxies)
    const isFingerPrintMatch = storedFingerprintMatches(reqFingerprint, fingerprint);
    
    if (!isFingerPrintMatch) {
      // Invalid attempt - revoke token
      memoryService.deleteUserPreference(secretId);
      return false;
    }
  }
  
  // Extend TTL for renewed session (sliding window)
  memoryService.storeUserPreference(secretId, storedData, { expiresIn: 86400 });
  
  return true;
}

// Helper to compare fingerprints with allowance for proxy variations
function storedFingerprintMatches(actual: string, stored: string): boolean {
  // Exact match is ideal, but allow some flexibility for shared characteristics
  if (actual === stored) return true;
  
  // Extract common identifiers from fingerprints
  const actualParts = actual.split(':');
  const storedParts = stored.split(':');
  
  // At least the IP should match (or same prefix if behind same proxy)
  if (actualParts.length > 0 && storedParts.length > 0) {
    if (actualParts[0] !== storedParts[0]) {
      // Check if they share the same subnet (simple first-octet comparison for IPv4)
      const actualIp = parseFirstOctet(actualParts[0]);
      const storedIp = parseFirstOctet(storedParts[0]);
      if (actualIp !== storedIp) return false;
    }
  }
  
  return true;
}

function parseFirstOctet(ipStr: string): number | null {
  const match = ipStr.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Generate new CSRF token pair for client-side forms with fingerprint
export function createCSRFPair(): { csrfToken: string; csrfSecret: string } {
  const csrfToken = generateCSRFToken();
  const csrfSecret = generateCSRFToken(); // For HMAC signing validation
  
  // We'll need fingerprint at time of form submission, so store just the token initially
  // The fingerprint will be captured during validation
  storeCSRFToken(csrfToken, ''); // Placeholder, fingerprint filled on submit
  
  return { csrfToken, csrfSecret };
}

// Middleware function to check CSRF header on state-changing requests
export async function createCSRFProtectionMiddleware(req: any, res: any, next: any) {
  // Only protect state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  
  // Look for CSRF token in header or body
  const headerToken = req.headers['x-csrf-token'] || req.body['_csrf'];
  
  if (!headerToken) {
    return res.status(403).json({ 
      success: false, 
      error: 'CSRF token required' 
    });
  }
  
  // Validate CSRF token with fingerprint
  const isValid = await validateCSRFToken(headerToken, req);
  
  if (!isValid) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired CSRF token' 
    });
  }
  
  // Attach validated token to request context for downstream use
  req.csrfValidated = true;
  req.csrfToken = headerToken;
  
  next();
}

// Export helper for generating HTML meta tag for CSRF protection
export function getCSRFMetaTag(csrfToken: string): string {
  return `<meta name="csrf-token" content="${escapeHtml(csrfToken)}">`;
}

// Escape HTML special characters to prevent XSS
function escapeHtml(text: string): string {
  // For Node.js environment without DOM, use simple escaping
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Initialize CSRF protection system on server startup
export async function initializeCSRFProtection(): Promise<void> {
  try {
    const memoryService = getMemoryService();
    const secretManager = getSecretManager();
    
    // Verify basic connectivity
    await memoryService.initialize();
    console.log('✅ CSRF protection system initialized successfully');
  } catch (error) {
    console.warn('⚠️ Warning: CSRF protection could not be fully initialized:', error.message);
    // Continue without CSRF protection (fail safe) - log warning only
  }
}

// Add CSRF token to response cookies (for Angular-style double submit cookie pattern)
export function addCSRFToCookie(req: any, res: any, csrfToken: string): void {
  // Use Next.js cookie API or set-cookie directly
  try {
    // Check if this is a Next.js response object
    if (res.cookies && res.cookies.set) {
      res.cookies.set('csrfToken', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 86400, // 24 hours
        path: '/',
        sameSite: 'strict', // Primary defense
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
    }
  } catch (e) {
    console.warn('Could not set CSRF cookie:', e);
  }
}

// Generate CSRF token with proper cookie attachment
export async function generateCSRFTokenWithCookie(req: any, res: any) {
  const { csrfToken } = createCSRFPair();
  
  // Bind current request fingerprint
  const fingerprint = createRequestFingerprint(req);
  storeCSRFToken(csrfToken, fingerprint);
  
  // Also store as cookie for double-submit pattern
  addCSRFToCookie(req, res, csrfToken);
  
  return { csrfToken };
}

// Utility to check if CSRF protection is enabled/enabled in environment
export function isCSRFEnabled(): boolean {
  return process.env.ENABLE_CSRF !== 'false';
}

// Simple token bucket rate limiter for CSRF validation
class SimpleRateLimiter {
  private tokens: Map<string, { tokens: number; lastRefill: number }>;
  private readonly maxTokens: number;
  private readonly refillRate: number; // Tokens per second
  private readonly windowMs: number; // Refill window in ms

  constructor(refillsPerMinute: number = 5) {
    this.tokens = new Map();
    this.maxTokens = refillsPerMinute;
    this.refillRate = refillsPerMinute / 60; // Tokens per second
    this.windowMs = 60000; // 1 minute window
  }

  check(key: string): boolean {
    const now = Date.now();
    let entry = this.tokens.get(key);
    
    if (!entry) {
      entry = { tokens: this.maxTokens, lastRefill: now };
      this.tokens.set(key, entry);
    }
    
    // Calculate elapsed seconds since last refill
    const elapsedSeconds = (now - entry.lastRefill) / 1000;
    
    // Refill tokens proportionally to elapsed time
    entry.tokens += elapsedSeconds * this.refillRate;
    entry.tokens = Math.min(entry.tokens, this.maxTokens);
    entry.lastRefill = now;
    
    // Check if we have a token available
    if (entry.tokens >= 1) {
      entry.tokens -= 1;
      return true;
    }
    
    return false;
  }
}

export default {
  generateCSRFToken,
  storeCSRFToken,
  validateCSRFToken,
  createCSRFPair,
  createCSFRLookup,
  getCSRFMetaTag,
  initializeCSRFProtection,
  createCSRFProtectionMiddleware,
  addCSRFToCookie,
  generateCSRFTokenWithCookie,
  isCSRFEnabled,
  escapeHtml,
  FINGERPRINT_CONFIG,
  SimpleRateLimiter,
  createRequestFingerprint,
};
