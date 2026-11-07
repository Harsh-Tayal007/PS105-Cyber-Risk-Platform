import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  glow = false,
}) => {
  return (
    <div
      className={`bg-surface border border-line rounded-[10px] shadow-xs transition-all duration-150 ${
        glow ? 'border-brand/40 ring-1 ring-brand/20' : ''
      } ${className}`}
    >
      {(title || action) && (
        <div
          className={`flex items-center justify-between px-5 py-4 border-b border-line ${headerClassName}`}
        >
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-sm sm:text-base font-semibold text-ink font-serif tracking-tight">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-muted mt-0.5 leading-relaxed">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
};
