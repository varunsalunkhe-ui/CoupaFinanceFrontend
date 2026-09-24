import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import HeroSection from './caseys/HeroSection';
import SummaryTab from './caseys/tabs/SummaryTab';
import SnapshotTab from './caseys/tabs/SnapshotTab';
import PortfolioTab from './caseys/tabs/PortfolioTab';
import AIAgentsTab from './caseys/tabs/AIAgentsTab';
import UsageTab from './caseys/tabs/UsageTab';
import WhitespaceTab from './caseys/tabs/WhitespaceTab';
import UBPTab from './caseys/tabs/UBPTab';
import ActionPlanTab from './caseys/tabs/ActionPlanTab';
import { DashboardProvider, useDashboard } from '../context/DashboardContext';
import { fetchSection, transformHeroData } from '../services/bigqueryApi';
import { fetchClients, findClientBySlug } from '../services/clientsApi';
import InfoTooltip from '../components/InfoTooltip';
import HelpGuideModal from '../components/HelpGuideModal';
import AgentLoadingOverlay from '../components/AgentLoadingOverlay';
import { buildFullDashboardReportHtml, downloadHtmlFile } from '../services/dashboardReportBuilder';

const ENTRY_OVERLAY_DURATION_MS = 8500;

const TABS = [
  {
    id: 'summary',
    label: 'Executive Summary',
    description: 'A one-page account health overview providing details on — relationship health, Customer Value Management rating, key concerns, adoption wins, and top expansion priorities. The content is AI-generated from the underlying data, reflecting what is happening in the account, not a manual narrative. Use this to align with your manager on account strategy before a customer meeting.',
  },
  {
    id: 'snapshot',
    label: 'Value Snapshot',
    description: 'The dollar value the customer is realizing from each product, calculated from platform volumes — invoice spend, sourcing savings, and payment rebates. At the bottom of the tab is a value realization calculation that shows the estimated value the customer is getting relative to what they are paying. Use this to speak about business impact or to build the case for a Usage Based Pricing (UBP) conversion.',
  },
  {
    id: 'portfolio',
    label: 'Product Portfolio',
    description: "A full picture of every product the customer owns, color-coded by adoption and health. Divided into: healthy/active use (green), owned but underused/at risk (yellow/red), and unowned expansion opportunities. Use this to decide where to focus: Is this a save play or a growth play?",
  },
  {
    id: 'aiagents',
    label: 'Navi Agents & GenAI Features',
    description: "Coupa's full AI agent catalog to the agents relevant to a customer, based on the products they own can be found here. Each card shows the agent's name, product alignment, rollout stage, and access status. Use this tab when positioning Compose, AI-first packages, or downloading an offline report.",
  },
  {
    id: 'usage',
    label: 'Usage Over Time',
    description: "A trend-based tab designed to show key platform metrics. Use this tab to analyze how these metrics have changed over time — monthly and yearly, across the customer's products.",
  },
  {
    id: 'whitespace',
    label: 'Whitespace & Risks',
    description: 'Expansion opportunities and risk signals displayed side by side. Opportunities come from open Salesforce deals and whitespace analysis; risks come from adoption gaps, low usage, and renewal signals. Treat output as directional.',
  },
  {
    id: 'ubp',
    label: 'UBP Conversion',
    description: 'A directional calculation showing what a usage-based pricing conversion would look like. Places the customer into one of seven programs based on spend tier and applies a basis point calculation to estimate switching value.',
  },
  {
    id: 'plan',
    label: 'Action Plan',
    description: 'Recommended next steps for the rep, synthesized from everything the dashboard surfaces across the other eight tabs. AI-generated bridge between dashboard intelligence and your actual account execution plan.',
  },
];


