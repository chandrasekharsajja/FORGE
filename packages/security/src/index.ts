/**
 * @sajja/forge-security - Security Utilities & Analysis
 * Combines SAST scanning (Semgrep, CodeQL, Trivy, Gitleaks) with cryptographic primitives,
 access controls, enterprise authentication integrations, and encryption at rest.
 */

export { SecurityFinding, SecurityScanner } from './scanner';

// Data Protection / Encryption-at-Rest utilities
export * from './encryption';

// Enterprise Authentication Providers
export type { 
  AuthProviderConfig, 
  OAuth2Config, 
  SAML2Config, 
  AuthSession 
} from './auth/providers';
export { 
  AuthProvider, 
  OAuth2AuthProvider, 
  SAML2AuthProvider, 
  AuthenticationManager, 
  authManager,
  registerOktaOAuth,
  registerAzureADOAuth,
  registerGoogleOAuth,
  registerKeycloakOAuth,
  registerSAML2Sp
} from './auth/providers';

// OpenID Connect Client utilities
export type { OIDCClient, OIDCSession, OIDCProviderConfig } from './auth/oidc';
export { createOIDCClient, createAzureADOrientClient, createOktaClient, createGoogleClient } from './auth/oidc';

// SAML 2.0 Service Provider
export type { SAML2SP } from './auth/saml';
export { SAML2SP } from './auth/saml';
