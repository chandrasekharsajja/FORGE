/**
 * @packages/security/auth/providers - Enterprise Authentication Providers
 * Exports all authentication provider classes and helpers
 */

export type { 
  AuthProviderConfig, 
  OAuth2Config, 
  SAML2Config, 
  AuthSession 
} from './providers';

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
} from './providers';
