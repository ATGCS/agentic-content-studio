import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';

const iconBg: Record<string, string> = {
  blue: 'bg-[#f0f5ff] text-[#1664ff]',
  purple: 'bg-[#f5f0ff] text-[#7c3aed]',
  cyan: 'bg-[#f0fdfe] text-[#06b6d4]',
  orange: 'bg-[#fff7ed] text-[#ff6a00]',
  green: 'bg-[#e8ffea] text-[#00b42a]',
};

export function DashboardMetricCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  tone?: 'blue' | 'purple' | 'cyan' | 'orange' | 'green';
}) {
  const up = delta !== undefined && delta >= 0;
  const deltaText = delta !== undefined ? `${up ? '+' : ''}${delta} 个` : null;

  return (
    <div className="studio-stat-card">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="studio-stat-label">{label}</p>
          <p className="studio-stat-value mt-3 text-[#1D2129]">{value}</p>
        </div>
        <div className={`studio-stat-icon rounded-full ${iconBg[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      {deltaText && (
        <p
          className={`studio-stat-delta mt-3 flex items-center gap-0.5 ${
            up ? 'text-[#f53f3f]' : 'text-[#00b42a]'
          }`}
        >
          较昨日{' '}
          {up ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )}
          {deltaText}
        </p>
      )}
    </div>
  );
}

/** Deterministic pseudo-delta from count for demo display */
export function pseudoDelta(count: number, salt = 0): number {
  if (count === 0) return 0;
  const raw = ((count * 7 + salt * 13) % 31) - 8;
  return raw;
}
