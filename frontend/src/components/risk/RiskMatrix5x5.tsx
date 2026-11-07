import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export interface MatrixRiskItem {
  id: number;
  name: string;
  likelihood: number; // 1 - 5
  impact: number;     // 1 - 5
  score: number;      // 1 - 25
}

export interface RiskMatrix5x5Props {
  risks?: MatrixRiskItem[];
  selectedRiskId?: number;
  onSelectRisk?: (risk: MatrixRiskItem) => void;
  className?: string;
}

export const RiskMatrix5x5: React.FC<RiskMatrix5x5Props> = ({
  risks = [],
  selectedRiskId,
  onSelectRisk,
  className = '',
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 15) return 'bg-danger-soft text-danger border-danger/40 hover:bg-danger/15';
    if (score >= 10) return 'bg-warn-soft text-warn border-warn/40 hover:bg-warn/15';
    if (score >= 5)  return 'bg-warn-soft/60 text-warn border-warn/25 hover:bg-warn-soft';
    return 'bg-ok-soft text-ok border-ok/40 hover:bg-ok/15';
  };

  return (
    <Card
      title="5×5 Qualitative Likelihood × Impact Risk Heatmap"
      action={<Badge variant="outline" size="sm">{risks.length} Mapped Risks</Badge>}
      subtitle="Interactive threat severity mapping matrix (Scores 1 to 25)"
      className={className}
    >
      <div className="flex flex-col space-y-3">
        {/* Y-axis label */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Likelihood (L5 Almost Certain → L1 Rare)</span>
          <span>Impact (I1 Negligible → I5 Catastrophic) →</span>
        </div>

        {/* Matrix Grid (5 rows: L=5 down to L=1) */}
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={`row-${l}`} className="grid grid-cols-6 gap-1.5 items-center">
              {/* Row Label */}
              <div className="text-xs font-mono font-medium text-muted text-center bg-surface-2 py-3 rounded-[6px] border border-line">
                L{l}
              </div>

              {/* Columns for Impact 1 to 5 */}
              {[1, 2, 3, 4, 5].map((i) => {
                const cellScore = l * i;
                const cellRisks = risks.filter((r) => r.likelihood === l && r.impact === i);
                const hasRisks = cellRisks.length > 0;

                return (
                  <div
                    key={`cell-${l}-${i}`}
                    className={`relative flex flex-col items-center justify-center p-1.5 min-h-[50px] rounded-[6px] border transition-all cursor-pointer ${getScoreColor(
                      cellScore
                    )} ${hasRisks ? 'ring-1 ring-brand' : 'opacity-85'}`}
                    onClick={() => {
                      if (hasRisks && onSelectRisk) onSelectRisk(cellRisks[0]);
                    }}
                  >
                    <span className="text-[10px] font-mono font-medium opacity-60">
                      {cellScore}
                    </span>

                    {/* Risk Badges in Cell */}
                    {hasRisks && (
                      <div className="mt-1 flex flex-wrap gap-1 justify-center">
                        {cellRisks.map((r) => (
                          <span
                            key={r.id}
                            title={`${r.name} (Score: ${r.score})`}
                            className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-surface text-ink border ${
                              selectedRiskId === r.id ? 'border-brand ring-1 ring-brand' : 'border-line'
                            }`}
                          >
                            R{r.id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="grid grid-cols-6 gap-1.5 pt-1 text-center">
          <div className="text-[11px] font-mono text-muted">L / I</div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`col-lbl-${i}`} className="text-xs font-mono font-medium text-muted">
              I{i}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span className="font-medium text-ink">Severity Legend:</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger" />
              <span>Critical (15–25)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-warn" />
              <span>High / Med (5–14)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-ok" />
              <span>Low (1–4)</span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
