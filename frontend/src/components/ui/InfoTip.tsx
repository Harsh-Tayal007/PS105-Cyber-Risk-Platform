import { Info } from 'lucide-react';
import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export interface InfoTipProps {
  content: ReactNode;
  title?: string;
  label?: string;       // accessible name for the icon button
  className?: string;
}

export const InfoTip: React.FC<InfoTipProps> = ({
  content, title, label = 'More information', className = '',
}) => {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = useCallback(() => { window.clearTimeout(timer.current); setOpen(true); }, []);
  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setOpen(false); setPos(null); }, 80);
  }, []);
  const closeNow = useCallback(() => { setOpen(false); setPos(null); }, []);

  // Measure after render, then place: below the icon, flip above if no room, clamp to viewport.
  useLayoutEffect(() => {
    if (!open || !btnRef.current || !tipRef.current) return;
    const b = btnRef.current.getBoundingClientRect();
    const t = tipRef.current.getBoundingClientRect();
    const margin = 8, gap = 8;
    let top = b.bottom + gap;
    if (top + t.height > window.innerHeight - margin && b.top - gap - t.height > margin) {
      top = b.top - gap - t.height;
    }
    let left = b.left + b.width / 2 - t.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - t.width - margin));
    setPos({ top, left });
  }, [open, content, title]);

  // Close on Escape, resize, or scroll of ANY container (capture catches <main> scrolling).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNow(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', closeNow);
    window.addEventListener('scroll', closeNow, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', closeNow);
      window.removeEventListener('scroll', closeNow, true);
    };
  }, [open, closeNow]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => { e.stopPropagation(); open ? closeNow() : show(); }}
        className={`inline-flex items-center align-middle ml-1 text-muted hover:text-brand focus-visible:text-brand cursor-help ${className}`}
      >
        <Info size={14} />
      </button>

      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{
              position: 'fixed',
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? 'visible' : 'hidden',   // avoids a flash before measuring
              zIndex: 70,                               // above modals (60) and drawers
              maxWidth: 280,
            }}
            className="w-max rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed text-ink shadow-lg"
          >
            {title && <strong className="mb-1 block font-semibold">{title}</strong>}
            {content}
          </div>,
          document.body,
        )}
    </>
  );
};