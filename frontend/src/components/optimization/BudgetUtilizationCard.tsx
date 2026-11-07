import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatINR } from '../../lib/format';

export interface BudgetUtilizationCardProps {
  totalBudget?: number;
  allocatedInvestment?: number;
  remainingBudget?: number;
  className?: string;
}

export const BudgetUtilizationCard: React.FC<BudgetUtilizationCardProps> = ({
  totalBudget = 2500000,
  allocatedInvestment = 1650000,
  remainingBudget = 850000,
  className = '',
}) => {
  const percentage = totalBudget > 0 ? (allocatedInvestment / totalBudget) * 100 : 0;

  return (
    <Card
      title="Investment Budget Allocation"
      action={<Badge variant="primary" size="sm">Optimal Allocation</Badge>}
      subtitle={`Budget efficiency for target threshold ${formatINR(totalBudget)}`}
      className={className}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-[8px] bg-surface-2 border border-line">
            <div className="text-[11px] font-medium text-muted">Total Budget</div>
            <div className="text-sm font-semibold text-ink mt-1 num">{formatINR(totalBudget)}</div>
          </div>
          <div className="p-3 rounded-[8px] bg-brand-soft border border-brand/20">
            <div className="text-[11px] font-medium text-brand">Allocated Cost</div>
            <div className="text-sm font-semibold text-brand mt-1 num">{formatINR(allocatedInvestment)}</div>
          </div>
          <div className="p-3 rounded-[8px] bg-ok-soft border border-ok/20">
            <div className="text-[11px] font-medium text-ok">Unallocated Reserve</div>
            <div className="text-sm font-semibold text-ok mt-1 num">{formatINR(remainingBudget)}</div>
          </div>
        </div>

        <ProgressBar
          value={percentage}
          max={100}
          label="Budget Utilized"
          sublabel={`${formatINR(allocatedInvestment)} / ${formatINR(totalBudget)}`}
          color={percentage > 90 ? 'warning' : 'primary'}
        />
      </div>
    </Card>
  );
};
