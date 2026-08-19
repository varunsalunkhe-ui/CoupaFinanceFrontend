import React, { useState, useEffect, useCallback, useRef } from 'react';
import TabLoader from '../../../components/TabLoader';
import { getDailyCached, setDailyCached, clearCachedByPrefix } from '../../../services/cacheStorage';
import { useDashboard } from '../../../context/DashboardContext';

const PORTFOLIO_API = import.meta.env.VITE_API_BASE_URL || '/api';

// Persistent cache using localStorage (survives tabs, sign-out, browser restart)
const PORTFOLIO_CACHE_KEY = 'tab_cache_portfolio_';

const getPortfolioCached = (key) => {
  return getDailyCached(PORTFOLIO_CACHE_KEY + key);
};
const setPortfolioCached = (key, data) => {
  setDailyCached(PORTFOLIO_CACHE_KEY + key, data);
};

export const clearPortfolioCache = () => {
  clearCachedByPrefix(PORTFOLIO_CACHE_KEY);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatQuantity = (qty) => {
  if (!qty) return '';
  if (qty >= 1000) return `${(qty / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  return qty.toLocaleString();
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

const buildHeatmapData = (heatmap) => {
  if (!heatmap) return { columns: [], aiPlatform: [] };

  const columns = HEATMAP_COLUMNS.map((col) => {
    const products = [];
    col.groups.forEach((groupName) => {
      if (heatmap[groupName]) {
        heatmap[groupName].products.forEach((p) => {
          products.push({ ...p, sourceGroup: groupName });
        });
      }
    });
    return { ...col, products };
  });

  const aiPlatform = AI_PLATFORM_DISPLAY.map((item) => {
    const group = heatmap[item.group];
    if (!group) return { ...item, heat: null };
    if (item.product) {
      const found = group.products.find((p) => p.productName === item.product);
      return { ...item, heat: found?.productHeat || null };
    }
    const first = group.products[0];
    return { ...item, heat: first?.productHeat || null };
  });

  return { columns, aiPlatform };
};

const PortfolioTab = ({ accountName, clientName }) => {
  const customerName = clientName || accountName;
  const cached = getPortfolioCached(customerName);
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const unmountedRef = useRef(false);
  const { setExternalTabData } = useDashboard();

  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  const fetchData = useCallback(async () => {
    const c = getPortfolioCached(customerName);
    if (c) {
      setData(c);
      setLoading(false);
      setExternalTabData('portfolio', c);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ customer_name: customerName, section: 'product-portfolio' });
      const response = await fetch(
        `${PORTFOLIO_API}/section?${params.toString()}`,
        { headers: { accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
      );
      if (!response.ok) throw new Error(`Failed to fetch (${response.status})`);
      const result = await response.json();
      setPortfolioCached(customerName, result);
      if (!unmountedRef.current) {
        setData(result);
        setExternalTabData('portfolio', result);
      }
    } catch (err) {
      if (!unmountedRef.current) setError(err.message || 'Failed to load Product Portfolio');
    } finally {
      if (!unmountedRef.current) setLoading(false);
    }
  }, [customerName]);

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

          {/* ═══ HEATMAP ═══ */}
          {/* {data.heatmap && (() => {
            const { columns, aiPlatform } = buildHeatmapData(data.heatmap);
            const adoptedCount = summary?.successfulCount || 0;
            const underusedCount = summary?.concernedCount || 0;
            const opportunityCount = summary?.atRiskCount || 0;
            const totalPossible = summary?.totalProducts || 0;
            const penetration = totalPossible > 0 ? Math.round((adoptedCount / totalPossible) * 100) : 0;
            const maxRows = Math.max(...columns.map(c => c.products.length), 1);
            return (
              <div className="mb-8 mt-10 bg-[#F8F9FC] rounded-2xl p-6 border border-[#E4E7F1]">
              
                <h3 className="text-[16px] font-bold text-[#0F1733] mb-1">
                  Coupa Product Landscape — Adoption Heatmap
                </h3>
                <p className="text-[12px] text-[#5A6180] mb-5 leading-relaxed">
                  Every SKU Coupa sells, mapped to current state. Classification reconciled from Customer 360 entitlements, live usage dashboards, and the upsell landscape.
                </p>

              
                <div className="flex flex-wrap items-center gap-5 mb-6 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#BCE2F5' }}></span>
                    <span className="text-[#374151]">Adopted (owned + actively used)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#D7BAE3' }}></span>
                    <span className="text-[#374151]">Underused / Concerned (owned, adoption gap)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#D1FAE5' }}></span>
                    <span className="text-[#374151]">Value Opportunity (not owned — upsell)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm border border-[#D1D5DB]" style={{ backgroundColor: '#F3F4F6' }}></span>
                    <span className="text-[#374151]">Not applicable / blank</span>
                  </span>
                  <span className="text-[#5A6180] ml-2">
                    Tag: <strong>A</strong>=Adopted · <strong>U</strong>=Underused · <strong>O</strong>=Opportunity
                  </span>
                </div>

           
                <div className="grid grid-cols-7 gap-1.5 mb-3">
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className="px-3 py-2.5 text-center text-[11px] font-bold text-white rounded-lg"
                      style={{ backgroundColor: '#1E2A5E' }}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>

              
                {Array.from({ length: maxRows }).map((_, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-7 gap-1.5 mb-1.5">
                    {columns.map((col) => {
                      const product = col.products[rowIdx];
                      if (!product) {
                        return <div key={col.key} className="min-h-[80px]"></div>;
                      }
                      return (
                        <HeatmapCell
                          key={col.key}
                          productName={product.productName}
                          heat={product.productHeat}
                        />
                      );
                    })}
                  </div>
                ))}

                
                <div className="mt-8">
                  <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-[#5A6180] mb-3">
                    COUPA AI & PLATFORM & ECOSYSTEM
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {aiPlatform.map((item, idx) => {
                      const type = item.heat ? getHeatType(item.heat) : null;
                      const tag = type === 'adopted' ? 'A' : type === 'underused' ? 'U' : type === 'opportunity' ? 'O' : '';
                      const s = type ? HEAT_STYLES[type] : { bg: '#F3F4F6', text: '#6B7280', tagBg: '#D1D5DB', tagText: '#6B7280' };
                      return (
                        <div
                          key={idx}
                          className="relative rounded-lg p-4 flex flex-col items-center justify-center text-center min-h-[72px]"
                          style={{ backgroundColor: s.bg, color: s.text }}
                        >
                          {tag && (
                            <span
                              className="absolute top-2 right-2 text-[9px] font-bold w-[16px] h-[16px] flex items-center justify-center rounded-sm"
                              style={{ backgroundColor: s.tagBg, color: s.tagText }}
                            >
                              {tag}
                            </span>
                          )}
                          <span className="text-[12px] font-semibold leading-tight">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[#E4E7F1]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Modules Have Been Adopted</div>
                    <div className="text-3xl font-bold text-[#16A34A]">{adoptedCount}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">Value is being realized</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Underutilized</div>
                    <div className="text-3xl font-bold text-[#F59E0B]">{underusedCount}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">Attention is needed</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Opportunity</div>
                    <div className="text-3xl font-bold text-[#16A34A]">{opportunityCount}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">Expanding potential</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Combined Penetration Rate</div>
                    <div className="text-3xl font-bold text-[#0F766E]">~{penetration}%</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">{adoptedCount} / ~{totalPossible}</div>
                  </div>
                </div>
              </div>
            );
          })()} */}

          {/* ═══ Summary Stats ═══ */}
          {/* {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E4E7F1]">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Total Products</div>
                <div className="text-2xl font-bold text-[#0F1733]">{summary.totalProducts}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Successful</div>
                <div className="text-2xl font-bold text-[#16A34A]">{summary.successfulCount}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Concerned</div>
                <div className="text-2xl font-bold text-[#F59E0B]">{summary.concernedCount}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Health %</div>
                <div className="text-2xl font-bold text-[#4A3DC7]">{summary.healthPercentage}%</div>
              </div>
            </div>
          )} */}

         
        </div>
      )}
    </TabLoader>
  );
};

export default PortfolioTab;
