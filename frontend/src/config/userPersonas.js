/**
 * User persona configuration for account-based access control.
 * Each user email maps to a list of account IDs they can access.
 */

const USER_PERSONAS = {
  // User 1: Can see only Casey's (1 account)
  'user1@coupa.com': {
    name: 'User 1',
    accounts: ['caseys'],
  },
  // User 2: Can see Tyson Foods and Progressive (2 accounts)
  'user2@coupa.com': {
    name: 'User 2',
    accounts: ['tyson-foods', 'progressive'],
  },
  // User 3: Can see 3 accounts
  'user3@coupa.com': {
    name: 'User 3',
    accounts: ['caseys', 'tyson-foods', 'progressive'],
  },
  // Admin: Can see all accounts (wildcard '*' means all)
  'admin@coupa.com': {
    name: 'Admin',
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
