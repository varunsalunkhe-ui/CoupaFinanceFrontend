import React, { useState, useEffect, useCallback } from 'react';
import TabLoader from '../../../components/TabLoader';
import { useDashboard } from '../../../context/DashboardContext';
import { buildAgentsReportHtml, downloadHtmlFile } from '../../../services/dashboardReportBuilder';

const AI_AGENTS_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const formatNumber = (val) => {
  const num = Number(val);
  if (val === null || val === undefined || Number.isNaN(num)) return '—';
  return num.toLocaleString();
};

const formatCredits = (val) => {
  const num = Number(val);
  if (val === null || val === undefined || Number.isNaN(num)) return '—';
  const hasDecimal = Math.abs(num % 1) > 0.001;
  return num.toLocaleString(undefined, { minimumFractionDigits: hasDecimal ? 2 : 0, maximumFractionDigits: 2 });
};

const formatK = (val) => {
  const num = Number(val);
  if (val === null || val === undefined || Number.isNaN(num)) return '—';
  return num >= 1000 ? `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K` : String(num);
};

const STATUS_STYLES = {
  'Enabled': 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]',
  'Access But Unused': 'bg-[#FEF9C3] text-[#92400E] border border-[#FDE68A]',
  'Disabled / Stalling': 'bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]',
};

const STATUS_BORDER = {
  'Enabled': 'border-l-[#22C55E]',
  'Access But Unused': 'border-l-[#EAB308]',
  'Disabled / Stalling': 'border-l-[#E5E7EB]',
};

const DESIGNATION_STYLES = {
  ACT: 'bg-[#BBF7D0] text-[#065F46] border border-[#86EFAC]',
  ASSIST: 'bg-gray-200 text-black border border-gray-300',
  ADVISE: 'bg-blue-100 text-blue-900 border border-blue-200',
};

const STATUS_USER_COLOR = {
  'Enabled': 'text-[#111827]',
  'Access But Unused': 'text-[#B45309]',
  'Disabled / Stalling': 'text-[#EF4444]',
};

// Derived (from the real `status` field) follow-up label shown per catalog card
const STATUS_ACTION = {
  'Enabled': { text: 'Prerequisite: Verified', className: 'text-[#4B5563]' },
  'Access But Unused': { text: 'Action Needed: Enable in Prod', className: 'text-[#B45309] font-semibold' },
  'Disabled / Stalling': { text: 'Action Needed: Review Adoption', className: 'text-[#EF4444] font-semibold' },
};

