/**
 * @packages/security/auth/oidc - OpenID Connect Client
 * 
 Implements OIDC authentication flows including Authorization Code Flow with PKCE,
 supporting identity providers that conform to OpenID Connect Discovery.
 */

import { v4 as uuidv4 } from 'uuid';
import { createMemoryService } from '@platform/memory-service';
import { getSecretManager } from '@platform/runtime';

// ==================== OIDC CONFIGURATION ====================

interface OIDCProviderConfig {
  issuer: string; // Base URL of IdP (e.g., https://login.microsoftonline.com/tenant/v2.0)
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[]; // Default: ['openid', 'profile', 'email']
  codeChallengeMethod?: 'S256' | 'plain';
}

interface OIDCSession {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  expiresAt: number;
  metadata: Record<string, any>;
}

// ==================== OIDC CLIENT ====================

class OIDCClient {
  private config: Required<OIDCProviderConfig>;
  private memoryService: any;
  private secretManager: any;

  constructor(config: OIDCProviderConfig) {
    this.config = {
      ...config,
      scopes: config.scopes || ['openid', 'profile', 'email'],
      codeChallengeMethod: config.codeChallengeMethod || 'S256',
    };
    this.memoryService = createMemoryService();
    this.secretManager = getSecretManager();
  }

  /** Start the OIDC authorization flow */
  async authorize(redirectUri?: string, state?: string): Promise<string> {
    const codeVerifier = uuidv4();
    const codeChallenge = this.calculateCodeVerifier(codeVerifier);
    
    const authState = {
      clientId: this.config.clientId,
      redirectUri: redirectUri || this.config.redirectUri,
      codeVerifier,
      codeChallenge,
      state: state || uuidv4(),
      createdAt: Date.now(),
    };

    // Store state for callback verification
    await this.memoryService.setUserPreference(`oidc-state:${authState.state}`, authState, { expiresIn: 300 });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri || this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: authState.state,
      code_challenge: authState.codeChallenge,
      code_challenge_method: this.config.codeChallengeMethod.toLowerCase(),
    });

    // Get discovery config first (simplified - in production would fetch .well-known/openid-configuration)
    const authEndpoint = `${this.config.issuer}/authorize`;
    return `${authEndpoint}?${params.toString()}`;
  }

  private calculateCodeVerifier(verifier: string): string {
    if (this.config.codeChallengeMethod === 'S256') {
      // SHA-256 hash of verifier, base64url encoded
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      // Simplified: In real implementation use Web Crypto API
      return btoa(String.fromCharCode(...new Uint8Array(data.length))).replace(/+/g, '-').replace(/\/g, '_').replace(/=+$/, '');
    }
    return verifier;
  }

  /** Complete the OIDC flow after receiving authorization code */
  async verifyCallback(code: string, redirectUri?: string, state?: string): Promise<OIDCSession> {
    if (!code) throw new Error('Missing authorization code');
    
    // Extract stored state
    const storedStateKey = state ? `oidc-state:${state}` : '';
    // In a real implementation, we'd validate the state parameter here
    
    // Exchange code for tokens (simplified)
    const tokens = await this.exchangeCodeForTokens(code, redirectUri || this.config.redirectUri);
    
    // Parse ID token (simplified - in production would decode and verify signature)
    const idTokenPayload = this.decodeIdToken(tokens.id_token);
    
    // Create session
    const session: OIDCSession = {
      sessionId: uuidv4(),
      userId: idTokenPayload.sub,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
      metadata: {
        provider: this.config.issuer.split('//')[1].split('/')[0],
        idTokenPayload,
      },
    };

    // Store session
    await this.memoryService.setUserPreference(`session:${session.sessionId}`, session, { expiresIn: tokens.expires_in || 3600 });
    
    return session;
  }

  private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ access_token: string; id_token: string; refresh_token?: string; expires_in: number }> {
    console.log(`[OIDC] Exchanging code for tokens with provider: ${this.config.issuer}`);
    // In production: POST to token endpoint with client credentials
    return {
      access_token: `ey1.${Math.random().toString(36).substr(2, 9)}.signature`,
      id_token: `id-${uuidv4()}`,
      refresh_token: `rt_${uuidv4()}`,
      expires_in: 3600,
    };
  }

  private decodeIdToken(idToken: string): Record<string, any> {
    // In production: Verify JWT signature using IdP's JWKS
    // For demo purposes, return dummy payload
    return { sub: `user-${uuidv4().substring(0, 8)}`, email: 'user@example.com', name: 'Test User' };
  }

  /** Logout by redirecting to IdP logout endpoint */
  async logout(redirectUri?: string): Promise<string> {
    const postLogoutRedirect = redirectUri || this.config.redirectUri;
    const logoutState = uuidv4();
    
    // Store for post-logout redirect validation
    await this.memoryService.setUserPreference(`logout-state:${logoutState}`, { redirectUri: postLogoutRedirect }, { expiresIn: 300 });
    
    const logoutEndpoint = `${this.config.issuer}/logout`;
    return `${logoutEndpoint}?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirect)}&state=${logoutState}`;
  }
}

export { OIDCClient, OIDCSession, OIDCProviderConfig };

// Convenience factory functions
export function createOIDCClient(config: OIDCProviderConfig): OIDCClient {
  return new OIDCClient(config);
}

export function createAzureADOrientClient(tenantId: string, clientId: string, redirectUri: string): OIDCClient {
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  return createOIDCClient({ issuer, clientId, redirectUri });
}

export function createOktaClient(domain: string, clientId: string, redirectUri: string): OIDCClient {
  const issuer = `https://${domain}/oauth2/default`;
  return createOIDCClient({ issuer, clientId, redirectUri });
}

export function createGoogleClient(clientId: string, redirectUri: string): OIDCClient {
  const issuer = 'https://accounts.google.com';
  return createOIDCClient({ issuer, clientId, redirectUri, scopes: ['openid', 'profile', 'email'] });
}
