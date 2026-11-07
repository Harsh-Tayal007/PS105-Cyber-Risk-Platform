import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useThemeColors } from '../../lib/useThemeColors';
import { formatINR } from '../../lib/format';

export interface ExceedancePoint {
  loss: number;        // ₹ Lakhs
  probability: number; // 0.0 - 1.0 (0% - 100%)
}

export interface ExceedanceCurveChartProps {
  data?: ExceedancePoint[];
  title?: string;
}

export const ExceedanceCurveChart: React.FC<ExceedanceCurveChartProps> = ({
  data = [],
  title = 'Loss Exceedance Curve (LEC)',
}) => {
  const colors = useThemeColors();
  const hasData = data && data.length > 0 && data.some((d) => d.probability > 0);

  return (
    <Card
      title={title}
      action={<Badge variant="outline" size="sm">Exceedance Probability</Badge>}
      subtitle="Probability of annual cyber loss exceeding a given threshold"
    >
      <div className="h-64 w-full">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-muted">No exceedance curve data available</p>
            <p className="text-[11px] text-muted/70 mt-1">Run Monte Carlo simulation to generate portfolio exceedance probability curve.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid stroke={colors.line} strokeDasharray="3 3" opacity={0.6} />
              <XAxis
                dataKey="loss"
                tick={{ fill: colors.muted, fontSize: 12 }}
                axisLine={{ stroke: colors.line }}
                tickLine={{ stroke: colors.line }}
                tickFormatter={(v) => formatINR(Number(v) * 1e5)}
              />
              <YAxis
                tick={{ fill: colors.muted, fontSize: 12 }}
                axisLine={{ stroke: colors.line }}
                tickLine={{ stroke: colors.line }}
                tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
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
                formatter={(val: any, name: any) => [
                  name === 'probability' ? `${(Number(val) * 100).toFixed(1)}%` : val,
                  'Probability of Exceedance',
                ]}
                labelFormatter={(label: any) => `Loss Threshold: ${formatINR(Number(label) * 1e5)}`}
              />
              <Area
                type="monotone"
                dataKey="probability"
                stroke={colors.brand}
                strokeWidth={2}
                fill={colors.brandSoft}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
