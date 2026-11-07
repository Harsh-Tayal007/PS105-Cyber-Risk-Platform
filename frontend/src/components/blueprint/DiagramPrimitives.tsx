import React from 'react';

export interface DiagBoxProps {
  title: string;
  subtitle?: string;
  tag?: string;
  variant?: 'default' | 'accent' | 'sage' | 'sand' | 'slate';
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const DiagBox: React.FC<DiagBoxProps> = ({
  title,
  subtitle,
  tag,
  variant = 'default',
  onClick,
  className = '',
  children,
}) => {
  const variantStyles = {
    default: 'bg-[var(--bp-surface)] border-[var(--bp-line)] text-[var(--bp-ink)]',
    accent: 'bg-[var(--bp-accent-soft)] border-[var(--bp-accent)] text-[var(--bp-ink)]',
    sage: 'bg-[var(--bp-tint-sage)] border-[var(--bp-line)] text-[var(--bp-ink)]',
    sand: 'bg-[var(--bp-tint-sand)] border-[var(--bp-line)] text-[var(--bp-ink)]',
    slate: 'bg-[var(--bp-tint-slate)] border-[var(--bp-line)] text-[var(--bp-ink)]',
  }[variant];

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all ${
        onClick
          ? 'cursor-pointer hover:border-[var(--bp-accent)] hover:shadow-sm'
          : ''
      } ${variantStyles} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-snug">{title}</h4>
        {tag && (
          <span className="bp-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bp-surface)]/60 border border-[var(--bp-line)] shrink-0">
            {tag}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-[var(--bp-muted)] mt-1 leading-relaxed">
          {subtitle}
        </p>
      )}
      {children && <div className="mt-2 text-xs">{children}</div>}
    </Comp>
  );
};

export interface ArrowProps {
  direction?: 'right' | 'down';
  label?: string;
  className?: string;
}

export const Arrow: React.FC<ArrowProps> = ({
  direction = 'right',
  label,
  className = '',
}) => {
  if (direction === 'down') {
    return (
      <div className={`flex flex-col items-center justify-center my-1 ${className}`}>
        {label && (
          <span className="text-[10px] text-[var(--bp-muted)] bp-mono mb-1">
            {label}
          </span>
        )}
        <svg
          className="w-4 h-6 text-[var(--bp-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center mx-1 shrink-0 ${className}`}>
      {label && (
        <span className="text-[10px] text-[var(--bp-muted)] bp-mono mr-1">
          {label}
        </span>
      )}
      <svg
        className="w-6 h-4 text-[var(--bp-muted)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
      </svg>
    </div>
  );
};

export interface StepItem {
  number: string;
  title: string;
  desc: string;
  tabId?: string;
}

export interface StepListProps {
  steps: StepItem[];
  onSelectTab?: (tabId: string) => void;
  className?: string;
}

export const StepList: React.FC<StepListProps> = ({
  steps,
  onSelectTab,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {steps.map((st) => (
        <div
          key={st.number}
          className="flex items-start gap-3 p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface)]"
        >
          <span className="bp-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bp-accent-soft)] text-[var(--bp-accent)] shrink-0">
            {st.number}
          </span>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-sm font-semibold text-[var(--bp-ink)]">
                {st.title}
              </h5>
              {st.tabId && onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab(st.tabId!)}
                  className="text-xs text-[var(--bp-accent)] hover:underline cursor-pointer shrink-0"
                >
                  Open →
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--bp-muted)] leading-relaxed">
              {st.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

