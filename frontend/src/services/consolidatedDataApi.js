/**
 * Consolidated Data API Service
 *
 * Builds a single JSON payload combining Hero Section + 4 tab data
 * (Snapshot, Portfolio, AI Agents, Usage).
 * Excludes Executive Summary and Action Plan — those will be generated
 * by the backend using this consolidated payload.
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const REQUIRED_SECTIONS = ['hero', 'snapshot', 'portfolio', 'aiAgents', 'usage'];

/**
 * Generate a unique session ID for this account visit.
 */
export const generateSessionId = () => crypto.randomUUID();

/**
 * Build the consolidated payload from all collected sections.
 */
export const buildConsolidatedPayload = ({ sessionId, accountName, clientName, sections }) => ({
  sessionId,
  accountName,
  clientName: clientName || accountName,
  generatedAt: new Date().toISOString(),
  sections: {
    hero: sections.hero || null,
    snapshot: sections.snapshot || null,
    portfolio: sections.portfolio || null,
    aiAgents: sections.aiAgents || null,
    usage: sections.usage || null,
  },
});

/**
 * Check whether all required sections have data.
 */
export const isPayloadComplete = (sections) => {
  if (!sections) return false;
  return REQUIRED_SECTIONS.every((key) => sections[key] != null);
};

/**
 * Send consolidated data to the backend /query API.
 * @param {object} payload
 * @param {object} [options]
 * @param {boolean} [options.bypassCache] - Force a fresh agent call and refresh
 *   the cache entry (used by "Update Data").
 * Returns { executiveSummary, actionPlan, metadata } from the response.
 */
export const sendConsolidatedData = async (payload, { bypassCache = false } = {}) => {
  const body = {
    prompt: `Give account plan for this client ${payload.clientName}.`,
    user_id: 'default-user',
    session_id: payload.sessionId,
    data: payload,
    cache_key: `${payload.clientName}:consolidated`,
    bypass_cache: bypassCache,
  };

  console.log('[ConsolidatedData] Sending to backend:', JSON.stringify(body).slice(0, 500));
  console.log('[ConsolidatedData] POST', `${API_BASE}/query`);

  const response = await axios.post(`${API_BASE}/query`, body, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 180000,
  });

  const raw = response.data;
  const output = raw.output;

  if (!output) {
    throw new Error('Backend returned empty output');
  }

  // Normalize: output may be a JSON string
  const parsed = typeof output === 'string' ? JSON.parse(output) : output;

  return {
    executiveSummary: parsed.executiveSummary || null,
    actionPlan: parsed.actionPlan || null,
    metadata: parsed.metadata || null,
    backendSessionId: raw.session_id || null,
  };
};
