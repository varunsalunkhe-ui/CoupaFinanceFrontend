import React from 'react';

const HeroSection = ({ data }) => {
  const pillBg = (color) => {
    if (color === 'success') return 'bg-green-600/80';
    if (color === 'warning') return 'bg-amber-500/80';
    if (color === 'danger' || color === 'error') return 'bg-red-600/80';
    return 'bg-white/15';
  };

  return (
    <div className="bg-gradient-to-r from-[#0C4A6E] via-[#075985] to-[#0369A1] text-white rounded-2xl p-8 mb-6 shadow-[0_10px_30px_rgba(3,105,161,0.2)]">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{data.companyName}</h1>
          <div className="text-sm opacity-85">{data.subtext}</div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {data.tags.map((tag, i) => (
              <span key={i} className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${pillBg(tag.color)}`}>
                {tag.text}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase opacity-70 tracking-wider">Open Opp Renewal ACV</div>
          <div className="text-3xl font-bold">{data.openAcv}</div>
          <div className="text-xs opacity-80">{data.contractTerm}</div>
          <div className="text-[11px] opacity-65 mt-1">{data.priorAcv}</div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-6 gap-y-4 mt-6 pt-6">
        {data.metaGrid.map((item, i) => (
          <div key={i}>
            <div className="text-[11px] uppercase opacity-70 tracking-wider mb-0.5">{item.label}</div>
            <div className="text-sm font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroSection;
