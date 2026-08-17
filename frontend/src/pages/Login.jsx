import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import './Login.css';

const Login = () => {
  const { authState, oktaAuth } = useOktaAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authState?.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleOktaLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await oktaAuth.signInWithRedirect({ originalUri: '/' });
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Section - Form */}
      <div className="login-left">
        <div className="login-left-inner">
          <div className="brand-mark">
            <img src="/coupa.jpg" alt="Coupa" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
            <span className="brand-name">Coupa Finance</span>
          </div>

          <div className="form-header">
            <h1>Sign in</h1>
            <p>Access your customer value intelligence dashboard</p>
          </div>

          <form className="login-form">
            {error && (
              <div className="error-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="button"
              className="btn-okta"
              onClick={handleOktaLogin}
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#007DC1" strokeWidth="2.5" fill="none" />
                  <circle cx="12" cy="12" r="4" fill="#007DC1" />
                </svg>
              )}
             {loading ? 'Redirecting to Okta...' : 'Continue with Okta SSO'}
            </button>
          </form>

          <p className="login-footer">
            &copy; 2026 Coupa Finance &middot; Enterprise Intelligence Platform
          </p>
        </div>
      </div>

      {/* Right Section - Visual */}
      <div className="login-right">
        <div className="right-content">
          <div className="floating-orb orb-1"></div>
          <div className="floating-orb orb-2"></div>
          <div className="floating-orb orb-3"></div>

          <div className="hero-text">
            <div className="hero-badge">AI-Powered</div>
            <h2>Account Intelligence<br /><span>Dashboard</span></h2>
            <p>Turn procurement data into strategic advantage with real-time AI insights across your entire portfolio.</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">$3.3B</div>
              <div className="stat-label">Spend Managed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">47x</div>
              <div className="stat-label">ROI Delivered</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">2.4K</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0.6d</div>
              <div className="stat-label">Cycle Time</div>
            </div>
          </div>

          <div className="trust-bar">
            <span className="trust-dot"></span>
            Trusted by Fortune 500 procurement teams
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
