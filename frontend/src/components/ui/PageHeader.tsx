import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  step?: {
    current: number;
    total: number;
  };
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  step,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line ${className}`}>
      <div className="space-y-1">
        {step && (
          <div className="text-xs font-medium text-brand">
            Step {step.current} of {step.total}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink font-serif tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

