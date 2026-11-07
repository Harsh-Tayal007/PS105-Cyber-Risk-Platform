import React from 'react';
import { Card } from './Card';
import { InfoTip } from './InfoTip';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
  glow?: boolean;
  className?: string;
  info?: string;
  hint?: string;
  tone?: 'default' | 'danger' | 'ok' | 'warn';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  subtitle,
  glow = false,
  className = '',
  info,
  hint,
  tone = 'default',
}) => {
  const changeColors = {
    positive: 'text-ok bg-ok-soft border-ok/20',
    negative: 'text-danger bg-danger-soft border-danger/20',
    neutral: 'text-muted bg-surface-2 border-line',
  };

  const toneClasses = {
    default: '',
    danger: 'border-danger/30 bg-danger-soft/10',
    ok: 'border-ok/30 bg-ok-soft/10',
    warn: 'border-warn/30 bg-warn-soft/10',
  };

  return (
    <Card
      glow={glow}
      className={`relative overflow-hidden transition-all duration-150 ${toneClasses[tone]} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted">{title}</span>
            {info && <InfoTip content={info} title={title} />}
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-ink mt-1.5 num tracking-tight truncate">
            {value}
          </div>
          {subtitle && <p className="text-xs text-muted mt-1 leading-relaxed">{subtitle}</p>}
        </div>
        {icon && (
          <div className="p-2.5 rounded-[10px] bg-surface-2 border border-line text-brand shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(change || hint) && (
        <div className="mt-3.5 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
          {change && (
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${changeColors[changeType]}`}>
                {change}
              </span>
              <span className="text-[11px] text-muted">vs benchmark</span>
            </div>
          )}
          {hint && (
            <span className="text-[11px] text-muted leading-tight ml-auto">
              {hint}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
