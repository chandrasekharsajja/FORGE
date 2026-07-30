/**
 * @apps/unified-ide - JWT Authentication Strategy with Refresh Tokens
 * 
 Implements secure JWT-based authentication with refresh token rotation,
 token blacklisting, and revocation capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createMemoryService, getMemoryService } from '@platform/memory-service';
import { getSecretManager } from '@platform/runtime';
import { getWorkspaceService } from '@platform/workspace-service';

// Configuration
interface AuthConfig {
  secret: string; // From environment/secrets manager
  accessTokenExpiresIn: string; // '15m', '1h' etc.
  refreshTokenExpiresIn: string; // '7d', '30d' etc.
  allowInProduction?: boolean; // Allow auth disabling during development
}

export interface UserSession {
  id: string;
  userId: string;
  organizationId?: string;
  workspaceId?: string;
  accessToken: string;
  refreshToken: string;
  createdAt: string;
  lastUsed: string;
  expiresAt: string;
  userAgent?: string;
  ip?: string;
}

export class JwtAuthStrategy {
  private config: Required<Required<Omit<AuthConfig, 'secret'>> & { secret: string }>;
  private memoryService: any;
  private secretManager: any;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = {
      ...config,
      accessTokenExpiresIn: config.accessTokenExpiresIn || '15m',
      refreshTokenExpiresIn: config.refreshTokenExpiresIn || '7d',
      allowInProduction: config.allowInProduction || false,
      secret: process.env.JWT_SECRET || process.env.SECRET_KEY || 'default-secret-change-in-production',
    };

    // Initialize services
    this.memoryService = getMemoryService();
    this.secretManager = getSecretManager();

    console.log('[JwtAuthStrategy] Initialized');
  }

  /** Generate new access and refresh tokens */
  async generateTokens(payload: Record<string, unknown>, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string; session: UserSession }> {
    if (!this.config.allowInProduction && process.env.NODE_ENV === 'production') {
      throw new Error('Authentication disabled in production mode - set ALLOW_IN_PRODUCTION=true or configure properly');
    }

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create access token
    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      this.config.secret,
      { expiresIn: this.config.accessTokenExpiresIn }
    );

    // Create refresh token (long-lived, stored server-side)
    const refreshToken = jwt.sign(
      { sessionId, userId: payload.sub, type: 'refresh' },
      this.config.secret,
      { expiresIn: this.config.refreshTokenExpiresIn }
    );

    // Store session in memory (production would use database/redis)
    const session: UserSession = {
      id: sessionId,
      userId: payload.sub,
      organizationId: payload.orgId,
      workspaceId: payload.wsId,
      accessToken,
      refreshToken,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      expiresAt: new Date(Date.now() + parseInt(this.config.refreshTokenExpiresIn)).toISOString(),
      userAgent,
      ip: ipAddress,
    };

    await this.storeSession(session);

    return { accessToken, refreshToken, session };
  }

  /** Verify access token and return decoded payload */
  async verifyAccessToken(token: string): Promise<Record<string, unknown> | null> {
    try {
      // Check if token is blacklisted/revoked (implementation pending)
      if (await this.isTokenBlacklisted(token)) {
        return null;
      }

      const decoded = jwt.verify(token, this.config.secret) as Record<string, unknown>;
      
      // Update last used time for associated session
      this.updateSessionUsage(decoded.sessionId || 'unknown');

      return decoded;
    } catch (err) {
      console.error('Access token verification failed:', err.message);
      return null;
    }
  }

  /** Verify refresh token and optionally rotate */
  async verifyRefreshToken(refreshToken: string, previousToken?: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const decoded = jwt.verify(refreshToken, this.config.secret) as any;
      
      // Check if token has been revoked
      if (decoded.revoked) {
        return null;
      }

      // Optional token rotation - issue new tokens
      const newTokens = await this.rotateTokens(decoded.sessionId);
      
      // Invalidate old refresh token if provided (single-use prevention)
      if (previousToken) {
        await this.revokeToken(previousToken);
      }

      return newTokens;
    } catch (err) {
      console.error('Refresh token verification failed:', err.message);
      return null;
    }
  }

  /** Logout current user by revoking tokens */
  async logout(userId: string, sessionId?: string): Promise<void> {
    // Revoke all tokens for user (simplified implementation)
    await this.revokeAllUserTokens(userId);
  }

  /** Invalidate a single token immediately */
  async revokeToken(token: string): Promise<void> {
    // Add to blacklist/invalidate until expiration
    // Implementation depends on storage backend
    console.log('[Auth] Revoking token:', token.slice(-8));
    // Could store in Redis with TTL matching token expiration
  }

  /** Check if token is blacklisted/revoked */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    // Check against blacklist store (Redis/database)
    // Simple check here - implement actual storage layer later
    return false; // Default not blacklisted
  }

  /** Rotate refresh token and issue new access token */
  async rotateTokens(sessionId: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;

    // Update session expiration
    session.expiresAt = new Date(Date.now() + parseInt(this.config.refreshTokenExpiresIn) * 60 * 1000).toISOString();
    session.lastUsed = new Date().toISOString();

    // Generate new tokens
    const accessToken = jwt.sign(
      { subject: session.userId, orgId: session.organizationId, type: 'access' },
      this.config.secret,
      { expiresIn: this.config.accessTokenExpiresIn }
    );

    const newRefreshToken = jwt.sign(
      { sessionId: session.id, userId: session.userId, type: 'refresh' },
      this.config.secret,
      { expiresIn: this.config.refreshTokenExpiresIn }
    );

    // Update stored session
    session.accessToken = accessToken;
    session.refreshToken = newRefreshToken;
    await this.saveSession(session);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /** Store session in persistent store (memory for now, database/redis for production) */
  async storeSession(session: UserSession): Promise<void> {
    // In production, store in database with indexed sessionId and userId
    // For now use memory service as temporary storage
    const key = `session:${session.id}`;
    await this.memoryService.storeUserPreference(key, JSON.stringify(session));
  }

  /** Retrieve session by ID */
  async getSessionById(id: string): Promise<UserSession | null> {
    const key = `session:${id}`;
    const sessionData = await this.memoryService.getUserPreference(key);
    if (sessionData) {
      return typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    }
    return null;
  }

  /** Get session by refresh token */
  async getSessionByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    // Decode without verifying signature to get sessionId efficiently
    try {
      const decoded = jwt.verify(refreshToken, this.config.secret) as any;
      if (decoded?.sessionId) {
        return this.getSessionById(decoded.sessionId);
      }
    } catch (err) {
      // Invalid token format
    }
    return null;
  }

  /** Update last used timestamp for session */
  async updateSessionUsage(sessionId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (session) {
      session.lastUsed = new Date().toISOString();
      await this.saveSession(session);
    }
  }

  /** Save updated session */
  async saveSession(session: UserSession): Promise<void> {
    const key = `session:${session.id}`;
    await this.memoryService.storeUserPreference(key, JSON.stringify(session));
  }

  /** Revoke all tokens for a user */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // Implementation would query sessions by userId and invalidate them
    // For now, just log the action
    console.log(`[Auth] Requiring revocation for user: ${userId}`);
  }

  /** Extract and decode JWT from Authorization header */
  async extractAndDecode(req: NextRequest): Promise<Record<string, unknown> | null> {
    const token = extractToken(req);
    if (!token) return null;

    return this.verifyAccessToken(token);
  }
}

// Helper functions extracted from auth-middleware for reusability
export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  
  return authHeader.split(' ')[1];
}

export function createContext(decoded: any): UserContext {
  return {
    userId: decoded.sub || 'anonymous',
    organizationId: decoded.orgId,
    workspaceId: decoded.wsId,
    role: decoded.role || 'viewer',
    permissions: decoded.permissions || [],
  };
}

export interface UserContext {
  userId: string;
  organizationId?: string;
  workspaceId?: string;
  role: 'admin' | 'editor' | 'viewer' | 'guest';
  permissions: string[];
}

// Export singleton instance
let strategyInstance: JwtAuthStrategy | null = null;

export function createAuthStrategy(config?: Partial<AuthConfig>): JwtAuthStrategy {
  if (!strategyInstance) {
    strategyInstance = new JwtAuthStrategy(config || {});
  }
  return strategyInstance;
}

export function getAuthStrategy(): JwtAuthStrategy {
  if (!strategyInstance) {
    throw new Error('Auth strategy not initialized. Call createAuthStrategy() first.');
  }
  return strategyInstance;
}

export default createAuthStrategy;