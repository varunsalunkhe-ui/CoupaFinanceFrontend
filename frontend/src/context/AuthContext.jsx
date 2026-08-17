import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useOktaAuth } from '@okta/okta-react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { authState, oktaAuth } = useOktaAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authState) return;

    if (authState.isAuthenticated) {
      oktaAuth.getUser().then((info) => {
        setUser(info);
        sessionStorage.setItem('authenticated', 'true');
        sessionStorage.setItem('userEmail', (info.email || '').trim().toLowerCase());
        sessionStorage.setItem('userName', info.name || '');
        setLoading(false);
      }).catch((err) => {
        console.error('[Auth] Failed to get user info:', err);
        setLoading(false);
      });
    } else {
      setUser(null);
      sessionStorage.removeItem('authenticated');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('userName');
      setLoading(false);
    }
  }, [authState, oktaAuth]);

  const logout = useCallback(async () => {
    sessionStorage.clear();
    await oktaAuth.tokenManager.clear();
    window.location.replace('/login');
   
  }, [oktaAuth]);

  const value = {
    user,
    loading,
    isAuthenticated: authState?.isAuthenticated ?? false,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
