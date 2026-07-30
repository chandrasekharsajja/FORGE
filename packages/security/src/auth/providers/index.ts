export type { AuthProviderConfig, OAuth2Config, SAML2Config, AuthSession } from './providers';
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

// Export OIDC helpers
export type { OIDCClient, OIDCSession, OIDCProviderConfig } from '../oidc';
export { createOIDCClient, createAzureADOrientClient, createOktaClient, createGoogleClient } from '../oidc';

// Export SAML SP helper
export type { SAML2SP } from '../saml';
export { SAML2SP } from '../saml';
