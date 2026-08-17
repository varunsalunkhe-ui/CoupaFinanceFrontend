import axios from 'axios';

const BQ_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetch a section from the BigQuery API.
 * @param {string} customerName - e.g. "Casey's General Stores Inc."
 * @param {string} section - e.g. "hero"
 * @param {object} [options] - Optional settings
 * @param {boolean} [options.noCache] 
 */
export const fetchSection = async (customerName, section, { noCache = false } = {}) => {
  const params = { customer_name: customerName, section };
  if (noCache) {
    params._t = Date.now();
  }
  const response = await axios.get(`${BQ_BASE_URL}/section`, {
    params,
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    timeout: 30000,
  });
  return response.data;
};

/**
 * Transform the BigQuery hero API response into the HeroSection component format.
 */
export const transformHeroData = (raw) => {
  const acv = raw.OPEN_RENEWAL_ACV_CONVERTED_TOTAL || 0;
  const acvFormatted = acv >= 1_000_000
    ? `$${(acv / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
    : `$${(acv / 1_000).toFixed(0)}K`;

  const priorAcv = raw.prior_acv || 0;
  const priorFormatted = priorAcv >= 1_000_000
    ? `$${(priorAcv / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
    : `$${(priorAcv / 1_000).toFixed(0)}K`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const p2pLicensed = raw.p2p_active_users_licensed || 0;
  const p2pActual = raw.p2p_active_users_actual || 0;
  const p2pPct = p2pLicensed > 0
    ? ((p2pActual / p2pLicensed) * 100).toFixed(1)
    : '0';

  const tags = [
    { text: `Heat Level: ${raw.CUSTOMER_HEAT_LEVEL || ' — '}`, color: raw.CUSTOMER_HEAT_LEVEL === 'Successful' ? 'success' : 'warning' },
    { text: `CVM Rating: ${raw.CVM_CUSTOMER_RATING || ' — '}`, color: 'success' },
  ];
  if (raw.spendsetter_of_the_year_award) {
    tags.push({ text: `Spendsetter of the Year ${raw.spendsetter_of_the_year_award}`, color: 'success' });
  }

  return {
    companyName: raw.SF_ACCT_NAME,
    subtext: raw.company_subtext,
    tags,
    openAcv: acvFormatted,
    contractTerm: `Contract term: ${formatDate(raw.CONTRACT_START_DATE)} – ${formatDate(raw.CONTRACT_END_DATE)}`,
    metaGrid: [
      { label: 'Go-Live', value: formatDate(raw.go_live) },
      { label: 'Primary ERP', value: raw.primary_erp || ' — ' },
      { label: 'CUSTOMER ADOPTION MANAGER', value: raw.CAM || ' — ' },
      { label: 'SUPPORT ACCOUNT MANAGER', value: raw.SAM || ' — ' },
      { label: 'P2P Active Users', value: `${p2pActual.toLocaleString()} / ${p2pLicensed.toLocaleString()} (${p2pPct}%)` },
      { label: 'Active Production Users', value: (raw.active_production_users || 0).toLocaleString() },
      { label: 'Exec Sponsor', value: raw.COUPA_EXECUTIVE_SPONSOR_NAME || ' — ' },
      { label: 'CVM Owner', value: raw.CVM_OWNER || ' — ' },
      { label: 'Account Owner', value: raw.ACCOUNT_OWNER || ' — ' },
      { label: 'Last Check-in', value: formatDate(raw.LAST_CUSTOMER_CHECKIN) },
      { label: 'Open Cases', value: String(raw.COUNT_OF_OPEN_CASES ?? 0) },
    ],
  };
};
