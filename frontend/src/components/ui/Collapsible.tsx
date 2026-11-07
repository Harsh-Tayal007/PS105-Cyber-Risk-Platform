import React, { useState, useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleProps {
  label: React.ReactNode;
  /** Initial open state (uncontrolled). Defaults to false. */
  defaultOpen?: boolean;
  /** 'card' (default) — bordered card with header background.
   *  'inline' — no border/card; uses a slim text-button trigger. */
  variant?: 'card' | 'inline';
  /** Called whenever the panel is toggled. */
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  label,
  defaultOpen = false,
  variant = 'card',
  onToggle,
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const contentId = `collapsible-content-${id}`;

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(next);
  };

  /* ── Animated content wrapper (CSS grid trick) ── */
  const animatedContent = (
    <div
      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      className="grid transition-[grid-template-rows] duration-250 ease-in-out motion-reduce:transition-none"
    >
      <div
        id={contentId}
        className="overflow-hidden min-h-0"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(!isOpen ? { inert: true as any } : {})}
      >
        {variant === 'card' ? (
          <div className="px-4 py-3 border-t border-line text-xs text-muted leading-relaxed bg-surface-2/30">
            {children}
          </div>
        ) : (
          <div className="pt-2 pb-1 text-xs text-muted leading-relaxed">
            {children}
          </div>
        )}
      </div>
    </div>
  );

  /* ── Card variant ── */
  if (variant === 'card') {
    return (
      <div className={`border border-line rounded-[10px] bg-surface overflow-hidden ${className}`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-medium text-ink hover:bg-surface-2 transition-colors cursor-pointer select-none"
        >
          <span className="flex items-center gap-2">{label}</span>
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform duration-200 motion-reduce:transition-none shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {animatedContent}
      </div>
    );
  }

  /* ── Inline variant ── */
  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex items-center gap-1 text-xs text-brand hover:underline cursor-pointer select-none"
      >
        {label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {animatedContent}
    </div>
  );
};
