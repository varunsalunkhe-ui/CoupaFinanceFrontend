/**
 * User persona configuration for account-based access control.
 * Each user email maps to a role and list of account IDs they can access.
 * Roles: 'Admin' (full access), 'CVM' (view/edit/export), 'AE' (view only)
 */

const USER_PERSONAS = {
  'user1@coupa.com': {
    name: 'User 1',
    role: 'AE',
    accounts: ['caseys'],
  },
  'user2@coupa.com': {
    name: 'User 2',
    role: 'CVM',
    accounts: ['tyson-foods', 'progressive'],
  },
  'user3@coupa.com': {
    name: 'User 3',
    role: 'CVM',
    accounts: ['caseys', 'tyson-foods', 'progressive'],
  },
  'admin@coupa.com': {
    name: 'Admin',
    role: 'Admin',
    accounts: ['*'],
  },
};

// All users share the same password
export const VALID_PASSWORD = 'coupa2026';

/**
 * Returns the persona for a given email, or null if not a valid user.
 */
export const getPersona = (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  return USER_PERSONAS[normalizedEmail] || null;
};

/**
 * Returns the role for a given email. Defaults to 'AE' if no persona found.
 */
export const getUserRole = (email) => {
  const persona = getPersona(email);
  return persona?.role || 'AE';
};

/**
 * Returns the list of allowed account IDs for a given email.
 * A wildcard ['*'] means all accounts are allowed.
 */
export const getAllowedAccounts = (email) => {
  const persona = getPersona(email);
  return persona ? persona.accounts : [];
};

/**
 * Validates if the given email is a registered user.
 */
export const isValidUser = (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail in USER_PERSONAS;
};

export default USER_PERSONAS;
