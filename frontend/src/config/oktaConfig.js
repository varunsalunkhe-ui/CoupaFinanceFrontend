const OKTA_CLIENT_ID = import.meta.env.VITE_OKTA_CLIENT_ID;
const OKTA_ISSUER = import.meta.env.VITE_OKTA_ISSUER;
const API_SCOPES = (import.meta.env.VITE_OKTA_API_SCOPES || '').split(/[\s,]+/).filter(Boolean);

const oktaConfig = {
  clientId: OKTA_CLIENT_ID,
  issuer: OKTA_ISSUER,
  redirectUri: `${window.location.origin}/login/callback`,
  scopes: [...new Set(['openid', 'email', ...API_SCOPES])],
  pkce: true,
  responseType: 'code',
  tokenManager: {
    storage: 'localStorage',
  },
  // Use localStorage for PKCE transaction data so it survives across redirects
  storageManager: {
    transaction: { storageTypes: ['localStorage'] },
    cache: { storageTypes: ['localStorage'] },
  },
};

export default oktaConfig;
