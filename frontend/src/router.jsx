import React from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Security } from '@okta/okta-react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import oktaConfig from './config/oktaConfig';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import LoginCallbackPage from './components/LoginCallback';
import Home from './pages/Home';
import Login from './pages/Login';
import AccountDashboard from './pages/AccountDashboard';

const oktaAuth = new OktaAuth(oktaConfig);

const restoreOriginalUri = (_oktaAuth, originalUri) => {
  window.location.replace(toRelativeUrl(originalUri || '/', window.location.origin));
};

const OktaLayout = () => (
  <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  </Security>
);
const router = createBrowserRouter([
 
    {
    element: <OktaLayout />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/login/callback',
        element: <LoginCallbackPage />,
      },
      {
        path: '/',
        element: (
          <ProtectedRoute >
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: '/:accountId',
        element: (
          <ProtectedRoute >
            <AccountDashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;
