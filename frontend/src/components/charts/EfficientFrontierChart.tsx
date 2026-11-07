import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useThemeColors } from '../../lib/useThemeColors';
import { formatINR } from '../../lib/format';

export interface FrontierPoint {
  budget: number;        // ₹ Lakhs
  residualLoss: number;  // ₹ Lakhs
  portfolioSize: number;
  isOptimal?: boolean;
}

export interface EfficientFrontierChartProps {
  data?: FrontierPoint[];
  title?: string;
}

export const EfficientFrontierChart: React.FC<EfficientFrontierChartProps> = ({
  data = [],
  title = 'Security Investment Efficient Frontier',
}) => {
  const colors = useThemeColors();
  const hasData = data && data.length > 0;

  return (
    <Card
      title={title}
      action={<Badge variant="outline" size="sm">Frontier</Badge>}
      subtitle="Optimal residual risk tradeoff curve across budget levels"
    >
      <div className="h-64 w-full">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-muted">No efficient frontier data available</p>
            <p className="text-[11px] text-muted/70 mt-1">Run portfolio optimization with candidate budgets to compute the efficiency curve.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid stroke={colors.line} strokeDasharray="3 3" opacity={0.6} />
              <XAxis
                type="number"
                dataKey="budget"
                name="Budget"
                tick={{ fill: colors.muted, fontSize: 12 }}
                axisLine={{ stroke: colors.line }}
                tickLine={{ stroke: colors.line }}
                tickFormatter={(v) => formatINR(Number(v) * 1e5)}
                label={{ value: 'Investment Budget', position: 'insideBottom', fill: colors.muted, fontSize: 11, offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="residualLoss"
                name="Residual Loss"
                tick={{ fill: colors.muted, fontSize: 12 }}
                axisLine={{ stroke: colors.line }}
                tickLine={{ stroke: colors.line }}
                tickFormatter={(v) => formatINR(Number(v) * 1e5)}
                label={{ value: 'Residual Loss', angle: -90, position: 'insideLeft', fill: colors.muted, fontSize: 11, offset: 10 }}
              />
              <ZAxis dataKey="portfolioSize" range={[60, 200]} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: '10px',
                  color: colors.ink,
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                itemStyle={{ color: colors.ink }}
                labelStyle={{ color: colors.muted, fontWeight: 500 }}
                formatter={(val: any, name: any) => [
                  formatINR(Number(val) * 1e5),
                  name === 'Budget' ? 'Investment' : 'Residual Loss',
                ]}
              />
              <Scatter
                name="Portfolios"
                data={data}
                fill={colors.brand}
                line
                stroke={colors.brand}
                strokeWidth={2}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
