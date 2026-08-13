import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { fetchGoogleUserInfo, validateUserEmail } from '../services/authApi';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        // 1. Get user's Google profile (email, name, picture)
        const userInfo = await fetchGoogleUserInfo(tokenResponse.access_token);

        // 2. Check if this email is authorized in the backend
        const { authorized } = await validateUserEmail(userInfo.email);

        if (authorized) {
          sessionStorage.setItem('authenticated', 'true');
          sessionStorage.setItem('userEmail', userInfo.email.trim().toLowerCase());
          sessionStorage.setItem('userName', userInfo.name || '');
          sessionStorage.setItem('userPicture', userInfo.picture || '');
          navigate('/');
        } else {
          setError('Your Google account is not authorized to access this application.');
        }
      } catch (err) {
        setError(err.message || 'Sign-in failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed. Please try again.');
    },
  });

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
              className="btn-google"
              onClick={() => googleLogin()}
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {loading ? 'Signing in...' : 'Continue with Google SSO'}
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
