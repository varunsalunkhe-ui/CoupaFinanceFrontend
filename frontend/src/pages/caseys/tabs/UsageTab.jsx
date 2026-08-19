import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import TabLoader from '../../../components/TabLoader';
import { getDailyCached, setDailyCached, clearCachedByPrefix } from '../../../services/cacheStorage';
import { useDashboard } from '../../../context/DashboardContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Custom Plugin: Renders stacked total sums above Chart 1 bars
const stackedSumPlugin = {
  id: 'stackedSumPlugin',
  afterDatasetsDraw(chart) {
    const { ctx, scales: { x, y } } = chart;
    if (chart.config.options.plugins?.stackedSumPlugin?.enabled !== true) return;

    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#34A853';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const metaCount = chart.data.datasets.length;
    const dataLength = chart.data.labels.length;

    for (let i = 0; i < dataLength; i++) {
      let total = 0;
      let lastTop = y.getPixelForValue(0);

      for (let j = 0; j < metaCount; j++) {
        const val = chart.data.datasets[j].data[i] || 0;
        total += val;
        const meta = chart.getDatasetMeta(j);
        if (meta.data[i]) {
          lastTop = Math.min(lastTop, meta.data[i].y);
        }
      }

      const xPos = x.getPixelForValue(i);
      if (total > 0) {
        ctx.fillText(formatCurrency(total), xPos, lastTop - 4);
      }
    }
    ctx.restore();
  }
};

ChartJS.register(stackedSumPlugin);

const USAGE_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const USAGE_CACHE_KEY = 'tab_cache_usage_';

const getUsageCached = (key) => getDailyCached(USAGE_CACHE_KEY + key);
const setUsageCached = (key, data) => setDailyCached(USAGE_CACHE_KEY + key, data);

export const clearUsageCache = () => {
  clearCachedByPrefix(USAGE_CACHE_KEY);
};

const KPI_COLORS = {
  total_coupa_spend: '#0D652D',
  coupa_po_spend: '#4285F4',
  total_invoice_spend: '#46BDC6',
  external_po_spend: '#FF6D01',
  external_po_based_invoice_spend: '#FBBC04',
  coupa_non_ext_spend: '#FF7043',
  on_contract_spend: '#34A853',
  total_structured_spend: '#AF57DB',
  non_po_invoice_spend: '#EA4335',
  expense_spend: '#7BAAF7',
};

