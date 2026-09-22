import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_WIDTH = 288; // px, matches w-72
const VIEWPORT_MARGIN = 8;

/**
 * Small hoverable eye icon, absolutely positioned at the top-right corner of a
 * `relative`-positioned KPI card, revealing that metric's business definition.
 * Only render this where a definition actually exists (callers should guard).
 */
const KpiEyeInfo = ({ text, colorClassName = 'text-[#94A3B8] hover:text-[#0369A1]' }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  const showTooltip = () => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (rect) {
      const center = rect.left + rect.width / 2;
      const minLeft = VIEWPORT_MARGIN;
      const maxLeft = window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN;
      const left = Math.min(Math.max(center - TOOLTIP_WIDTH / 2, minLeft), maxLeft);
      setCoords({ top: rect.bottom + 8, left });
    }
    setVisible(true);
  };

  const hideTooltip = () => setVisible(false);

  return (
    <span
      ref={iconRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onClick={(e) => e.stopPropagation()}
      className={`absolute top-2 right-2 inline-flex shrink-0 items-center justify-center cursor-pointer ${colorClassName}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {visible &&
        createPortal(
          <div
            className="fixed z-[9999] w-72 rounded-lg bg-[#0F1733] px-4 py-3 text-xs leading-relaxed text-white shadow-xl"
            style={{ top: coords.top, left: coords.left }}
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
};

export default KpiEyeInfo;
