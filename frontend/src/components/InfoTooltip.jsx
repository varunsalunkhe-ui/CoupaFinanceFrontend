import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Small hoverable "i" icon that renders its tooltip via a portal so it
// is never clipped by the scrollable tab bar's overflow container.
const TOOLTIP_WIDTH = 288; // px, matches w-72
const VIEWPORT_MARGIN = 8;

const InfoTooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  const showTooltip = () => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (rect) {
      const center = rect.left + rect.width / 2;
      // clamp so the tooltip's left edge never falls outside the viewport
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
      className="inline-flex shrink-0 items-center justify-center text-[#94A3B8] hover:text-[#0369A1] cursor-pointer"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01" />
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

export default InfoTooltip;
