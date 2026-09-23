import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchClients, toSlug } from '../services/clientsApi';
import { useAuth } from '../context/AuthContext.jsx';
import HelpGuideModal from '../components/HelpGuideModal';
import SearchableSelect from '../components/SearchableSelect';

const SERVICE_NOW_URL = 'https://deloitte.service-now.com';

const COLORS = ['#0369A1', '#0891B2', '#0D9488', '#059669', '#4F46E5', '#7C3AED'];

const getInitials = (name) => {
  return name
    .split(/\s+/)
    .filter((w) => w[0] && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
};

const formatAcv = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (Number.isNaN(num)) return null;
  const abs = Math.abs(num);
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
};

const HEAT_BADGE_STYLES = {
  successful: 'bg-emerald-100 text-emerald-700',
  healthy: 'bg-emerald-100 text-emerald-700',
  concerned: 'bg-amber-100 text-amber-700',
  'at risk': 'bg-red-100 text-red-700',
  terminating: 'bg-red-100 text-red-700',
};

const getHeatBadgeClass = (heat) => HEAT_BADGE_STYLES[(heat || '').toLowerCase()] || 'bg-gray-100 text-gray-600';

const Home = () => {
  const { logout } = useAuth();
  const userEmail = sessionStorage.getItem('userEmail') || '';
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState([]);
  const [cvmOwnerFilter, setCvmOwnerFilter] = useState([]);
  const [sponsorFilter, setSponsorFilter] = useState([]);
  const [helpGuideOpen, setHelpGuideOpen] = useState(false);
  const [accountHelpOpen, setAccountHelpOpen] = useState(false);
  const accountHelpRef = useRef(null);

  // Close the "Can't find your account?" popover on outside click
  useEffect(() => {
    if (!accountHelpOpen) return;
    const handleClickOutside = (e) => {
      if (accountHelpRef.current && !accountHelpRef.current.contains(e.target)) {
        setAccountHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountHelpOpen]);

  useEffect(() => {
    let cancelled = false;
    const loadClients = async () => {
      try {
        const clients = await fetchClients();
        if (cancelled) return;
        const mapped = clients.map((client, idx) => ({
          id: toSlug(client.account_name),
          key: `${toSlug(client.account_name)}-${client.SF_ACCT_ID || idx}`,
          name: client.account_name,
          accountName: client.account_name,
          initials: getInitials(client.account_name),
          color: COLORS[idx % COLORS.length],
          rating: client.cvm_customer_rating ?? null,
          heatLevel: client.customer_heat_level || null,
          acv: client.open_renewal_acv_converted_total ?? null,
          executiveSponsor: client.coupa_executive_sponsor_name || null,
          cvmOwner: client.cvm_owner || null,
          accountOwner: client.account_owner || null,
          ubpRun: client.ubp_run !== false,
        }));
        setAccounts(mapped);
      } catch (err) {
        if (!cancelled) setError('Failed to load accounts');
        console.error('[Home] Failed to fetch clients:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadClients();
    return () => { cancelled = true; };
  }, []);

  // Unique filter options derived from the loaded accounts
  const ownerOptions = useMemo(() => Array.from(new Set(accounts.map((a) => a.accountOwner).filter(Boolean))).sort(), [accounts]);
  const cvmOwnerOptions = useMemo(() => Array.from(new Set(accounts.map((a) => a.cvmOwner).filter(Boolean))).sort(), [accounts]);
  const sponsorOptions = useMemo(() => Array.from(new Set(accounts.map((a) => a.executiveSponsor).filter(Boolean))).sort(), [accounts]);

  // Filter accounts based on search + owner/CVM owner/sponsor filters (each supports multiple selections)
  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (query && !account.name.toLowerCase().includes(query)) return false;
      if (ownerFilter.length > 0 && !ownerFilter.includes(account.accountOwner)) return false;
      if (cvmOwnerFilter.length > 0 && !cvmOwnerFilter.includes(account.cvmOwner)) return false;
      if (sponsorFilter.length > 0 && !sponsorFilter.includes(account.executiveSponsor)) return false;
      return true;
    });
  }, [accounts, search, ownerFilter, cvmOwnerFilter, sponsorFilter]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/coupa.jpg" alt="Coupa" className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-[#0F172A] text-lg font-bold tracking-tight">Coupa Finance</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setHelpGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0369A1] bg-[#0369A1]/10 rounded-lg hover:bg-[#0369A1]/20 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              Help & FAQ Guide
            </button>
            {/* <div className="relative" ref={accountHelpRef}>
              <button
                onClick={() => setAccountHelpOpen((v) => !v)}
                aria-label="Can't find your account?"
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-[#0369A1] hover:bg-[#0369A1]/10 cursor-pointer transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 2-3 4M12 17h.01" />
                </svg>
              </button>
              {accountHelpOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl p-5 z-50">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01" />
                      </svg>
                      Can't find your account?
                    </h4>
                    <button onClick={() => setAccountHelpOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    This development environment currently contains a pre-selected subset of production accounts (~168 total in production, {accounts.length} loaded here in dev).
                  </p>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[11px] text-slate-400 mb-2">Need access to Nike, Puma, Microsoft or others?</p>
                    <a
                      href={SERVICE_NOW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm no-underline"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Request Access in ServiceNow
                    </a>
                  </div>
                </div>
              )}
            </div> */}
            <span className="text-sm text-[#64748B] hidden sm:inline">{userEmail}</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0369A1] to-[#0891B2] flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-[#64748B] hover:text-[#0369A1] px-3.5 py-2 rounded-lg hover:bg-[#0369A1]/5 cursor-pointer transition-all font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <HelpGuideModal open={helpGuideOpen} onClose={() => setHelpGuideOpen(false)} />

      {/* Subheader with title + search */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Accounts</h1>
            <p className="text-[13px] text-[#94A3B8] mt-0.5">Select a customer to open their value dashboard</p>
          </div>
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-[#F8FAFC] text-[#1E293B] text-sm placeholder-[#94A3B8] focus:outline-none focus:border-[#0369A1] focus:ring-2 focus:ring-[#0369A1]/10 focus:bg-white transition-all"
            />
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pb-5 flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-medium text-[#94A3B8]">Filter by:</span>
          <SearchableSelect
            label="Account Owner"
            values={ownerFilter}
            onChange={setOwnerFilter}
            options={ownerOptions}
            className="w-48"
          />
          <SearchableSelect
            label="CVM Owner"
            values={cvmOwnerFilter}
            onChange={setCvmOwnerFilter}
            options={cvmOwnerOptions}
            className="w-48"
          />
          <SearchableSelect
            label="Executive Sponsor"
            values={sponsorFilter}
            onChange={setSponsorFilter}
            options={sponsorOptions}
            className="w-48"
          />
          {(ownerFilter.length > 0 || cvmOwnerFilter.length > 0 || sponsorFilter.length > 0) && (
            <button
              onClick={() => { setOwnerFilter([]); setCvmOwnerFilter([]); setSponsorFilter([]); }}
              className="text-xs font-medium text-[#0369A1] hover:text-[#075985] cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-8">
        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-8 text-sm">
          <span className="text-[#64748B]">
            {loading ? (
              <span className="font-semibold text-[#0F172A]">Loading accounts...</span>
            ) : (
              <>
                <span className="font-semibold text-[#0F172A]">{filteredAccounts.length}</span> {filteredAccounts.length === 1 ? 'account' : 'accounts'}
              </>
            )}
          </span>
          {search && (
            <span className="text-[#94A3B8]">
              Showing results for "<span className="text-[#0369A1] font-medium">{search}</span>"
            </span>
          )}
        </div>

        {/* Account Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading && (
            <>
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mb-5" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </>
          )}
          {error && (
            <div className="col-span-full bg-red-50 text-red-600 text-sm py-8 px-6 rounded-2xl text-center border border-red-100">{error}</div>
          )}
          {!loading && !error && filteredAccounts.length === 0 && (
            <div className="col-span-full flex flex-col items-center text-center py-14 px-6">
              <div className="w-14 h-14 rounded-full bg-[#0369A1]/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-[#0369A1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#0F172A] mb-1.5">
                {search ? 'No matching accounts found' : 'No accounts available'}
              </h3>
              <p className="text-[13px] text-[#94A3B8] max-w-sm mb-6">
                {search
                  ? "We couldn't find any account in dev matching your search/filtering settings."
                  : 'No accounts are currently available for your user.'}
              </p>
              {/* <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl px-6 py-5 w-full max-w-sm">
                <p className="text-xs text-[#64748B] mb-3">Need to review a customer that isn't listed?</p>
                <a
                  href={SERVICE_NOW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm no-underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Request Account Access in ServiceNow
                </a>
              </div> */}
            </div>
          )}
          {filteredAccounts.map((account) => (
            <Link
              key={account.key}
              to={`/${account.id}`}
              state={{ accountName: account.accountName, clientName: account.name, ubpRun: account.ubpRun }}
              className="group bg-white rounded-2xl p-6 no-underline transition-all border border-gray-100 hover:border-[#0369A1]/25 hover:shadow-lg hover:shadow-[#0369A1]/[0.06] hover:-translate-y-0.5 flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-full bg-[#0369A1]/10 flex items-center justify-center text-[#0369A1] text-[13px] font-bold">
                  {account.initials}
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent group-hover:bg-[#0369A1]/5 transition-colors">
                  <svg
                    className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0369A1] transition-colors"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-[15px] font-semibold text-[#0F172A] group-hover:text-[#0369A1] transition-colors mb-1 leading-snug">
                {account.name}
              </h3>
              <p className="text-[12px] text-[#94A3B8]">Account Intelligence Dashboard</p>
              {formatAcv(account.acv) && (
                <p className="text-[13px] font-bold text-[#0369A1] mt-2">ACV: {formatAcv(account.acv)}</p>
              )}
              <div className="mt-auto pt-5">
                <div className="h-px bg-gray-100 mb-3" />
                <div className="flex items-center justify-between gap-2">
                  {account.heatLevel ? (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getHeatBadgeClass(account.heatLevel)}`}>
                      {account.heatLevel}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-[#94A3B8] font-medium">Active</span>
                    </span>
                  )}
                  {account.rating !== null && account.rating !== undefined && (
                    <span className="text-[11px] text-[#94A3B8]">Rating: <strong className="text-[#0F172A]">{account.rating}</strong></span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-8">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
          <span className="text-xs text-[#94A3B8]">&copy; 2026 Coupa Finance &middot; Enterprise Intelligence Platform</span>
          <span className="text-xs text-[#CBD5E1]">Powered by AI</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
