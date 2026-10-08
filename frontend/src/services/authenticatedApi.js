class ApiAuthenticationError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiAuthenticationError';
    this.response = { status };
  }
}

export function createAuthenticatedApi({
  getTokenManager,
  apiBase,
  origin,
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = () => Date.now(),
  onUnauthorized = () => {},
}) {
  const apiUrl = new URL(apiBase, origin);
  const apiPath = apiUrl.pathname.replace(/\/+$/, '');
  let renewal;
  let notified = false;

  function isApiRequest(input) {
    try {
      const url = new URL(input instanceof Request ? input.url : input, origin);
      return url.origin === apiUrl.origin
        && (url.pathname === apiPath || url.pathname.startsWith(`${apiPath}/`));
    } catch {
      return false;
    }
  }

  function authenticationRequired() {
    if (!notified) {
      notified = true;
      onUnauthorized();
    }
    return new ApiAuthenticationError(401, 'Your session has expired. Sign in again.');
  }

  async function accessToken() {
    try {
      const manager = getTokenManager();
      let token = await manager.get('accessToken');
      if (!token?.accessToken || !Number.isFinite(token.expiresAt)) {
        throw authenticationRequired();
      }
      if (token.expiresAt <= now() / 1000 + 30) {
        if (!renewal) {
          renewal = Promise.resolve()
            .then(() => manager.renew('accessToken'))
            .finally(() => { renewal = undefined; });
        }
        token = await renewal;
      }
      if (typeof token?.accessToken !== 'string' || !token.accessToken
        || !Number.isFinite(token.expiresAt) || token.expiresAt <= now() / 1000) {
        throw authenticationRequired();
      }
      return token.accessToken;
    } catch {
      throw authenticationRequired();
    }
  }

  async function authorizeAxios(config, resolvedUrl = config.url) {
    if (!isApiRequest(resolvedUrl)) return config;
    const token = await accessToken();
    const headers = Object.fromEntries(
      Object.entries(config.headers || {}).filter(([name]) => name.toLowerCase() !== 'authorization'),
    );
    config.headers = { ...headers, Authorization: `Bearer ${token}` };
    return config;
  }

  async function authenticatedFetch(input, init = {}) {
    if (!isApiRequest(input)) {
      throw new ApiAuthenticationError(403, 'Authenticated requests must target the configured API.');
    }
    const token = await accessToken();
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetchImpl(input, { ...init, headers, redirect: 'error' });
    if (response.status === 401) throw authenticationRequired();
    return response;
  }

  async function rejectAxios(error, resolvedUrl = error.config?.url) {
    if (error.response?.status === 401 && isApiRequest(resolvedUrl)) authenticationRequired();
    throw error;
  }

  return { authorizeAxios, authenticatedFetch, rejectAxios };
}