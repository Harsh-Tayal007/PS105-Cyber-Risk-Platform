import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  description = 'There are no records matching your request or filter criteria.',
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[10px] bg-surface border border-line ${className}`}>
      <div className="p-3 bg-surface-2 rounded-full border border-line mb-3.5 text-muted">
        {icon || <FolderOpen className="w-8 h-8 text-muted" />}
      </div>
      <h4 className="text-sm sm:text-base font-semibold text-ink font-serif">{title}</h4>
      <p className="text-xs sm:text-sm text-muted max-w-sm mt-1 mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
