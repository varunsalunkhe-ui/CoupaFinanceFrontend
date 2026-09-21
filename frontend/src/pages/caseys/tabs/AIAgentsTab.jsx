import React, { useState, useEffect, useCallback } from 'react';
import TabLoader from '../../../components/TabLoader';
import { useDashboard } from '../../../context/DashboardContext';

const AI_AGENTS_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const AIAgentsTab = ({ accountName, clientName }) => {
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
  }, [customerName]);

  useEffect(() => {
    fetchAgentAccess();
  }, [fetchAgentAccess]);

  const agents = data;
  const summary = agents?.summary;
  const categories = agents?.categories || [];

  // Compute unlocked percentage
  const unlockedPct = summary?.total_agents > 0
    ? Math.round((summary.customer_accessible / summary.total_agents) * 100)
    : 0;

  return (
    <TabLoader loading={loading} error={error} onRetry={fetchAgentAccess} data={data}>
      {agents && (
        <div>
          {/* ─── Description + Legend Row ─── */}
          <p className="text-[13px] text-[#374151] mb-5 leading-[1.7]">
            AI Agents available for {agents.client_name}. Filled cards = agents the customer can access today based on their portfolio. Outlined cards = agents unlocked by adding the indicated SKU.
            <span className="inline-flex items-center gap-1.5 ml-4">
              <span className="inline-block text-[10px] font-bold px-2 py-[3px] rounded-[4px] bg-green-200 text-black leading-none">ACT</span>
              <span className="text-[12px] text-[#5A6180]">the agent does the work</span>
            </span>
            <span className="inline-flex items-center gap-1.5 ml-4">
              <span className="inline-block text-[10px] font-bold px-2 py-[3px] rounded-[4px] bg-gray-300 text-black leading-none">ASSIST</span>
              <span className="text-[12px] text-[#5A6180]">the agent helps the user</span>
            </span>
            <span className="inline-flex items-center gap-1.5 ml-4">
              <span className="inline-block text-[10px] font-bold px-2 py-[3px] rounded-[4px] bg-blue-200 text-black leading-none">ADVISE</span>
              <span className="text-[12px] text-[#5A6180]">the agent advises the user</span>
            </span>
          </p>

          {/* ─── Summary Stats Strip ─── */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#6353E9] to-[#00B8D9]" />
                <div className="text-[11px] text-[#6B7280] uppercase tracking-wide font-semibold mt-1 mb-1">Total Agents</div>
                <div className="text-[36px] font-bold text-[#111827] leading-none">{summary.total_agents}</div>
                <div className="text-[12px] text-[#6B7280] mt-2">R43-R47 cumulative</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#6353E9] to-[#00B8D9]" />
                <div className="text-[11px] text-[#6B7280] uppercase tracking-wide font-semibold mt-1 mb-1">Customer Accessible</div>
                <div className="text-[36px] font-bold text-[#111827] leading-none">{summary.customer_accessible}</div>
                <div className="text-[12px] text-[#6B7280] mt-2">{unlockedPct}% unlocked</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#6353E9] to-[#06B6D4]" />
                <div className="text-[11px] text-[#6B7280] uppercase tracking-wide font-semibold mt-1 mb-1">Currently Active</div>
                <div className="text-[28px] font-bold text-[#111827] leading-none">{summary.currently_active}</div>
                <div className="text-[12px] text-[#6B7280] mt-2">Awaiting telemetry</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#6353E9] to-[#06B6D4]" />
                <div className="text-[11px] text-[#6B7280] uppercase tracking-wide font-semibold mt-1 mb-1">Volume (12 Mo)</div>
                <div className="text-[28px] font-bold text-[#111827] leading-none">{summary.volume_12_mo}</div>
                <div className="text-[12px] text-[#6B7280] mt-2">Awaiting telemetry</div>
              </div>
            </div>
          )}

          {/* ─── Agent Studio Callout ─── */}
          {/* {agents.agent_studio && (
            <div className="bg-[#DBEAFE] border border-[#93C5FD] rounded-2xl px-6 py-5 mb-5">
              <h3 className="text-[15px] font-bold text-[#4A3DC7] mb-1">Agent Studio — Build Custom Agents</h3>
              <p className="text-[13px] text-[#374151] leading-relaxed">
                <span className="font-semibold text-[#4A3DC7]">Coupa Compose</span> — {agents.agent_studio.description}
              </p>
            </div>
          )} */}

          {/* ─── Agent Studio — Platform Capabilities Table ─── */}
          {(() => {
            const hasPlatformPlus = agents?.platform_plus ?? agents?.platformPlus ?? true;
            return (
          <div className="bg-[#EFF6FF] border border-[#93C5FD] border-l-[4px]  rounded-2xl px-6 pt-6 pb-4 mb-5 space-y-4">
            <h3 className="text-[16px] font-bold italic text-[#4A3DC7] mb-2">Coupa Compose — Platform Capabilities</h3>
            <p className="text-[13px] text-[#374151] leading-relaxed mb-5">
              Based on <span className="font-bold text-[#4A3DC7]">{agents.client_name || customerName}</span>'s current entitlements ({hasPlatformPlus ? 'Platform Plus' : 'Platform SKU'}), elements of Compose can be accessed per the table below. Highlighted columns show capabilities included with your current SKU.
            </p>

            <div className="bg-white rounded-xl overflow-hidden">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wide text-[#5A6180] bg-[#F8FAFC]">Capability</th>
                    <th className="text-center py-3 px-4 text-[11px] font-bold uppercase tracking-wide text-[#1E293B] bg-[#F8FAFC]">SIO<br/>Individual / Multi</th>
                    <th className="text-center py-3 px-4 text-[11px] font-bold uppercase tracking-wide text-[#1E293B] bg-[#F8FAFC]">SIO<br/>Universal</th>
                    <th className={`text-center py-3 px-4 text-[11px] font-bold uppercase tracking-wide text-[#1E293B] ${!hasPlatformPlus ? 'bg-green-100 rounded-tr-xl' : 'bg-[#F8FAFC]'}`}>Platform SKU</th>
                    <th className={`text-center py-3 px-4 text-[11px] font-bold uppercase tracking-wide text-[#1E293B] ${hasPlatformPlus ? 'bg-green-100 rounded-tr-xl' : 'bg-[#F8FAFC]'}`}>Platform Plus</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="py-3.5 px-5 text-[#1E293B]">SIO Orchestrations (single or multi)</td>
                    <td className="py-3.5 px-4 text-center text-[#374151] font-medium">x</td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="py-3.5 px-5 text-[#1E293B]">SIO with 3rd Party Connectors</td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center text-[#374151] font-medium">x</td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="py-3.5 px-5 text-[#1E293B]">Custom Objects, IFrames, Embedded Apps</td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className={`py-3.5 px-4 text-center ${hasPlatformPlus ? 'bg-green-50 text-[#16A34A] font-bold text-[15px]' : ''}`}>{hasPlatformPlus ? '✓' : ''}</td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="py-3.5 px-5 text-[#1E293B]">Agent Catalog, Activity, &amp; Knowledge</td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className={`py-3.5 px-4 text-center ${hasPlatformPlus ? 'text-[#374151] font-medium' : 'bg-green-50 text-[#16A34A] font-bold text-[15px]'}`}>{hasPlatformPlus ? 'x' : '✓'}</td>
                    <td className={`py-3.5 px-4 text-center ${hasPlatformPlus ? 'bg-green-50 text-[#16A34A] font-bold text-[15px]' : ''}`}>{hasPlatformPlus ? '✓' : ''}</td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="py-3.5 px-5 text-[#1E293B]">Agent Builder</td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center text-[#374151] text-[12px] font-bold">Free trial until Jan 1 2027</td>
                    <td className={`py-3.5 px-4 text-center ${hasPlatformPlus ? 'bg-green-50 text-[#16A34A] font-bold text-[15px]' : ''}`}>{hasPlatformPlus ? '✓' : ''}</td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="py-3.5 px-5 text-[#374151] italic">Agentic Interoperability tools</td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                  </tr>
                  <tr>
                    <td colSpan="5" className="text-right pr-5 py-2 text-[12px] text-[#6B7280] italic">Tbd — roadmap</td>
                  </tr>
                </tbody>
              </table>
              
            </div>
            <div className="bg-[#FEF9C3] border border-[#FDE047] rounded-xl px-3 py-2.5 mt-3">
            <p className="text-[13px] text-[#374151]">
              <span className="mr-1">💡</span>
              <span className="font-bold text-[#4A3DC7]">Upgrade to Coupa Compose</span> to unlock all platform capabilities in one easy package — including Agent Builder, Custom Objects, and 3rd Party Integrations.
            </p>
          </div>
          </div>
            );
          })()}

              

          {/* ─── Agent Categories ─── */}
          {categories.map((cat, ci) => (
            <div key={ci} className="mb-8">
              {/* Category header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#4A3DC7]">{cat.name}</h3>
                <span className="text-[12px] text-[#9CA3AF]">{cat.agent_count} agents</span>
              </div>
              <div className="border-b border-[#E5E7EB] -mt-2 mb-3" />

              {/* Agent cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                {cat.agents.map((agent, ai) => {
                  const isAccessible = agent.accessible;
                  const designationColors = {
                    ACT: 'bg-[#BBF7D0] text-[#065F46]',
                    ASSIST: 'bg-gray-200 text-black',
                    ADVISE: 'bg-blue-200 text-black',
                  };
                  const designationClass = designationColors[agent.designation] || 'bg-gray-200 text-black';
                  const statusColors = {
                    GA: 'text-[#059669]',
                    LA: 'text-[#6353E9]',
                    'Exp.LA': 'text-[#DC2626]',
                  };
                  const statusClass = statusColors[agent.status] || 'text-[#5A6180]';
                  return (
                    <div
                      key={ai}
                      className={`rounded-xl relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col ${
                        isAccessible
                          ? 'bg-[#EFF6FF] border border-[#6657f3] border-l-[4px] border-l-[#6657f3]'
                          : 'bg-[#F9FAFB] border border-[#E5E7EB] border-l-[4px] border-l-[#E5E7EB]'
                      }`}
                    >
                      <div className="p-3 flex flex-col flex-1">
                        {/* Agent name + Designation badge */}
                        <div className="flex items-start justify-between gap-2 min-h-[20px]">
                          <span className={`text-[13px] font-semibold leading-snug ${isAccessible ? 'text-[#4338CA]' : 'text-[#1E293B]'}`}>
                            {agent.name}
                          </span>
                          {agent.designation && (
                            <span className={`shrink-0 text-[9px] font-bold px-[8px] py-[4px] rounded-[4px] leading-none tracking-wide ${designationClass}`}>
                              {agent.designation}
                            </span>
                          )}
                        </div>

                        {/* Release version */}
                        {agent.release && (
                          <div className="text-[11px] text-[#6B7280] mt-1">{agent.release}</div>
                        )}

                        {/* Description */}
                        {agent.description && (
                          <p className="text-[11px] text-[#5A6180] leading-[1.5] mt-2 line-clamp-4">
                            {agent.description}
                          </p>
                        )}

                        {/* Bottom row: Product with access icon + Status */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-dashed border-[#D1D5DB]">
                          <span className={`text-[11px] font-medium ${isAccessible ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                            {isAccessible ? '✓' : '🔒'} {agent.product || 'Base'}
                          </span>
                          <span className={`text-[11px] font-semibold ${statusClass}`}>
                            {agent.status || 'GA'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ─── Pending data note ─── */}
          {(summary?.currently_active === '[PENDING]' || summary?.volume_12_mo === '[PENDING]') && (
            <div className="mt-6 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
              <p className="text-[11px] text-[#92400E] leading-relaxed">
                <strong>Pending data:</strong> Per-agent usage volumes and activation dates are not yet ingested in Customer 360.
                The "Currently Active" and "Volume (12 mo)" KPIs and the per-card usage strip will populate once telemetry is available.
              </p>
            </div>
          )}
        </div>
      )}
    </TabLoader>
  );
};

export default AIAgentsTab;
