import React from 'react';
import { useTabFromContext } from '../../../context/DashboardContext';
import TabLoader from '../../../components/TabLoader';

// FastTrack Archetypes reference data (standard Coupa program — highlighted row is dynamic based on backend)
const FASTTRACK_ARCHETYPES = [
  { num: 1, archetype: 'Legacy Lock-in', trigger: 'Low usage · Healthy', salesPlay: 'No-Brainer Upgrade', salesPlayColor: 'blue', uplift: '20% (min 10%)', cohort: 24 },
  { num: 2, archetype: 'Retention Reset', trigger: 'Low usage · Churn Risk', salesPlay: 'Risk Reversal', salesPlayColor: 'red', uplift: '20% (min 5%)', cohort: 23 },
  { num: 3, archetype: 'Reliable Riser', trigger: 'Normal usage · Healthy', salesPlay: 'No-Brainer Upgrade', salesPlayColor: 'blue', uplift: '10% (min 5%)', cohort: 78 },
  { num: 4, archetype: 'At Risk Optimizer', trigger: 'Normal usage · Churn Risk', salesPlay: 'Risk Reversal', salesPlayColor: 'red', uplift: '20% (min 5%)', cohort: 52 },
  { num: 5, archetype: 'Capped Steady Grower', trigger: 'High usage · Healthy · RR <= 7%', salesPlay: 'No-Brainer Upgrade', salesPlayColor: 'blue', uplift: '20% (min 5%)', cohort: 297 },
  { num: 6, archetype: 'Fair Value Realizer', trigger: 'High usage · Healthy · RR > 7%', salesPlay: 'No-Brainer Upgrade', salesPlayColor: 'blue', uplift: '20% (min 5%)', cohort: 11 },
  { num: 7, archetype: 'At Risk — High Utilizer', trigger: 'High usage · Churn Risk', salesPlay: 'Automation Bridge', salesPlayColor: 'amber', uplift: '15% (min 5%)', cohort: 177 },
];

// Currency formatting helpers
const formatCurrency = (value) => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `$${num.toLocaleString('en-US')}`;
};

