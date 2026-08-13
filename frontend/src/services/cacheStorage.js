const pad2 = (value) => String(value).padStart(2, '0');

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

export const getDailyCached = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Legacy cache entries (without metadata) are treated as stale.
    if (!parsed || typeof parsed !== 'object' || !('cacheDate' in parsed) || !('payload' in parsed)) {
      localStorage.removeItem(storageKey);
      return null;
    }

    if (parsed.cacheDate !== getLocalDateKey()) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
};

export const setDailyCached = (storageKey, payload) => {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        cacheDate: getLocalDateKey(),
        payload,
      })
    );
  } catch {
    // Ignore quota/storage failures and rely on API fetch path.
  }
};

export const clearCachedByPrefix = (keyPrefix) => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(keyPrefix))
    .forEach((key) => localStorage.removeItem(key));
};
