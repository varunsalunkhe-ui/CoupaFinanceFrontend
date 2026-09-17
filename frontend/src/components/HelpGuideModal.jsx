import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const TAB_GUIDES = [
  {
    title: 'Executive Summary',
    body: 'A one-page account health overview providing details on — relationship health, Customer Value Management rating, key concerns, adoption wins, and top expansion priorities. The content is AI-generated from the underlying data, reflecting what is happening in the account, not a manual narrative. Use this to align with your manager on account strategy before a customer meeting.',
  },
  {
    title: 'Value Snapshot',
    body: 'The dollar value the customer is realizing from each product, calculated from platform volumes — invoice spend, sourcing savings, and payment rebates. At the bottom of the tab is a value realization calculation that shows the estimated value the customer is getting relative to what they are paying. Use this to speak about business impact or to build the case for a Usage Based Pricing (UBP) conversion.',
  },
  {
    title: 'Product Portfolio',
    body: 'A full picture of every product the customer owns, color-coded by adoption and health. The tab is divided into three sections:',
    list: [
      { text: 'Products that are healthy and in active use (', highlight: 'green', highlightColor: 'text-[#059669]' },
      { text: 'Products that are owned but underused or at risk (', highlight: 'yellow/red', highlightColor: 'text-[#D97706]' },
      { text: 'Products not yet owned — your expansion and upsell opportunities.', highlight: null },
    ],
    footnote: 'Use this to decide where to focus: Is this a save play or a growth play?',
  },
  {
    title: 'AI Agents',
    body: "Coupa's full AI agent catalog to the agents relevant to a customer, based on the products they own can be found here. Each agent card shows the agent's name, product alignment, rollout stage, and whether the customer has access. Use this tab when positioning Compose, AI-first packages, any conversation about expanding AI adoption at the account or using the Download Report button to download a snapshot of the tab with all details, which can be shared offline as an HTML file that can be viewed in a web browser.",
  },
  {
    title: 'Usage Over Time',
    body: "A trend-based tab designed to show key platform metrics. Use this tab to analyze how these metrics have changed over time — monthly and yearly, across the customer's products.",
  },
  {
    title: 'Whitespace & Risks',
    body: 'Expansion opportunities and risk signals displayed side by side. Opportunities come from open Salesforce deals and product whitespace analysis; risks come from adoption gaps, low usage patterns, and renewal signals. This tab is AI-generated and is currently in early development — treat the output as directional and a useful starting point for conversation, not a final playbook.',
  },
  {
    title: 'UBP Conversion',
    body: 'A directional calculation showing what a usage-based pricing conversion would look like. It places the customer into one of seven programs based on their spend tier and applies a basis point calculation to estimate the value of switching to UBP. Use this tab to get a suggested sales play, available promotions, Account Executive talk points, and objection handling.',
  },
  {
    title: 'Action Plan',
    body: "Recommended next steps for the rep, synthesized from everything the dashboard surfaces across the other eight tabs. The action plan is AI-generated and consolidates the key actions that come out of the account's health, whitespace, risk signals, and UBP opportunity. Use this tab as the bridge between the dashboard intelligence and your actual account execution plan.",
  },
];

