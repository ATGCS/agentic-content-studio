'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DEFAULT_COLORS = ['#1664ff', '#7c3aed', '#06b6d4', '#ff6a00', '#00b42a', '#f53f3f'];

export function DonutChart({
  data,
  colors = DEFAULT_COLORS,
  height = 160,
  innerRadius = 40,
  outerRadius = 60,
}: {
  data: { label: string; value: number }[];
  colors?: string[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: '0.5rem',
            border: '1px solid #e5e8ef',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '0.8125rem',
            padding: '0.5rem 0.75rem',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
