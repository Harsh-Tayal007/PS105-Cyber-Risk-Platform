import React from 'react';

export interface LoadingStateProps {
  message?: string;
  subtitle?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Processing calculation engine...',
  subtitle = 'Executing deterministic risk matrices & optimization models',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[10px] bg-surface border border-line ${className}`}>
      <div className="flex items-center justify-center mb-3.5">
        <div className="w-9 h-9 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
      </div>
      <h4 className="text-sm font-semibold text-ink font-serif tracking-normal">{message}</h4>
      {subtitle && <p className="text-xs text-muted mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
};
