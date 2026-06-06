'use client';

import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export function GroupedBar({
  data,
  bars,
  height = 220,
}: {
  data: Record<string, string | number>[];
  bars: { dataKey: string; color: string; name: string }[];
  height?: number;
}) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBar data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#86909c' }}
          axisLine={{ stroke: '#e5e8ef' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#86909c' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '0.5rem',
            border: '1px solid #e5e8ef',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '0.8125rem',
            padding: '0.5rem 0.75rem',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '0.75rem', color: '#86909c', paddingTop: '0.5rem' }}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color}
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
          />
        ))}
      </RechartsBar>
    </ResponsiveContainer>
  );
}
