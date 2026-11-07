import React from 'react';
import type { SeverityLevel } from '@/types';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';

export interface RiskBadgeProps {
  severity: SeverityLevel | string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  severity,
  showIcon = true,
  size = 'md',
  className = '',
}) => {
  const norm = (severity ? String(severity) : 'MEDIUM').toUpperCase();

  const configMap: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
    CRITICAL: {
      label: 'Critical',
      style: 'bg-danger-soft text-danger border-danger/30',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    HIGH: {
      label: 'High',
      style: 'bg-warn-soft text-warn border-warn/30',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    MEDIUM: {
      label: 'Medium',
      style: 'bg-warn-soft text-warn border-warn/30',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    LOW: {
      label: 'Low',
      style: 'bg-ok-soft text-ok border-ok/30',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    MINIMAL: {
      label: 'Minimal',
      style: 'bg-brand-soft text-brand border-brand/30',
      icon: <Info className="w-3.5 h-3.5" />,
    },
  };

  const conf = configMap[norm] || {
    label: norm,
    style: 'bg-surface-2 text-muted border-line',
    icon: <Info className="w-3.5 h-3.5" />,
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1 font-medium' : 'px-2.5 py-1 text-xs gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${conf.style} ${sizeClass} ${className}`}
    >
      {showIcon && conf.icon}
      <span>{conf.label}</span>
    </span>
  );
};
