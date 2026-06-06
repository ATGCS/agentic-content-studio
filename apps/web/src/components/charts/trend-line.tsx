'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const BLUE = '#1664ff';

export function TrendLine({
  data,
  color = BLUE,
  height = 48,
}: {
  data: { value: number }[];
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`trend-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="value"
          fill={`url(#trend-fill-${color.replace('#', '')})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
