import axios from 'axios';
import { oktaAuth } from '../router';
import { createAuthenticatedApi } from './authenticatedApi';

const authenticatedApi = createAuthenticatedApi({
  getTokenManager: () => oktaAuth.tokenManager,
  apiBase: import.meta.env.VITE_API_BASE_URL || '/api',
  origin: window.location.origin,
  onUnauthorized: () => {
    void Promise.resolve()
      .then(() => {
        oktaAuth.setOriginalUri(window.location.href);
        return oktaAuth.tokenManager.clear();
      })
      .catch(() => undefined)
      .finally(() => window.location.assign('/login'));
  },
});

axios.interceptors.request.use((config) => authenticatedApi.authorizeAxios(config, axios.getUri(config)));
axios.interceptors.response.use(
  (response) => response,
  (error) => authenticatedApi.rejectAxios(error, error.config ? axios.getUri(error.config) : undefined),
);

export const authenticatedFetch = authenticatedApi.authenticatedFetch;
