import React from 'react';
import { useTabFromContext } from '../../../context/DashboardContext';
import TabLoader from '../../../components/TabLoader';

const insightStyles = {
  win: { border: 'border-t-green-600', tagColor: 'text-green-600', icon: '✓', label: 'Win' },
  risk: { border: 'border-t-red-600', tagColor: 'text-red-600', icon: '⚠', label: 'Risk' },
  opp: { border: 'border-t-amber-500', tagColor: 'text-amber-500', icon: '◆', label: 'Expansion' },
};

const statusColors = {
  adopted: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
  underused: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-500' },
  opportunity: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-[#6353E9]' },
};

const WhitespaceTab = ({ accountName = 'caseys' }) => {
  const { data, loading, error, retry } = useTabFromContext('whitespace');

  return (
    <TabLoader loading={loading} error={error} onRetry={retry} data={data}>
      {data && (
        <div >
          {/* Portfolio Summary */}
          {data.portfolioSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {data.portfolioSummary.map((stat, i) => (
                <div key={i} className="bg-white border border-[#E4E7F1] border-t-4 border-t-[#4A3DC7] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#0F1733]">{stat.value}</div>
                  <div className="text-[11px] uppercase tracking-wide text-[#5A6180] font-semibold mt-1">{stat.label}</div>
                  <div className="text-xs text-[#5A6180] mt-0.5">{stat.subtext}</div>
                </div>
              ))}
            </div>
          )}

          {/* Landscape Map */}
          {data.landscapeColumns && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#5A6180] mb-3">Whitespace Landscape</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {data.landscapeColumns.map((col, i) => (
                  <div key={i} className="bg-white border border-[#E4E7F1] rounded-xl p-4 border-t-4 border-t-[#4ec0f4]">
                    <div className="text-xs font-bold uppercase tracking-wide text-[#5A6180] mb-3 pb-2 border-b border-[#E4E7F1]">{col.header}</div>
                    <div className="flex flex-col gap-2">
                      {col.cells.map((cell, j) => {
                        const colors = statusColors[cell.status] || statusColors.opportunity;
                        return (
                          <div key={j} className={`border-l-4 ${colors.border} pl-3 py-1.5`}>
                            <div className="text-sm font-semibold text-[#0F1733]">{cell.name}</div>
                            <div className={`text-[10px] font-bold uppercase ${colors.text}`}>{cell.status}</div>
                            {cell.subtext && <div className="text-xs text-[#5A6180] mt-0.5">{cell.subtext}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platform Cells */}
          {data.platformCells && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#5A6180] mb-3">Platform & Foundation</h3>
              <div className="flex flex-wrap gap-2">
                {data.platformCells.map((cell, i) => {
                  const colors = statusColors[cell.status] || statusColors.opportunity;
                  return (
                    <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                      {cell.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prioritization Framework */}
          {data.prioritizationFactors && (
            <div className="bg-white border border-[#E4E7F1] rounded-xl p-5 mb-5">
              <h3 className="text-sm font-semibold mb-1">How we prioritize where to sell</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                {data.prioritizationFactors.map((factor, i) => (
                  <div key={i} className="border-l-[3px] border-l-[#6353E9] pl-3 py-1">
                    <div className="text-sm font-bold text-[#4A3DC7]">{factor.number || i + 1} · {factor.title}</div>
                    <div className="text-xs text-[#5A6180] mt-1 leading-relaxed">{factor.description}</div>
                    {factor.customerApplication && (
                      <div className="text-xs mt-1.5"><strong>Application →</strong> {factor.customerApplication}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expansion Sequence */}
          {data.expansionSequence && (
            <div className="bg-white border border-[#E4E7F1] rounded-xl p-5 mb-5">
              <div className="text-xs text-[#5A6180] uppercase tracking-wide font-bold mb-3">
                Ranked Expansion Sequence
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white border border-[#E4E7F1] rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-[#F8F9FD]">
                      <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180] w-12">Rank</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180]">Module</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180]">Primary Driver</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6180]">Factors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expansionSequence.map((item, i) => (
                      <tr key={i} className="border-b border-[#E4E7F1] last:border-b-0">
                        <td className="px-4 py-3 text-sm font-bold text-[#6353E9]">{item.rank || i + 1}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#0F1733]">{item.module}</td>
                        <td className="px-4 py-3 text-sm text-[#5A6180]">{item.driver || item.rationale}</td>
                        <td className="px-4 py-3 text-sm text-[#5A6180]">{item.factors || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insights */}
          {data.insights && (
            <>
              <div className="flex items-baseline justify-between mb-4 pb-2 border-b-2 border-[#E4E7F1] mt-4">
                <h2 className="text-base font-bold text-[#0F1733]">Risks, Wins & Expansion Theses</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.insights.map((insight, i) => {
                  const style = insightStyles[insight.type] || insightStyles.opp;
                  return (
                    <div key={i} className={`bg-white border border-[#E4E7F1] rounded-xl p-4 border-t-[3px] ${style.border}`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${style.tagColor}`}>
                        {style.icon} {style.label}
                      </div>
                      <h4 className="text-sm font-bold mt-1 mb-2">{insight.title}</h4>
                      <p className="text-xs text-[#5A6180] leading-relaxed">{insight.description}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </TabLoader>
  );
};

export default WhitespaceTab;
