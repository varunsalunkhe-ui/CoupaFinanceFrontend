import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * A dropdown filter with an inline search box, used in place of a plain <select>
 * so users can type to narrow long option lists (account/CVM owners, sponsors, etc.).
 */
const SearchableSelect = ({ label, value, onChange, options, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      searchInputRef.current?.focus();
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (opt) => {
    onChange(opt);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-sm rounded-lg border border-gray-200 bg-[#F8FAFC] px-3 py-1.5 flex items-center justify-between gap-2 focus:outline-none focus:border-[#0369A1] focus:ring-2 focus:ring-[#0369A1]/10 cursor-pointer ${
          value ? 'text-[#1E293B]' : 'text-[#64748B]'
        }`}
      >
        <span className="truncate">{value || `${label} (All)`}</span>
        <svg className={`w-3.5 h-3.5 shrink-0 text-[#94A3B8] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-[#0369A1] focus:ring-2 focus:ring-[#0369A1]/10"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left text-sm px-3 py-1.5 hover:bg-[#0369A1]/5 cursor-pointer ${!value ? 'text-[#0369A1] font-medium' : 'text-[#1E293B]'}`}
            >
              {label} (All)
            </button>
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-xs text-[#94A3B8]">No matches</div>
            )}
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left text-sm px-3 py-1.5 hover:bg-[#0369A1]/5 cursor-pointer truncate ${opt === value ? 'text-[#0369A1] font-medium' : 'text-[#1E293B]'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
