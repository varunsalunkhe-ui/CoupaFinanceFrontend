import axios from 'axios';

const CLIENTS_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetch all clients from the backend API with retry for cold starts.
 * @returns {Promise<Array<{account_name: string, SF_ACCT_ID: string}>>}
 */
export const fetchClients = async (retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`${CLIENTS_BASE_URL}/clients`, {
        headers: { Accept: 'application/json' },
        timeout: 30000,
      });
      return response.data;
    } catch (err) {
      if (attempt === retries) throw err;
      // Wait briefly before retrying (cold start may need time)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

/**
 * Convert an account_name to a URL-friendly slug.
 * e.g. "White Cap" → "white-cap", "Tyson Foods" → "tyson-foods"
 */
export const toSlug = (accountName) => {
  return accountName.toLowerCase().replace(/\s+/g, '-');
};

/**
 * Find a client from the list by its URL slug.
 */
export const findClientBySlug = (clients, slug) => {
  return clients.find((c) => toSlug(c.account_name) === slug);
};
