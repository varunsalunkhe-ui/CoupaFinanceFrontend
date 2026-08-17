import React from 'react';
import { LoginCallback as OktaLoginCallback } from '@okta/okta-react';

const LoginCallbackError = ({ error }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
    <div style={{ textAlign: 'center', maxWidth: 400 }}>
      <h2 style={{ color: '#DC2626', fontSize: '1.25rem', marginBottom: 12 }}>Authentication Error</h2>
      <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: 20 }}>{error.message || 'An error occurred during sign-in.'}</p>
      <a href="/login" style={{ color: '#0369A1', fontWeight: 600, textDecoration: 'none' }}>Return to Login</a>
    </div>
  </div>
);

const LoginCallbackPage = () => (
  <OktaLoginCallback errorComponent={LoginCallbackError} />
);

export default LoginCallbackPage;
