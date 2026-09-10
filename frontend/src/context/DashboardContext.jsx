import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { fetchAllTabsInSession } from '../services/executiveSummaryApi';
import { generateSessionId, buildConsolidatedPayload, isPayloadComplete, sendConsolidatedData } from '../services/consolidatedDataApi';

const DashboardContext = createContext(null);

const TAB_KEYS = ['whitespace', 'ubp'];

// Module-level map to prevent duplicate fetches across StrictMode remounts
const activeFetches = new Map();

export const DashboardProvider = ({ accountName, clientName, children }) => {
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({ summary: true, plan: true });
  const [tabErrors, setTabErrors] = useState({});
  const [tabSessions, setTabSessions] = useState({});
  const fetchStartedRef = useRef(false);
  const unmountedRef = useRef(false);
  const tabInFlightRef = useRef(new Set());

  // ── Consolidated Data (Hero + 6 tabs, excl. Executive Summary & Action Plan) ──
  const [consolidatedSessionId, setConsolidatedSessionId] = useState(() => generateSessionId());
  const [externalData, setExternalData] = useState({});
  const insightsFetchedRef = useRef(false);

  /**
   * Register data from externally-fetched sections (hero, snapshot, portfolio, aiAgents, usage).
   * Tab components call this after their data loads so it can be included in the consolidated payload.
   */
  const setExternalTabData = useCallback((key, data) => {
    setExternalData((prev) => {
      if (prev[key] === data) return prev;
      return { ...prev, [key]: data };
    });
  }, []);

  /** Assembled sections for the consolidated payload. */
  const consolidatedSections = useMemo(() => ({
    hero: externalData.hero || null,
    snapshot: externalData.snapshot || null,
    portfolio: externalData.portfolio || null,
    aiAgents: externalData.aiAgents || null,
    usage: externalData.usage || null,
    whitespace: tabData.whitespace || null,
    ubp: tabData.ubp || null,
  }), [externalData, tabData]);

  /** Full consolidated payload — null until every section is populated. */
  const consolidatedPayload = useMemo(() => {
    if (!isPayloadComplete(consolidatedSections)) return null;
    return buildConsolidatedPayload({
      sessionId: consolidatedSessionId,
      accountName,
      clientName,
      sections: consolidatedSections,
    });
  }, [consolidatedSections, consolidatedSessionId, accountName, clientName]);

  // Debug: log which consolidated sections are still missing
  useEffect(() => {
    const keys = ['hero', 'snapshot', 'portfolio', 'aiAgents', 'usage', 'whitespace', 'ubp'];
    const present = keys.filter(k => consolidatedSections[k] != null);
    const missing = keys.filter(k => consolidatedSections[k] == null);
    console.log(`[Consolidated] ${present.length}/7 sections ready. Present: [${present}] Missing: [${missing}]`);
  }, [consolidatedSections]);

  // When consolidated payload is ready, call backend to generate Executive Summary & Action Plan
  useEffect(() => {
    if (!consolidatedPayload) return;
    if (insightsFetchedRef.current) return;
    insightsFetchedRef.current = true;

    console.log('[DashboardContext] Consolidated payload ready, calling backend:', consolidatedPayload);

    setTabLoading(prev => ({ ...prev, summary: true, plan: true }));
    setTabErrors(prev => ({ ...prev, summary: null, plan: null }));

    sendConsolidatedData(consolidatedPayload)
      .then(({ executiveSummary, actionPlan }) => {
        if (unmountedRef.current) return;
        if (executiveSummary) {
          setTabData(prev => ({ ...prev, summary: { cards: executiveSummary } }));
        } else {
          setTabErrors(prev => ({ ...prev, summary: 'No executive summary in response' }));
        }
        if (actionPlan) {
          setTabData(prev => ({ ...prev, plan: actionPlan }));
        } else {
          setTabErrors(prev => ({ ...prev, plan: 'No action plan in response' }));
        }
      })
      .catch((err) => {
        if (unmountedRef.current) return;
        const msg = err.message || 'Failed to generate insights';
        setTabErrors(prev => ({ ...prev, summary: msg, plan: msg }));
      })
      .finally(() => {
        if (!unmountedRef.current) {
          setTabLoading(prev => ({ ...prev, summary: false, plan: false }));
        }
      });
  }, [consolidatedPayload]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  const loadAllTabs = useCallback(async () => {
    if (fetchStartedRef.current) return;
    if (activeFetches.has(accountName)) return;
    fetchStartedRef.current = true;
    activeFetches.set(accountName, true);

    // Mark whitespace/ubp as loading (summary/plan come from consolidated backend)
    const loadingState = { summary: true, plan: true };
    TAB_KEYS.forEach(k => { loadingState[k] = true; });
    setTabLoading(loadingState);
    setTabErrors(prev => ({ summary: prev.summary, plan: prev.plan }));

    try {
      await fetchAllTabsInSession(accountName, (tabKey, result, error, currentSessionId) => {
        if (unmountedRef.current) return;

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
      }, TAB_KEYS);
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
    // For summary/plan, re-trigger the consolidated backend call
    if (tabKey === 'summary' || tabKey === 'plan') {
      if (!consolidatedPayload) return;
      insightsFetchedRef.current = false;
      setTabData(prev => ({ ...prev, summary: null, plan: null }));
      setTabLoading(prev => ({ ...prev, summary: true, plan: true }));
      setTabErrors(prev => ({ ...prev, summary: null, plan: null }));
      try {
        const { executiveSummary, actionPlan } = await sendConsolidatedData(consolidatedPayload);
        if (unmountedRef.current) return;
        insightsFetchedRef.current = true;
        if (executiveSummary) {
          setTabData(prev => ({ ...prev, summary: { cards: executiveSummary } }));
        } else {
          setTabErrors(prev => ({ ...prev, summary: 'No executive summary in response' }));
        }
        if (actionPlan) {
          setTabData(prev => ({ ...prev, plan: actionPlan }));
        } else {
          setTabErrors(prev => ({ ...prev, plan: 'No action plan in response' }));
        }
      } catch (err) {
        if (!unmountedRef.current) {
          const msg = err.message || 'Retry failed';
          setTabErrors(prev => ({ ...prev, summary: msg, plan: msg }));
        }
      } finally {
        if (!unmountedRef.current) {
          setTabLoading(prev => ({ ...prev, summary: false, plan: false }));
        }
      }
      return;
    }

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
  }, [accountName, tabSessions, consolidatedPayload]);

  const refreshAll = useCallback(() => {
    // New session ID for the fresh consolidated payload
    setConsolidatedSessionId(generateSessionId());
    insightsFetchedRef.current = false;
    // Reset state so loadAllTabs can run again
    fetchStartedRef.current = false;
    activeFetches.delete(accountName);
    setTabData({});
    setTabLoading({ summary: true, plan: true });
    setTabErrors({});
    setTabSessions({});
    setExternalData({});
    tabInFlightRef.current.clear();
  }, [accountName]);

  return (
    <DashboardContext.Provider value={{
      tabData, tabLoading, tabErrors, tabSessions,
      loadAllTabs, fetchTab, retryTab, refreshAll,
      setExternalTabData, consolidatedPayload, consolidatedSessionId,
    }}>
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
