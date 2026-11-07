import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowDownRight, ShieldCheck } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';
import { formatINR } from '../../lib/format';

export interface ResidualRiskIndicatorProps {
  baselineLoss?: number;   // ₹ Baseline ALE
  residualLoss?: number;   // ₹ Loss After Multiplicative Mitigations
  riskReduction?: number;  // 0 - 100%
  selectedControlsCount?: number;
  className?: string;
}

export const ResidualRiskIndicator: React.FC<ResidualRiskIndicatorProps> = ({
  baselineLoss = 26583750,
  residualLoss = 2658375,
  riskReduction = 90.0,
  selectedControlsCount = 2,
  className = '',
}) => {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand" />
          <span>Multiplicative Residual Risk Reduction</span>
        </div>
      }
      action={<Badge variant="success" size="sm">Compounded Mitigations</Badge>}
      subtitle={`Exact post-evaluation after applying ${selectedControlsCount} controls`}
      className={className}
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-2 rounded-[8px] border border-line">
          <div>
            <span className="text-xs text-muted">Baseline Exposure:</span>
            <div className="text-sm font-medium text-danger line-through num">
              {formatINR(baselineLoss)}
            </div>
          </div>
          <div className="flex items-center text-ok gap-1 font-semibold text-xs bg-ok-soft px-2.5 py-1 rounded-full border border-ok/20 self-start sm:self-center">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>-{riskReduction.toFixed(1)}% Reduction</span>
          </div>
          <div>
            <span className="text-xs text-muted">Residual Expected Loss:</span>
            <div className="text-sm font-semibold text-ok num">
              {formatINR(residualLoss)}
            </div>
          </div>
        </div>

        <ProgressBar
          value={riskReduction}
          max={100}
          label="Risk Reduction Progress"
          color="success"
          size="md"
        />
      </div>
    </Card>
  );
};
