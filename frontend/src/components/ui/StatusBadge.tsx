import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';

export interface StatusBadgeProps {
  status: 'VERIFIED' | 'PENDING' | 'MITIGATED' | 'FAILED' | 'ACTIVE' | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const norm = (status || '').toUpperCase();

  const map: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
    VERIFIED: {
      label: 'Verified',
      style: 'bg-ok-soft text-ok border-ok/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    MITIGATED: {
      label: 'Mitigated',
      style: 'bg-brand-soft text-brand border-brand/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    ACTIVE: {
      label: 'Active',
      style: 'bg-brand-soft text-brand border-brand/30',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    PENDING: {
      label: 'Pending',
      style: 'bg-warn-soft text-warn border-warn/30',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    FAILED: {
      label: 'Failed',
      style: 'bg-danger-soft text-danger border-danger/30',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const item = map[norm] || {
    label: norm,
    style: 'bg-surface-2 text-muted border-line',
    icon: <Clock className="w-3.5 h-3.5" />,
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1 font-medium' : 'px-2.5 py-1 text-xs gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${item.style} ${sizeClass} ${className}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};
