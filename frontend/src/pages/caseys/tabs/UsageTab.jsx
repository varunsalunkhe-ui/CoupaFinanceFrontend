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
  const expenseSpend = getKpi(kpis, 'expense_spend');

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
        { label: 'Coupa PO Spend', data: po.map(s => s.value), backgroundColor: '#4285F4', borderRadius: 2 },
        { label: 'Non-PO Invoice', data: npo.map(s => s.value), backgroundColor: '#EA4335', borderRadius: 2 },
        { label: 'External PO Invoice', data: ext.map(s => s.value), backgroundColor: '#FBBC04', borderRadius: 2 },
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
        borderColor: '#0D652D',
        backgroundColor: 'rgba(13,101,45,0.1)',
        borderWidth: 2.5,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#0D652D',
        fill: true,
      }],
    };
  };

  // Chart 3: Doughnut — spend composition for the latest period of the selected view
  const chart3Data = () => {
    const items = [
      { label: 'Coupa PO', value: getLatest(coupaPo), color: '#4285F4' },
      { label: 'Non-PO Invoice', value: getLatest(nonPoInvoice), color: '#EA4335' },
      { label: 'Ext PO Invoice', value: getLatest(extPoInvoice), color: '#FBBC04' },
      { label: 'On-Contract', value: getLatest(onContract), color: '#34A853' },
      { label: 'Structured', value: getLatest(structured), color: '#AF57DB' },
      { label: 'Non-External', value: getLatest(nonExt), color: '#FF7043' },
    ].filter(i => i.value > 0);
    if (!items.length) return null;
    return {
      labels: items.map(i => i.label),
      datasets: [{ data: items.map(i => i.value), backgroundColor: items.map(i => i.color), borderWidth: 2, borderColor: '#fff' }],
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
        { label: 'Coupa PO Spend', data: po.map(s => s.value), backgroundColor: '#4285F4', borderRadius: 3 },
        { label: 'External PO Spend', data: ext.map(s => s.value), backgroundColor: '#FF6D01', borderRadius: 3 },
        { label: 'Total Invoice Spend', data: inv.map(s => s.value), backgroundColor: '#46BDC6', borderRadius: 3 },
      ],
    };
  };

  // Chart 5: Multi-line — On-Contract, Structured, Non-External trends (reacts to view toggle)
  const chart5Data = () => {
    if (!onContract || !structured || !nonExt) return null;
    const oc = getSeries(onContract, activeView);
    const st = getSeries(structured, activeView);
    const ne = getSeries(nonExt, activeView);
    return {
      labels: oc.map(s => s.period),
      datasets: [
        { label: 'On-Contract', data: oc.map(s => s.value), borderColor: '#34A853', backgroundColor: 'rgba(52,168,83,0.08)', borderWidth: 2, tension: 0.35, pointRadius: 3, pointBackgroundColor: '#34A853', fill: true },
        { label: 'Structured', data: st.map(s => s.value), borderColor: '#AF57DB', backgroundColor: 'rgba(175,87,219,0.08)', borderWidth: 2, tension: 0.35, pointRadius: 3, pointBackgroundColor: '#AF57DB', fill: true },
        { label: 'Non-External', data: ne.map(s => s.value), borderColor: '#FF7043', backgroundColor: 'rgba(255,112,67,0.08)', borderWidth: 2, tension: 0.35, pointRadius: 3, pointBackgroundColor: '#FF7043', fill: true },
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
      datasets: [{ data: items.map(i => i.value), backgroundColor: items.map(i => i.color), borderRadius: 4 }],
    };
  };

  const stackedOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'rect', boxWidth: 10, font: { size: 10 }, padding: 8 } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => formatAxisVal(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } },
    },
  };

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { callback: (v) => formatAxisVal(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } },
    },
  };

  const multiLineOpts = {
    ...lineOpts,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 }, padding: 8 } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
  };

  const groupedOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'rect', boxWidth: 10, font: { size: 10 }, padding: 8 } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { callback: (v) => formatAxisVal(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } },
    },
  };

  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '55%',
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 }, padding: 8 } },
      tooltip: { callbacks: { label: (c) => `${c.label}: ${formatCurrency(c.parsed)}` } },
    },
  };

  const horizOpts = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatCurrency(c.parsed.x) } } },
    scales: {
      x: { beginAtZero: true, ticks: { callback: (v) => formatAxisVal(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } },
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
                <p className="text-[10px] text-[#5A6180] mb-3">PO + Non-PO + External PO ({viewLabels[activeView]})</p>
                <div className="h-[220px]"><Bar data={c1} options={stackedOpts} /></div>
              </div>
            )}
            {c2 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">Total Coupa Spend — Trend</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">{viewLabels[activeView]} spend trajectory</p>
                <div className="h-[220px]"><Line data={c2} options={lineOpts} /></div>
              </div>
            )}
            {c3 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">Spend Composition</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">Proportion by category · {latestPeriod || 'Latest'}</p>
                <div className="h-[220px]"><Doughnut data={c3} options={doughnutOpts} /></div>
              </div>
            )}
          </div>

          {/* Row 2: 3 charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {c4 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">PO vs Invoice Comparison</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">Coupa PO vs External PO vs Total Invoice ({viewLabels[activeView]})</p>
                <div className="h-[220px]"><Bar data={c4} options={groupedOpts} /></div>
              </div>
            )}
            {c5 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">Contract & Structured Spend</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">On-Contract vs Structured vs Non-External ({viewLabels[activeView]})</p>
                <div className="h-[220px]"><Line data={c5} options={multiLineOpts} /></div>
              </div>
            )}
            {c6 && (
              <div className="bg-white border border-[#E4E7F1] rounded-xl p-4">
                <h3 className="text-[13px] font-bold text-[#0F1733] mb-0.5">KPI Snapshot</h3>
                <p className="text-[10px] text-[#5A6180] mb-3">All spend categories ranked · {latestPeriod || 'Latest'}</p>
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
