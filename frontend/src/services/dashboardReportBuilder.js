/**
 * Dashboard Report Builder
 *
 * Builds downloadable, self-contained HTML reports from dashboard tab data.
 * Used by the per-tab "Download Report" button (AI Agents) and the
 * dashboard-wide "Download HTML" button (Hero + all 8 tabs).
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

const formatCreditsVal = (val) => {
  const num = Number(val);
  if (val === null || val === undefined || Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const AGENT_STATUS_BADGE_CLASS = {
  'Enabled': 'style="background:#DCFCE7;color:#166534;"',
  'Access But Unused': 'style="background:#FEF9C3;color:#854D0E;"',
  'Disabled / Stalling': 'style="background:#FEE2E2;color:#991B1B;"',
};

const AGENT_CARD_BORDER_COLOR = {
  'Enabled': '#22C55E',
  'Access But Unused': '#EAB308',
  'Disabled / Stalling': '#E5E7EB',
};

const AGENT_STATUS_ACTION = {
  'Enabled': 'Prerequisite: Verified',
  'Access But Unused': 'Action Needed: Enable in Prod',
  'Disabled / Stalling': 'Action Needed: Review Adoption',
};

const agentFormatK = (val) => {
  const num = Number(val);
  if (val === null || val === undefined || Number.isNaN(num)) return '\u2014';
  return num >= 1000 ? `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K` : String(num);
};

/** Reusable AI Agents section markup (summary + agent studio + catalog), shared by the tab-level and dashboard-wide reports. Mirrors AIAgentsTab.jsx field-for-field. */
export const buildAgentsSectionMarkup = (agents) => {
  if (!agents) return '<p class="empty">No AI Agents data available.</p>';
  const summary = agents.summary;
  const agentStudio = agents.agent_studio;
  const catalog = agents.catalog || [];

  let html = '';

  if (summary?.is_multi_instance) {
    html += `<p style="font-size:12px;color:#1E3A8A;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 14px;margin-bottom:12px;"><strong>Customer Instance Telemetry:</strong> This customer has more than one instance. Data displayed is consolidated across all active instances.</p>`;
  }

  if (summary) {
    html += `<h3 style="margin-top:0;">Agent &amp; Credit Summary</h3>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Agents &amp; GenAI Features</div>
        <div class="stat-value">${esc(summary.total_navi_agents)} Navi Agents / <span style="color:#7C3AED;">${esc(summary.total_genai_features)} GenAI</span></div>
        <div class="stat-sub">Cumulative total: ${esc(summary.cumulative_total ?? summary.total_agents)}${(summary.total_ga_agents != null || summary.total_la_open_beta_agents != null) ? ` &bull; ${esc(summary.total_ga_agents)} GA &bull; ${esc(summary.total_la_open_beta_agents)} LA` : ''}</div>
      </div>
      <div class="stat-card"><div class="stat-label">Customer Accessible</div><div class="stat-value">${esc(summary.customer_accessible ?? summary.total_agents_accessible)}</div><div class="stat-sub">${summary.accessibility_pct != null ? `${esc(summary.accessibility_pct)}% unlocked` : ''}</div></div>
      <div class="stat-card"><div class="stat-label">Navi Licenses Provisioned</div><div class="stat-value">${esc(summary.navi_licenses_total)}</div><div class="stat-sub">Environment Allocation: ${esc(summary.navi_licenses_prd)} PRD / ${esc(summary.navi_licenses_stg)} STG</div></div>
      <div class="stat-card"><div class="stat-label">Utilized Credits (Total)</div><div class="stat-value">${formatCreditsVal(summary.utilized_credits_total)}</div><div class="stat-sub">Prod ${formatCreditsVal(summary.utilized_credits_prd)} · Staging ${formatCreditsVal(summary.utilized_credits_stg)}</div></div>
      <div class="stat-card"><div class="stat-label">Remaining Credit Balance</div><div class="stat-value">${formatCreditsVal(summary.remaining_balance_total)}</div><div class="stat-sub">Prod ${formatCreditsVal(summary.remaining_balance_prd)} · Staging ${formatCreditsVal(summary.remaining_balance_stg)}</div></div>
      <div class="stat-card"><div class="stat-label">Free Credits Tracking (${agentFormatK(summary.free_credits_provisioned)} Default)</div><div class="stat-value">${formatCreditsVal(summary.free_credits_remaining)} left</div><div class="stat-sub">Provisioned ${formatCreditsVal(summary.free_credits_provisioned)} · Consumed ${formatCreditsVal(summary.free_credits_consumed)}</div></div>
    </div>
    <p style="font-size:12px;color:#92400E;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;margin-top:8px;"><strong>\u23f3 Predictive Burn-Down:</strong> ${summary.estimated_months_remaining != null ? `Estimated exhaustion in ${esc(summary.estimated_months_remaining)} months` : 'Not enough usage history yet to forecast credit exhaustion timeline.'}</p>`;
  }

  if (agentStudio) {
    html += `<div class="category">
      <h3>Navi Agents & GenAI Features: Agent Studio</h3>
      <hr class="category-divider"/>
      <table><thead><tr><th>Type</th><th>Custom Builds (Prod/Sand)</th><th>Unique Agents</th><th>Active Users (Prod/Sand)</th></tr></thead><tbody>
        <tr><td>Custom Autonomous Agents (scheduled workflows / background reconciliations)</td><td>${esc(agentStudio.autonomous?.builds_prd)} / ${esc(agentStudio.autonomous?.builds_stg)}</td><td>${esc(agentStudio.autonomous?.unique_agents)}</td><td>${esc(agentStudio.autonomous?.users_prd)} / ${esc(agentStudio.autonomous?.users_stg)}</td></tr>
        <tr><td>Custom Conversation Agents (policy lookup, advisory chat, guided intake Q&amp;A)</td><td>${esc(agentStudio.conversational?.builds_prd)} / ${esc(agentStudio.conversational?.builds_stg)}</td><td>${esc(agentStudio.conversational?.unique_agents)}</td><td>${esc(agentStudio.conversational?.users_prd)} / ${esc(agentStudio.conversational?.users_stg)}</td></tr>
      </tbody></table>
    </div>`;
  }

  html += `<div class="category">
      <h3>Navi Agents & GenAI Features Catalog</h3>
      <p class="section-sub">ACT: the agent does the work &bull; ASSIST: the agent helps the user &bull; ADVISE: the agent advises the user</p>
      <hr class="category-divider"/>
      <div class="agents-grid" style="grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));">
        ${catalog.map((agent) => {
          const isUntapped = agent.status === 'Access But Unused' && agent.total_active_users === 0;
          const docUrls = (agent.ssot_docs_url || '').split(',').map((u) => u.trim()).filter(Boolean);
          return `<div class="agent-card" style="border-left-color:${AGENT_CARD_BORDER_COLOR[agent.status] || '#E5E7EB'};background:#fff;border:1px solid #E5E7EB;border-left-width:4px;">
          <div style="display:flex;align-items:start;justify-content:space-between;gap:8px;">
            <span class="agent-name accessible">${esc(agent.agent)}</span>
            <span class="badge badge-status" ${AGENT_STATUS_BADGE_CLASS[agent.status] || ''}>${esc(agent.status)}</span>
          </div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${agent.interaction_designation ? `<span class="badge badge-${agent.interaction_designation.toLowerCase()}">${esc(agent.interaction_designation)}</span>` : ''}
            ${agent.prerequisite_sku ? `<span style="font-size:11px;font-style:italic;color:#030405;">Prerequisite: ${esc(agent.prerequisite_sku)}</span>` : ''}
          </div>
          <div style="font-size:12px;color:#374151;border-top:1px solid #E5E7EB;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;">
            <span>Active Unique Users:</span>
            <strong>${esc(agent.active_users_prd)} Prod &bull; ${esc(agent.active_users_stg)} Sandbox${isUntapped ? ' (Untapped Value)' : ''}</strong>
          </div>
          <div style="background:#F9FAFB;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:11px;">
            <div style="display:flex;justify-content:space-between;"><span>Prod Burn:</span><span>${formatCreditsVal(agent.burn_metered_prd)} Met | ${formatCreditsVal(agent.burn_unmetered_prd)} Unmet | <strong>${formatCreditsVal(agent.burn_total_prd)} Total</strong></span></div>
            <div style="display:flex;justify-content:space-between;margin-top:3px;"><span>Sandbox Burn:</span><span>${formatCreditsVal(agent.burn_metered_stg)} Met | ${formatCreditsVal(agent.burn_unmetered_stg)} Unmet | <strong>${formatCreditsVal(agent.burn_total_stg)} Total</strong></span></div>
          </div>
          <div class="agent-bottom">
            ${AGENT_STATUS_ACTION[agent.status] ? `<span style="font-size:11px;">${esc(AGENT_STATUS_ACTION[agent.status])}</span>` : '<span></span>'}
            ${docUrls.length ? `<span>${docUrls.map((url, di) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#0369A1;margin-left:8px;">SSOT Doc${docUrls.length > 1 ? ` ${di + 1}` : ''} \u2197</a>`).join('')}</span>` : ''}
          </div>
        </div>`;
        }).join('')}
      </div>
    </div>`;

  return html;
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
  {
    key: 'adoptionWins',
    title: '✓ Adoption Wins',
    render: (d) => {
      const stats = d.utilizationStats;
      const statsHtml = stats ? `<li style="list-style:none;margin-left:-18px;margin-bottom:6px;"><span style="background:#ECFDF5;color:#15803D;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">Users: ${esc(stats.activeUsers)} / ${esc(stats.totalUsers)} (${esc(stats.utilizationPercent)})</span></li>` : '';
      return statsHtml + (d.items || []).map((i) => `<li><strong>${esc(i.title)}:</strong> ${esc(i.metric)}</li>`).join('');
    },
  },
  { key: 'benchmarkMethodology', title: '⊙ Benchmarks & Methodology', render: (d) => (d.items || []).map((i) => `<li><strong>${esc(i.name)}:</strong> ${esc(i.customerValue)}${i.industryBenchmark ? ` (benchmark: ${esc(i.industryBenchmark)})` : ''}</li>`).join('') },
];

const buildSummaryMarkup = (summary) => {
  const cards = summary?.cards;
  if (!cards) return '<p class="empty">No Executive Summary data available.</p>';
  // Newer cards (accountObjectives/processPainPoints/competitiveLandscape/additionalInsights) are
  // optional — only render them when they actually carry items (mirrors SummaryTab.jsx's hasItems guard).
  const hasItems = (card) => card && Array.isArray(card.items) && card.items.length > 0;
  const OPTIONAL_KEYS = ['accountObjectives', 'processPainPoints', 'competitiveLandscape', 'additionalInsights'];
  return `<div class="card-grid">
    ${SUMMARY_CARD_ORDER.filter((c) => cards[c.key] && (!OPTIONAL_KEYS.includes(c.key) || hasItems(cards[c.key]))).map((c) => `<div class="card">
      <h4>${c.title}</h4>
      ${cards[c.key].summary ? `<p class="section-sub">${esc(cards[c.key].summary)}</p>` : ''}
      ${c.key === 'valueDelivered' ? `<p style="font-size:12px;margin-bottom:6px;"><strong>Total Value:</strong> ${esc(cards[c.key].totalValue)} &nbsp; <strong>ROI:</strong> ${esc(cards[c.key].roiMultiple)}</p>` : ''}
      <ul>${c.render(cards[c.key])}</ul>
    </div>`).join('')}
  </div>`;
};

const snapParseNum = (val) => {
  if (val === null || val === undefined || val === 'NA') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const snapFormatDays = (val) => (val === null || val === undefined || val === 'NA') ? '—' : `${val} days`;
const snapFormatDayReduction = (val) => {
  if (val === null || val === undefined || val === '' || val === 'NA') return '—';
  if (typeof val === 'string') return `${val} day reduction`;
  const num = Number(val);
  if (!Number.isFinite(num)) return '—';
  return `${Math.round(num * 100) / 100} day reduction`;
};
const snapFormatPercent = (val) => (val === null || val === undefined || val === 'NA') ? '—' : `${Number(val).toFixed(0)}%`;

/** Value Realized rows — mirrors the static table structure in SnapshotTab.jsx Section 4. */
const buildValueRealizedRows = (d) => [
  { solution: 'AP Automation', driver: 'Generate Rebates through Card Payments', product: 'Virtual Cards', value: formatCurrency(d.Generate_Rebates_through_Card_Payments), formula: 'sum(Vcard transactions) × 0.02', benchmark: '', dim: false },
  { solution: 'AP Automation', driver: 'Reduce Invoice Processing Costs', product: 'InvoiceSmash / Invoicing', value: formatCurrency(d.Reduce_Invoice_Processing_Costs), formula: 'Sum(invoice savings)', benchmark: '', dim: false },
  { solution: 'AP Automation', driver: 'Reduce Time & Effort to process invoices', product: 'Invoice Smash / Invoicing / Rossum', value: snapFormatDayReduction(d.Reduce_Time_and_Effort_to_process_invoices), formula: 'Benchmark Cycle Time − Current Year invoice cycle time', benchmark: '18.3 days from ingestion to processed', dim: false },
  { solution: 'AP Automation', driver: 'Savings Generated with Early Payment Discounts', product: 'Early Pay Discounts', value: formatCurrency(d.Savings_Generated_with_Early_Payment_Discounts), formula: 'sum(invoiced paid where EPD flagged/captured)', benchmark: '', dim: false },
  { solution: 'Platform', driver: 'Increase Savings Capture Rate by improving On-Contract Spend', product: 'Smart Intake & Orchestration', value: formatCurrency(d['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Smart_Intake_and_Orchestration']), formula: '(PO Spend × On-Contract% − 20%) × 0.04 + (PO Spend × Off-Contracts% − 20%) × 0.04 × 0.15', benchmark: '20% spend on contract', dim: snapParseNum(d['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Smart_Intake_and_Orchestration']) == null },
  { solution: 'Platform', driver: 'PO Processing Efficiency', product: 'Smart Intake & Orchestration', value: snapFormatDayReduction(d.PO_Processing_Efficiency_smart_intake_and_orchestration), formula: 'Benchmark Cycletime − CY Requisition Cycle Time', benchmark: '6−7 business days', dim: !d.PO_Processing_Efficiency_smart_intake_and_orchestration },
  { solution: 'Procure to Pay', driver: 'Increase Savings Capture Rate by improving On-Contract Spend', product: 'Core Procurement', value: formatCurrency(d['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Core_Procurement']), formula: d['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Core_Procurement_formula'] || '', benchmark: '20% spend on contract', dim: false },
  { solution: 'Procure to Pay', driver: 'PO Processing Efficiency', product: 'Core Procurement', value: snapFormatDayReduction(d.PO_Processing_Efficiency_Core_Procurement), formula: 'Benchmark Cycle time − CY Requisition Cycle Time', benchmark: '6−7 business days', dim: !d.PO_Processing_Efficiency_Core_Procurement },
  { solution: 'Strategic Sourcing', driver: 'Increase Spend On Contract Through More Sourcing Activities', product: 'Coupa Sourcing / Coupa Sourcing Optimization', value: d.Increase_Spend_On_Contract_Through_More_Sourcing_Activities === 'NA' || d.Increase_Spend_On_Contract_Through_More_Sourcing_Activities == null ? '—' : formatCurrency(d.Increase_Spend_On_Contract_Through_More_Sourcing_Activities), formula: '(current year sourced spend % − benchmark sourced spend%) × sourced spend × 0.04%', benchmark: '15% of spend sourced annually', dim: d.Increase_Spend_On_Contract_Through_More_Sourcing_Activities === 'NA' || d.Increase_Spend_On_Contract_Through_More_Sourcing_Activities == null },
  { solution: 'Strategic Sourcing', driver: 'Total Sourcing Savings', product: 'Coupa Sourcing / Coupa Sourcing Optimization', value: d.Total_Sourcing_Savings === 'NA' || d.Total_Sourcing_Savings == null ? '—' : formatCurrency(d.Total_Sourcing_Savings), formula: 'Current year sourced spend × 0.04%', benchmark: '', dim: d.Total_Sourcing_Savings === 'NA' || d.Total_Sourcing_Savings == null },
  { solution: 'Supplier Information & Risk Management', driver: 'Reduce time to manage supplier information', product: 'Risk Assess (RPMA) / Risk Aware (RPM)', value: '—', formula: 'CY Onboarded suppliers × (Benchmark onboard cycle time − CY onboard cycle time in weeks)', benchmark: '15−35 business days', dim: true },
];

const buildSnapshotMarkup = (snapshot) => {
  if (!snapshot) return '<p class="empty">No Value Snapshot data available.</p>';
  const d = snapshot;

  const poSpend = snapParseNum(d.po_spend) || 0;
  const nonPoInvoiceSpend = snapParseNum(d.Non_PO_Invoice_Spend) || 0;
  const externalPoInvoiceSpend = snapParseNum(d.External_PO_based_Invoice_Spend) || 0;
  const totalCoupaSpend = snapParseNum(d.total_coupa_spend) || (poSpend + nonPoInvoiceSpend + externalPoInvoiceSpend);
  const poShare = totalCoupaSpend > 0 ? (poSpend / totalCoupaSpend) * 100 : 0;
  const externalPoInvoiceShare = totalCoupaSpend > 0 ? (externalPoInvoiceSpend / totalCoupaSpend) * 100 : 0;
  const nonPoInvoiceShare = totalCoupaSpend > 0 ? (nonPoInvoiceSpend / totalCoupaSpend) * 100 : 0;

  // ─── Section 1 · Spend Data ───
  let html = `<p class="section-sub">Section 1 · UBP Measured Spend Data</p>
  <div class="stats">
    <div class="stat-card"><div class="stat-label">Coupa PO Spend</div><div class="stat-value">${formatCurrency(d.po_spend)}</div><div class="stat-sub">${esc(d.po_spend_text || '')}</div></div>
    <div class="stat-card"><div class="stat-label">Non-PO Invoice Spend</div><div class="stat-value">${formatCurrency(d.Non_PO_Invoice_Spend)}</div><div class="stat-sub">${esc(d.Non_PO_Invoice_Spend_text || '')}</div></div>
    <div class="stat-card"><div class="stat-label">External PO-based Invoice Spend</div><div class="stat-value">${formatCurrency(d.External_PO_based_Invoice_Spend)}</div><div class="stat-sub">${esc(d.External_PO_based_Invoice_Spend_text || '')}</div></div>
    <div class="stat-card" style="background:#0F172A;border-color:#0F172A;"><div class="stat-label" style="color:#B9CBEF;">Composition of Total UBP Measured Spend</div><div class="stat-value" style="color:#fff;">${formatCurrency(d.total_coupa_spend)}</div><div class="stat-sub" style="color:#CFDDF6;">Coupa PO Spend + Non-PO Invoice Spend + External PO-based Invoice Spend</div></div>
    <div class="stat-card"><div class="stat-label">Total Addressable Spend (Est.)</div><div class="stat-value">${d.total_addressable_spend === 'NA' ? '~$4.5B' : formatCurrency(d.total_addressable_spend)}</div><div class="stat-sub">Confirm with finance</div></div>
  </div>
  <table style="margin-top:10px;"><thead><tr><th>Composition of Total UBP Measured Spend</th><th>Share</th><th>Amount</th></tr></thead><tbody>
    <tr><td>Coupa PO Spend</td><td>${poShare.toFixed(1)}%</td><td>${formatCurrency(poSpend)}</td></tr>
    <tr><td>External PO-based Invoice Spend</td><td>${externalPoInvoiceShare.toFixed(1)}%</td><td>${formatCurrency(externalPoInvoiceSpend)}</td></tr>
    <tr><td>Non-PO Invoice Spend</td><td>${nonPoInvoiceShare.toFixed(1)}%</td><td>${formatCurrency(nonPoInvoiceSpend)}</td></tr>
  </tbody></table>`;

  // ─── Section 2 · Value Metrics (KPIs) ───
  // Total Number of Sourcing Events hidden — numbers aren't coming through properly
  html += `<p class="section-sub" style="margin-top:20px;">Section 2 · Value Metrics (KPIs)</p>
  <table><thead><tr><th>Category</th><th>Metric</th><th>Value</th><th>Detail</th></tr></thead><tbody>
    <tr><td>Procurement</td><td>On-Contract Savings</td><td>${formatCurrency(d.Spend_Under_Contract_Savings_Capture)}</td><td>${esc(d.Spend_Under_Contract_Savings_Capture_text || '')}</td></tr>
    <tr><td>Procurement</td><td>Requisition Cycle Time</td><td>${snapFormatDays(d.PR_to_PO_Cycle_Time)}</td><td>${esc(d.PR_to_PO_Cycle_Time_text || '')}</td></tr>
    <tr><td>Invoicing</td><td>First Time Match Rate</td><td>${snapFormatPercent(d.First_Time_Match_Rate)}</td><td>${esc(d.First_Time_Match_Rate_text || '')}</td></tr>
    <tr><td>Contracts & Sourcing</td><td>Total Contracts (incl. active contracts)</td><td>${esc(d.Total_Contracts)}</td><td>${esc(d.Total_Contracts_text || '')}</td></tr>
  </tbody></table>`;

  // ─── Section 3 · Coupa Pay Performance ───
  html += `<p class="section-sub" style="margin-top:20px;">Section 3 · Coupa Pay Performance</p>
  <table><thead><tr><th>Payment Channel</th><th>Total Volume</th><th>Revenue Share</th></tr></thead><tbody>
    <tr><td>Digital Payment</td><td>${formatCurrency(d.Digital_Payment_Volume)}</td><td>${formatCurrency(d.Digital_Payment_Revenue_Share)}</td></tr>
    <tr><td>Virtual Card</td><td>${formatCurrency(d.VCard_Volume)}</td><td>${formatCurrency(d.VCard_Revenue_Share)}</td></tr>
    <tr><td>EPD (Early Pay Discounts)</td><td>${formatCurrency(d.Early_Pay_Discounts_Captured)}</td><td>${formatCurrency(d.EPD_Revenue_Share)}</td></tr>
  </tbody></table>`;

  // ─── Section 4 · Value Realized ───
  const totalValueRealized = ['Generate_Rebates_through_Card_Payments', 'Reduce_Invoice_Processing_Costs', 'Savings_Generated_with_Early_Payment_Discounts', 'Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Smart_Intake_and_Orchestration', 'Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Core_Procurement', 'Increase_Spend_On_Contract_Through_More_Sourcing_Activities', 'Total_Sourcing_Savings']
    .reduce((sum, key) => sum + (typeof d[key] === 'number' ? d[key] : 0), 0);
  const valueRows = buildValueRealizedRows(d);
  html += `<p class="section-sub" style="margin-top:20px;">Section 4 · Value Realized — Value Decomposition (Conversation-Ready Detail)</p>
  <p style="font-size:15px;font-weight:700;color:#4A3DC7;margin-bottom:8px;">Total Value Realized: ${formatCurrency(totalValueRealized)}</p>
  <table><thead><tr><th>T1-Solution</th><th>Value Driver</th><th>T2-Products</th><th>Value</th><th>Calculation Logic</th><th>Benchmark</th></tr></thead><tbody>
    ${valueRows.map((r) => `<tr${r.dim ? ' style="opacity:.5;"' : ''}><td>${esc(r.solution)}</td><td>${esc(r.driver)}</td><td>${esc(r.product)}</td><td><strong>${esc(r.value)}</strong></td><td style="font-size:11px;">${esc(r.formula)}</td><td style="font-size:11px;">${esc(r.benchmark)}</td></tr>`).join('')}
  </tbody></table>`;

  return html;
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
    html += `<h3 style="margin-top:0;">Portfolio Summary</h3>
    <div class="stats">${data.portfolioSummary.map((s) => `<div class="stat-card"><div class="stat-label">${esc(s.label)}</div><div class="stat-value">${esc(s.value)}</div><div class="stat-sub">${esc(s.subtext)}</div></div>`).join('')}</div>`;
  }
  if (data.landscapeColumns?.length) {
    html += `<h3 style="margin-top:16px;">Whitespace Landscape</h3>
    <div class="card-grid">${data.landscapeColumns.map((col) => `<div class="card"><h4>${esc(col.header)}</h4><ul>${(col.cells || []).map((c) => `<li><strong>${esc(c.name)}:</strong> ${esc(c.status)}${c.subtext ? ` — ${esc(c.subtext)}` : ''}</li>`).join('')}</ul></div>`).join('')}</div>`;
  }
  if (data.platformCells?.length) {
    html += `<p class="section-sub" style="margin-top:12px;"><strong>Platform & Foundation:</strong> ${data.platformCells.map((c) => esc(c.name)).join(', ')}</p>`;
  }
  if (data.prioritizationFactors?.length) {
    html += `<h3 style="margin-top:16px;">How We Prioritize Where To Sell</h3>
    <table><thead><tr><th>#</th><th>Title</th><th>Description</th><th>Application</th></tr></thead><tbody>
      ${data.prioritizationFactors.map((f, i) => `<tr><td>${esc(f.number || i + 1)}</td><td>${esc(f.title)}</td><td>${esc(f.description)}</td><td>${esc(f.customerApplication || '—')}</td></tr>`).join('')}
    </tbody></table>`;
  }
  if (data.expansionSequence?.length) {
    html += `<h3 style="margin-top:16px;">Ranked Expansion Sequence</h3>
    <table><thead><tr><th>Rank</th><th>Module</th><th>Driver</th><th>Factors</th></tr></thead><tbody>
      ${data.expansionSequence.map((item, i) => `<tr><td>${item.rank || i + 1}</td><td>${esc(item.module)}</td><td>${esc(item.driver || item.rationale)}</td><td>${esc(item.factors || '—')}</td></tr>`).join('')}
    </tbody></table>`;
  }
  if (data.insights?.length) {
    html += `<h3 style="margin-top:16px;">Risks, Wins & Expansion Theses</h3>
    <div class="card-grid">${data.insights.map((i) => `<div class="card"><h4>${esc(i.title)}</h4><p style="font-size:12px;color:#5A6180;">${esc(i.description)}</p></div>`).join('')}</div>`;
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
    html += `<h3 style="margin-top:16px;">Key Metrics</h3>
    <div class="stats">${entries.map((m) => `<div class="stat-card"><div class="stat-label">${esc(m.metric)}</div><div class="stat-value">${esc(m.value)}</div>${m.source ? `<div class="stat-sub">${esc(m.source)}</div>` : ''}</div>`).join('')}</div>`;
  }
  const rows = ubp.estimatedUBPPricing?.pricingRows || ubp.estimatedUBPPricing?.lineItems || ubp.estimatedUBPPricing?.pricingData || [];
  if (rows.length) {
    html += `<h3 style="margin-top:16px;">${esc(ubp.estimatedUBPPricing?.title || 'Estimated UBP Pricing')}</h3>
    <table><thead><tr><th>Line Item</th><th>Pricing Method</th><th>Est. List ACV</th><th>@30% Disc</th><th>@40% Disc</th><th>@65% Disc</th></tr></thead><tbody>
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
    html += `<h3 style="margin-top:16px;">${esc(ubp.composePackage?.title || 'Compose Package Tiers')}</h3>
    <div class="card-grid" style="margin-top:12px;">${tiers.map((pkg) => `<div class="card">
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
  return `<h3 style="margin-top:0;">Recommended Actions</h3>
  ${summary ? `<p class="section-sub">${esc(summary)}</p>` : ''}
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