const formatMetricValue = (value, unit, metricKey) => {
  if (value == null) return '—';
  if (typeof value === 'string' && metricKey === 'customerTier') return `Tier ${value}`;
  if (typeof value === 'string') return value;
  const num = Number(value);
  if (isNaN(num)) return String(value);
  if (metricKey === 'customerTier') return `Tier ${value}`;
  if (unit === '$' || unit === '$$}}, "') {
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(3)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)} million`;
    return `$${num.toLocaleString('en-US')}`;
  }
  return num.toLocaleString('en-US');
};

const UBPTab = ({ accountName }) => {
  const { data, loading, error, retry } = useTabFromContext('ubp');

  // Handle different possible data shapes from the API (may be nested under output)
  const rawUbp = data?.output || data;
  const ubp = rawUbp?.ubpConversion
    || (rawUbp?.keyMetrics ? rawUbp : null)
    || (rawUbp?.customerArchetype ? rawUbp : null)
    || (rawUbp?.composePackage ? rawUbp : null);

  // If we have structured UBP data, don't let TabLoader render rawText
  const tabLoaderData = ubp ? {} : data;

  // keyMetrics normalized to array
  const keyMetricsArray = (() => {
    if (!ubp?.keyMetrics) return [];
    if (Array.isArray(ubp.keyMetrics)) return ubp.keyMetrics;
    const order = ['currentACV', 'estimatedP2PSum', 'customerTier', 'estUBPListACV'];
    return order
      .filter((k) => ubp.keyMetrics[k])
      .map((k) => ({ metric: k, ...ubp.keyMetrics[k] }));
  })();

  // Pricing rows and totals from backend
  const pricingRows = ubp?.estimatedUBPPricing?.pricingRows || ubp?.estimatedUBPPricing?.lineItems || ubp?.estimatedUBPPricing?.pricingData || [];
  const pricingTotals = ubp?.estimatedUBPPricing?.totals || null;

  // Compose package tiers
  const composeTiers = ubp?.composePackage?.tiers || ubp?.composePackage?.packages || [];

  // Customer archetype number for highlighting FastTrack table
  const customerArchetypeNum = ubp?.customerArchetype?.archetype || null;

  return (
    <TabLoader loading={loading} error={error} onRetry={retry} data={tabLoaderData}>
      {ubp ? (
        <div className="space-y-6">
          {/* Description */}
          {ubp.description && (
            <p className="text-[13px] text-[#374151] leading-relaxed">{ubp.description}</p>
          )}

          {/* Data Confidence Alert */}
          {ubp.dataConfidence && (
            <div className="flex items-start gap-2 bg-[#FEF3C7] border border-[#F59E0B] rounded-lg px-4 py-3">
              <span className="text-amber-600 font-bold text-sm mt-0.5">&#9888;</span>
              <p className="text-[13px] text-[#92400E]">
                <strong>Data Confidence:</strong> {ubp.dataConfidence.message}
              </p>
            </div>
          )}

          {/* Key Metrics Bar */}
          {keyMetricsArray.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {keyMetricsArray.map((m, i) => {
                const labels = {
                  currentACV: 'CURRENT ACV',
                  estimatedP2PSum: 'ESTIMATED P2P $SUM',
                  customerTier: 'CUSTOMER TIER',
                  estUBPListACV: 'EST. UBP LIST ACV',
                };
                const borderList = ['#6353E9', '#0EA5E9', '#6353E9', '#6353E9'];
                return (
                  <div
                    key={i}
                    style={{ borderTopWidth: '4px', borderTopColor: borderList[i] || '#6353E9' }}
                    className="bg-white rounded-xl border border-[#E4E7F1] p-5"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6353E9] mb-3">
                      {labels[m.metric] || m.metric}
                    </div>
                    <div className="text-[28px] font-bold text-[#0F1733] leading-none mb-2">
                      {formatMetricValue(m.value, m.unit, m.metric)}
                    </div>
                    {m.source && (
                      <div className="text-[12px] text-[#5A6180]">{m.source}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Estimated UBP Pricing */}
          {ubp.estimatedUBPPricing && ubp.estimatedUBPPricing.hasData && (
            <div className="bg-white border border-[#E4E7F1] rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-[#0F1733] mb-1">{ubp.estimatedUBPPricing.title || 'Estimated UBP Pricing'}</h3>
              <p className="text-[11px] text-[#5A6180] mb-4">
                Calculation method: {ubp.estimatedUBPPricing.calculationMethod || '—'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#E4E7F1] bg-gray-50">
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">LINE ITEM</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">PRICING METHOD</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">EST. LIST ACV</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">@ 30% DISC</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">@ 40% DISC</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">@ 65% DISC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingRows.map((row, i) => (
                      <tr key={i} className="border-b border-[#E4E7F1]">
                        <td className="px-3 py-2.5 text-[13px] font-medium text-[#0F1733]">{row.lineItem || '—'}</td>
                        <td className="px-3 py-2.5 text-[13px] text-[#5A6180]">{row.pricingMethod || '—'}</td>
                        <td className="px-3 py-2.5 text-[13px] text-right font-semibold text-[#0F1733]">{formatCurrency(row.estListACV)}</td>
                        <td className="px-3 py-2.5 text-[13px] text-right text-[#5A6180]">{formatCurrency(row.at30Disc)}</td>
                        <td className="px-3 py-2.5 text-[13px] text-right text-[#5A6180]">{formatCurrency(row.at40Disc)}</td>
                        <td className="px-3 py-2.5 text-[13px] text-right text-[#5A6180]">{formatCurrency(row.at65Disc)}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    {pricingTotals && (
                      <tr className="border-t-2 border-[#6b38f7] bg-[#F8F9FC]">
                        <td className="px-3 py-3 text-[13px] font-bold text-[#0F1733]">Estimated TOTAL (Year 1)</td>
                        <td className="px-3 py-3 text-[13px] font-bold text-[#0F1733]">Sum</td>
                        <td className="px-3 py-3 text-[13px] text-right font-bold text-[#6b38f7]">{formatCurrency(pricingTotals.totalEstListACV)}</td>
                        <td className="px-3 py-3 text-[13px] text-right font-bold text-[#0F1733]">{formatCurrency(pricingTotals.total30Disc)}</td>
                        <td className="px-3 py-3 text-[13px] text-right font-bold text-[#0F1733]">{formatCurrency(pricingTotals.total40Disc)}</td>
                        <td className="px-3 py-3 text-[13px] text-right font-bold text-[#0F1733]">{formatCurrency(pricingTotals.total65Disc)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Comparison note */}
              {ubp.keyMetrics?.currentACV?.value && pricingTotals?.total40Disc && (
                <p className="mt-4 text-[12px] text-[#374151] leading-relaxed">
                  <strong>vs. {accountName?.replace(/-/g, ' ') || ubp.metadata?.accountName || 'Customer'}&apos;s current ACV ({formatMetricValue(ubp.keyMetrics.currentACV.value, '$', 'currentACV')}):</strong>{' '}
                  At @40% standard discount, estimated UBP Net = {formatCurrency(pricingTotals.total40Disc)}
                  {' '}(+{formatCurrency(pricingTotals.total40Disc - ubp.keyMetrics.currentACV.value)};{' '}
                  +{((pricingTotals.total40Disc - ubp.keyMetrics.currentACV.value) / ubp.keyMetrics.currentACV.value * 100).toFixed(0)}%) → cohort: <strong className='text-[#e07f08]'>UBP HIGHER</strong>
                </p>
              )}
            </div>
          )}

          {/* Customer Archetype */}
          {ubp.customerArchetype && ubp.customerArchetype.hasData && (
            <div className="bg-gradient-to-br from-[#e9fafe] to-[#F5F3FF] border-2 border-[#6353E9]/30 rounded-xl p-5">
              <h3 className="text-sm font-bold text-[#4A3DC7] mb-2">
                Customer archetype: #{ubp.customerArchetype.archetype}{' '}
                {FASTTRACK_ARCHETYPES.find(a => a.num === ubp.customerArchetype.archetype)?.archetype || ''} with a cap
              </h3>
              <p className="text-[13px] text-[#374151] leading-relaxed">{ubp.customerArchetype.statusMessage}</p>
            </div>
          )}

          {/* Compose Package Options */}
          {ubp.composePackage && composeTiers.length > 0 && (
            <div>
              {ubp.composePackage.title && (
                <h3 className="text-sm font-bold text-[#0F1733] mb-3">{ubp.composePackage.title}</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {composeTiers.map((pkg, i) => {
                  const isRec = pkg.isRecommended;
                  const tierLabels = ['COMPOSE GOOD', 'COMPOSE BETTER', 'COMPOSE BEST'];
                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-5 flex flex-col ${
                        isRec
                          ? 'bg-white border-2 border-[#059669] ring-4 ring-[#059669]/10'
                          : 'bg-white border border-[#E4E7F1]'
                      }`}
                    >
                      {isRec && (
                        <div className="text-[9px] font-bold uppercase tracking-widest text-[#059669] mb-2">
                          &#10003; RECOMMENDED FOR {accountName?.toUpperCase()?.replace(/-/g, ' ') || ubp.metadata?.accountName?.toUpperCase() || 'CLIENT'}
                        </div>
                      )}
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[#5A6180]">
                        {tierLabels[i] || pkg.tierLabel || pkg.name}
                      </div>
                      <h4 className={`text-lg font-bold mb-2 ${isRec ? 'text-[#6b38f7]' : 'text-[#6b38f7]'}`}>
                        {pkg.tierName || pkg.name}
                      </h4>
                      <div className={`text-2xl font-bold ${isRec ? 'text-[#6b38f7]' : 'text-[#6b38f7]'}`}>
                        {pkg.percentOfP2P ? `${pkg.percentOfP2P}%` : pkg.details}
                      </div>
                      <div className="text-[11px] mb-1 text-[#5A6180]">of P2P</div>
                      {pkg.estListACV && (
                        <div className="text-[11px] mb-3 text-[#5A6180]">
                          Est. {formatCurrency(pkg.estListACV)} list ACV at {accountName?.replace(/-/g, ' ') || ubp.metadata?.accountName || "Customer"}&apos;s Tier
                        </div>
                      )}
                      {pkg.features && pkg.features.length > 0 && (
                        <ul className="space-y-1 mb-3 text-[#374151]">
                          {pkg.features.map((f, fi) => (
                            <li key={fi} className="flex items-start gap-1.5 text-[12px]">
                              <span className="mt-0.5 shrink-0">&bull;</span>
                              <span>{typeof f === 'string' ? f : f.name || f.feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {isRec && pkg.scenario && (
                        <div className="text-[12px] leading-relaxed mt-auto text-[#374151]">
                          <strong className="italic">Scenario:</strong> <span className="italic">{pkg.scenario}</span>. <strong className="italic">Renewal:</strong> <span className="italic">{pkg.renewalDiscount}</span>. <strong className="italic">Min uplift:</strong> <span className="italic">{pkg.minUplift}</span>
                        </div>
                      )}
                      {!isRec && pkg.customerFit && (
                        <div className="text-[12px] leading-relaxed mt-auto text-[#374151]">
                          {pkg.customerFit}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
 
          {/* FastTrack Archetypes Table */}
          <div className="bg-white border border-[#E4E7F1] rounded-xl p-5">
            <h3 className="text-sm font-bold text-[#0F1733] mb-1">FastTrack Archetypes — All 7 Scenarios</h3>
            <p className="text-[11px] text-[#5A6180] mb-4">From Coupa Compose FastTrack program. Customer&apos;s likely archetype is highlighted.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E4E7F1] bg-gray-50">
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180] w-8">#</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180] w-8"></th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">ARCHETYPE</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">TRIGGER</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">SALES PLAY</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">RECOMMENDED UPLIFT</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[#5A6180]">COHORT SIZE</th>
                  </tr>
                </thead>
                <tbody>
                  {FASTTRACK_ARCHETYPES.map((arch) => {
                    const isHighlighted = arch.num === customerArchetypeNum;
                    const salesPlayStyles = {
                      blue: 'bg-[#DBEAFE] text-[#1D4ED8]',
                      red: 'bg-[#FEE2E2] text-[#DC2626]',
                      amber: 'bg-[#FEF3C7] text-[#92400E]',
                    };
                    return (
                      <tr
                        key={arch.num}
                        className={`border-b border-[#E4E7F1] last:border-b-0 ${isHighlighted ? 'bg-[#6353E9]/10' : ''}`}
                      >
                        <td className={`px-3 py-2.5 text-[13px] ${isHighlighted ? 'font-bold text-[#6353E9]' : 'text-[#0F1733]'}`}>
                          {arch.num}
                        </td>
                        <td className="px-3 py-2.5">
                          {isHighlighted && (
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-[#70e281] mb-0.5">
                              {accountName?.replace(/-/g, ' ')?.toUpperCase() || ubp.metadata?.accountName?.toUpperCase() || "CASEY'S GENERAL STORES"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[13px] font-medium text-[#0F1733]`}>
                            {arch.archetype}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[13px] text-[#5A6180]">{arch.trigger}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-semibold ${salesPlayStyles[arch.salesPlayColor]}`}>
                            {arch.salesPlay}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[13px] text-[#0F1733]">{arch.uplift}</td>
                        <td className="px-3 py-2.5 text-[13px] text-[#5A6180]">{arch.cohort}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Plays */}
          {ubp.salesPlays && ubp.salesPlays.plays && ubp.salesPlays.plays.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#5A6180]">{ubp.salesPlays.title}</h3>
                <span className="text-[11px] text-[#5A6180] italic">{ubp.salesPlays.subtitle}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ubp.salesPlays.plays.map((play, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-5 ${
                      play.isRecommended
                        ? 'bg-white border-2 border-[#6353E9] ring-2 ring-[#6353E9]/10'
                        : 'bg-white border border-[#E4E7F1]'
                    }`}
                  >
                    {play.isRecommended && (
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[#6353E9] mb-2">
                        &#10003; {accountName?.toUpperCase()?.replace(/-/g, ' ') || ubp.metadata?.accountName?.toUpperCase() || 'CLIENT'}&apos;S RECOMMENDED PLAY
                      </div>
                    )}
                    <h4 className="text-[15px] font-bold text-[#0F1733] mb-2">{play.name}</h4>
                    {play.targetArchetypes && (
                      <p className="text-[11px] text-[#5A6180] mb-1">
                        <strong>Target archetypes:</strong> Archetypes {play.targetArchetypes.join(', ')}
                      </p>
                    )}
                    {play.accountCount && (
                      <p className="text-[11px] text-[#5A6180] mb-2">
                        <strong>Account count:</strong> {play.accountCount} target accounts
                      </p>
                    )}
                    <p className="text-[12px] text-[#5A6180] leading-relaxed">{play.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promotions Available */}
          {ubp.promotionsAvailable && ubp.promotionsAvailable.promotions && ubp.promotionsAvailable.promotions.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#5A6180]">{ubp.promotionsAvailable.title}</h3>
                <span className="text-[11px] text-[#5A6180] italic">{ubp.promotionsAvailable.subtitle}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ubp.promotionsAvailable.promotions.map((promo, i) => (
                  <div key={i} className="border border-[#E4E7F1] border-l-4 border-l-[#6353E9] rounded-2xl p-4 bg-white">
                    <h5 className="text-[13px] font-bold text-[#6353E9] mb-1.5">{promo.name}</h5>
                    <p className="text-[12px] text-[#374151] leading-relaxed mb-2">
                      {promo.description || promo.details}
                    </p>
                    {promo.requirements && (
                      <p className="text-[11px] text-[#374151] leading-relaxed mb-1">
                        <strong>Requires:</strong> {promo.requirements}
                      </p>
                    )}
                    {promo.accountEligibility && (
                      <p className="text-[11px] text-[#D97706] leading-relaxed">
                        <strong>For {accountName?.replace(/-/g, ' ') || ubp.metadata?.accountName || 'Customer'}:</strong> {promo.accountEligibility}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AE Talk Track */}
          {ubp.aeTalkTrack && ubp.aeTalkTrack.talkingPoints && ubp.aeTalkTrack.talkingPoints.length > 0 && (
            <div className="bg-white border border-[#E4E7F1] rounded-xl p-5">
              <h3 className="text-sm font-bold text-[#0F1733] mb-1">{ubp.aeTalkTrack.title}</h3>
              <p className="text-[11px] text-[#5A6180] mb-4 italic">{ubp.aeTalkTrack.subtitle}</p>
              <ol className="space-y-3">
                {ubp.aeTalkTrack.talkingPoints.map((point, i) => {
                  const pointText = typeof point === 'string' ? point : point.point || point.text;
                  const contextText = typeof point === 'object' ? point.context : null;
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6353E9] text-[11px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-[13px] text-[#374151] leading-relaxed">
                          {pointText}
                        </span>
                        {contextText && (
                          <p className="text-[11px] text-[#5A6180] mt-1 leading-relaxed italic">{contextText}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Objection Handling */}
          {ubp.objectionHandling && ubp.objectionHandling.objections && ubp.objectionHandling.objections.length > 0 && (
            <div className="bg-white border border-[#E4E7F1] rounded-xl p-5">
              <h3 className="text-sm font-bold text-[#0F1733] mb-4">{ubp.objectionHandling.title}</h3>
              <div className="space-y-5">
                {ubp.objectionHandling.objections.map((obj, i) => {
                  const objection = typeof obj === 'string' ? obj : obj.objection || obj.question;
                  const response = typeof obj === 'string' ? null : obj.suggestedResponse || obj.response || obj.answer;
                  return (
                    <div key={i}>
                      <div className="flex items-start gap-3 mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FEE2E2] text-[#DC2626] text-xs font-bold shrink-0 mt-0.5">?</span>
                        <p className="text-[13px] font-semibold text-[#0F1733] leading-relaxed">{objection}</p>
                      </div>
                      {response && (
                        <div className="ml-9 flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#DCFCE7] text-[#16A34A] text-[10px] shrink-0 mt-0.5">&#10003;</span>
                          <p className="text-[13px] text-[#374151] leading-relaxed">{response}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open Questions / Data Gaps */}
          {ubp.openQuestions && ubp.openQuestions.questions && ubp.openQuestions.questions.length > 0 && (
            <div className="bg-[#FEF3C7]/50 border border-[#F59E0B] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-600 text-lg">&#9888;</span>
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#92400E]">{ubp.openQuestions.title}</h3>
              </div>
              <p className="text-[11px] text-[#92400E] mb-3 italic">{ubp.openQuestions.subtitle}</p>
              <ul className="space-y-2">
                {ubp.openQuestions.questions.map((q, i) => {
                  const questionText = typeof q === 'string' ? q : q.question || q.text;
                  const priority = typeof q === 'object' ? q.priority : null;
                  const owner = typeof q === 'object' ? q.owner : null;
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#F59E0B] mt-0.5 shrink-0">&bull;</span>
                      <div>
                        <span className="text-[13px] text-[#78350F] leading-relaxed">{questionText}</span>
                        {(priority || owner) && (
                          <span className="ml-2 text-[10px] text-[#92400E] font-semibold">
                            {priority && <span className="uppercase">[{priority}]</span>}
                            {owner && <span> — {owner}</span>}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

         
        </div>
      ) : (
        !loading && data && <div className="text-sm text-[#5A6180] text-center py-8">No UBP conversion data available.</div>
      )}
    </TabLoader>
  );
};

export default UBPTab;
