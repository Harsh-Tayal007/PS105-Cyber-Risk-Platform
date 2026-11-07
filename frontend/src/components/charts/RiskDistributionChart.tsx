import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useThemeColors } from '../../lib/useThemeColors';

export interface RiskDistributionData {
  severity: string;
  count: number;
  color?: string;
}

export interface RiskDistributionChartProps {
  data?: RiskDistributionData[];
  title?: string;
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({
  data = [],
  title = 'Risk Portfolio Severity Distribution',
}) => {
  const colors = useThemeColors();
  const hasData = data && data.length > 0 && data.some((d) => d.count > 0);

  const severityColorMap: Record<string, string> = {
    CRITICAL: colors.danger,
    HIGH: colors.warn,
    MEDIUM: colors.warn,
    LOW: colors.ok,
    MINIMAL: colors.brand,
  };

  return (
    <Card
      title={title}
      action={<Badge variant="outline" size="sm">Distribution</Badge>}
      subtitle="Breakdown of active risks by qualitative severity rating"
    >
      <div className="h-64 w-full">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-muted">No risk distribution data available</p>
            <p className="text-[11px] text-muted/70 mt-1">Add assets and evaluate threats to visualize severity levels.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="count"
                nameKey="severity"
              >
                {data.map((entry, index) => {
                  const sliceColor =
                    severityColorMap[entry.severity.toUpperCase()] ||
                    (entry.color && !entry.color.startsWith('#0') ? entry.color : colors.brand);
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={sliceColor}
                      stroke={colors.surface}
                      strokeWidth={2}
                    />
                  );
                })}
              </Pie>
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
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-muted font-normal">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
