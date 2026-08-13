import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import AccountDashboard from './pages/AccountDashboard';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <ProtectedRoute><Home /></ProtectedRoute>,
  },
  {
    path: '/:accountId',
    element: <ProtectedRoute><AccountDashboard /></ProtectedRoute>,
  },
]);

export default router;
