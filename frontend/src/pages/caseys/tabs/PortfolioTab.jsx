import React, { useState, useEffect, useCallback, useRef } from 'react';
import TabLoader from '../../../components/TabLoader';
import { useDashboard } from '../../../context/DashboardContext';

const PORTFOLIO_API = import.meta.env.VITE_API_BASE_URL || '/api';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatQuantity = (qty) => {
  if (!qty) return '';
  return Number(qty).toLocaleString('en-US');
};

// ═══ Heatmap Configuration ═══
const HEATMAP_COLUMNS = [
  { key: 'strategic_sourcing', label: 'Strategic Sourcing', groups: ['Sourcing'] },
  { key: 'procurement', label: 'Procurement', groups: ['P2P', 'Services Procurement', 'Services Maestro'] },
  { key: 'invoice', label: 'Invoice', groups: ['InvoiceSmash', 'Contract Management'] },
  { key: 'pay', label: 'Pay', groups: ['Coupa Pay', 'Treasury'] },
  { key: 'expense', label: 'Expense', groups: ['Expense'] },
  { key: 'supply_chain', label: 'Supply Chain', groups: ['Supply Chain Collaboration'] },
  { key: 'mgmt_risk', label: 'Mgmt & Risk', groups: ['CLM', 'Supplier Management', 'Managed Services', 'Support'] },
];

const AI_PLATFORM_DISPLAY = [
  { label: 'Analytics', group: 'Spend Analysis', product: 'Advanced Analytics' },
  { label: 'AI Classification', group: 'Spend Analysis', product: 'AIC' },
  { label: 'SpendGuard', group: 'Spend Analysis', product: 'SPEND_GUARD' },
  { label: 'OBN / CSP', group: 'OBN', product: 'Open Business Network' },
  { label: 'Platform / Navi', group: 'Platform', product: null },
];

const getHeatType = (heat) => {
  const h = (heat || '').toLowerCase();
  if (h === 'successful') return 'adopted';
  if (h === 'concerned') return 'underused';
  return 'opportunity';
};

const getHeatSubtitle = (heat) => {
  const h = (heat || '').toLowerCase();
  if (h === 'successful') return 'Success';
  if (h === 'concerned') return 'Attention';
  return 'Opportunity';
};

const HEAT_STYLES = {
  adopted: { bg: '#DCE0F9', text: '#1E2A5E', tagBg: '#FFFFFF', tagText: '#1E2A5E' },
  underused: { bg: '#E0DFF5', text: '#322A80', tagBg: '#FFFFFF', tagText: '#322A80' },
  opportunity: { bg: '#D1FAE5', text: '#065F46', tagBg: '#FFFFFF', tagText: '#065F46' },
};

const HeatmapCell = ({ productName, heat, subtitle }) => {
  const type = getHeatType(heat);
  const tag = type === 'adopted' ? 'A' : type === 'underused' ? 'U' : 'O';
  const s = HEAT_STYLES[type];
  return (
    <div
      className="relative rounded-lg p-3 flex flex-col items-center justify-center text-center min-h-[80px]"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span
        className="absolute top-2 right-2 text-[9px] font-bold w-[16px] h-[16px] flex items-center justify-center rounded-sm"
        style={{ backgroundColor: s.tagBg, color: s.tagText }}
      >
        {tag}
      </span>
      <span className="text-[12px] font-semibold leading-tight mb-0.5">{productName}</span>
      <span className="text-[10px] opacity-80">{subtitle || getHeatSubtitle(heat)}</span>
    </div>
  );
};
 
