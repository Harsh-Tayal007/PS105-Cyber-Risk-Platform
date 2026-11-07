import React from 'react';
import {
  BarChart,
  Bar,
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

export interface ControlEffectivenessPoint {
  code: string;
  name: string;
  effectiveness: number; // 0 - 100%
  cost: number;          // ₹ Lakhs
}

export interface ControlEffectivenessChartProps {
  data?: ControlEffectivenessPoint[];
  title?: string;
}

export const ControlEffectivenessChart: React.FC<ControlEffectivenessChartProps> = ({
  data = [],
  title = 'Security Control Effectiveness (% Risk Reduction)',
}) => {
  const colors = useThemeColors();
  const hasData = data && data.length > 0;

  return (
    <Card
      title={title}
      action={<Badge variant="outline" size="sm">Mitigation Factor</Badge>}
      subtitle="Mitigation factor ratings for candidate security controls"
    >
      <div className="h-64 w-full">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-muted">No control effectiveness data available</p>
            <p className="text-[11px] text-muted/70 mt-1">Configure candidate security controls and risk mitigation mappings.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid stroke={colors.line} strokeDasharray="3 3" opacity={0.6} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: colors.muted, fontSize: 12 }}
                axisLine={{ stroke: colors.line }}
                tickLine={{ stroke: colors.line }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="code"
                tick={{ fill: colors.muted, fontSize: 12 }}
                axisLine={{ stroke: colors.line }}
                tickLine={{ stroke: colors.line }}
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
                formatter={(val: any, _name: any, item: any) => [
                  `${val}% Effectiveness (Cost: ${formatINR(Number(item.payload.cost) * 1e5)})`,
                  item.payload.name,
                ]}
              />
              <Bar dataKey="effectiveness" fill={colors.ok} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
