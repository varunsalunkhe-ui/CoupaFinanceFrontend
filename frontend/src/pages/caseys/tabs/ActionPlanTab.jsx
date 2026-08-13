import React from 'react';
import { useTabFromContext } from '../../../context/DashboardContext';
import TabLoader from '../../../components/TabLoader';

const priorityStyles = {
  'P1': 'bg-red-100 text-red-900',
  'P2': 'bg-amber-100 text-amber-900',
  'P3': 'bg-blue-100 text-blue-900',
  1: 'bg-red-100 text-red-900',
  2: 'bg-amber-100 text-amber-900',
  3: 'bg-blue-100 text-blue-900',
};

const ActionPlanTab = ({ accountName = 'caseys' }) => {
  const { data, loading, error, retry } = useTabFromContext('plan');

  // Handle multiple backend response shapes:
  // { actions: [...] } | { actionPlan: { items: [...] } } | { rows: [...] } | [...]
  const actions = data?.actions
    || data?.actionPlan?.items
    || data?.rows
    || (Array.isArray(data) ? data : []);
  const metadata = data?.metadata;
  const summary = data?.actionPlan?.summary;

  return (
    <TabLoader loading={loading} error={error} onRetry={retry} data={data}>
      {data && actions.length > 0 && (
        <div>
          {metadata && (
            <p className="text-sm text-[#5A6180] mb-4">
              Action plan for <strong>{metadata.companyName}</strong> — Generated {metadata.generatedAt}
            </p>
          )}
          {summary && (
            <p className="text-sm text-[#0F1733] mb-4 bg-[#F8F9FD] border border-[#E4E7F1] rounded-lg px-4 py-3">
              {summary}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white border border-[#E4E7F1] rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-[#F8F9FD]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180] w-20">Priority</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180]">Action</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180]">Owner</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180]">Impact</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180] w-24">Source</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((row, i) => {
                  const prio = row.priority || row.priorityLevel || `P${i + 1}`;
                  return (
                    <tr key={i} className="border-b border-[#E4E7F1] last:border-b-0 hover:bg-[#F6F7FB] transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${priorityStyles[prio] || priorityStyles['P3']}`}>
                          {prio}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#0F1733]">{row.action || row.title}</td>
                      <td className="px-4 py-3 text-sm text-[#5A6180]">{row.owner || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#5A6180]">{row.impact || row.expectedOutcome || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#5A6180]">{row.due || row.source || row.timeline || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TabLoader>
  );
};

export default ActionPlanTab;
