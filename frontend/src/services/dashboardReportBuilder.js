/**
 * Dashboard Report Builder
 *
 * Builds downloadable, self-contained HTML reports from dashboard tab data.
 * Used by the per-tab "Download Report" button (AI Agents) and the
 * dashboard-wide "Download Dashboard" button (Hero + all 8 tabs).
 */

const esc = (val) => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === 'NA' || val === '') return '—';
  const num = Number(val);
  if (Number.isNaN(num)) return esc(val);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const REPORT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F6F7FB; color: #111827; padding: 32px; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 32px; }
  .header h1 { font-size: 24px; color: #0F1733; }
  .header p { font-size: 13px; color: #6B7280; margin-top: 4px; }
  .section { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
  .section h2 { font-size: 18px; color: #0F1733; margin-bottom: 4px; }
  .section .section-sub { font-size: 12px; color: #6B7280; margin-bottom: 16px; }
  .hero { color: #fff; border-radius: 16px; padding: 28px; margin-bottom: 24px; background: linear-gradient(135deg, #0C4A6E, #075985, #0369A1); }
  .hero h1 { font-size: 26px; }
  .hero .sub { font-size: 13px; opacity: .85; margin-top: 4px; }
  .hero .tags { margin-top: 12px; }
  .hero .tag { display: inline-block; background: rgba(255,255,255,.18); padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-right: 8px; }
  .hero .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.2); }
  .hero .meta-label { font-size: 10px; opacity: .7; text-transform: uppercase; letter-spacing: .06em; }
  .hero .meta-value { font-size: 13px; font-weight: 600; margin-top: 2px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 20px; }
  .stat-card { background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; }
  .stat-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 6px; }
  .stat-value { font-size: 24px; font-weight: 700; color: #111827; }
  .stat-sub { font-size: 11px; color: #6B7280; margin-top: 6px; }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
  .card { border-radius: 12px; padding: 16px; border: 1px solid #E5E7EB; border-left: 4px solid #6353E9; background: #fff; }
  .card h4 { font-size: 13px; margin-bottom: 8px; }
  .card ul { padding-left: 18px; font-size: 13px; }
  .card li { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #6B7280; padding: 8px; background: #F8FAFC; border-bottom: 2px solid #E5E7EB; }
  td { padding: 8px; border-bottom: 1px solid #F3F4F6; }
  .category { margin-bottom: 24px; }
  .category h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #4A3DC7; margin-bottom: 10px; }
  .category-divider { border: none; border-bottom: 1px solid #E5E7EB; margin-bottom: 10px; }
  .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .agent-card { border-radius: 12px; padding: 12px; display: flex; flex-direction: column; }
  .agent-card.accessible { background: #EEF2FF; border: 1px solid #C7D2FE; border-left: 4px solid #6353E9; }
  .agent-card.locked { background: #F9FAFB; border: 1px solid #E5E7EB; border-left: 4px solid #E5E7EB; }
  .agent-name { font-size: 13px; font-weight: 600; }
  .agent-name.accessible { color: #4338CA; }
  .agent-name.locked { color: #1E293B; }
  .badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.05em; }
  .badge-act { background: #BBF7D0; color: #000; }
  .badge-assist { background: #D1D5DB; color: #000; }
  .badge-advise { background: #BFDBFE; color: #000; }
  .badge-status { background: #E5E7EB; color: #000; }
  .agent-desc { font-size: 11px; color: #5A6180; margin-top: 8px; }
  .agent-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #D1D5DB; }
  .pill-accessible { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: #6353E9; color: #fff; }
  .pill-locked { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0; }
  .access-yes { font-size: 11px; font-weight: 500; color: #059669; }
  .access-no { font-size: 11px; font-weight: 500; color: #6B7280; }
  .empty { font-size: 13px; color: #9CA3AF; font-style: italic; }
  .footer { text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; }
`;

/** Trigger a browser download of an HTML string. */
export const downloadHtmlFile = (html, filename) => {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Reusable AI Agents section markup (stats + categories), shared by the tab-level and dashboard-wide reports. */
export const buildAgentsSectionMarkup = (agents) => {
  if (!agents) return '<p class="empty">No AI Agents data available.</p>';
  const summary = agents.summary;
  const categories = agents.categories || [];
  const unlockedPct = summary?.total_agents > 0
    ? Math.round((summary.customer_accessible / summary.total_agents) * 100)
    : 0;

  return `
    ${summary ? `<div class="stats">
      <div class="stat-card"><div class="stat-label">Total Agents</div><div class="stat-value">${esc(summary.total_agents)}</div><div class="stat-sub">R43-R47 cumulative</div></div>
      <div class="stat-card"><div class="stat-label">Customer Accessible</div><div class="stat-value">${esc(summary.customer_accessible)}</div><div class="stat-sub">${unlockedPct}% unlocked</div></div>
      <div class="stat-card"><div class="stat-label">Currently Active</div><div class="stat-value">${esc(summary.currently_active)}</div><div class="stat-sub">Awaiting telemetry</div></div>
      <div class="stat-card"><div class="stat-label">Volume (12 Mo)</div><div class="stat-value">${esc(summary.volume_12_mo)}</div><div class="stat-sub">Awaiting telemetry</div></div>
    </div>` : ''}
    ${categories.map((cat) => `<div class="category">
      <h3>${esc(cat.name)}</h3>
      <hr class="category-divider"/>
      <div class="agents-grid">
        ${(cat.agents || []).map((agent) => `<div class="agent-card ${agent.accessible ? 'accessible' : 'locked'}">
          <div style="display:flex;align-items:start;justify-content:space-between;gap:8px;">
            <span class="agent-name ${agent.accessible ? 'accessible' : 'locked'}">${esc(agent.name)}</span>
            <span class="badge badge-status">${esc(agent.status || 'GA')}</span>
          </div>
          ${agent.designation ? `<div style="margin-top:6px;"><span class="badge badge-${agent.designation.toLowerCase()}">${esc(agent.designation)}</span></div>` : ''}
          ${agent.description ? `<p class="agent-desc">${esc(agent.description)}</p>` : ''}
          <div class="agent-bottom">
            <span class="${agent.accessible ? 'pill-accessible' : 'pill-locked'}">${esc(agent.release || 'Base')}</span>
            <span class="${agent.accessible ? 'access-yes' : 'access-no'}">${agent.accessible ? '✓ Accessible' : '🔒 ' + esc(agent.access_status || 'Requires SKU')}</span>
          </div>
        </div>`).join('')}
      </div>
    </div>`).join('')}
  `;
};

/** Standalone single-tab AI Agents report (used by AIAgentsTab's "Download Report" button). */
export const buildAgentsReportHtml = (agents, customerName) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AI Agents Report - ${esc(customerName)}</title>
<style>${REPORT_STYLES}</style>
</head>
<body>
<div class="header">
  <h1>AI Agents Report</h1>
  <p>${esc(customerName)} &mdash; Generated ${new Date().toLocaleDateString()}</p>
</div>
${buildAgentsSectionMarkup(agents)}
<div class="footer">Coupa Finance &mdash; AI-Driven Knowledge Platform</div>
</body>
</html>`;

const buildHeroMarkup = (hero) => {
  if (!hero) return '';
  return `<div class="hero">
    <h1>${esc(hero.companyName)}</h1>
    <div class="sub">${esc(hero.subtext)}</div>
    <div class="tags">${(hero.tags || []).map((t) => `<span class="tag">${esc(t.text)}</span>`).join('')}</div>
    <div class="meta-grid">
      <div><div class="meta-label">Open Opp Renewal ACV</div><div class="meta-value">${esc(hero.openAcv)}</div></div>
      <div><div class="meta-label">Contract Term</div><div class="meta-value">${esc(hero.contractTerm)}</div></div>
      ${(hero.metaGrid || []).map((item) => `<div><div class="meta-label">${esc(item.label)}</div><div class="meta-value">${esc(item.value)}</div></div>`).join('')}
    </div>
  </div>`;
};

const SUMMARY_CARD_ORDER = [
  { key: 'relationshipHealth', title: '✓ Relationship Health', render: (d) => (d.items || []).map((i) => `<li><strong>${esc(i.indicator)}:</strong> ${esc(i.value)}</li>`).join('') },
  { key: 'concerns', title: '⚠ Concerns', render: (d) => (d.items || []).map((i) => `<li><strong>${esc(i.title)}:</strong> ${esc(i.description)}</li>`).join('') },
  { key: 'valueDelivered', title: '$ Value Delivered', render: (d) => (d.items || []).map((i) => `<li><strong>${esc(i.category)}:</strong> ${esc(i.value)}</li>`).join('') },
  { key: 'topExpansionPriorities', title: '◆ Top Expansion Priorities', render: (d) => (d.items || []).map((i) => `<li><strong>${esc(i.module)}:</strong> ${esc(i.rationale)}</li>`).join('') },
  { key: 'adoptionWins', title: '✓ Adoption Wins', render: (d) => (d.items || []).map((i) => `<li><strong>${esc(i.title)}:</strong> ${esc(i.metric)}</li>`).join('') },
  { key: 'benchmarkMethodology', title: '⊙ Benchmarks & Methodology', render: (d) => (d.items || []).map((i) => `<li><strong>${esc(i.name)}:</strong> ${esc(i.customerValue)}${i.industryBenchmark ? ` (benchmark: ${esc(i.industryBenchmark)})` : ''}</li>`).join('') },
];

const buildSummaryMarkup = (summary) => {
  const cards = summary?.cards;
  if (!cards) return '<p class="empty">No Executive Summary data available.</p>';
  return `<div class="card-grid">
    ${SUMMARY_CARD_ORDER.filter((c) => cards[c.key]).map((c) => `<div class="card">
      <h4>${c.title}</h4>
      ${cards[c.key].summary ? `<p class="section-sub">${esc(cards[c.key].summary)}</p>` : ''}
      ${c.key === 'valueDelivered' ? `<p style="font-size:12px;margin-bottom:6px;"><strong>Total Value:</strong> ${esc(cards[c.key].totalValue)} &nbsp; <strong>ROI:</strong> ${esc(cards[c.key].roiMultiple)}</p>` : ''}
      <ul>${c.render(cards[c.key])}</ul>
    </div>`).join('')}
  </div>`;
};

const buildSnapshotMarkup = (snapshot) => {
  if (!snapshot) return '<p class="empty">No Value Snapshot data available.</p>';

  const spendRows = [
    ['Coupa PO Spend', snapshot.po_spend],
    ['Non-PO Invoice Spend', snapshot.Non_PO_Invoice_Spend],
    ['External PO-based Invoice Spend', snapshot.External_PO_based_Invoice_Spend],
    ['Total Coupa Spend', snapshot.total_coupa_spend],
    ['Total Addressable Spend (Est.)', snapshot.total_addressable_spend],
  ];

  const kpiRows = [
    ['On-Contract Savings Capture', snapshot.Spend_Under_Contract_Savings_Capture],
    ['Requisition (PR-to-PO) Cycle Time (days)', snapshot.PR_to_PO_Cycle_Time],
    ['First Time Match Rate', snapshot.First_Time_Match_Rate],
    ['Total Contracts', snapshot.Total_Contracts],
    ['Total Sourcing Projects', snapshot.Total_Sourcing_Projects],
  ];

  const payRows = [
    ['Spend Thru Coupa Pay', snapshot.Spend_Thru_Coupa_Pay],
    ['VCard On PO Volume', snapshot.VCard_On_PO_Volume],
    ['VCard On Invoice Volume', snapshot.VCard_On_Invoice_Volume],
    ['VCard Volume', snapshot.VCard_Volume],
    ['EPD Rebates', snapshot.EPD_Rebates],
  ];

  const valueRows = [
    ['Generate Rebates through Card Payments', snapshot.Generate_Rebates_through_Card_Payments],
    ['Reduce Invoice Processing Costs', snapshot.Reduce_Invoice_Processing_Costs],
    ['Savings Generated with Early Payment Discounts', snapshot.Savings_Generated_with_Early_Payment_Discounts],
    ['Increase Savings Capture Rate (Smart Intake & Orchestration)', snapshot['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Smart_Intake_and_Orchestration']],
    ['Increase Savings Capture Rate (Core Procurement)', snapshot['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Core_Procurement']],
    ['Increase Spend On Contract Through More Sourcing Activities', snapshot.Increase_Spend_On_Contract_Through_More_Sourcing_Activities],
    ['Total Sourcing Savings', snapshot.Total_Sourcing_Savings],
  ];

  const renderTable = (title, rows) => `<p class="section-sub" style="margin-top:12px;">${esc(title)}</p>
    <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
      ${rows.map(([label, val]) => `<tr><td>${esc(label)}</td><td>${formatCurrency(val)}</td></tr>`).join('')}
    </tbody></table>`;

  return renderTable('Spend Data', spendRows)
    + renderTable('Value Metrics (KPIs)', kpiRows)
    + renderTable('Coupa Pay Performance', payRows)
    + renderTable('Value Realized', valueRows);
};

const buildPortfolioGroupMarkup = (group, badgeClass) => {
  if (!group || !group.products?.length) return '';
  return `<div class="category">
    <h3>${esc(group.title)}</h3>
    <hr class="category-divider"/>
    <table><thead><tr><th>Product</th><th>Group</th><th>Heat</th><th>Qty</th><th>Contract</th><th>Description</th></tr></thead><tbody>
      ${group.products.map((p) => `<tr>
        <td>${esc(p.productName)}</td>
        <td>${esc(p.productGroup)}</td>
        <td>${esc(p.productHeat || badgeClass)}</td>
        <td>${p.quantity > 1 ? esc(p.quantity) : '—'}</td>
        <td>${p.subscriptionStartDate ? `${esc(p.subscriptionStartDate)} – ${esc(p.subscriptionEndDate)}` : '—'}</td>
        <td>${esc(p.llmDescription || '—')}</td>
      </tr>`).join('')}
    </tbody></table>
  </div>`;
};

const buildPortfolioMarkup = (data) => {
  const portfolio = data?.portfolio;
  if (!portfolio) return '<p class="empty">No Product Portfolio data available.</p>';
  return [
    buildPortfolioGroupMarkup(portfolio.ownedAndPerforming, 'Successful'),
    buildPortfolioGroupMarkup(portfolio.ownedButConcerned, 'Concerned'),
    buildPortfolioGroupMarkup(portfolio.notOwnedUpsell, 'Opportunity'),
  ].join('') || '<p class="empty">No products found.</p>';
};

const buildUsageMarkup = (usage) => {
  const kpis = usage?.kpis;
  if (!kpis?.length) return '<p class="empty">No Usage data available.</p>';
  return kpis.map((kpi) => {
    const views = Object.keys(kpi).filter((k) => k !== 'key' && k !== 'label');
    return `<div class="category">
      <h3>${esc(kpi.label || kpi.key)}</h3>
      <hr class="category-divider"/>
      ${views.map((view) => {
        const series = kpi[view]?.series || [];
        if (!series.length) return '';
        return `<p class="section-sub" style="margin-top:8px;">${esc(view.replace(/_/g, ' '))}</p>
          <table><thead><tr>${series.map((s) => `<th>${esc(s.period)}</th>`).join('')}</tr></thead>
          <tbody><tr>${series.map((s) => `<td>${formatCurrency(s.value)}</td>`).join('')}</tr></tbody></table>`;
      }).join('')}
    </div>`;
  }).join('');
};

const buildWhitespaceMarkup = (data) => {
  if (!data) return '<p class="empty">No Whitespace & Risks data available.</p>';
  let html = '';
  if (data.portfolioSummary?.length) {
    html += `<div class="stats">${data.portfolioSummary.map((s) => `<div class="stat-card"><div class="stat-label">${esc(s.label)}</div><div class="stat-value">${esc(s.value)}</div><div class="stat-sub">${esc(s.subtext)}</div></div>`).join('')}</div>`;
  }
  if (data.landscapeColumns?.length) {
    html += `<div class="card-grid">${data.landscapeColumns.map((col) => `<div class="card"><h4>${esc(col.header)}</h4><ul>${(col.cells || []).map((c) => `<li><strong>${esc(c.name)}:</strong> ${esc(c.status)}${c.subtext ? ` — ${esc(c.subtext)}` : ''}</li>`).join('')}</ul></div>`).join('')}</div>`;
  }
  if (data.platformCells?.length) {
    html += `<p class="section-sub" style="margin-top:12px;">Platform & Foundation: ${data.platformCells.map((c) => esc(c.name)).join(', ')}</p>`;
  }
  if (data.prioritizationFactors?.length) {
    html += `<table><thead><tr><th>#</th><th>Title</th><th>Description</th><th>Application</th></tr></thead><tbody>
      ${data.prioritizationFactors.map((f, i) => `<tr><td>${esc(f.number || i + 1)}</td><td>${esc(f.title)}</td><td>${esc(f.description)}</td><td>${esc(f.customerApplication || '—')}</td></tr>`).join('')}
    </tbody></table>`;
  }
  if (data.expansionSequence?.length) {
    html += `<table><thead><tr><th>Rank</th><th>Module</th><th>Driver</th><th>Factors</th></tr></thead><tbody>
      ${data.expansionSequence.map((item, i) => `<tr><td>${item.rank || i + 1}</td><td>${esc(item.module)}</td><td>${esc(item.driver || item.rationale)}</td><td>${esc(item.factors || '—')}</td></tr>`).join('')}
    </tbody></table>`;
  }
  if (data.insights?.length) {
    html += `<div class="card-grid" style="margin-top:16px;">${data.insights.map((i) => `<div class="card"><h4>${esc(i.title)}</h4><p style="font-size:12px;color:#5A6180;">${esc(i.description)}</p></div>`).join('')}</div>`;
  }
  return html || '<p class="empty">No whitespace insights available.</p>';
};

const FASTTRACK_ARCHETYPES = [
  { num: 1, archetype: 'Legacy Lock-in', trigger: 'Low usage · Healthy', salesPlay: 'No-Brainer Upgrade', uplift: '20% (min 10%)', cohort: 24 },
  { num: 2, archetype: 'Retention Reset', trigger: 'Low usage · Churn Risk', salesPlay: 'Risk Reversal', uplift: '20% (min 5%)', cohort: 23 },
  { num: 3, archetype: 'Reliable Riser', trigger: 'Normal usage · Healthy', salesPlay: 'No-Brainer Upgrade', uplift: '10% (min 5%)', cohort: 78 },
  { num: 4, archetype: 'At Risk Optimizer', trigger: 'Normal usage · Churn Risk', salesPlay: 'Risk Reversal', uplift: '20% (min 5%)', cohort: 52 },
  { num: 5, archetype: 'Capped Steady Grower', trigger: 'High usage · Healthy · RR <= 7%', salesPlay: 'No-Brainer Upgrade', uplift: '20% (min 5%)', cohort: 297 },
  { num: 6, archetype: 'Fair Value Realizer', trigger: 'High usage · Healthy · RR > 7%', salesPlay: 'No-Brainer Upgrade', uplift: '20% (min 5%)', cohort: 11 },
  { num: 7, archetype: 'At Risk — High Utilizer', trigger: 'High usage · Churn Risk', salesPlay: 'Automation Bridge', uplift: '15% (min 5%)', cohort: 177 },
];

const buildUbpMarkup = (data) => {
  const ubp = data?.output?.ubpConversion || data?.ubpConversion || data;
  if (!ubp || (!ubp.keyMetrics && !ubp.estimatedUBPPricing && !ubp.customerArchetype)) {
    return '<p class="empty">No UBP Conversion data available.</p>';
  }
  let html = '';
  if (ubp.description) {
    html += `<p class="section-sub">${esc(ubp.description)}</p>`;
  }
  if (ubp.dataConfidence?.message) {
    html += `<p style="font-size:12px;color:#92400E;background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:10px 12px;">${esc(ubp.dataConfidence.message)}</p>`;
  }
  const metrics = ubp.keyMetrics;
  if (metrics) {
    const entries = Array.isArray(metrics) ? metrics : Object.entries(metrics).map(([k, v]) => ({ metric: k, ...v }));
    html += `<div class="stats">${entries.map((m) => `<div class="stat-card"><div class="stat-label">${esc(m.metric)}</div><div class="stat-value">${esc(m.value)}</div>${m.source ? `<div class="stat-sub">${esc(m.source)}</div>` : ''}</div>`).join('')}</div>`;
  }
  const rows = ubp.estimatedUBPPricing?.pricingRows || ubp.estimatedUBPPricing?.lineItems || ubp.estimatedUBPPricing?.pricingData || [];
  if (rows.length) {
    html += `<table><thead><tr><th>Line Item</th><th>Pricing Method</th><th>Est. List ACV</th><th>@30% Disc</th><th>@40% Disc</th><th>@65% Disc</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.lineItem)}</td><td>${esc(r.pricingMethod || '—')}</td><td>${formatCurrency(r.estListACV)}</td><td>${formatCurrency(r.at30Disc)}</td><td>${formatCurrency(r.at40Disc)}</td><td>${formatCurrency(r.at65Disc)}</td></tr>`).join('')}
      ${ubp.estimatedUBPPricing?.totals ? `<tr><td><strong>Estimated TOTAL (Year 1)</strong></td><td>Sum</td><td>${formatCurrency(ubp.estimatedUBPPricing.totals.totalEstListACV)}</td><td>${formatCurrency(ubp.estimatedUBPPricing.totals.total30Disc)}</td><td>${formatCurrency(ubp.estimatedUBPPricing.totals.total40Disc)}</td><td>${formatCurrency(ubp.estimatedUBPPricing.totals.total65Disc)}</td></tr>` : ''}
    </tbody></table>`;
  }
  if (ubp.customerArchetype?.statusMessage) {
    html += `<p style="margin-top:12px;font-size:13px;"><strong>Archetype #${esc(ubp.customerArchetype.archetype)}:</strong> ${esc(ubp.customerArchetype.statusMessage)}</p>`;
  }

  const customerArchetypeNum = ubp.customerArchetype?.archetype || null;
  html += `<h3 style="margin-top:16px;">FastTrack Archetypes — All 7 Scenarios</h3>
  <table><thead><tr><th>#</th><th>Archetype</th><th>Trigger</th><th>Sales Play</th><th>Recommended Uplift</th><th>Cohort Size</th></tr></thead><tbody>
    ${FASTTRACK_ARCHETYPES.map((arch) => `<tr${arch.num === customerArchetypeNum ? ' style="background:#EEF2FF;font-weight:700;"' : ''}>
      <td>${arch.num}</td><td>${esc(arch.archetype)}</td><td>${esc(arch.trigger)}</td><td>${esc(arch.salesPlay)}</td><td>${esc(arch.uplift)}</td><td>${arch.cohort}</td>
    </tr>`).join('')}
  </tbody></table>`;
  const tiers = ubp.composePackage?.tiers || ubp.composePackage?.packages || [];
  if (tiers.length) {
    html += `<div class="card-grid" style="margin-top:12px;">${tiers.map((pkg) => `<div class="card">
      <h4>${esc(pkg.tierName || pkg.name)}</h4>
      <p class="section-sub">${pkg.percentOfP2P ? `${esc(pkg.percentOfP2P)}% of P2P` : esc(pkg.details || '')}</p>
      ${pkg.estListACV ? `<p style="font-size:12px;">Est. list ACV: ${formatCurrency(pkg.estListACV)}</p>` : ''}
      ${(pkg.features || []).length ? `<ul>${pkg.features.map((f) => `<li>${esc(typeof f === 'string' ? f : f.name || f.feature)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (ubp.salesPlays?.plays?.length) {
    html += `<h3 style="margin-top:16px;">${esc(ubp.salesPlays.title || 'Recommended Sales Plays')}</h3>
    ${ubp.salesPlays.subtitle ? `<p class="section-sub">${esc(ubp.salesPlays.subtitle)}</p>` : ''}
    <div class="card-grid">${ubp.salesPlays.plays.map((play) => `<div class="card">
      <h4>${esc(play.name)}${play.isRecommended ? ' ✓' : ''}</h4>
      ${play.targetArchetypes ? `<p style="font-size:11px;color:#5A6180;">Target archetypes: ${esc(play.targetArchetypes.join(', '))}</p>` : ''}
      ${play.accountCount ? `<p style="font-size:11px;color:#5A6180;">Account count: ${esc(play.accountCount)}</p>` : ''}
      <p style="font-size:12px;">${esc(play.description)}</p>
    </div>`).join('')}</div>`;
  }

  if (ubp.promotionsAvailable?.promotions?.length) {
    html += `<h3 style="margin-top:16px;">${esc(ubp.promotionsAvailable.title || 'Incentive Promotions')}</h3>
    ${ubp.promotionsAvailable.subtitle ? `<p class="section-sub">${esc(ubp.promotionsAvailable.subtitle)}</p>` : ''}
    <div class="card-grid">${ubp.promotionsAvailable.promotions.map((promo) => `<div class="card">
      <h4>${esc(promo.name)}</h4>
      <p style="font-size:12px;">${esc(promo.description || promo.details)}</p>
      ${promo.requirements ? `<p style="font-size:11px;color:#5A6180;"><strong>Requires:</strong> ${esc(promo.requirements)}</p>` : ''}
      ${promo.accountEligibility ? `<p style="font-size:11px;color:#D97706;"><strong>Eligibility:</strong> ${esc(promo.accountEligibility)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (ubp.aeTalkTrack?.talkingPoints?.length) {
    html += `<h3 style="margin-top:16px;">${esc(ubp.aeTalkTrack.title || 'AE Talk Track')}</h3>
    ${ubp.aeTalkTrack.subtitle ? `<p class="section-sub">${esc(ubp.aeTalkTrack.subtitle)}</p>` : ''}
    <ol style="padding-left:18px;font-size:13px;">${ubp.aeTalkTrack.talkingPoints.map((point) => {
      const pointText = typeof point === 'string' ? point : point.point || point.text;
      const contextText = typeof point === 'object' ? point.context : null;
      return `<li style="margin-bottom:6px;">${esc(pointText)}${contextText ? `<div style="font-size:11px;color:#5A6180;font-style:italic;">${esc(contextText)}</div>` : ''}</li>`;
    }).join('')}</ol>`;
  }

  if (ubp.objectionHandling?.objections?.length) {
    html += `<h3 style="margin-top:16px;">${esc(ubp.objectionHandling.title || 'Objection Handling Guide')}</h3>
    <table><thead><tr><th>Objection</th><th>Suggested Response</th></tr></thead><tbody>
      ${ubp.objectionHandling.objections.map((obj) => {
        const objection = typeof obj === 'string' ? obj : obj.objection || obj.question;
        const response = typeof obj === 'string' ? '—' : obj.suggestedResponse || obj.response || obj.answer || '—';
        return `<tr><td>${esc(objection)}</td><td>${esc(response)}</td></tr>`;
      }).join('')}
    </tbody></table>`;
  }

  if (ubp.openQuestions?.questions?.length) {
    html += `<h3 style="margin-top:16px;">${esc(ubp.openQuestions.title || 'Open Questions & Gaps')}</h3>
    ${ubp.openQuestions.subtitle ? `<p class="section-sub">${esc(ubp.openQuestions.subtitle)}</p>` : ''}
    <table><thead><tr><th>Question</th><th>Priority</th><th>Owner</th></tr></thead><tbody>
      ${ubp.openQuestions.questions.map((q) => {
        const questionText = typeof q === 'string' ? q : q.question || q.text;
        const priority = typeof q === 'object' ? q.priority : null;
        const owner = typeof q === 'object' ? q.owner : null;
        return `<tr><td>${esc(questionText)}</td><td>${esc(priority || '—')}</td><td>${esc(owner || '—')}</td></tr>`;
      }).join('')}
    </tbody></table>`;
  }

  return html;
};

const buildActionPlanMarkup = (data) => {
  const actions = data?.actions || data?.actionPlan?.items || data?.rows || (Array.isArray(data) ? data : []);
  if (!actions?.length) return '<p class="empty">No Action Plan data available.</p>';
  const summary = data?.actionPlan?.summary;
  return `${summary ? `<p class="section-sub">${esc(summary)}</p>` : ''}
  <table><thead><tr><th>Priority</th><th>Action</th><th>Owner</th><th>Impact</th><th>Source</th></tr></thead><tbody>
    ${actions.map((row, i) => `<tr>
      <td>${esc(row.priority || row.priorityLevel || `P${i + 1}`)}</td>
      <td>${esc(row.action || row.title)}</td>
      <td>${esc(row.owner || '—')}</td>
      <td>${esc(row.impact || row.expectedOutcome || '—')}</td>
      <td>${esc(row.due || row.source || row.timeline || '—')}</td>
    </tr>`).join('')}
  </tbody></table>`;
};

/**
 * Build a single combined HTML report covering Hero + all 8 tabs.
 */
export const buildFullDashboardReportHtml = ({ customerName, hero, summary, snapshot, portfolio, aiAgents, usage, whitespace, ubp, plan }) => {
  const sections = [
    { title: 'Executive Summary', body: buildSummaryMarkup(summary) },
    { title: 'Value Snapshot', body: buildSnapshotMarkup(snapshot) },
    { title: 'Product Portfolio', body: buildPortfolioMarkup(portfolio) },
    { title: 'AI Agents', body: buildAgentsSectionMarkup(aiAgents) },
    { title: 'Usage Over Time', body: buildUsageMarkup(usage) },
    { title: 'Whitespace & Risks', body: buildWhitespaceMarkup(whitespace) },
    { title: 'UBP Conversion', body: buildUbpMarkup(ubp) },
    { title: 'Action Plan', body: buildActionPlanMarkup(plan) },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Account Dashboard Report - ${esc(customerName)}</title>
<style>${REPORT_STYLES}</style>
</head>
<body>
<div class="header">
  <h1>Account Dashboard Report</h1>
  <p>${esc(customerName)} &mdash; Generated ${new Date().toLocaleDateString()}</p>
</div>
${buildHeroMarkup(hero)}
${sections.map((s) => `<div class="section"><h2>${esc(s.title)}</h2>${s.body}</div>`).join('')}
<div class="footer">Coupa Finance &mdash; AI-Driven Knowledge Platform</div>
</body>
</html>`;
};
