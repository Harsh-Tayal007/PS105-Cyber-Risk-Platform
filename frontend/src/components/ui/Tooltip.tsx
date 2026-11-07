import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** When true, renders the tooltip via a React portal into document.body
   *  with position:fixed coordinates so it is never clipped by overflow:hidden
   *  containers (e.g. the sidebar). Adds a 150 ms show delay. */
  portal?: boolean;
  className?: string;
}

/** Inline tooltip (default) — absolute positioning, no portal */
const InlineTooltip: React.FC<Omit<TooltipProps, 'portal'>> = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-40 px-2.5 py-1.5 text-xs font-normal text-ink bg-surface border border-line rounded-[8px] shadow-md whitespace-nowrap pointer-events-none transition-opacity duration-150 ${posClasses[position]}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
};

/** Portal tooltip — renders into document.body with fixed positioning */
const PortalTooltip: React.FC<Omit<TooltipProps, 'portal'>> = ({
  content,
  children,
  position = 'right',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const GAP = 8;
    let top = 0;
    let left = 0;

    switch (position) {
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + GAP;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - GAP;
        break;
      case 'bottom':
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2;
        break;
      case 'top':
      default:
        top = rect.top - GAP;
        left = rect.left + rect.width / 2;
        break;
    }
    setCoords({ top, left });
  }, [position]);

  const show = useCallback(() => {
    computeCoords();
    showTimer.current = setTimeout(() => setIsVisible(true), 150);
  }, [computeCoords]);

  const hide = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const handleScroll = () => { computeCoords(); };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isVisible, computeCoords]);

  // Translate classes for centering based on direction
  const transformClass = {
    right: '-translate-y-1/2',
    left: '-translate-y-1/2 -translate-x-full',
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
  }[position];

  const tooltipNode = isVisible
    ? ReactDOM.createPortal(
        <div
          role="tooltip"
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
          className={`${transformClass} px-2.5 py-1.5 text-xs font-normal text-ink bg-surface border border-line rounded-[8px] shadow-md whitespace-nowrap pointer-events-none`}
        >
          {content}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {tooltipNode}
    </div>
  );
};

export const Tooltip: React.FC<TooltipProps> = ({ portal = false, ...props }) => {
  if (portal) return <PortalTooltip {...props} />;
  return <InlineTooltip {...props} />;
};
