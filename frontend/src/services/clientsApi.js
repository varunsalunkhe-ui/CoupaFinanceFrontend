import axios from 'axios';
import { getDailyCached, setDailyCached } from './cacheStorage';

const CLIENTS_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const CLIENTS_CACHE_KEY = 'clients_cache';

let inFlightClientsRequest = null;

const normalizeClients = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.clients)
      ? payload.clients
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  return list.filter((client) => {
    return typeof client?.account_name === 'string' && client.account_name.trim().length > 0;
  });
};

/**
 * Fetch all clients from the backend API with retry for cold starts.
 * @returns {Promise<Array<{account_name: string, SF_ACCT_ID: string}>>}
 */
export const fetchClients = async (options = {}) => {
  const config = typeof options === 'number'
    ? { retries: options, forceRefresh: false }
    : { retries: 2, forceRefresh: false, ...options };

  if (!config.forceRefresh) {
    const cachedClients = getDailyCached(CLIENTS_CACHE_KEY);
    if (Array.isArray(cachedClients)) {
      return cachedClients;
    }
  }

  if (inFlightClientsRequest) {
    return inFlightClientsRequest;
  }

  inFlightClientsRequest = (async () => {
    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        const response = await axios.get(`${CLIENTS_BASE_URL}/clients`, {
          headers: { Accept: 'application/json' },
          timeout: 15000,
        });

        const normalizedClients = normalizeClients(response.data);
        setDailyCached(CLIENTS_CACHE_KEY, normalizedClients);
        return normalizedClients;
      } catch (err) {
        if (attempt === config.retries) {
          throw err;
        }
        // Keep retry backoff short to reduce perceived UI latency.
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }

    return [];
  })();

  try {
    return await inFlightClientsRequest;
  } finally {
    inFlightClientsRequest = null;
  }
};

/**
 * Convert an account_name to a URL-friendly slug.
 * e.g. "White Cap" → "white-cap", "Tyson Foods" → "tyson-foods"
 */
export const toSlug = (accountName) => {
  return String(accountName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Find a client from the list by its URL slug.
 */
export const findClientBySlug = (clients, slug) => {
  return clients.find((c) => toSlug(c.account_name) === slug);
};
