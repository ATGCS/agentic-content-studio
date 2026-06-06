import type { LucideIcon } from 'lucide-react';
import { TrendLine } from '@/components/charts';

const iconBg: Record<string, string> = {
  blue: 'bg-[#f0f5ff] text-[#1664ff]',
  purple: 'bg-[#f5f0ff] text-[#7c3aed]',
  cyan: 'bg-[#f0fdfe] text-[#06b6d4]',
  orange: 'bg-[#fff7ed] text-[#ff6a00]',
};

const trendColors: Record<string, string> = {
  blue: '#1664ff',
  purple: '#7c3aed',
  cyan: '#06b6d4',
  orange: '#ff6a00',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
  trend,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  tone?: 'blue' | 'purple' | 'cyan' | 'orange';
  trend?: { value: number }[];
}) {
  return (
    <div className="studio-stat-card">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="studio-stat-label">{label}</p>
          <p className="studio-stat-value mt-1 text-[#1D2129]">{value}</p>
        </div>
        <div className={`studio-stat-icon ${iconBg[tone]}`}>
          <Icon className="size-4" />
        </div>
      </div>
      {trend && trend.length > 0 && (
        <div className="mt-2">
          <TrendLine data={trend} color={trendColors[tone]} height={36} />
        </div>
      )}
      <p className="studio-stat-hint">{hint}</p>
    </div>
  );
}