const FAQ_SECTIONS = [
  {
    heading: 'Access & Performance',
    items: [
      {
        q: 'Who has access to the Account Intelligence Dashboard?',
        a: 'Access is provided to a select group of Customer Value Management team members and Account Executives, with plans to open access to all Executive Sponsor account owners in future updates.',
      },
      {
        q: 'Do I need to learn a new system or install anything?',
        a: 'No. The dashboard runs in your browser - there is nothing to install and no new software to learn. If you can access it via the URL your team shares, you are ready to go.',
      },
      {
        q: 'Why does the dashboard take a few minutes to load?',
        a: 'The dashboard pulls from an AI agent that processes account data across multiple sources in real time. Initial load typically takes 2-3 minutes for a full account.',
      },
    ],
  },
  {
    heading: 'Data and Permissions',
    items: [
      {
        q: "Will I see data for accounts I'm not supposed to see?",
        a: 'Currently, you will be able to access all the accounts integrated with the Account Intelligence Dashboard.',
      },
      {
        q: 'Can the dashboard edit Salesforce, C360, or any other system data?',
        a: 'No. The dashboard is read-only. It pulls data from your source systems and displays it in a structured, AI-enriched view — but it cannot update, edit, or write back to any connected system.',
      },
      {
        q: 'What should I do if a tab shows an error or does not load?',
        a: 'For any error that is encountered, when a tab is being loaded, it is suggested to reload the page to resolve the issue.',
      },
    ],
  },
  {
    heading: 'Support, Feedback & Roadmap',
    items: [
      {
        q: 'Who do I contact if something is not working on the dashboard?',
        a: "Please report any issues or bugs you're experiencing to #project-harvest-help on Slack.",
      },
      {
        q: 'How do I give feedback on the Account Intelligence Dashboard?',
        a: 'You can also reach out to #project-harvest-help on Slack. The team will review your feedback - your input and ideas directly influence what gets built next.',
      },
      {
        q: 'Will the Account Intelligence Dashboard keep improving?',
        a: 'Yes. The current release is the scalable foundation — it covers the core eight tabs and supports approximately 168 accounts. Scalability and improvements are planned for future updates.',
      },
      {
        q: 'Are there plans to integrate the dashboard with other tools, like Salesforce or email?',
        a: 'No. The current version is a standalone web application that reads from backend data sources — it does not embed into Salesforce, send email notifications, or integrate with Slack or calendar tools. These types of integrations are being considered for future updates, though they are not currently confirmed for the immediate roadmap.',
      },
    ],
  },
];

const HelpGuideModal = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 bg-[#0F1733] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0369A1]">
              <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Help Center & FAQ Guide</h2>
              <p className="text-xs text-[#94A3B8]">Account Intelligence Dashboard • Project Harvest User Manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-full p-1 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="custom-scrollbar overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Secure Single Sign-On (Okta SSO)
            </p>
            <p className="mt-1 text-sm text-[#1E3A8A]">
              Login is managed strictly via corporate Okta SSO authentication. Google credentials or manual passwords are not requested.
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-[#E4E7F1] bg-[#F8FAFC] p-4">
            <div>
              <p className="text-sm font-semibold text-[#0F1733]">Questions or feedback?</p>
              <p className="mt-1 text-sm text-[#5A6180]">Send them in our team Slack channel anytime.</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1D4ED8]">
              #project-harvest-help
            </span>
          </div>

          <h3 className="mt-6 mb-2 text-lg font-bold text-[#0F1733]">About Project Harvest</h3>
          <p className="text-sm leading-relaxed text-[#5A6180]">
            Project Harvest is Coupa's AI initiative built to give CVM reps and Account Executives a faster, smarter way to understand customer value and prepare for conversations — without spending hours manually pulling together data from Customer 360, Salesforce, CVR dashboards, and product usage files.
          </p>

          <h3 className="mt-6 mb-3 text-lg font-bold text-[#0F1733]">Dashboard Tabs & Analytics Overviews</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TAB_GUIDES.map((tab) => (
              <div key={tab.title} className="rounded-lg border border-[#E4E7F1] bg-[#F8FAFC] p-4">
                <p className="text-sm font-bold text-[#0F1733]">{tab.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5A6180]">{tab.body}</p>
                {tab.list && (
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#5A6180]">
                    {tab.list.map((item) => (
                      <li key={item.text}>
                        {item.text}
                        {item.highlight && <span className={`font-semibold ${item.highlightColor}`}>{item.highlight}</span>}
                        {item.highlight && ')'}
                      </li>
                    ))}
                  </ul>
                )}
                {tab.footnote && (
                  <p className="mt-1.5 text-xs italic leading-relaxed text-[#5A6180]">{tab.footnote}</p>
                )}
              </div>
            ))}
          </div>

          <h3 className="mt-6 mb-3 text-lg font-bold text-[#0F1733]">Frequently Asked Questions (FAQ)</h3>
          <div className="space-y-5">
            {FAQ_SECTIONS.map((section) => (
              <div key={section.heading}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#94A3B8]">{section.heading}</p>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.q} className="border-b border-[#E4E7F1] pb-3 last:border-b-0">
                      <p className="text-sm font-semibold text-[#0F1733]">{item.q}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#5A6180]">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HelpGuideModal;
