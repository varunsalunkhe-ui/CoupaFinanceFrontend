import React from 'react';
import { useTabFromContext } from '../../../context/DashboardContext';
import TabLoader from '../../../components/TabLoader';

const CARD_CONFIG = {
  relationshipHealth: {
    title: '✓ Relationship Health',
    titleColor: '#14532D',
    borderColor: '#0E9F6E',
  },
  concerns: {
    title: '⚠ Concerns',
    titleColor: '#991B1B',
    borderColor: '#DC2626',
  },
  valueDelivered: {
    title: '$ Value Delivered',
    titleColor: '#4A3DC7',
    borderColor: '#6353E9',
  },
  topExpansionPriorities: {
    title: '◆ Top Expansion Priorities',
    titleColor: '#92400E',
    borderColor: '#D97706',
  },
  adoptionWins: {
    title: '✓ Adoption Wins',
    titleColor: '#14532D',
    borderColor: '#0E9F6E',
  },
  benchmarkMethodology: {
    title: '⊙ Benchmarks & Methodology',
    titleColor: '#0E7490',
    borderColor: '#00A0DF',
  },
  accountObjectives: {
    title: '🎯 Account Objectives',
    titleColor: '#1E3A8A',
    borderColor: '#2563EB',
  },
  processPainPoints: {
    title: '⚠ Process Pain Points',
    titleColor: '#9A3412',
    borderColor: '#EA580C',
  },
  competitiveLandscape: {
    title: '⚔ Competitive Landscape',
    titleColor: '#075985',
    borderColor: '#0EA5E9',
  },
  additionalInsights: {
    title: '💡 Additional Insights',
    titleColor: '#3730A3',
    borderColor: '#6366F1',
  },
};

const SummaryTab = ({ accountName = 'caseys' }) => {
  const { data, loading, error, retry } = useTabFromContext('summary');

  // Some accounts have no data for these newer sections — backend returns null/empty; hide the card entirely rather than rendering it blank.
  const hasItems = (card) => card && Array.isArray(card.items) && card.items.length > 0;

  return (
    <TabLoader loading={loading} error={error} onRetry={retry} data={data}>
      {data && data.cards && (
        <div>
          <p className="text-sm text-[#5A6180] mb-4">
            AI-generated executive summary — powered by Coupa Intelligence Agent.
          </p>
          <div className="columns-1 lg:columns-2 gap-4">
            <div className="mb-4 break-inside-avoid"><RelationshipHealthCard data={data.cards.relationshipHealth} /></div>
            <div className="mb-4 break-inside-avoid"><ConcernsCard data={data.cards.concerns} /></div>
            <div className="mb-4 break-inside-avoid"><ValueDeliveredCard data={data.cards.valueDelivered} /></div>
            <div className="mb-4 break-inside-avoid"><ExpansionPrioritiesCard data={data.cards.topExpansionPriorities} /></div>
            <div className="mb-4 break-inside-avoid"><AdoptionWinsCard data={data.cards.adoptionWins} /></div>
            <div className="mb-4 break-inside-avoid"><BenchmarkCard data={data.cards.benchmarkMethodology} /></div>
            {hasItems(data.cards.accountObjectives) && <div className="mb-4 break-inside-avoid"><AccountObjectivesCard data={data.cards.accountObjectives} /></div>}
            {hasItems(data.cards.processPainPoints) && <div className="mb-4 break-inside-avoid"><ProcessPainPointsCard data={data.cards.processPainPoints} /></div>}
            {hasItems(data.cards.competitiveLandscape) && <div className="mb-4 break-inside-avoid"><CompetitiveLandscapeCard data={data.cards.competitiveLandscape} /></div>}
            {hasItems(data.cards.additionalInsights) && <div className="mb-4 break-inside-avoid"><AdditionalInsightsCard data={data.cards.additionalInsights} /></div>}
          </div>
        </div>
      )}
    </TabLoader>
  );
};

const CardWrapper = ({ cardKey, children, summary }) => {
  const config = CARD_CONFIG[cardKey];
  return (
    <div
      className="bg-white border border-[#E4E7F1] rounded-xl p-5"
      style={{ borderLeft: `4px solid ${config.borderColor}` }}
    >
      <h3 className="text-sm font-bold mb-2" style={{ color: config.titleColor }}>
        {config.title}
      </h3>
      {summary && <p className="text-xs text-[#5A6180] mb-3">{summary}</p>}
      {children}
    </div>
  );
};

const RelationshipHealthCard = ({ data }) => (
  <CardWrapper cardKey="relationshipHealth" summary={data.summary}>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.indicator}:</strong> {item.value}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const ConcernsCard = ({ data }) => (
  <CardWrapper cardKey="concerns" summary={data.summary}>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.title}:</strong> {item.description}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const ValueDeliveredCard = ({ data }) => (
  <CardWrapper cardKey="valueDelivered">
    <div className="flex items-center gap-4 mb-3">
      <span className="bg-[#EDE9FE] text-[#4A3DC7] px-3 py-1 rounded-full text-xs font-bold">
        Total Value: {data.totalValue}
      </span>
      <span className="bg-[#EDE9FE] text-[#4A3DC7] px-3 py-1 rounded-full text-xs font-bold">
        ROI: {data.roiMultiple}
      </span>
    </div>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.category}:</strong> {item.value}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const ExpansionPrioritiesCard = ({ data }) => (
  <CardWrapper cardKey="topExpansionPriorities" summary={data.summary}>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.module}:</strong> {item.rationale}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const AdoptionWinsCard = ({ data }) => (
  <CardWrapper cardKey="adoptionWins" summary={data.summary}>
    {data.utilizationStats && (
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
          Users: {data.utilizationStats.activeUsers} / {data.utilizationStats.totalUsers} ({data.utilizationStats.utilizationPercent})
        </span>
      </div>
    )}
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.title}:</strong> {item.metric}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const BenchmarkCard = ({ data }) => (
  <CardWrapper cardKey="benchmarkMethodology" summary={data.summary}>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
       <li key={i}>
          <strong>{item.name}:</strong> {item.customerValue}
          {item.industryBenchmark && <span className="text-[#5A6180]"> (benchmark: {item.industryBenchmark})</span>}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const AccountObjectivesCard = ({ data }) => (
  <CardWrapper cardKey="accountObjectives" summary={data.summary}>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.objective}:</strong> {item.details}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const ProcessPainPointsCard = ({ data }) => (
  <CardWrapper cardKey="processPainPoints" summary={data.summary}>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.area}:</strong> {item.description}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const CompetitiveLandscapeCard = ({ data }) => (
  <CardWrapper cardKey="competitiveLandscape" summary={data.summary}>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.competitor}</strong> {item.area && <span className="text-[#5A6180]">({item.area})</span>}: {item.strategy}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

const AdditionalInsightsCard = ({ data }) => (
  <CardWrapper cardKey="additionalInsights" summary={data.summary}>
    <ul className="pl-5 text-sm leading-7 list-disc">
      {data.items.map((item, i) => (
        <li key={i}>
          <strong>{item.insight}:</strong> {item.supportingData}
        </li>
      ))}
    </ul>
  </CardWrapper>
);

export default SummaryTab;
