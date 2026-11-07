import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { OptimizationResultDict } from '@/types';
import { formatINR } from '../../lib/format';

export interface OptimizationComparisonTableProps {
  comparison: OptimizationResultDict;
  className?: string;
}

export const OptimizationComparisonTable: React.FC<OptimizationComparisonTableProps> = ({
  comparison,
  className = '',
}) => {
  return (
    <Card
      title="Optimization Solver Verification (MILP vs Global Optimum)"
      action={
        <Badge variant={comparison.milp_matches_exhaustive ? 'success' : 'warning'} size="sm">
          {comparison.milp_matches_exhaustive ? '100% Global Optimum Match' : 'Divergence'}
        </Badge>
      }
      subtitle="Exact compounding multiplicative post-evaluation benchmark"
      className={className}
    >
      <div className="overflow-x-auto rounded-[8px] border border-line">
        <table className="w-full text-left text-xs sm:text-sm text-ink">
          <thead className="bg-surface-2/60 text-muted text-xs font-medium border-b border-line">
            <tr>
              <th scope="col" className="px-4 py-3">Optimization Method</th>
              <th scope="col" className="px-4 py-3">Selected Investment</th>
              <th scope="col" className="px-4 py-3">Additive MILP Loss</th>
              <th scope="col" className="px-4 py-3">Exact Multiplicative Loss</th>
              <th scope="col" className="px-4 py-3">Verification Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {/* MILP Row */}
            <tr className="hover:bg-surface-2/40">
              <td className="px-4 py-3 font-medium text-brand">
                PuLP Binary MILP Solver
              </td>
              <td className="px-4 py-3 num">{formatINR(comparison.total_investment)}</td>
              <td className="px-4 py-3 num">{formatINR(comparison.milp_objective_loss)}</td>
              <td className="px-4 py-3 font-semibold text-ok num">
                {formatINR(comparison.exact_multiplicative_loss)}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-ok text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Feasible Solution</span>
                </span>
              </td>
            </tr>

            {/* Exhaustive 2^N Row */}
            <tr className="hover:bg-surface-2/40">
              <td className="px-4 py-3 text-muted">
                Exhaustive Enumeration ({comparison.number_of_enumerated_portfolios} Portfolios)
              </td>
              <td className="px-4 py-3 num">{formatINR(comparison.total_investment)}</td>
              <td className="px-4 py-3 num">{formatINR(comparison.exhaustive_optimum_loss)}</td>
              <td className="px-4 py-3 font-semibold text-ok num">
                {formatINR(comparison.exhaustive_optimum_loss)}
              </td>
              <td className="px-4 py-3">
                {comparison.milp_matches_exhaustive ? (
                  <span className="inline-flex items-center gap-1 text-ok text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Global Minimum Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warn text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Diverged</span>
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
};
