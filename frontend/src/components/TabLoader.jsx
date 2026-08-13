import React from 'react';

const TabLoader = ({ loading, error, onRetry, data, children }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#6353E9] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#5A6180]">Loading data from AI agent...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">Error loading data</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // If data has rawText (agent returned unparseable text), show it formatted
  if (data?.rawText) {
    return (
      <div className="bg-white border border-[#E4E7F1] rounded-xl p-6">
        <p className="text-xs text-[#5A6180] mb-3 uppercase tracking-wide font-semibold">Agent Response</p>
        <div className="text-sm text-[#0F1733] whitespace-pre-wrap leading-relaxed">{data.rawText}</div>
      </div>
    );
  }

  return children;
};

export default TabLoader;