const PortfolioTab = ({ accountName, clientName, forceRefresh = false }) => {
  const customerName = clientName || accountName;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unmountedRef = useRef(false);
  const { setExternalTabData } = useDashboard();

  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ customer_name: customerName, section: 'product-portfolio' });
      if (forceRefresh) params.set('refresh', 'true');
      const response = await fetch(
        `${PORTFOLIO_API}/section?${params.toString()}`,
        { headers: { accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
      );
      if (!response.ok) throw new Error(`Failed to fetch (${response.status})`);
      const result = await response.json();
      if (!unmountedRef.current) {
        setData(result);
        setExternalTabData('portfolio', result);
      }
    } catch (err) {
      if (!unmountedRef.current) setError(err.message || 'Failed to load Product Portfolio');
    } finally {
      if (!unmountedRef.current) setLoading(false);
    }
  }, [customerName, forceRefresh]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const portfolio = data?.portfolio;
  const summary = data?.summary;

  return (
    <TabLoader loading={loading} error={error} onRetry={fetchData} data={data}>
      {data && portfolio && (
        <div>
          {/* Legend */}
          <p className="text-[13px] text-[#374151] mb-4 leading-relaxed">
            {data.metadata?.dataSourceDescription}
            <span className="inline-flex items-center gap-1.5 ml-4">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#16A34A]"></span>
              <span className="text-[12px] text-[#5A6180]">Successful / Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5 ml-3">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#F59E0B]"></span>
              <span className="text-[12px] text-[#5A6180]">Concerned / Underused</span>
            </span>
            <span className="inline-flex items-center gap-1.5 ml-3">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#9CA3AF]"></span>
              <span className="text-[12px] text-[#5A6180]">Not owned</span>
            </span>
          </p>

          {/* ═══ OWNED & PERFORMING ═══ */}
          {portfolio.ownedAndPerforming && portfolio.ownedAndPerforming.products.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#0F1733] mb-4">
                {portfolio.ownedAndPerforming.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {portfolio.ownedAndPerforming.products.map((p, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#E5E7EB] border-l-[4px] border-l-[#16A34A] rounded-xl p-4 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wide text-[#5A6180] font-semibold">{p.productGroup}</span>
                      <span className="shrink-0 text-[9px] font-bold px-2 py-[3px] rounded bg-green-100 text-green-800 leading-none">
                        {p.productHeat}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-[#0F1733] mb-2">{p.productName}</div>
                    <div className="mt-auto space-y-0.5 text-[11px] text-[#5A6180]">
                      {p.quantity > 1 && <div>Qty: {formatQuantity(p.quantity)} licenses</div>}
                      <div>Contract: {formatDate(p.subscriptionStartDate)} – {formatDate(p.subscriptionEndDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ OWNED BUT CONCERNED / UNDERUSED ═══ */}
          {portfolio.ownedButConcerned && portfolio.ownedButConcerned.products.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#0F1733] mb-4">
                {portfolio.ownedButConcerned.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {portfolio.ownedButConcerned.products.map((p, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#E5E7EB] border-l-[4px] border-l-[#F59E0B] rounded-xl p-4 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wide text-[#5A6180] font-semibold">{p.productGroup}</span>
                      <span className="shrink-0 text-[9px] font-bold px-2 py-[3px] rounded bg-amber-100 text-amber-800 leading-none">
                        {p.productHeat}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-[#0F1733] mb-2">{p.productName}</div>
                    <div className="mt-auto space-y-0.5 text-[11px] text-[#5A6180]">
                      {p.quantity > 1 && <div>Qty: {formatQuantity(p.quantity)} licenses</div>}
                      <div>Contract: {formatDate(p.subscriptionStartDate)} – {formatDate(p.subscriptionEndDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ NOT OWNED — UPSELL / CROSS-SELL ═══ */}
          {portfolio.notOwnedUpsell && portfolio.notOwnedUpsell.products.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#0F1733] mb-4">
                {portfolio.notOwnedUpsell.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {portfolio.notOwnedUpsell.products.map((p, i) => (
                  <div
                    key={i}
                    className="bg-[#F9FAFB] border border-[#E5E7EB] border-l-[4px] border-l-[#9CA3AF] rounded-xl p-4 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wide text-[#5A6180] font-semibold">{p.productGroup}</span>
                      <span className="shrink-0 text-[9px] font-bold px-2 py-[3px] rounded bg-gray-200 text-gray-700 leading-none">
                        Opportunity
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-[#0F1733] mb-2">{p.productName}</div>
                    {p.llmDescription && (
                      <p className="text-[11px] text-[#5A6180] leading-[1.5] mb-2">{p.llmDescription}</p>
                    )}
                    <div className="mt-auto space-y-0.5 text-[11px] text-[#5A6180]">
                      {p.quantity > 1 && <div>Qty: {formatQuantity(p.quantity)} licenses</div>}
                      {p.subscriptionStartDate && (
                        <div>Contract: {formatDate(p.subscriptionStartDate)} – {formatDate(p.subscriptionEndDate)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </TabLoader>
  );
};

export default PortfolioTab;