const formatCurrency = (val) => {
  if (val == null || isNaN(val)) return '$0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const formatAxisVal = (val) => {
  if (val == null || isNaN(val)) return '$0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const getKpi = (kpis, key) => kpis?.find(k => k.key === key) || null;

const UsageTab = ({ accountName, clientName }) => {
  const customerName = clientName || accountName;
  const cached = getUsageCached(customerName);
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('trailing_twelve_months');
  const dashboard = useDashboard();

  useEffect(() => {
    if (data && dashboard?.setExternalTabData) dashboard.setExternalTabData('usage', data);
  }, [data, dashboard]);

  const { setExternalTabData } = useDashboard();

  const fetchUsageData = useCallback(async () => {
    const c = getUsageCached(customerName);
    if (c) {
      setData(c);
      setLoading(false);
      setExternalTabData('usage', c);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        customer_name: customerName,
        section: 'usage',
      });
      const response = await fetch(`${USAGE_API_BASE}/section?${params.toString()}`, {
        headers: { 'accept': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch Usage data (${response.status})`);
      }
      const result = await response.json();
      setUsageCached(customerName, result);
      setExternalTabData('usage', result);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load Usage data');
    } finally {
      setLoading(false);
    }
  }, [customerName, setExternalTabData]);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const kpis = data?.kpis || [];
  const coupaPo = getKpi(kpis, 'coupa_po_spend');
  const nonPoInvoice = getKpi(kpis, 'non_po_invoice_spend');
  const extPoInvoice = getKpi(kpis, 'external_po_based_invoice_spend');
  const extPoSpend = getKpi(kpis, 'external_po_spend');
  const totalInvoice = getKpi(kpis, 'total_invoice_spend');
  const totalCoupa = getKpi(kpis, 'total_coupa_spend');
  const onContract = getKpi(kpis, 'on_contract_spend');
  const structured = getKpi(kpis, 'total_structured_spend');
  const nonExt = getKpi(kpis, 'coupa_non_ext_spend');
  const expenseSpend = getKpi(kpis, 'expense_spend');

  const getLatest = (kpi, view = activeView) => {
    const series = kpi?.[view]?.series || [];
    return series[series.length - 1]?.value || 0;
  };

  const getGrowth = (kpi, view = activeView) => {
    const series = kpi?.[view]?.series || [];
    if (series.length < 2) return null;
    const current = series[series.length - 1]?.value || 0;
    const previous = series[series.length - 2]?.value || 0;
    if (previous === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getSeries = (kpi, view) => kpi?.[view]?.series || [];

  // =========================================================================
  // CHART 1 (Mandatory Intact): Stacked Bar + Sum Total Label
  // =========================================================================
  const chart1Data = () => {
    if (!coupaPo || !nonPoInvoice || !extPoInvoice) return null;
    const po = getSeries(coupaPo, activeView);
    const npo = getSeries(nonPoInvoice, activeView);
    const ext = getSeries(extPoInvoice, activeView);
    return {
      labels: po.map(s => s.period),
      datasets: [
        { label: 'Coupa PO Spend', data: po.map(s => s.value), backgroundColor: '#4285F4', borderRadius: 2 },
        { label: 'Non-PO Invoice Spend', data: npo.map(s => s.value), backgroundColor: '#EA4335', borderRadius: 2 },
        { label: 'External PO Invoice Spend', data: ext.map(s => s.value), backgroundColor: '#FBBC04', borderRadius: 2 },
      ],
    };
  };

  // =========================================================================
  // CHART 2: Overall Velocity — Total Coupa Spend vs Total Invoice Spend
  // =========================================================================
  const chart2Data = () => {
    if (!totalCoupa || !totalInvoice) return null;
    const coupaSeries = getSeries(totalCoupa, activeView);
    const invoiceSeries = getSeries(totalInvoice, activeView);
    return {
      labels: coupaSeries.map(s => s.period),
      datasets: [
        {
          label: 'Total Coupa Spend',
          data: coupaSeries.map(s => s.value),
          borderColor: '#0D652D',
          backgroundColor: 'rgba(13,101,45,0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true,
        },
        {
          label: 'Total Invoice Spend',
          data: invoiceSeries.map(s => s.value),
          borderColor: '#46BDC6',
          backgroundColor: 'rgba(70,189,198,0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true,
        },
      ],
    };
  };

  // =========================================================================
  // CHART 3: Internal Sourcing & Operations — Non-External vs Expense
  // =========================================================================
  const chart3Data = () => {
    if (!expenseSpend || !nonExt) return null;
    const expSeries = getSeries(expenseSpend, activeView);
    const nonExtSeries = getSeries(nonExt, activeView);

    return {
      labels: nonExtSeries.map(s => s.period),
      datasets: [
        {
          label: 'Coupa Non-External Spend',
          data: nonExtSeries.map(s => s.value),
          backgroundColor: '#FF7043',
          borderRadius: 3,
        },
        {
          label: 'Expense Spend',
          data: expSeries.map(s => s.value),
          backgroundColor: '#7BAAF7',
          borderRadius: 3,
        },
      ],
    };
  };

  // =========================================================================
  // CHART 4: External PO Sourcing — External PO Spend vs External PO Invoices
  // =========================================================================
  const chart4Data = () => {
    if (!extPoSpend || !extPoInvoice) return null;
    const extPo = getSeries(extPoSpend, activeView);
    const extPoInv = getSeries(extPoInvoice, activeView);

    return {
      labels: extPo.map(s => s.period),
      datasets: [
        {
          label: 'External PO Spend',
          data: extPo.map(s => s.value),
          backgroundColor: '#FF6D01',
          borderRadius: 3,
        },
        {
          label: 'External PO-Based Invoice Spend',
          data: extPoInv.map(s => s.value),
          backgroundColor: '#FBBC04',
          borderRadius: 3,
        },
      ],
    };
  };

  // =========================================================================
  // CHART 5 (Mandatory Intact): Line Graph — Total Structured Spend vs On-Contract Spend
  // =========================================================================
  const chart5Data = () => {
    if (!onContract || !structured) return null;
    const oc = getSeries(onContract, activeView);
    const st = getSeries(structured, activeView);
    return {
      labels: oc.map(s => s.period),
      datasets: [
        {
          label: 'Total Structured Spend',
          data: st.map(s => s.value),
          borderColor: '#AF57DB',
          backgroundColor: 'rgba(175,87,219,0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#AF57DB',
          fill: false,
        },
        {
          label: 'On-Contract Spend',
          data: oc.map(s => s.value),
          borderColor: '#34A853',
          backgroundColor: 'rgba(52,168,83,0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#34A853',
          fill: false,
        },
      ],
    };
  };

  // =========================================================================
  // CHART 6: All 10 KPIs Ranked (Horizontal Bar Chart)
  // =========================================================================
  const chart6Data = () => {
    const items = kpis
      .map(k => ({
        label: k.label,
        value: getLatest(k),
        color: KPI_COLORS[k.key] || '#4285F4',
      }))
      .sort((a, b) => b.value - a.value);

    if (!items.length) return null;

    return {
      labels: items.map(i => i.label),
      datasets: [
        {
          label: 'Spend Value',
          data: items.map(i => i.value),
          backgroundColor: items.map(i => i.color),
          borderRadius: 4,
          barThickness: 10,
        },
      ],
    };
  };

  // Chart Options
  const chart1Opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      stackedSumPlugin: { enabled: true },
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'rect', boxWidth: 10, font: { size: 10 }, padding: 8 } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => formatAxisVal(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } },
    },
  };

  const lineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 }, padding: 8 } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { callback: (v) => formatAxisVal(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } },
    },
  };

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'rect', boxWidth: 10, font: { size: 10 }, padding: 8 } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { callback: (v) => formatAxisVal(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } },
    },
  };

  const horizOpts = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${c.label}: ${formatCurrency(c.parsed.x)}` } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { callback: (v) => formatAxisVal(v), font: { size: 8 } }, grid: { color: '#f1f5f9' } },
      y: { grid: { display: false }, ticks: { font: { size: 9 } } },
    },
  };

  const viewLabels = {
    year_on_year: 'Year-on-Year',
    trailing_twelve_months: 'Trailing 12 Months',
    monthly: 'Monthly',
  };

  const latestPeriod = totalCoupa?.[activeView]?.series?.slice(-1)?.[0]?.period || '';

  const c1 = chart1Data();
  const c2 = chart2Data();
  const c3 = chart3Data();
  const c4 = chart4Data();
  const c5 = chart5Data();
  const c6 = chart6Data();

  return (
    <TabLoader loading={loading} error={error} onRetry={fetchUsageData} data={data}>
      {data && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-[#0F1733]">Usage Over Time</h3>
              <p className="text-xs text-[#5A6180]">
                {data.customer_name} &nbsp;|&nbsp; Latest: {data.latest_month} &nbsp;|&nbsp; Years: {data.available_years?.join(', ')}
              </p>
            </div>
            <div className="flex bg-[#F1F5F9] rounded-lg p-1">
              {Object.entries(viewLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeView === key ? 'bg-white text-[#0369A1] shadow-sm' : 'text-[#64748B] hover:text-[#334155]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            {[
              { kpi: totalCoupa, label: 'Total Coupa Spend' },
              { kpi: coupaPo, label: 'Coupa PO Spend' },
              { kpi: nonPoInvoice, label: 'Non-PO Invoice' },
              { kpi: extPoInvoice, label: 'Ext PO Invoice' },
              { kpi: totalInvoice, label: 'Total Invoice Spend' },
              { kpi: extPoSpend, label: 'External PO Spend' },
              { kpi: onContract, label: 'On-Contract Spend' },
              { kpi: structured, label: 'Structured Spend' },
              { kpi: nonExt, label: 'Non-External Spend' },
              { kpi: expenseSpend, label: 'Expense Spend' },
            ].map(({ kpi, label }) => {
              const val = getLatest(kpi);
              const growth = getGrowth(kpi);
              return (
                <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 border-l-[#0E9F6E]">
                  <div className="text-[10px] text-[#5A6180] uppercase tracking-wide font-semibold mb-1">{label}</div>
                  <div className="text-xl font-bold text-[#1E293B]">{formatCurrency(val)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#5A6180]">{latestPeriod || 'Latest'}</span>
                    {growth !== null && (
                      <span className={`text-[10px] font-semibold ${Number(growth) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {Number(growth) >= 0 ? '↑' : '↓'}{Math.abs(Number(growth))}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 1: 3 charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {c1 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">Spend Breakdown</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">Coupa PO + Non-PO + Ext PO Invoice ({viewLabels[activeView]})</p>
                <div className="h-[220px]"><Bar data={c1} options={chart1Opts} /></div>
              </div>
            )}
            {c2 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">Overall System Velocity</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">Total Coupa Spend vs Total Invoice Spend ({viewLabels[activeView]})</p>
                <div className="h-[220px]"><Line data={c2} options={lineOpts} /></div>
              </div>
            )}
            {c3 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">Internal Sourcing & Expenses</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">Coupa Non-External & Expense Spend ({viewLabels[activeView]})</p>
                <div className="h-[220px]"><Bar data={c3} options={barOpts} /></div>
              </div>
            )}
          </div>

          {/* Row 2: 3 charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {c4 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">External PO Sourcing</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">External PO Spend vs Ext PO Invoices ({viewLabels[activeView]})</p>
                <div className="h-[220px]"><Bar data={c4} options={barOpts} /></div>
              </div>
            )}
            {c5 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">Structured & Contract Growth</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">Total Structured Spend vs On-Contract Spend ({viewLabels[activeView]})</p>
                <div className="h-[220px]"><Line data={c5} options={lineOpts} /></div>
              </div>
            )}
            {c6 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">All KPI Snapshot & Ranking</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">All 10 spend categories ranked · {latestPeriod || 'Latest'}</p>
                <div className="h-[220px]"><Bar data={c6} options={horizOpts} /></div>
              </div>
            )}
          </div>
        </div>
      )}
    </TabLoader>
  );
};

export default UsageTab;