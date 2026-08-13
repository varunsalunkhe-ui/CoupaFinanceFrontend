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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import TabLoader from '../../../components/TabLoader';
import { getDailyCached, setDailyCached, clearCachedByPrefix } from '../../../services/cacheStorage';
import { useDashboard } from '../../../context/DashboardContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const USAGE_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const USAGE_CACHE_KEY = 'tab_cache_usage_';

const getUsageCached = (key) => getDailyCached(USAGE_CACHE_KEY + key);
const setUsageCached = (key, data) => setDailyCached(USAGE_CACHE_KEY + key, data);

export const clearUsageCache = () => {
  clearCachedByPrefix(USAGE_CACHE_KEY);
};

const KPI_COLORS = {
  coupa_po_spend: '#4285F4',
  non_po_invoice_spend: '#EA4335',
  external_po_based_invoice_spend: '#FBBC04',
  external_po_spend: '#FF6D01',
  total_invoice_spend: '#46BDC6',
  expense_spend: '#7BAAF7',
  on_contract_spend: '#34A853',
  total_structured_spend: '#AF57DB',
  coupa_non_ext_spend: '#FF7043',
  total_coupa_spend: '#0D652D',
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

  const fetchUsageData = useCallback(async () => {
    const c = getUsageCached(customerName);
    if (c) {
      setData(c);
      setLoading(false);
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
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load Usage data');
    } finally {
      setLoading(false);
    }
  }, [customerName]);

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

  // Latest value within the currently-selected view (reacts to the toggle).
  const getLatest = (kpi, view = activeView) => {
    const series = kpi?.[view]?.series || [];
    return series[series.length - 1]?.value || 0;
  };

  // Growth between the last two periods of the selected view.
  const getGrowth = (kpi, view = activeView) => {
    const series = kpi?.[view]?.series || [];
    if (series.length < 2) return null;
    const current = series[series.length - 1]?.value || 0;
    const previous = series[series.length - 2]?.value || 0;
    if (previous === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getSeries = (kpi, view) => kpi?.[view]?.series || [];

  // Chart 1: Stacked Bar — PO + Non-PO Invoice + External PO Invoice breakdown
  const chart1Data = () => {
    if (!coupaPo || !nonPoInvoice || !extPoInvoice) return null;
    const po = getSeries(coupaPo, activeView);
    const npo = getSeries(nonPoInvoice, activeView);
    const ext = getSeries(extPoInvoice, activeView);
    return {
      labels: po.map(s => s.period),
      datasets: [
        { label: 'Coupa PO Spend', data: po.map(s => s.value), backgroundColor: '#00A0DF', borderRadius: 4, maxBarThickness: 42 },
        { label: 'Non-PO Invoice', data: npo.map(s => s.value), backgroundColor: '#EF4444', borderRadius: 4, maxBarThickness: 42 },
        { label: 'External PO Invoice', data: ext.map(s => s.value), backgroundColor: '#F59E0B', borderRadius: 4, maxBarThickness: 42 },
      ],
    };
  };

  // Chart 2: Area line — Total Coupa Spend trend (reacts to view toggle)
  const chart2Data = () => {
    if (!totalCoupa) return null;
    const series = getSeries(totalCoupa, activeView);
    return {
      labels: series.map(s => s.period),
      datasets: [{
        label: 'Total Coupa Spend',
        data: series.map(s => s.value),
        borderColor: '#00A0DF',
        backgroundColor: 'rgba(0,160,223,0.12)',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#00A0DF',
        pointBorderWidth: 2,
        fill: true,
      }],
    };
  };

  // Chart 3: Doughnut — spend composition for the latest period of the selected view
  const chart3Data = () => {
    const items = [
      { label: 'Coupa PO', value: getLatest(coupaPo), color: '#00A0DF' },
      { label: 'Non-PO Invoice', value: getLatest(nonPoInvoice), color: '#EF4444' },
      { label: 'Ext PO Invoice', value: getLatest(extPoInvoice), color: '#F59E0B' },
      { label: 'On-Contract', value: getLatest(onContract), color: '#0E9F6E' },
      { label: 'Structured', value: getLatest(structured), color: '#6353E9' },
      { label: 'Non-External', value: getLatest(nonExt), color: '#EC4899' },
    ].filter(i => i.value > 0);
    if (!items.length) return null;
    return {
      labels: items.map(i => i.label),
      datasets: [{ data: items.map(i => i.value), backgroundColor: items.map(i => i.color), borderWidth: 3, borderColor: '#fff', hoverOffset: 6 }],
    };
  };

  // Chart 4: Grouped bar — PO Spend vs External PO Spend vs Total Invoice
  const chart4Data = () => {
    if (!coupaPo || !extPoSpend || !totalInvoice) return null;
    const po = getSeries(coupaPo, activeView);
    const ext = getSeries(extPoSpend, activeView);
    const inv = getSeries(totalInvoice, activeView);
    return {
      labels: po.map(s => s.period),
      datasets: [
        { label: 'Coupa PO Spend', data: po.map(s => s.value), backgroundColor: '#00A0DF', borderRadius: 4, maxBarThickness: 24 },
        { label: 'External PO Spend', data: ext.map(s => s.value), backgroundColor: '#6353E9', borderRadius: 4, maxBarThickness: 24 },
        { label: 'Total Invoice Spend', data: inv.map(s => s.value), backgroundColor: '#0E9F6E', borderRadius: 4, maxBarThickness: 24 },
      ],
    };
  };

  // Chart 5: Multi-line — On-Contract, Structured, Non-External trends (reacts to view toggle)
  const chart5Data = () => {
    if (!onContract || !structured || !nonExt) return null;
    const oc = getSeries(onContract, activeView);
    const st = getSeries(structured, activeView);
    const ne = getSeries(nonExt, activeView);
    const linePoint = (color) => ({
      borderColor: color, backgroundColor: 'transparent', borderWidth: 2.5, tension: 0.4,
      pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#fff', pointBorderColor: color, pointBorderWidth: 2, fill: false,
    });
    return {
      labels: oc.map(s => s.period),
      datasets: [
        { label: 'On-Contract', data: oc.map(s => s.value), ...linePoint('#0E9F6E') },
        { label: 'Structured', data: st.map(s => s.value), ...linePoint('#6353E9') },
        { label: 'Non-External', data: ne.map(s => s.value), ...linePoint('#F59E0B') },
      ],
    };
  };

  // Chart 6: Horizontal bar — all KPI latest value in the selected view (reacts to toggle)
  const chart6Data = () => {
    const items = kpis
      .map(k => ({ label: k.label, value: getLatest(k), color: KPI_COLORS[k.key] || '#6353E9' }))
      .filter(i => i.value > 0)
      .sort((a, b) => b.value - a.value);
    if (!items.length) return null;
    return {
      labels: items.map(i => i.label),
      datasets: [{ data: items.map(i => i.value), backgroundColor: items.map(i => i.color), borderRadius: 4, maxBarThickness: 18 }],
    };
  };

  const commonPlugins = {
    tooltip: {
      backgroundColor: '#1E293B', titleColor: '#fff', bodyColor: '#E2E8F0', padding: 10,
      cornerRadius: 8, titleFont: { size: 11, weight: '600' }, bodyFont: { size: 11 }, displayColors: true, boxPadding: 4,
    },
  };
  const gridStyle = { color: 'rgba(226,232,240,0.6)', drawBorder: false };
  const axisTicks = { font: { size: 9 }, color: '#94A3B8' };

  const stackedOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, font: { size: 10 }, padding: 10, color: '#64748B' } },
      tooltip: { ...commonPlugins.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { ...axisTicks, maxRotation: 45 } },
      y: { stacked: true, beginAtZero: true, border: { display: false }, ticks: { ...axisTicks, callback: (v) => formatAxisVal(v) }, grid: gridStyle },
    },
  };

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...commonPlugins.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { ...axisTicks, maxRotation: 45 } },
      y: { beginAtZero: true, border: { display: false }, ticks: { ...axisTicks, callback: (v) => formatAxisVal(v) }, grid: gridStyle },
    },
  };

  const multiLineOpts = {
    ...lineOpts,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, font: { size: 10 }, padding: 10, color: '#64748B' } },
      tooltip: { ...commonPlugins.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
  };

  const groupedOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, font: { size: 10 }, padding: 10, color: '#64748B' } },
      tooltip: { ...commonPlugins.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { ...axisTicks, maxRotation: 45 } },
      y: { beginAtZero: true, border: { display: false }, ticks: { ...axisTicks, callback: (v) => formatAxisVal(v) }, grid: gridStyle },
    },
  };

  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '62%',
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, font: { size: 10 }, padding: 10, color: '#64748B' } },
      tooltip: { ...commonPlugins.tooltip, callbacks: { label: (c) => ` ${c.label}: ${formatCurrency(c.parsed)}` } },
    },
  };

  const horizOpts = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...commonPlugins.tooltip, callbacks: { label: (c) => ` ${formatCurrency(c.parsed.x)}` } } },
    scales: {
      x: { beginAtZero: true, border: { display: false }, ticks: { ...axisTicks, callback: (v) => formatAxisVal(v) }, grid: gridStyle },
      y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 9 }, color: '#64748B' } },
    },
  };

  const viewLabels = {
    year_on_year: 'Year-on-Year',
    trailing_twelve_months: 'Trailing 12 Months',
    monthly: 'Monthly',
  };

  // Latest period label in the selected view (e.g. "2026" or "2026-07")
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

          {/* KPI Cards — values reflect the selected view's latest period */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            {[
              { kpi: totalCoupa, label: 'Total Coupa Spend', color: '#0D652D' },
              { kpi: coupaPo, label: 'Coupa PO Spend', color: '#4285F4' },
              { kpi: nonPoInvoice, label: 'Non-PO Invoice', color: '#EA4335' },
              { kpi: extPoInvoice, label: 'Ext PO Invoice', color: '#FBBC04' },
              { kpi: totalInvoice, label: 'Total Invoice Spend', color: '#46BDC6' },
              { kpi: extPoSpend, label: 'External PO Spend', color: '#FF6D01' },
              { kpi: onContract, label: 'On-Contract Spend', color: '#34A853' },
              { kpi: structured, label: 'Structured Spend', color: '#AF57DB' },
              { kpi: nonExt, label: 'Non-External Spend', color: '#FF7043' },
            ].map(({ kpi, label, color }) => {
              const val = getLatest(kpi);
              const growth = getGrowth(kpi);
              return (
                <div key={label} className="bg-white border border-[#EDF0F7] rounded-xl p-3 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <div className="text-[10px] text-[#8A93A8] uppercase tracking-wide font-semibold truncate">{label}</div>
                  </div>
                  <div className="text-lg font-bold" style={{ color }}>{formatCurrency(val)}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#8A93A8]">{latestPeriod || 'Latest'}</span>
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
              <div className="bg-white border border-[#EDF0F7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                <h3 className="text-sm font-bold text-[#0F1733] mb-0.5">Spend Breakdown</h3>
                <p className="text-[11px] text-[#8A93A8] mb-4">PO + Non-PO + External PO · {viewLabels[activeView]}</p>
                <div className="h-[240px]"><Bar data={c1} options={stackedOpts} /></div>
              </div>
            )}
            {c2 && (
              <div className="bg-white border border-[#EDF0F7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                <h3 className="text-sm font-bold text-[#0F1733] mb-0.5">Total Coupa Spend — Trend</h3>
                <p className="text-[11px] text-[#8A93A8] mb-4">{viewLabels[activeView]} spend trajectory</p>
                <div className="h-[240px]"><Line data={c2} options={lineOpts} /></div>
              </div>
            )}
            {c3 && (
              <div className="bg-white border border-[#EDF0F7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                <h3 className="text-sm font-bold text-[#0F1733] mb-0.5">Spend Composition</h3>
                <p className="text-[11px] text-[#8A93A8] mb-4">Proportion by category · {latestPeriod || 'Latest'}</p>
                <div className="h-[240px]"><Doughnut data={c3} options={doughnutOpts} /></div>
              </div>
            )}
          </div>

          {/* Row 2: 3 charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {c4 && (
              <div className="bg-white border border-[#EDF0F7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                <h3 className="text-sm font-bold text-[#0F1733] mb-0.5">PO vs Invoice Comparison</h3>
                <p className="text-[11px] text-[#8A93A8] mb-4">Coupa PO vs External PO vs Total Invoice · {viewLabels[activeView]}</p>
                <div className="h-[240px]"><Bar data={c4} options={groupedOpts} /></div>
              </div>
            )}
            {c5 && (
              <div className="bg-white border border-[#EDF0F7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                <h3 className="text-sm font-bold text-[#0F1733] mb-0.5">Contract &amp; Structured Spend</h3>
                <p className="text-[11px] text-[#8A93A8] mb-4">On-Contract vs Structured vs Non-External · {viewLabels[activeView]}</p>
                <div className="h-[240px]"><Line data={c5} options={multiLineOpts} /></div>
              </div>
            )}
            {c6 && (
              <div className="bg-white border border-[#EDF0F7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                <h3 className="text-sm font-bold text-[#0F1733] mb-0.5">KPI Snapshot</h3>
                <p className="text-[11px] text-[#8A93A8] mb-4">All spend categories ranked · {latestPeriod || 'Latest'}</p>
                <div className="h-[240px]"><Bar data={c6} options={horizOpts} /></div>
              </div>
            )}
          </div>
        </div>
      )}
    </TabLoader>
  );
};

export default UsageTab;
