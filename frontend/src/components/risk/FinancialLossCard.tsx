import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatINR } from '../../lib/format';

export interface FinancialLossCardProps {
  sle?: number;           // Single Loss Expectancy in ₹
  aro?: number;           // Annualized Rate of Occurrence
  ale?: number;           // Annualized Loss Expectancy in ₹
  assetName?: string;
  assetValue?: number;    // Business value
  exposureFactor?: number;// 0.0 - 1.0
  className?: string;
}

export const FinancialLossCard: React.FC<FinancialLossCardProps> = ({
  sle = 42500000,
  aro = 0.6255,
  ale = 26583750,
  assetName = 'Core Banking Database Server',
  assetValue = 50000000,
  exposureFactor = 0.85,
  className = '',
}) => {
  return (
    <Card
      title="Quantitative Financial Loss Exposure"
      action={<Badge variant="outline" size="sm">SLE × ARO = ALE</Badge>}
      subtitle={assetName ? `Annualized loss metrics for: ${assetName}` : 'Annualized and single-event financial loss expectations'}
      className={className}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* SLE */}
        <div className="p-3.5 rounded-[8px] bg-surface-2 border border-line">
          <div className="text-xs font-medium text-muted">
            Single Loss Expectancy (SLE)
          </div>
          <div className="text-xl font-semibold text-ink mt-1.5 num">
            {formatINR(sle)}
          </div>
          <div className="text-[11px] text-muted mt-1">
            Valuation ({formatINR(assetValue)}) × EF ({(exposureFactor * 100).toFixed(0)}%)
          </div>
        </div>

        {/* ARO */}
        <div className="p-3.5 rounded-[8px] bg-surface-2 border border-line">
          <div className="text-xs font-medium text-muted">
            Annual Rate (ARO)
          </div>
          <div className="text-xl font-semibold text-brand mt-1.5 num">
            {aro.toFixed(4)} / yr
          </div>
          <div className="text-[11px] text-muted mt-1">
            Threat Probability × Exploit Multiplier
          </div>
        </div>

        {/* ALE */}
        <div className="p-3.5 rounded-[8px] bg-danger-soft/30 border border-danger/30">
          <div className="text-xs font-medium text-danger">
            Annual Loss Expectancy (ALE)
          </div>
          <div className="text-xl font-semibold text-danger mt-1.5 num">
            {formatINR(ale)}
          </div>
          <div className="text-[11px] text-muted mt-1">
            SLE × ARO Baseline Loss
          </div>
        </div>
      </div>
    </Card>
  );
};
