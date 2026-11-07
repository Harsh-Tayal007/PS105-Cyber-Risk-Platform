import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  errorDetails?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Error',
  errorDetails = 'An unexpected error occurred while executing the operation.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-[10px] bg-danger-soft border border-danger/20 ${className}`}>
      <div className="p-3 bg-surface rounded-full border border-danger/30 text-danger mb-3.5 shadow-xs">
        <AlertOctagon className="w-7 h-7" />
      </div>
      <h4 className="text-sm sm:text-base font-semibold text-danger font-serif">{title}</h4>
      <p className="text-xs text-danger/80 max-w-md mt-1 mb-5 font-mono bg-surface/80 p-2.5 rounded-[8px] border border-danger/20 break-words">
        {errorDetails}
      </p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Retry Operation
        </Button>
      )}
    </div>
  );
};
