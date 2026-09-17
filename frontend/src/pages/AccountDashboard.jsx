import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
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
    label: 'AI Agents',
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

const AccountDashboardInner = ({ accountName, clientName, displayName }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [heroData, setHeroData] = useState(null);
  const [heroLoading, setHeroLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloadingPpt, setDownloadingPpt] = useState(false);
  const [helpGuideOpen, setHelpGuideOpen] = useState(false);
  const { loadAllTabs, refreshAll, setExternalTabData } = useDashboard();


  useEffect(() => {
    loadAllTabs();
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(() => {
    refreshAll();
    // Re-fetch hero
    setHeroData(null);
    setHeroLoading(true);
    // Bump key to force re-mount all tabs & re-trigger loadAllTabs
    setRefreshKey(k => k + 1);
  }, [refreshAll, clientName]);

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
    setActiveTab(tabId);
  };

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
    snapshot: <SnapshotTab accountName={accountName} clientName={clientName} />,
    portfolio: <PortfolioTab accountName={accountName} clientName={clientName} />,
    aiagents: <AIAgentsTab accountName={accountName} clientName={clientName} />,
    usage: <UsageTab accountName={accountName} clientName={clientName} />,
    whitespace: <WhitespaceTab accountName={accountName} />,
    ubp: <UBPTab accountName={accountName} />,
    plan: <ActionPlanTab accountName={accountName} />,
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
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
            <h2 className="text-xl font-bold text-[#0F1733]">Deep Dive</h2>
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

              {/* <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0369A1] bg-[#0369A1]/10 rounded-lg hover:bg-[#0369A1]/20 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button> */}
            </div>
          </div>

          <div className="flex gap-1 mb-5 border-b border-[#E4E7F1] overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-semibold text-sm whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'text-[#0369A1] border-[#0369A1]'
                    : 'text-[#5A6180] border-transparent hover:text-[#0369A1]'
                }`}
              >
                {tab.label}
                <InfoTooltip text={tab.description} />
              </button>
            ))}
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
    <DashboardProvider accountName={clientInfo.accountName} clientName={clientInfo.clientName}>
      <AccountDashboardInner
        accountName={clientInfo.accountName}
        clientName={clientInfo.clientName}
        displayName={clientInfo.clientName}
      />
    </DashboardProvider>
  );
};

export default AccountDashboard;
