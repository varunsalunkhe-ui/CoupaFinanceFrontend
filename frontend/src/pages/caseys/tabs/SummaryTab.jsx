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
};

const SummaryTab = ({ accountName = 'caseys' }) => {
  const { data, loading, error, retry } = useTabFromContext('summary');

  return (
    <TabLoader loading={loading} error={error} onRetry={retry} data={data}>
      {data && data.cards && (
        <div>
          <p className="text-sm text-[#5A6180] mb-4">
            AI-generated executive summary — powered by Coupa Intelligence Agent.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <RelationshipHealthCard data={data.cards.relationshipHealth} />
              <ValueDeliveredCard data={data.cards.valueDelivered} />
              <AdoptionWinsCard data={data.cards.adoptionWins} />
            </div>
            <div className="flex flex-col gap-4">
              <ConcernsCard data={data.cards.concerns} />
              <ExpansionPrioritiesCard data={data.cards.topExpansionPriorities} />
              <BenchmarkCard data={data.cards.benchmarkMethodology} />
            </div>
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

export default SummaryTab;
