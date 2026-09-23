import React, { useState, useEffect, useCallback, useRef } from 'react';
import TabLoader from '../../../components/TabLoader';
import { useDashboard } from '../../../context/DashboardContext';
import KpiEyeInfo from '../../../components/KpiEyeInfo';
import { METRIC_DEFINITIONS } from '../../../constants/metricDefinitions';

const CUSTOMER_VALUE_API = import.meta.env.VITE_API_BASE_URL || '/api';

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === 'NA') return ' — ';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

const parseNumericValue = (val) => {
  if (val === null || val === undefined || val === 'NA') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrencyLegend = (val) => {
  if (val === null || val === undefined || Number.isNaN(val)) return ' — ';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
};

const formatCurrencyFull = (numericVal, fallbackVal) => {
  if (numericVal !== null && numericVal !== undefined && Number.isFinite(numericVal)) {
    return `$${numericVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return fallbackVal || ' — ';
};

const formatDays = (val) => {
  if (val === null || val === undefined || val === 'NA') return ' — ';
  return `${val} days`;
};

// Rounds long floating-point day values (e.g. 7.720000000000001) to 2 decimals; passes through already-formatted range strings (e.g. "5.34 - 6.34")
const formatDayReduction = (val) => {
  if (val === null || val === undefined || val === '' || val === 'NA') return ' — ';
  if (typeof val === 'string') return `${val} day reduction`;
  const num = Number(val);
  if (!Number.isFinite(num)) return ' — ';
  return `${Math.round(num * 100) / 100} day reduction`;
};

const formatPercent = (val) => {
  if (val === null || val === undefined || val === 'NA') return ' — ';
  return `${Number(val).toFixed(0)}%`;
};


// One-decimal variant for small-magnitude KPI shares (e.g. 0.02%) that would round to 0% otherwise
const formatPercent1 = (val) => {
  const num = parseNumericValue(val);
  if (num === null) return ' — ';
  return `${num.toFixed(1)}%`;
};

// Formats API range strings like "215771.64488 - 323657.46732" as "$215.77K – $323.66K"
const formatCurrencyRange = (val) => {
  if (val === null || val === undefined || val === 'NA' || val === 'N/A') return ' — ';
  if (typeof val === 'string' && /\d\s*-\s*\d/.test(val)) {
    const [lo, hi] = val.split(/\s*-\s*/).map(parseNumericValue);
    if (lo !== null && hi !== null) return `${formatCurrency(lo)} – ${formatCurrency(hi)}`;
  }
  return formatCurrency(parseNumericValue(val));
};


const SnapshotTab = ({ accountName, clientName }) => {
  const customerName = clientName || accountName;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  // Sanitize API-provided sentinel strings like 'N/A' or 'NA' into a display dash
  const sanitizeData = (obj) => {
    if (obj == null) return obj;
    if (typeof obj === 'string') {
      if (obj === 'N/A' || obj === 'NA') return ' — ';
      return obj;
    }
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeData);
    const out = {};
    Object.keys(obj).forEach((k) => {
      out[k] = sanitizeData(obj[k]);
    });
    return out;
  };

  const { setExternalTabData } = useDashboard();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ customer_name: customerName, section: 'value_snapshot' });
      const response = await fetch(`${CUSTOMER_VALUE_API}/section?${params.toString()}`, {
        headers: { accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!response.ok) throw new Error(`Failed to fetch (${response.status})`);
      const result = await response.json();
      const sanitized = sanitizeData(result);
      if (!unmountedRef.current) {
        setData(sanitized);
        setExternalTabData('snapshot', sanitized);
      }
    } catch (err) {
      if (!unmountedRef.current) {
        setError(err.message || 'Failed to load Value Snapshot');
      }
    } finally {
      if (!unmountedRef.current) setLoading(false);
    }
  }, [customerName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const poSpend = parseNumericValue(data?.po_spend) || 0;
  const nonPoInvoiceSpend = parseNumericValue(data?.Non_PO_Invoice_Spend) || 0;
  const externalPoInvoiceSpend = parseNumericValue(data?.External_PO_based_Invoice_Spend) || 0;
  const totalCoupaSpendFromApi = parseNumericValue(data?.total_coupa_spend);
  const totalCoupaSpend = totalCoupaSpendFromApi || (poSpend + nonPoInvoiceSpend + externalPoInvoiceSpend);

  const poShare = totalCoupaSpend > 0 ? (poSpend / totalCoupaSpend) * 100 : 0;
  const externalPoInvoiceShare = totalCoupaSpend > 0 ? (externalPoInvoiceSpend / totalCoupaSpend) * 100 : 0;
  const nonPoInvoiceShare = totalCoupaSpend > 0 ? (nonPoInvoiceSpend / totalCoupaSpend) * 100 : 0;

  return (
    <TabLoader loading={loading} error={error} onRetry={fetchData} data={data}>
      {data && (
        <div>
          <div className="mb-6 flex items-start gap-2.5 text-[12px] text-[#3A4A8A] bg-linear-to-r from-[#EEF2FF] to-[#F5F8FF] border border-[#C7D5F7] border-l-4 border-l-[#4A3DC7] rounded-lg px-4 py-2.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-[#4A3DC7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Harvest metrics are based on PFI reporting data. Results may vary from other systems (Analytics, Customer Dashboard, etc.). AI-generated content should be verified.</span>
          </div>


          {/* Customer Strategic Initiatives */}
          {/* <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0F1733]">Customer Strategic Initiatives</h3>
              <span className="text-xs text-[#5A6180]">From Account Plan · Linked to Coupa expansion priorities</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: 'CEO Rebelez: Become 3rd largest US c-retailer', desc: 'Goal to add 500 stores by FY26, requiring scalable procurement for new construction.', link: 'Supply Chain Design', color: '#4A3DC7' },
                { title: 'CFO Bramlage: Working-capital optimization', desc: 'Focus on payables modernization and cost management.', link: 'Coupa Pay, Treasury', color: '#DB2777' },
                { title: 'COO Williams: Foodservice & supply chain', desc: 'Drive foodservice innovation and build supply chain resilience.', link: 'Sourcing, SIM', color: '#F59E0B' },
                { title: 'CIO Satturu: Tech consolidation & control', desc: 'Prioritizing digital transformation and control over indirect spend.', link: 'AIC, Intake', color: '#16A34A' },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-[#E4E7F1] rounded-lg p-4" style={{ borderLeft: `4px solid ${item.color}` }}>
                  <div className="text-[13px] font-bold text-[#0F1733] mb-1">{item.title}</div>
                  <div className="text-xs text-[#5A6180] mb-2">{item.desc}</div>
                  <div className="text-xs text-[#4A3DC7] font-medium">→ {item.link}</div>
                </div>
              ))}
            </div>
          </div> */}

          {/* Section 1 · Spend Data */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 pb-1.5 border-b-2 border-[#E4E7F1]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5A6180]">Section 1 - UBP Measured Spend Data</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
             <div className="relative bg-white border border-[#E4E7F1] rounded-lg p-5 border-t-4 border-t-[#4A3DC7]">
                <KpiEyeInfo text={METRIC_DEFINITIONS.coupaPoSpend} />
                <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">Coupa PO Spend</div>
                <div className="text-3xl font-bold text-[#0F1733]">{formatCurrency(data.po_spend)}</div>
                <div className="text-xs text-[#16A34A] mt-1">{data.po_spend_text || ''}</div>
              </div>
              <div className="relative bg-white border border-[#E4E7F1] rounded-lg p-5 border-t-4 border-t-[#4A3DC7]">
                <KpiEyeInfo text={METRIC_DEFINITIONS.nonPoInvoiceSpend} />
                <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">Non-PO Invoice Spend</div>
                <div className="text-3xl font-bold text-[#0F1733]">{formatCurrency(data.Non_PO_Invoice_Spend)}</div>
                <div className="text-xs text-[#16A34A] mt-1">{data.Non_PO_Invoice_Spend_text || ''}</div>
              </div>
              <div className="relative bg-white border border-[#E4E7F1] rounded-lg p-5 border-t-4 border-t-[#4A3DC7]">
                <KpiEyeInfo text={METRIC_DEFINITIONS.externalPoBasedInvoiceSpend} />
                <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">External PO-based Invoice Spend</div>
                <div className="text-3xl font-bold text-[#0F1733]">{formatCurrency(data.External_PO_based_Invoice_Spend)}</div>
                <div className="text-xs text-[#16A34A] mt-1">{data.External_PO_based_Invoice_Spend_text || ''}</div>
              </div>
              <div 
                className="relative rounded-lg p-5 border-t-4 border-t-[#FF6B35] border-l-0 border-r-0 border-b-0"
                style={{
                  background: 'linear-gradient(155deg, #1e3a8a 0%, #0f172a 100%)',
                }}
              >
                 <KpiEyeInfo text={METRIC_DEFINITIONS.totalCoupaSpend} colorClassName="text-[#CFDDF6]/70 hover:text-white" />
                <div className="text-[12px] uppercase tracking-[0.03em] text-[#B9CBEF] font-bold mb-2">Composition of Total UBP Measured Spend</div>
                <div className="text-[32px] font-black mt-2.5 text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>{formatCurrency(data.total_coupa_spend)}</div>
                <div className="text-[11.5px] text-[#CFDDF6] mt-2 font-medium">{'Coupa PO Spend + Non-PO Invoice Spend + External PO-based Invoice Spend'}</div>
              </div>
              <div className="relative bg-white border border-[#E4E7F1] rounded-lg p-5 border-t-4 border-t-[#4A3DC7]">
                <KpiEyeInfo text={METRIC_DEFINITIONS.totalAddressableSpend} />
                <div className="text-[10px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">Total Addressable Spend (EST.)</div>
                <div className="text-3xl font-bold text-[#0F1733]">{data.total_addressable_spend === 'NA' ? '~$4.5B' : formatCurrency(data.total_addressable_spend)}</div>
                <div className="text-xs text-[#5A6180] mt-1">Confirm with finance</div>
              </div>
            </div>

            {/* Capture Rate Bar */}
            <div className="bg-white border border-[#E4E7F1] rounded-lg p-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[14px] font-semibold text-[#0F1733]">Composition of Total UBP Measured Spend</span>
                <span className="text-[14px] leading-none font-extrabold text-[#0F1733]">{formatCurrencyFull(totalCoupaSpend, data.total_coupa_spend)}</span>
              </div>
              <div className="w-full h-9 bg-[#E4E7F1] rounded-xl overflow-hidden flex">
                <div className="h-full bg-[#2563EB] flex items-center justify-center text-white text-[14px] font-bold" style={{ width: `${poShare}%` }}>
                  {poShare >= 4 ? `Coupa PO Spend · ${poShare.toFixed(1)}%` : ''}
                </div>
                <div className="h-full bg-[#0F2346] flex items-center justify-center text-white text-[14px] font-bold" style={{ width: `${externalPoInvoiceShare}%` }}>
                  {externalPoInvoiceShare >= 4 ? `${externalPoInvoiceShare.toFixed(1)}%` : ''}
                </div>
                <div className="h-full bg-[#F59E0B] flex items-center justify-center text-white text-[14px] font-bold" style={{ width: `${nonPoInvoiceShare}%` }}>
                  {nonPoInvoiceShare >= 4 ? `${nonPoInvoiceShare.toFixed(1)}%` : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-7 mt-4 text-[13px] text-[#5A6180]">
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-[#2563EB] rounded-full inline-block"></span>
                  Coupa PO Spend - {formatCurrencyLegend(poSpend)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-[#0F2346] rounded-full inline-block"></span>
                  External PO-based Invoice Spend - {formatCurrencyLegend(externalPoInvoiceSpend)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-[#F59E0B] rounded-full inline-block"></span>
                  Non-PO Invoice Spend - {formatCurrencyLegend(nonPoInvoiceSpend)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2 · Value Metrics (KPIs) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 pb-1.5 border-b-2 border-[#E4E7F1]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5A6180]">Section 2 · Value Metrics (KPIs)</h3>
            </div>
            <div className="grid grid-cols md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Sourcing */}
              

              {/* Procurement */}
              <div className="bg-white border border-[#E4E7F1] rounded-lg overflow-hidden">
                <div className="h-1 border-t-4 border-t-[#4A3DC7]"></div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-wider text-[#DC2626] font-bold mb-3 ">Procurement</div>
                  <div className="relative mb-3 pr-5">
                    <KpiEyeInfo text={METRIC_DEFINITIONS.onContractSavings} />
                    <div className="text-[10px] uppercase text-[#5A6180] tracking-wide">On-Contract Savings</div>
                    <div className="text-2xl font-bold text-[#0F1733]">{formatCurrency(data.Spend_Under_Contract_Savings_Capture)}</div>
                    <div className="text-[11px] text-[#5A6180]">{data.Spend_Under_Contract_Savings_Capture_text || ''}</div>
                  </div>
                  <div className="relative pr-5">
                    <KpiEyeInfo text={METRIC_DEFINITIONS.requisitionCycleTime} />
                    <div className="text-[10px] uppercase text-[#5A6180] tracking-wide">Requisition Cycle Time</div>
                    <div className="text-2xl font-bold text-[#0F1733]">{formatDays(data.PR_to_PO_Cycle_Time)}</div>
                    <div className="text-[11px] text-[#5A6180]">{data.PR_to_PO_Cycle_Time_text || ''}</div>
                  </div>
                </div>
              </div>

              {/* Invoicing */}
              <div className="bg-white border border-[#E4E7F1] rounded-lg overflow-hidden">
                <div className="h-1 border-t-4 border-t-[#4A3DC7]"></div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-wider text-[#2563EB] font-bold mb-3">Invoicing</div>
                  {/* <div className="mb-3">
                    <div className="text-[10px] uppercase text-[#5A6180] tracking-wide">Invoice Processing Cycle</div>
                    <div className="text-2xl font-bold text-[#0F1733]">{formatDays(data.Invoice_Processing_Cycle)}</div>
                    <div className="text-[11px] text-[#5A6180]">{data.Invoice_Processing_Cycle_text || ''}</div>
                  </div> */}
                  <div className="relative pr-5">
                    <KpiEyeInfo text={METRIC_DEFINITIONS.firstTimeMatchRate} />
                    <div className="text-[10px] uppercase text-[#5A6180] tracking-wide">First Time Match Rate</div>
                    <div className="text-2xl font-bold text-[#0F1733]">{formatPercent(data.First_Time_Match_Rate)}</div>
                    <div className="text-[11px] text-[#5A6180]">{data.First_Time_Match_Rate_text || ''}</div>
                  </div>
                </div>
              </div>

              {/* Additional */}
              <div className="bg-white border border-[#E4E7F1] rounded-lg overflow-hidden">
                <div className="h-1 border-t-4 border-t-[#4A3DC7]"></div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-wider text-[#7C3AED] font-bold mb-3">Contracts & Sourcing</div>
                  <div className="relative mb-3 pr-5">
                    <KpiEyeInfo text={METRIC_DEFINITIONS.totalContracts} />
                    <div className="text-[10px] uppercase text-[#5A6180] tracking-wide">Total Contracts <span className="normal-case">(Includes active contracts)</span></div>
                    <div className="text-2xl font-bold text-[#0F1733]">{data.Total_Contracts}</div>
                    <div className="text-[11px] text-[#5A6180]">{data.Total_Contracts_text || ''}</div>

                  </div>
                  <div className="relative pr-5">
                    <KpiEyeInfo text={METRIC_DEFINITIONS.totalSourcingProjects} />
                    <div className="text-[10px] uppercase text-[#5A6180] tracking-wide">Total Number of Sourcing Events <span className="normal-case ">(Includes non-completed events)</span></div>
                    <div className="text-2xl font-bold text-[#0F1733]">{data.Total_Sourcing_Projects}</div>
                    <div className="text-[11px] text-[#5A6180]">{data.Total_Sourcing_Projects_text || ''}</div>
                  </div>
                </div>
              </div>
              {/* <div className="bg-white border border-[#E4E7F1] rounded-lg overflow-hidden">
                <div className="h-1 border-t-4 border-t-[#4A3DC7]"></div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-wider text-[#16A34A] font-bold mb-3">Sourcing</div>
                  
                  <div>
                    <div className="text-[10px] uppercase text-[#5A6180] tracking-wide">Total Number of Sourcing Events</div>
                    <div className="text-2xl font-bold text-[#0F1733]">{data.Total_Sourcing_Projects}</div>
                    <div className="text-[11px] text-[#5A6180]">{data.Total_Sourcing_Projects_text || ''}</div>
                  </div>
                </div>
              </div> */}
            </div>
          </div>

          {/* Section 3 · Coupa Pay Performance */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 pb-1.5 border-b-2 border-[#E4E7F1]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5A6180]">Section 3 · Coupa Pay Performance</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Coupa Pay data is now available and has been merged.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-white border border-[#E4E7F1] rounded-lg p-4 border-t-4 border-t-[#4A3DC7]">
                <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">Spend Thru Coupa Pay</div>
                <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.Spend_Thru_Coupa_Pay)}</div>
                <div className="text-[10px] text-[#5A6180] mt-1">{data.Spend_Thru_Coupa_Pay_text || 'TTM'}</div>
              </div>
              <div className="bg-white border border-[#E4E7F1] rounded-lg p-4 border-t-4 border-t-[#4A3DC7] md:col-span-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">PO Volume</div>
                    <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.VCard_On_PO_Volume)}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">{data.VCard_On_PO_Volume_text || ''}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Invoice Volume</div>
                    <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.VCard_On_Invoice_Volume)}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">{data.VCard_On_Invoice_Volume_text || ''}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Virtual Card Volume</div>
                    <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.VCard_Volume)}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">{data.VCard_Volume_text || ''}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E4E7F1] rounded-lg p-4 border-t-4 border-t-[#4A3DC7]">
                <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">EPD Rebates</div>
                <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.EPD_Rebates)}</div>
                <div className="text-[10px] text-[#5A6180] mt-1">{data.EPD_Rebates_text || 'TTM'}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white border border-[#E4E7F1] rounded-lg p-4 border-t-4 border-t-[#4A3DC7]">
                <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">Early Pay Discounts Captured</div>
                <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.Early_Pay_Discounts_Captured)}</div>
                <div className="text-[10px] text-[#5A6180] mt-1">
                  {data.Early_Pay_Discounts_Captured_text && data.Early_Pay_Discounts_Captured_text !== ' — '
                    ? data.Early_Pay_Discounts_Captured_text
                    : `${formatPercent1(data.Early_Pay_Discounts_Captured_pct_of_invoice_volume)} of invoice volume`}
                </div>
              </div>
              <div className="bg-white border border-[#E4E7F1] rounded-lg p-4 border-t-4 border-t-[#4A3DC7]">
                <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">Digital Payment Volume</div>
                <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.Digital_Payment_Volume)}</div>
                <div className="text-[10px] text-[#5A6180] mt-1">
                  {data.Digital_Payment_Volume_text && data.Digital_Payment_Volume_text !== ' — '
                    ? data.Digital_Payment_Volume_text
                    : `${formatPercent1(data.Digital_Payment_Volume_pct_of_invoice_volume)} of invoice volume`}
                </div>
              </div>
              <div className="bg-white border border-[#E4E7F1] rounded-lg p-4 border-t-4 border-t-[#4A3DC7]">
                <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">Estimated Rebate Opportunity</div>
                <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrencyRange(data.estimated_rebate_oppurtunity)}</div>
                <div className="text-[10px] text-[#5A6180] mt-1">{data.estimated_rebate_oppurtunity_text || ''}</div>
              </div>
              <div className="bg-white border border-[#E4E7F1] rounded-lg p-4 border-t-4 border-t-[#4A3DC7] md:col-span-2">
                <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-2">Revenue Share by Payment Channel</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Virtual Card</div>
                    <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.VCard_Revenue_Share)}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">{formatPercent1(data.VCard_Volume_pct_of_revenue_share)} of rev. share</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Digital Payment</div>
                    <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.Digital_Payment_Revenue_Share)}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">{formatPercent1(data.Digital_Payment_Volume_pct_of_revenue_share)} of rev. share</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#5A6180] font-semibold mb-1">Early Pay Discounts</div>
                    <div className="text-lg font-bold text-[#4A3DC7]">{formatCurrency(data.EPD_Revenue_Share)}</div>
                    <div className="text-[10px] text-[#5A6180] mt-0.5">{formatPercent1(data.Early_Pay_Discounts_Captured_pct_of_revenue_share)} of rev. share</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Pay strategy callout */}
            {/* <div className="p-4 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg">
              <div className="text-xs font-bold text-[#0F1733] mb-1">Pay strategy talking points for AE/CFO conversation</div>
              <div className="text-xs text-[#5A6180]">
                VCard spend is strong at {formatCurrency(data.VCard_Volume)} TTM. However, the EPD module is underutilized with only {formatCurrency(data.EPD_Rebates)} in rebates captured against a significant NET 60 invoice volume. This represents a major opportunity for working capital improvement and savings.
              </div>
            </div> */}
          </div>

          {/* Section 4 · Value Realized */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 pb-1.5 border-b-2 border-[#E4E7F1]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5A6180]">Section 4 · Value Realized</h3>
            </div>

            <h4 className="text-sm font-bold text-[#0F1733] mb-1">Value Decomposition — Conversation-Ready Detail</h4>
            <p className="text-xs text-[#5A6180] mb-3">Standardized value drivers mapped to Coupa solutions and products.</p>

            <p className="text-lg font-bold text-[#4A3DC7] mb-4">
              Total Value Realized: {formatCurrency(
                (typeof data.Generate_Rebates_through_Card_Payments === 'number' ? data.Generate_Rebates_through_Card_Payments : 0) +
                (typeof data.Reduce_Invoice_Processing_Costs === 'number' ? data.Reduce_Invoice_Processing_Costs : 0) +
                (typeof data.Savings_Generated_with_Early_Payment_Discounts === 'number' ? data.Savings_Generated_with_Early_Payment_Discounts : 0) +
                (typeof data['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Smart_Intake_and_Orchestration'] === 'number' ? data['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Smart_Intake_and_Orchestration'] : 0) +
                (typeof data['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Core_Procurement'] === 'number' ? data['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Core_Procurement'] : 0) +
                (typeof data.Increase_Spend_On_Contract_Through_More_Sourcing_Activities === 'number' ? data.Increase_Spend_On_Contract_Through_More_Sourcing_Activities : 0) +
                (typeof data.Total_Sourcing_Savings === 'number' ? data.Total_Sourcing_Savings : 0)
              )}
            </p>

            <div className="bg-white border border-[#E4E7F1] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F6F7FB] border-b border-[#E4E7F1]">
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wide text-[#5A6180] font-bold">T1-Solution</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wide text-[#5A6180] font-bold">Value Driver</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wide text-[#5A6180] font-bold">T2-Products</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wide text-[#5A6180] font-bold">Value</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wide text-[#5A6180] font-bold">Calculation Logic</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wide text-[#5A6180] font-bold">Benchmark</th>
                  </tr>
                </thead>
                <tbody>
                  {/* AP Automation */}
                  <tr className="border-b border-[#E4E7F1]">
                    <td rowSpan={4} className="px-3 py-2.5 font-semibold text-[#0F1733] align-top border-r border-[#E4E7F1]">AP Automation</td>
                    <td className="px-3 py-2.5 text-[#0F1733]">Generate Rebates through Card Payments</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Virtual Cards</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{formatCurrency(data.Generate_Rebates_through_Card_Payments)}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">sum(Vcard transactions) × 0.02</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]"></td>
                  </tr>
                  <tr className="border-b border-[#E4E7F1]">
                    <td className="px-3 py-2.5 text-[#0F1733]">Reduce Invoice Processing Costs</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">InvoiceSmash / Invoicing</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{formatCurrency(data.Reduce_Invoice_Processing_Costs)}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">Sum(invoice savings)</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]"></td>
                  </tr>
                  <tr className="border-b border-[#E4E7F1]">
                    <td className="px-3 py-2.5 text-[#0F1733]">Reduce Time & Effort to process invoices</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Invoice Smash / Invoicing / Rossum</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{formatDayReduction(data.Reduce_Time_and_Effort_to_process_invoices)}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">Benchmark Cycle Time − Current Year invoice cycle time</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">18.3 days from ingestion to processed</td>
                  </tr>
                  <tr className="border-b border-[#E4E7F1]">
                    <td className="px-3 py-2.5 text-[#0F1733]">Savings Generated with Early Payment Discounts</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Early Pay Discounts</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{formatCurrency(data.Savings_Generated_with_Early_Payment_Discounts)}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">sum(invoiced paid where EPD flagged/captured)</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]"></td>
                  </tr>

                  {/* Platform */}
                  {(() => { const isNA1 = parseNumericValue(data['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Smart_Intake_and_Orchestration']) == null; return (
                  <tr className={`border-b border-[#E4E7F1] ${isNA1 ? 'opacity-40' : ''}`}>
                    <td rowSpan={2} className="px-3 py-2.5 font-semibold text-[#0F1733] align-top border-r border-[#E4E7F1]">Platform</td>
                    <td className="px-3 py-2.5 text-[#0F1733]">Increase Savings Capture Rate by improving On-Contract Spend</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Smart Intake & Orchestration</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{formatCurrency(data['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Smart_Intake_and_Orchestration'])}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">(PO Spend × On-Contract% − 20%) × 0.04 + (PO Spend × Off-Contracts% − 20%) × 0.04 × 0.15</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">20% spend on contract</td>
                  </tr>); })()} 
                  {(() => { const isNA2 = !data.PO_Processing_Efficiency_smart_intake_and_orchestration; return (
                  <tr className={`border-b border-[#E4E7F1] ${isNA2 ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2.5 text-[#0F1733]">PO Processing Efficiency</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Smart Intake & Orchestration</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{formatDayReduction(data.PO_Processing_Efficiency_smart_intake_and_orchestration)}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">Benchmark Cycletime − CY Requisition Cycle Time</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">6−7 business days</td>
                  </tr>); })()}

                  {/* Procure to Pay */}
                  <tr className="border-b border-[#E4E7F1]">
                    <td rowSpan={2} className="px-3 py-2.5 font-semibold text-[#0F1733] align-top border-r border-[#E4E7F1]">Procure to Pay</td>
                    <td className="px-3 py-2.5 text-[#0F1733]">Increase Savings Capture Rate by improving On-Contract Spend</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Core Procurement</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{formatCurrency(data['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Core_Procurement'])}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">{data['Increase_Savings_Capture_Rate_by_improving_On-Contract_Spend_Core_Procurement_formula']}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">20% spend on contract</td>
                  </tr>
                  {(() => { const isNA = !data.PO_Processing_Efficiency_Core_Procurement; return (
                  <tr className={`border-b border-[#E4E7F1] ${isNA ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2.5 text-[#0F1733]">PO Processing Efficiency</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Core Procurement</td>
                   <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{formatDayReduction(data.PO_Processing_Efficiency_Core_Procurement)}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">Benchmark Cycle time − CY Requisition Cycle Time</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">6−7 business days</td>
                  </tr>); })()}

                  {/* Strategic Sourcing */}
                  {(() => { const isNA = data.Increase_Spend_On_Contract_Through_More_Sourcing_Activities === 'NA' || data.Increase_Spend_On_Contract_Through_More_Sourcing_Activities == null; return (
                  <tr className={`border-b border-[#E4E7F1] ${isNA ? 'opacity-40' : ''}`}>
                    <td rowSpan={2} className="px-3 py-2.5 font-semibold text-[#0F1733] align-top border-r border-[#E4E7F1]">Strategic Sourcing</td>
                    <td className="px-3 py-2.5 text-[#0F1733]">Increase Spend On Contract Through More Sourcing Activities</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Coupa Sourcing / Coupa Sourcing Optimization</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{isNA ? ' — ' : formatCurrency(data.Increase_Spend_On_Contract_Through_More_Sourcing_Activities)}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">(current year sourced spend % − benchmark sourced spend%) × sourced spend × 0.04%</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">15% of spend sourced annually</td>
                  </tr>); })()} 
                  {(() => { const isNA = data.Total_Sourcing_Savings === 'NA' || data.Total_Sourcing_Savings == null; return (
                  <tr className={`border-b border-[#E4E7F1] ${isNA ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2.5 text-[#0F1733]">Total Sourcing Savings</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Coupa Sourcing / Coupa Sourcing Optimization</td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733]">{isNA ? ' — ' : formatCurrency(data.Total_Sourcing_Savings)}</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">Current year sourced spend × 0.04%</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]"></td>
                  </tr>); })()}

                  {/* Supplier Information & Risk Management */}
                  <tr className="border-b border-[#E4E7F1] last:border-b-0 opacity-40">
                    <td className="px-3 py-2.5 font-semibold text-[#0F1733] align-top border-r border-[#E4E7F1]">Supplier Information & Risk Management</td>
                    <td className="px-3 py-2.5 text-[#0F1733]">Reduce time to manage supplier information</td>
                    <td className="px-3 py-2.5 text-[#5A6180]">Risk Assess (RPMA) / Risk Aware (RPM)</td>
                    <td className="px-3 py-2.5 font-semibold text-[#5A6180]"> — </td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">CY Onboarded suppliers × (Benchmark onboard cycle time − CY onboard cycle time in weeks)</td>
                    <td className="px-3 py-2.5 text-[#5A6180] text-[11px]">15−35 business days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </TabLoader>
  );
};

export default SnapshotTab;