const PPT_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const AccountDashboardInner = ({ accountId, accountName, clientName, displayName, ubpRun }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [heroData, setHeroData] = useState(null);
  const [heroLoading, setHeroLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloadingPpt, setDownloadingPpt] = useState(false);
  const [helpGuideOpen, setHelpGuideOpen] = useState(false);
  const { tabData, externalData, loadAllTabs, refreshAll, setExternalTabData, refreshing } = useDashboard();
  const [showEntryOverlay, setShowEntryOverlay] = useState(true);
  const updateClickLockRef = useRef(false);


  useEffect(() => {
    loadAllTabs();
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setShowEntryOverlay(true);
    const timer = setTimeout(() => setShowEntryOverlay(false), ENTRY_OVERLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  // Release the click-lock once the context reports the refresh has settled,
  // so a stray rapid double-click can't queue a second overlapping refresh.
  useEffect(() => {
    if (!refreshing) updateClickLockRef.current = false;
  }, [refreshing]);

  const handleUpdateData = useCallback(() => {
    if (updateClickLockRef.current || refreshing) return; // prevent duplicate refresh requests
    updateClickLockRef.current = true;
    refreshAll();
    // Re-fetch hero
    setHeroData(null);
    setHeroLoading(true);
    // Bump key to force re-mount all tabs & re-trigger loadAllTabs
    setRefreshKey(k => k + 1);
  }, [refreshAll, refreshing]);

  const handleDownloadPpt = useCallback(async () => {
    setDownloadingPpt(true);
    try {
      const response = await fetch(
        `${PPT_API_BASE}/generate-ppt/${encodeURIComponent(clientName)}?user_id=default-user`,
        {
          method: 'POST',
          headers: { 'accept': 'application/octet-stream, application/json' },
        }
      );
      if (!response.ok) {
        throw new Error(`PPT generation failed (${response.status})`);
      }
      const contentType = response.headers.get('content-type') || '';
      const fileName = `${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_QBR.pptx`;

      if (contentType.includes('application/json')) {
        // API returned a JSON response with a download link
        const result = await response.json();
        if (result.download_url) {
          const link = document.createElement('a');
          link.href = result.download_url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (result.gcs_uri) {
          window.open(result.gcs_uri, '_blank');
        } else {
          throw new Error('No download link returned from API');
        }
      } else {
        // API streamed the .pptx binary directly
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[DownloadPPT] Error:', err);
      alert(`Failed to generate deck: ${err.message}`);
    } finally {
      setDownloadingPpt(false);
    }
  }, [clientName]);

  const handleTabClick = (tabId) => {
    if (tabId === 'ubp' && !ubpRun) return;
    setActiveTab(tabId);
  };

  const handleDownloadDashboard = useCallback(() => {
    const html = buildFullDashboardReportHtml({
      customerName: clientName,
      hero: heroData,
      summary: tabData.summary,
      snapshot: externalData.snapshot,
      portfolio: externalData.portfolio,
      aiAgents: externalData.aiAgents,
      usage: externalData.usage,
      whitespace: tabData.whitespace,
      ubp: tabData.ubp,
      plan: tabData.plan,
    });
    downloadHtmlFile(html, `Dashboard_Report_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}.html`);
  }, [clientName, heroData, tabData, externalData]);

  useEffect(() => {
    const isRefresh = refreshKey > 0;
    let cancelled = false;
    const loadHero = async () => {
      try {
         const raw = await fetchSection(clientName, 'hero', { noCache: true });
        if (!cancelled) {
          const transformed = transformHeroData(raw);
          setHeroData(transformed);
          setExternalTabData('hero', transformed);
        }
      } catch (err) {
        console.error('[Hero] API failed, using fallback:', err);
      } finally {
        if (!cancelled) setHeroLoading(false);
      }
    };
    loadHero();
    return () => { cancelled = true; };
  }, [clientName, refreshKey]);

  const tabComponents = {
    summary: <SummaryTab accountName={accountName} />,
    snapshot: <SnapshotTab accountName={accountName} clientName={clientName} forceRefresh={refreshKey > 0} />,
    portfolio: <PortfolioTab accountName={accountName} clientName={clientName} forceRefresh={refreshKey > 0} />,
    aiagents: <AIAgentsTab accountName={accountName} clientName={clientName} forceRefresh={refreshKey > 0} />,
    usage: <UsageTab accountName={accountName} clientName={clientName} forceRefresh={refreshKey > 0} />,
    whitespace: <WhitespaceTab accountName={accountName} />,
    ubp: <UBPTab accountName={accountName} />,
    plan: <ActionPlanTab accountName={accountName} />,
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <AgentLoadingOverlay visible={showEntryOverlay} accountName={displayName} />
      <header className="bg-white text-[#1E293B] px-6 py-3 flex items-center justify-between shadow-sm border-b border-gray-200/60">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <img src="/coupa.jpg" alt="Coupa" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-lg font-bold text-[#1E293B]">Coupa Finance</span>
        </Link>
        <nav className="flex gap-4 text-sm items-center">
          <Link to="/" className="text-[#64748B] no-underline hover:text-[#0369A1] font-medium transition-colors">Home</Link>
          <button
            onClick={() => setHelpGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0369A1] bg-[#0369A1]/10 rounded-lg hover:bg-[#0369A1]/20 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Help & FAQ Guide
          </button>
          <span className="text-[#0369A1] font-semibold">{displayName}</span>
        </nav>
      </header>
      <HelpGuideModal open={helpGuideOpen} onClose={() => setHelpGuideOpen(false)} />

      <div className="max-w-[1400px] mx-auto p-6">
        {heroLoading ? (
          <div className="bg-gradient-to-br from-[#0369A1] via-[#075985] to-[#0C4A6E] rounded-2xl p-8 mb-6 animate-pulse h-48" />
        ) : heroData ? (
          <HeroSection data={heroData} />
        ) : null}

        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-4 pb-2 border-b-2 border-[#E4E7F1]">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#0F1733]">Deep Dive</h2>
              <div className="relative group">
                <button
                  onClick={handleDownloadDashboard}
                  aria-label="Download HTML"
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-[#0369A1] bg-[#0369A1]/10 hover:bg-[#0369A1]/20 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                  </svg>
                </button>
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded-md bg-[#0F1733] px-2.5 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  Download HTML
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPpt}
                disabled={downloadingPpt}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0369A1] bg-[#0369A1]/10 rounded-lg hover:bg-[#0369A1]/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {downloadingPpt ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                  </svg>
                )}
                {downloadingPpt ? 'Generating...' : 'Download Deck'}
              </button>

              <button
                onClick={() => window.open('https://vertexaisearch.cloud.google.com/us/home/cid/e0f17eb4-7f71-46db-9249-ea739ee10e2f/r/agent/8365950098131666619/session/-?hl=en_US&_gl=1*ua8eue*_ga*MTE1MDk5MjkzMS4xNzc5MTE2Nzg2*_ga_WH2QY8WWF5*czE3ODY5NDk5MzkkbzI4OCRnMSR0MTc4Njk1MDAxNiRqNDUkbDAkaDA', '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0369A1] bg-[#0369A1]/10 rounded-lg hover:bg-[#0369A1]/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h6v6m0 0L9 21l-4-4L19 3z" />
                </svg>
                GTM Sales Buddy
              </button>

              <button
                onClick={() => navigate(`/${accountId}/files`, { state: { accountName, clientName } })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0369A1] bg-[#0369A1]/10 rounded-lg hover:bg-[#0369A1]/20 transition-colors cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Upload Document
              </button>

              <button
                onClick={handleUpdateData}
                disabled={refreshing}
                title="Bypass cache and fetch the latest data for this account"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0369A1] bg-[#0369A1]/10 rounded-lg hover:bg-[#0369A1]/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {refreshing ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {refreshing ? 'Updating...' : 'Update Data'}
              </button>
            </div>
          </div>

          <div className="flex gap-1 mb-5 border-b border-[#E4E7F1] overflow-x-auto">
           {TABS.map((tab) => {
              const isDisabledUbp = tab.id === 'ubp' && !ubpRun;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  disabled={isDisabledUbp}
                  title={isDisabledUbp ? 'UBP conversion was not run for this account' : undefined}
                  className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-semibold text-sm whitespace-nowrap transition-all ${
                    isDisabledUbp
                      ? 'text-[#B0B7C3] border-transparent cursor-not-allowed opacity-60'
                      : activeTab === tab.id
                        ? 'text-[#0369A1] border-[#0369A1] cursor-pointer'
                        : 'text-[#5A6180] border-transparent hover:text-[#0369A1] cursor-pointer'
                  }`}
                >
                  {tab.label}
                  <InfoTooltip text={isDisabledUbp ? 'UBP conversion was not run for this account.' : tab.description} />
                </button>
              );
            })}
          </div>

          <div key={refreshKey}>
            {TABS.map((tab) => (
              <div key={tab.id} style={{ display: activeTab === tab.id ? 'block' : 'none' }}>
                {tabComponents[tab.id]}
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-10 pt-6 border-t border-[#E4E7F1] text-center text-xs text-[#5A6180]">
          <p><strong>Data sources</strong>: Data sourced from Coupa Customer 360 (May 6, 2026), CVR Dashboards (Apr 22, 2026), FY27 Account Plan, and Coupa Community Intelligence benchmarks. All data is TTM unless otherwise noted. Pricing is directional.</p>  
          <p className="mt-2">Generated by the Coupa AI-Driven Knowledge (ADK) Agent for the {displayName} Virtual Account Team. </p>
        </footer>
      </div>
    </div>
  );
};

const AccountDashboard = () => {
  const { accountId } = useParams();
  const location = useLocation();
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      // Try to get from navigation state first
      if (location.state?.accountName && location.state?.clientName) {
        setClientInfo({
          accountName: location.state.accountName,
          clientName: location.state.clientName,
           ubpRun: location.state.ubpRun !== false,
        });
        setLoading(false);
        return;
      }
      // Fallback: fetch from API for direct URL access
      try {
        const clients = await fetchClients();
        if (cancelled) return;
        const found = findClientBySlug(clients, accountId);
        if (found) {
          setClientInfo({
            accountName: found.account_name,
            clientName: found.account_name,
            ubpRun: found.ubp_run !== false,
          });
        }
      } catch (err) {
        console.error('[AccountDashboard] Failed to resolve client:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    resolve();
    return () => { cancelled = true; };
  }, [accountId, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <div className="text-[#5A6180]">Loading...</div>
      </div>
    );
  }

  if (!clientInfo) {
    return <div className="p-8 text-center text-red-500">Account not found</div>;
  }

  return (
     <DashboardProvider accountName={clientInfo.accountName} clientName={clientInfo.clientName} ubpEnabled={clientInfo.ubpRun}>
      <AccountDashboardInner
        accountId={accountId}
        accountName={clientInfo.accountName}
        clientName={clientInfo.clientName}
        displayName={clientInfo.clientName}
        ubpRun={clientInfo.ubpRun}
      />
    </DashboardProvider>
  );
};

export default AccountDashboard;
