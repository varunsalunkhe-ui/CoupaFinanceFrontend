import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * List files stored in the account's GCS bucket folder.
 * @returns {Promise<{account_name: string, bucket: string, files: string[]}>}
 */
export const fetchAccountFiles = async (accountName) => {
  const response = await axios.get(`${API_BASE}/account-files`, {
    params: { account_name: accountName },
    headers: { Accept: '*/*' },
    timeout: 30000,
  });
  return response.data;
};

/**
 * Delete a single file from the account's GCS bucket folder.
 * @returns {Promise<{account_name: string, bucket: string, files: string[]}>}
 */
export const deleteAccountFile = async (accountName, fileName) => {
  const response = await axios.delete(`${API_BASE}/account-files`, {
    params: { account_name: accountName, file_name: fileName },
    headers: { Accept: '*/*' },
    timeout: 30000,
  });
  return response.data;
};

/**
 * Upload a file (e.g. Account Plan / JVP) into the account's GCS bucket folder.
 * @returns {Promise<{account_name: string, bucket: string, files: string[]}>}
 */
export const uploadAccountFile = async (accountName, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE}/account-files/upload`, formData, {
    params: { account_name: accountName },
    headers: { Accept: '*/*', 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return response.data;
};
