import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

// ============================================
// Prompt templates per tab section
// ============================================
const TAB_PROMPTS = {
  summary: (name) => `Generate executive summary for ${name}`,
  whitespace: (name) => `Show whitespace and risks for ${name}`,
  ubp: (name) => `Can you generate UBP data for ${name}?`,
  plan: (name) => `Need action plan for ${name}`,
};

// ============================================
// Response parsing utilities
// ============================================

/**
 * Extract JSON from a string (handles markdown fences, raw JSON, etc.)
 */
function parseJsonFromString(text) {
  if (!text || typeof text !== 'string') return null;

  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch { /* continue */ }
  }

  // Try direct parse
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { /* continue */ }
  }

  // Extract first JSON object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch { /* continue */ }
  }

  return null;
}

/**
 * Normalize the API response output.
 * Backend returns: { output: <data>, session_id, timestamp, agent_type }
 * <data> can be an object directly or a JSON string.
 */
function normalizeOutput(output) {
  if (!output) return null;

  if (typeof output === 'object' && output !== null) {
    return output;
  }

  if (typeof output === 'string') {
    return parseJsonFromString(output) || { rawText: output };
  }

  return output;
}

// ============================================
// Core API call
// ============================================

/**
 * POST to the orchestrator agent.
 * @param {string} prompt
 * @param {string|null} sessionId - Reuse session for sequential calls
 * @param {number} retries - Number of retry attempts on 500/network errors
 * @returns {{ output: object, sessionId: string }}
 */
const queryAgent = async (prompt, sessionId = null, retries = 3) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const body = { prompt, user_id: 'default-user' };
      if (sessionId) body.session_id = sessionId;

      const response = await axios.post(`${baseURL}/query`, body, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: 180000, // 3 min — agents can be slow
      });

      const raw = response.data;
      const output = normalizeOutput(raw.output);
      const returnedSessionId = raw.session_id || null;

      // If output is empty, treat as retryable (backend sometimes returns 200 with null output)
      if (!output) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        throw new Error('Agent returned empty response');
      }

      return { output, sessionId: returnedSessionId };
    } catch (err) {
      lastError = err;

      // Don't retry 4xx client errors (bad request, auth, etc.)
      if (err.response?.status >= 400 && err.response?.status < 500) {
        const msg = err.response?.data?.detail || err.response?.data?.message || err.message;
        throw new Error(msg);
      }

      // Retry on 500, network errors, timeouts
      if (attempt < retries) {
        const delay = 3000 * (attempt + 1); // 3s, 6s, 9s
        console.warn(`[API] Attempt ${attempt + 1} failed for "${prompt.slice(0, 40)}...", retrying in ${delay/1000}s`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new Error(
    lastError?.response?.data?.detail || lastError?.message || 'Request failed after retries'
  );
};


export const fetchAllTabsInSession = async (accountName, onTabResult) => {
  const tabKeys = Object.keys(TAB_PROMPTS);

  const promises = tabKeys.map(async (tabKey) => {
    const prompt = TAB_PROMPTS[tabKey](accountName);
    try {
      const result = await queryAgent(prompt, null);
      onTabResult(tabKey, result.output, null, result.sessionId);
    } catch (err) {
      onTabResult(tabKey, null, err.message || 'Failed to load', null);
    }
  });

  await Promise.allSettled(promises);
};

/**
 * Retry a single tab using an existing session.
 */
export const retrySingleTab = async (accountName, tabKey, sessionId = null) => {
  const prompt = TAB_PROMPTS[tabKey](accountName);
  const result = await queryAgent(prompt, sessionId);
  return result.output;
};

export { queryAgent };
