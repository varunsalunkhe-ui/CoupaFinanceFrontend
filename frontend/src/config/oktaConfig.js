const OKTA_CLIENT_ID = import.meta.env.VITE_OKTA_CLIENT_ID;
const OKTA_ISSUER = import.meta.env.VITE_OKTA_ISSUER;
const OKTA_REDIRECT_URI = import.meta.env.VITE_OKTA_REDIRECT_URI || `${window.location.origin}/login/callback`;

const oktaConfig = {
  clientId: OKTA_CLIENT_ID,
  issuer: OKTA_ISSUER,
  redirectUri: OKTA_REDIRECT_URI,
  scopes: ['openid', 'email'],
  pkce: true,
  responseType: 'code',
};

export default oktaConfig;