const AIAgentsTab = ({ accountName, clientName, forceRefresh = false }) => {
  const customerName = clientName || accountName;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setExternalTabData } = useDashboard();

  const fetchAgentAccess = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ customer_name: customerName, section: 'ai-agents' });
      if (forceRefresh) params.set('refresh', 'true');
      const response = await fetch(`${AI_AGENTS_API_BASE}/section?${params.toString()}`, {
        headers: { 'accept': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch AI Agents data (${response.status})`);
      }
      const result = await response.json();
      setData(result);
      setExternalTabData('aiAgents', result);
    } catch (err) {
      setError(err.message || 'Failed to load AI Agents data');
    } finally {
      setLoading(false);
    }
  }, [customerName, forceRefresh]);

  useEffect(() => {
    fetchAgentAccess();
  }, [fetchAgentAccess]);

  const summary = data?.summary;
  const agentStudio = data?.agent_studio;
  const catalog = data?.catalog || [];

  const handleDownloadReport = () => {
    const html = buildAgentsReportHtml(data, customerName);
    downloadHtmlFile(html, `AI_Agents_Report_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.html`);
  };

  return (
    <TabLoader loading={loading} error={error} onRetry={fetchAgentAccess} data={data}>
      {data && (
        <div>
          {/* ─── Header ─── */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-[17px] font-bold text-[#0F1733]">Navi Agents and GenAI Features</h2>
              <p className="text-[13px] text-[#4B5563] mt-0.5">
                Navi suite agents, multi-environment credit telemetry, and custom AI studio capabilities for {summary?.sf_acct_name || customerName}.
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0369A1] bg-[#0369A1]/10 rounded-lg hover:bg-[#0369A1]/20 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
              Download Report
            </button>
          </div>

          {/* ─── Multi-instance banner ─── */}
          {summary?.is_multi_instance && (
            <div className="flex items-center justify-between bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-4 py-2.5 mb-5">
              <p className="text-[12px] text-[#1E3A8A]">
                <strong>Customer Instance Telemetry:</strong> This customer has more than one instance. Data displayed is consolidated across all active instances.
              </p>
              <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded bg-[#0369A1] text-white ml-3">CONSOLIDATED VIEW</span>
            </div>
          )}

          {/* ─── Row 1: Catalog / Accessibility / Licenses ─── */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#6353E9] to-[#00B8D9]" />
                <div className="text-[11px] text-[#4B5563] uppercase tracking-wide font-semibold mt-1 mb-2">Total Agents & GenAI Features</div>
                <div className="bg-[#F9FAFB] rounded-lg px-4 py-3">
                  <div className="text-[32px] font-bold text-[#111827] leading-none">{formatNumber(summary.total_agents)}</div>
                </div>
                <div className="text-[12px] text-[#4B5563] mt-2">Cumulative total across Navi + GenAI catalog</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#0EA5E9]" />
                <div className="text-[11px] text-[#4B5563] uppercase tracking-wide font-semibold mt-1 mb-1">Customer Accessible</div>
                <div className="text-[32px] font-bold text-[#111827] leading-none">{formatNumber(summary.customer_accessible ?? summary.total_agents_accessible)}</div>
                <div className="text-[11px] text-[#4B5563] mt-2">Active agents unlocked based on customer's currently provisioned module entitlements.</div>
                <div className="text-[12px] text-[#0369A1] font-bold mt-2 pt-2 border-t border-[#E5E7EB]">{summary.accessibility_pct != null ? `${summary.accessibility_pct}% unlocked` : '—'}</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#22C55E]" />
                <div className="text-[11px] text-[#4B5563] uppercase tracking-wide font-semibold mt-1 mb-1">Navi Licenses Provisioned</div>
                <div className="text-[32px] font-bold text-[#111827] leading-none">{formatNumber(summary.navi_licenses_total)}</div>
                <div className="text-[11px] text-[#4B5563] mt-2">Total user seats provisioned across enterprise tenants for the Navi product.</div>
                <div className="text-[12px] text-[#111827] mt-2 pt-2 border-t border-[#E5E7EB]"><span className="text-[#4B5563]">Environment Allocation:</span> <strong>{formatNumber(summary.navi_licenses_prd)} PRD / {formatNumber(summary.navi_licenses_stg)} STG</strong></div>
              </div>
            </div>
          )}

          {/* ─── Row 2: Credits ─── */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4">
                <div className="text-[11px] text-[#4B5563] uppercase tracking-wide font-semibold mb-1">Utilized Credits (Total)</div>
                <div className="text-[28px] font-bold text-[#111827] leading-none">{formatCredits(summary.utilized_credits_total)}</div>
                <div className="text-[12px] text-[#4B5563] mt-2">Prod {formatCredits(summary.utilized_credits_prd)} · Staging {formatCredits(summary.utilized_credits_stg)}</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4">
                <div className="text-[11px] text-[#4B5563] uppercase tracking-wide font-semibold mb-1">Remaining Credit Balance</div>
                <div className="text-[28px] font-bold text-[#0369A1] leading-none">{formatCredits(summary.remaining_balance_total)}</div>
                <div className="text-[12px] text-[#4B5563] mt-2">Prod {formatCredits(summary.remaining_balance_prd)} · Staging {formatCredits(summary.remaining_balance_stg)}</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-[#4B5563] uppercase tracking-wide font-semibold">Free Credits Tracking</div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">{formatK(summary.free_credits_provisioned)} Default</span>
                </div>
                <div className="text-[28px] font-bold text-[#059669] leading-none">{formatCredits(summary.free_credits_remaining)} <span className="text-[13px] font-medium text-[#4B5563]">left</span></div>
                <div className="text-[12px] text-[#4B5563] mt-2">Provisioned {formatCredits(summary.free_credits_provisioned)} · Consumed {formatCredits(summary.free_credits_consumed)}</div>
              </div>
            </div>
          )}

          {/* ─── Predictive burn-down ─── */}
          {summary && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-5 py-4 mb-6">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#92400E] mb-1">⏳ Predictive Burn-Down</div>
              {summary.estimated_months_remaining != null ? (
                <p className="text-[14px] font-bold text-[#92400E]">Estimated exhaustion in {summary.estimated_months_remaining} months</p>
              ) : (
                <p className="text-[13px] text-[#92400E]">Not enough usage history yet to forecast credit exhaustion timeline.</p>
              )}
              <p className="text-[12px] text-[#92400E]/80 mt-1">Forecasted from current consumption rate across Prod and Staging environments.</p>
            </div>
          )}

          {/* ─── Agent Studio ─── */}
          {agentStudio && (
            <div className="mb-6">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#4A3DC7] mb-1">Navi Agents & GenAI Features: Agent Studio</h3>
              <p className="text-[12px] text-[#4B5563] mb-3">Telemetry on custom agents built by or for this account using Coupa development tools.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#3B82F6]" />
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <span className="text-[14px] font-bold text-[#1E293B]">Agent Studio: Custom Autonomous Agents</span>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">Autonomous</span>
                  </div>
                  <p className="text-[12px] text-[#4B5563] mb-3">Telemetry for custom autonomous agents operating scheduled workflows and background system reconciliations without prompt input.</p>
                  <div className="bg-[#F9FAFB] rounded-lg px-3 py-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[9px] text-[#6B7280] uppercase font-semibold">Custom Builds</div>
                      <div className="text-[13px] font-bold text-[#1E293B]">{formatNumber(agentStudio.autonomous?.builds_prd)} Prod / {formatNumber(agentStudio.autonomous?.builds_stg)} Sand</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#6B7280] uppercase font-semibold">Unique Agents</div>
                      <div className="text-[13px] font-bold text-[#1E293B]">{formatNumber(agentStudio.autonomous?.unique_agents)} Unique</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#6B7280] uppercase font-semibold">Active Users</div>
                      <div className="text-[13px] font-bold text-[#2563EB]">{formatNumber(agentStudio.autonomous?.users_prd)} Prod / {formatNumber(agentStudio.autonomous?.users_stg)} Sand</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#8B5CF6]" />
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <span className="text-[14px] font-bold text-[#1E293B]">Agent Studio: Custom Conversation Agents</span>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]">Conversational</span>
                  </div>
                  <p className="text-[12px] text-[#4B5563] mb-3">Telemetry for interactive conversational agents providing intelligent policy lookup, advisory chat, and guided intake Q&amp;A.</p>
                  <div className="bg-[#F9FAFB] rounded-lg px-3 py-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[9px] text-[#6B7280] uppercase font-semibold">Custom Builds</div>
                      <div className="text-[13px] font-bold text-[#1E293B]">{formatNumber(agentStudio.conversational?.builds_prd)} Prod / {formatNumber(agentStudio.conversational?.builds_stg)} Sand</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#6B7280] uppercase font-semibold">Unique Agents</div>
                      <div className="text-[13px] font-bold text-[#1E293B]">{formatNumber(agentStudio.conversational?.unique_agents)} Unique</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#6B7280] uppercase font-semibold">Active Users</div>
                      <div className="text-[13px] font-bold text-[#7C3AED]">{formatNumber(agentStudio.conversational?.users_prd)} Prod / {formatNumber(agentStudio.conversational?.users_stg)} Sand</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Catalog ─── */}
          <div className="flex items-end justify-between mb-2">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#4A3DC7]">Navi Agents & GenAI Features Catalog</h3>
            <span className="text-[11px] text-[#6B7280]">Total Unique Active Users &amp; Credit Burn Breakdown</span>
          </div>
          <p className="text-[12px] text-[#4B5563] mb-3">
            <span className="inline-flex items-center gap-1.5 mr-4">
              <span className="inline-block text-[9px] font-bold px-2 py-[3px] rounded-[4px] bg-[#BBF7D0] text-[#065F46] leading-none">ACT</span>
              <span>the agent does the work</span>
            </span>
            <span className="inline-flex items-center gap-1.5 mr-4">
              <span className="inline-block text-[9px] font-bold px-2 py-[3px] rounded-[4px] bg-gray-300 text-black leading-none">ASSIST</span>
              <span>the agent helps the user</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block text-[9px] font-bold px-2 py-[3px] rounded-[4px] bg-blue-200 text-black leading-none">ADVISE</span>
              <span>the agent advises the user</span>
            </span>
          </p>
          <div className="border-b border-[#E5E7EB] mb-4" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {catalog.map((agent, i) => {
              const designationKey = (agent.interaction_designation || '').toUpperCase();
              const designationClass = DESIGNATION_STYLES[designationKey] || 'bg-gray-200 text-black border border-gray-300';
              const statusClass = STATUS_STYLES[agent.status] || 'bg-gray-200 text-black border border-gray-300';
              const borderClass = STATUS_BORDER[agent.status] || 'border-l-[#E5E7EB]';
              const docUrls = (agent.ssot_docs_url || '').split(',').map((u) => u.trim()).filter(Boolean);
              const isUntapped = agent.status === 'Access But Unused' && agent.total_active_users === 0;

              return (
                <div key={i} className={`bg-white rounded-xl border border-[#E5E7EB] border-l-[4px] ${borderClass} p-4 flex flex-col gap-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[15px] font-bold text-[#111827] leading-snug">{agent.agent}</span>
                    <span className={`shrink-0 text-[11px] font-bold px-3 py-1 rounded-full leading-none ${statusClass}`}>{agent.status}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap -mt-1">
                    {agent.interaction_designation && (
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full leading-none ${designationClass}`}>{agent.interaction_designation}</span>
                    )}
                    {agent.prerequisite_sku && (
                      <span className="text-[12px] italic text-[#030405]">Prerequisite: {agent.prerequisite_sku}</span>
                    )}
                  </div>

                  <div className="text-[13px] text-[#374151] border-t border-[#E5E7EB] pt-2.5 flex items-center justify-between">
                    <span className="font-semibold text-[#030405]">Active Unique Users:</span>
                    <span className="text-right">
                      <strong className={`text-[11px] ${STATUS_USER_COLOR[agent.status] || 'text-[#111827]'}`}>
                        {formatNumber(agent.active_users_prd)} Prod • {formatNumber(agent.active_users_stg)} Sandbox{isUntapped ? ' (Untapped Value)' : ''}
                      </strong>
                    </span>
                  </div>

                  <div className="bg-[#F9FAFB] rounded-lg px-3 py-2 space-y-1 text-[12px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[#1F2937] font-sans">Prod Burn:</span>
                      <span className="text-[#374151]">{formatCredits(agent.burn_metered_prd)} Met | {formatCredits(agent.burn_unmetered_prd)} Unmet | <strong className="text-[#111827]">{formatCredits(agent.burn_total_prd)} Total</strong></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#1F2937] font-sans">Sandbox Burn:</span>
                      <span className="text-[#374151]">{formatCredits(agent.burn_metered_stg)} Met | {formatCredits(agent.burn_unmetered_stg)} Unmet | <strong className="text-[#111827]">{formatCredits(agent.burn_total_stg)} Total</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {STATUS_ACTION[agent.status] && (
                      <span className={`text-[12px] ${STATUS_ACTION[agent.status].className}`}>{STATUS_ACTION[agent.status].text}</span>
                    )}
                    {docUrls.length > 0 && (
                      <div className="flex gap-3 shrink-0 ml-auto">
                        {docUrls.map((url, di) => (
                          <a key={di} href={url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-[#0369A1] hover:underline whitespace-nowrap">
                            View SSOT Documentation {docUrls.length > 1 ? di + 1 : ''} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </TabLoader>
  );
};

export default AIAgentsTab;
