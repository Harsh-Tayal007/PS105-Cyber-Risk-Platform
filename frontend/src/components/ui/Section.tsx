import React from 'react';
import { InfoTip } from './InfoTip';

export interface SectionProps {
  title: React.ReactNode;
  description?: string;
  info?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  info,
  actions,
  children,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <section className={`bg-surface border border-line rounded-[10px] overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-line bg-surface-2/40">
        <div>
          <div className="flex items-center gap-2">
            {typeof title === 'string' ? (
              <h2 className="text-base font-semibold text-ink font-serif tracking-tight">
                {title}
              </h2>
            ) : (
              title
            )}
            {info && <InfoTip content={info} title={typeof title === 'string' ? title : undefined} />}
          </div>
          {description && (
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className={`p-5 ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
};

