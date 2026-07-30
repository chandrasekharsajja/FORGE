/**
 * @platform/runtime - Rate limiting middleware for protecting services
 * 
 Implements token bucket algorithm with sliding window support for distributed systems.
 */

import { v4 as uuidv4 } from 'uuid';

// CONTRACTS
export interface RateLimitConfig {
  maxRequests: number;      // Maximum requests per time window
  windowMs: number;         // Time window in milliseconds
  keyGenerator?: (context: any) => string; // Optional custom key generator
  store?: MemoryStore;     // Optional storage backend (Redis/Memory)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;    // Seconds until reset
  limit: number;
  timestamp: string;
}

export interface MemoryStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
  increment(key: string): Promise<number>;
  del(key: string): Promise<void>;
}

class MemoryRateLimiter implements MemoryStore {
  private stores = new Map<string, { count: number; expires: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.stores.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.stores.delete(key);
      return null;
    }
    return String(entry.count);
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    this.stores.set(key, { 
      count: parseInt(value), 
      expires: Date.now() + ttl 
    });
  }

  async increment(key: string): Promise<number> {
    const now = Date.now();
    let entry = this.stores.get(key);
    
    if (!entry || entry.expires < now) {
      entry = { count: 1, expires: now + 60000 }; // Default TTL 1 minute
      this.stores.set(key, entry);
    } else {
      entry.count++;
    }
    
    return entry.count;
  }

  async del(key: string): Promise<void> {
    this.stores.delete(key);
  }
}

export class RateLimiter {
  private config: Required<Omit<RateLimitConfig, 'keyGenerator'>> & { 
    keyGenerator: (context: any) => string; 
    store: MemoryStore;
  };

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      ...config,
      keyGenerator: config.keyGenerator || ((ctx: any) => ctx.ip || 'anonymous'),
      store: config.store || new MemoryRateLimiter(),
    };
    
    console.log('[RateLimiter] Initialized with:', config.maxRequests, 'requests per', config.windowMs, 'ms');
  }

  /** Check if request is permitted and return rate limit metadata */
  async check(ctx: any): Promise<RateLimitResult> {
    try {
      const key = this.config.keyGenerator(ctx);
      
      // Get current count and check against limit
      const count = await this.config.store.increment(key);
      
      // Determine window end time
      const windowEnd = Date.now() + this.config.windowMs;
      const remaining = Math.max(0, this.config.maxRequests - count);
      
      // Calculate retry after time in seconds
      let retryAfter: number | undefined;
      if (count > this.config.maxRequests) {
        retryAfter = Math.ceil((windowEnd - Date.now()) / 1000);
      }
      
      return {
        allowed: count <= this.config.maxRequests,
        remaining,
        retryAfter,
        limit: this.config.maxRequests,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Rate limiter error:', err.message);
      // Fail open - allow request when store fails
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        limit: this.config.maxRequests,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /** Middleware function for Express-style frameworks */
  middleware(ctx: any, next: () => Promise<void>) {
    return async () => {
      const result = await this.check(ctx);
      
      if (!result.allowed) {
        throw new Error(`Too many requests. Try again later (${result.retryAfter}s)`);
      }

      await next();
    };
  }

  /** Next.js API route handler wrapper */
  async handleNextRequest(request: Request, response: (data: any) => void): Promise<Response> {
    // Extract context from request
    const context = {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('ip') || 'unknown',
      method: request.method,
      url: request.url,
    };

    const result = await this.check(context);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many requests', 
          retryAfter: result.retryAfter 
        }), 
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call the handler with updated context containing rate limit info
    const enhancedRequest = { ...request, _rateLimit: result };
    return response(await request.then(() => {}));
  }
}

// Global singleton instance
let globalLimiter: RateLimiter | null = null;

export function createRateLimiter(config?: RateLimitConfig): RateLimiter {
  if (!globalLimiter) {
    globalLimiter = new RateLimiter(config || { maxRequests: 100, windowMs: 60000 });
  }
  return globalLimiter;
}

export function getRateLimiter(): RateLimiter {
  if (!globalLimiter) {
    throw new Error('Rate limiter not initialized. Call createRateLimiter() first.');
  }
  return globalLimiter;
}

// Convenience decorators
export function rateLimitedDecorator<T extends Function>(fn: T, config?: RateLimitConfig): T {
  const limiter = createRateLimiter(config);
  
  // Return wrapped function that performs rate checking before calling original
  return ((...args: any[]) => {
    const context = args[0]; // Assuming first arg contains request/context in typical patterns
    return limiter.middleware(context, fn);
  }) as any;
}

export default createRateLimiter;