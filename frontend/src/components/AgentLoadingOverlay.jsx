import React, { useEffect, useState } from 'react';

const STATUS_MESSAGES = [
  'Reading PDF layout elements...',
  'Retrieving live P2P Active User counts from Snowflake.TABLE_USERS...',
  'Mapping latest Whitespace targets & executing ML pricing heuristics...',
  'Parsing unstructured account notes from GCS Bucket...',
  'Synthesizing Executive Summary & Action Plan...',
];

/**
 * Full-screen overlay shown right after an account card is clicked, masking the
 * initial dashboard/tab API latency behind an "AI pipeline" style animation
 * while the real requests fire in the background.
 */
const AgentLoadingOverlay = ({ visible, accountName }) => {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setStatusIndex(0);
    const interval = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 text-white">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        <div className="absolute inset-2 bg-blue-600/30 rounded-full animate-ping" />
        <div className="absolute inset-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="6" width="12" height="12" rx="1.5" />
            <path strokeLinecap="round" d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
          </svg>
        </div>
      </div>
      <h3 className="text-xl font-bold tracking-wide text-center">Executing AI Agent Extraction</h3>
      <p className="text-xs text-slate-300 mt-2 text-center max-w-md leading-relaxed">
        Pulling structured financials for <span className="text-white font-semibold">{accountName || 'this account'}</span> from{' '}
        <span className="text-cyan-400 font-mono">Snowflake</span> & parsing fresh unstructured context from{' '}
        <span className="text-amber-400 font-mono">GCS Bucket</span>...
      </p>
      <div className="mt-4 bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-1.5 text-xs text-slate-400 font-mono flex items-center space-x-2">
        <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
        <span>{STATUS_MESSAGES[statusIndex]}</span>
      </div>
    </div>
  );
};

export default AgentLoadingOverlay;
