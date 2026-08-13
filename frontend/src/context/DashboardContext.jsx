import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { fetchAllTabsInSession } from '../services/executiveSummaryApi';
import { getDailyCached, setDailyCached, clearCachedByPrefix } from '../services/cacheStorage';

const DashboardContext = createContext(null);

const TAB_KEYS = ['summary', 'whitespace', 'ubp', 'plan'];

// Module-level map to prevent duplicate fetches across StrictMode remounts
const activeFetches = new Map();

// Persistent cache using localStorage (survives tabs, sign-out, browser restart)
const CACHE_KEY_PREFIX = 'dashboard_cache_';

const getCache = (accountName) => {
  return getDailyCached(CACHE_KEY_PREFIX + accountName);
};

const setCache = (accountName, data) => {
  setDailyCached(CACHE_KEY_PREFIX + accountName, data);
};

export const clearDashboardCache = (accountName) => {
  if (accountName) {
    localStorage.removeItem(CACHE_KEY_PREFIX + accountName);
  } else {
    clearCachedByPrefix(CACHE_KEY_PREFIX);
  }
};

export const DashboardProvider = ({ accountName, children }) => {
  const cached = getCache(accountName);
  const [tabData, setTabData] = useState(cached?.tabData || {});
  const [tabLoading, setTabLoading] = useState({});
  const [tabErrors, setTabErrors] = useState({});
  const [tabSessions, setTabSessions] = useState(cached?.tabSessions || {});
  const fetchStartedRef = useRef(!!cached);
  const unmountedRef = useRef(false);
  const tabInFlightRef = useRef(new Set());

  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  // Persist tabData to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(tabData).length > 0) {
      setCache(accountName, { tabData, tabSessions });
    }
  }, [tabData, tabSessions, accountName]);

  const loadAllTabs = useCallback(async () => {
    if (fetchStartedRef.current) return;
    if (activeFetches.has(accountName)) return;
    fetchStartedRef.current = true;
    activeFetches.set(accountName, true);

    // Mark all tabs as loading
    const loadingState = {};
    TAB_KEYS.forEach(k => { loadingState[k] = true; });
    setTabLoading(loadingState);
    setTabErrors({});

    try {
      await fetchAllTabsInSession(accountName, (tabKey, result, error, currentSessionId) => {
        if (unmountedRef.current) return;

        // Store per-tab session ID
        if (currentSessionId) {
          setTabSessions(prev => ({ ...prev, [tabKey]: currentSessionId }));
        }

        // Skip if this tab was already fetched by a direct click
        if (tabInFlightRef.current.has(tabKey)) return;

        setTabLoading(prev => ({ ...prev, [tabKey]: false }));

        if (error) {
          setTabErrors(prev => ({ ...prev, [tabKey]: error }));
        } else {
          setTabData(prev => ({ ...prev, [tabKey]: result }));
        }
      });
    } catch (err) {
      if (!unmountedRef.current) {
        TAB_KEYS.forEach(k => {
          setTabLoading(prev => ({ ...prev, [k]: false }));
          setTabErrors(prev => ({ ...prev, [k]: err.message || 'Failed to load' }));
        });
      }
    } finally {
      activeFetches.delete(accountName);
    }
  }, [accountName]);

  /**
   * Fetch a single tab on-demand (e.g. when user clicks a tab).
   * Only fires a separate request if the sequential batch is DONE
   * and this tab has no data. Prevents concurrent backend overload.
   */
  const fetchTab = useCallback(async (tabKey) => {
    // Already have data — nothing to do
    if (tabData[tabKey]) return;
    // Already fetching via direct click
    if (tabInFlightRef.current.has(tabKey)) return;
    // Batch still running — don't fire parallel requests
    if (activeFetches.has(accountName)) return;

    tabInFlightRef.current.add(tabKey);
    setTabLoading(prev => ({ ...prev, [tabKey]: true }));
    setTabErrors(prev => ({ ...prev, [tabKey]: null }));

    try {
      const { retrySingleTab } = await import('../services/executiveSummaryApi');
      const result = await retrySingleTab(accountName, tabKey, tabSessions[tabKey] || null);
      if (!unmountedRef.current) {
        setTabData(prev => ({ ...prev, [tabKey]: result }));
      }
    } catch (err) {
      if (!unmountedRef.current) {
        setTabErrors(prev => ({ ...prev, [tabKey]: err.message || 'Failed to load' }));
      }
    } finally {
      tabInFlightRef.current.delete(tabKey);
      if (!unmountedRef.current) {
        setTabLoading(prev => ({ ...prev, [tabKey]: false }));
      }
    }
  }, [accountName, tabSessions, tabData]);

  const retryTab = useCallback(async (tabKey) => {
    const { retrySingleTab } = await import('../services/executiveSummaryApi');
    setTabLoading(prev => ({ ...prev, [tabKey]: true }));
    setTabErrors(prev => ({ ...prev, [tabKey]: null }));
    setTabData(prev => ({ ...prev, [tabKey]: null }));

    try {
      const result = await retrySingleTab(accountName, tabKey, tabSessions[tabKey] || null);
      setTabData(prev => ({ ...prev, [tabKey]: result }));
    } catch (err) {
      setTabErrors(prev => ({ ...prev, [tabKey]: err.message || 'Retry failed' }));
    } finally {
      setTabLoading(prev => ({ ...prev, [tabKey]: false }));
    }
  }, [accountName, tabSessions]);

  const refreshAll = useCallback(() => {
    // Clear module-level cache for this account
    clearDashboardCache(accountName);
    // Reset state so loadAllTabs can run again
    fetchStartedRef.current = false;
    activeFetches.delete(accountName);
    setTabData({});
    setTabLoading({});
    setTabErrors({});
    setTabSessions({});
    tabInFlightRef.current.clear();
  }, [accountName]);

  return (
    <DashboardContext.Provider value={{ tabData, tabLoading, tabErrors, tabSessions, loadAllTabs, fetchTab, retryTab, refreshAll }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
};

/**
 * Hook for individual tab components to get their data from the shared context.
 */
export const useTabFromContext = (tabKey) => {
  const { tabData, tabLoading, tabErrors, retryTab } = useDashboard();
  return {
    data: tabData[tabKey] || null,
    loading: tabLoading[tabKey] || false,
    error: tabErrors[tabKey] || null,
    retry: () => retryTab(tabKey),
  };
};
