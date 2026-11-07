import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useThemeColors } from '../../lib/useThemeColors';
import { formatINR } from '../../lib/format';

export interface PercentileDataPoint {
  percentile: string;
  loss: number; // in Lakhs
}

export interface LossPercentileChartProps {
  data?: PercentileDataPoint[];
  title?: string;
}

export const LossPercentileChart: React.FC<LossPercentileChartProps> = ({
  data = [],
  title = 'Monte Carlo Loss Percentiles',
}) => {
  const colors = useThemeColors();
  const hasData = data && data.length > 0 && data.some((d) => d.loss > 0);

  return (
    <Card
      title={title}
      action={<Badge variant="outline" size="sm">Percentiles</Badge>}
      subtitle="Stochastic loss distribution metrics derived from simulation iterations"
    >
      <div className="h-64 w-full">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-muted">No simulation data available</p>
            <p className="text-[11px] text-muted/70 mt-1">Execute a Monte Carlo loss simulation to compute empirical percentiles.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid stroke={colors.line} strokeDasharray="3 3" opacity={0.6} vertical={false} />
              <XAxis
                dataKey="percentile"
                tick={{ fill: colors.muted, fontSize: 12 }}
                axisLine={{ stroke: colors.line }}
                tickLine={{ stroke: colors.line }}
              />
              <YAxis
                tick={{ fill: colors.muted, fontSize: 12 }}
                axisLine={{ stroke: colors.line }}
                tickLine={{ stroke: colors.line }}
                tickFormatter={(v) => formatINR(Number(v) * 1e5)}
              />
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
                formatter={(val: any) => [formatINR(Number(val) * 1e5), 'Loss']}
              />
              <Bar dataKey="loss" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.percentile.includes('P95') || entry.percentile.includes('Max') ? colors.danger : colors.brand}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
