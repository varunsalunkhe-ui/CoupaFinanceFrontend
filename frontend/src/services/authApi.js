import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Validate if a Google-authenticated email is authorized to use the app.
 * Calls GET /users/{email} — returns true if authorized, false otherwise.
 */
export const validateUserEmail = async (email) => {
  try {
    const response = await axios.get(
      `${API_BASE}/users/${encodeURIComponent(email)}`,
      { headers: { Accept: 'application/json' }, timeout: 15000 }
    );
    // Backend returns true/false directly
    const authorized = response.data === true;
    return { authorized, user: authorized ? { email } : null };
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 401 || err.response?.status === 403) {
      return { authorized: false, user: null };
    }
    console.error('[Auth] Failed to validate email:', err);
    throw new Error('Unable to verify your account. Please try again.');
  }
};

/**
 * Fetch Google user profile using the access token.
 */
export const fetchGoogleUserInfo = async (accessToken) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch Google profile');
  }
  return response.json();
};
