import Link from 'next/link';
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
  deltaHint = '较昨日活跃',
  icon: Icon,
  tone = 'blue',
  href,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaHint?: string;
  icon: LucideIcon;
  tone?: 'blue' | 'purple' | 'cyan' | 'orange' | 'green';
  href?: string;
}) {
  const up = delta !== undefined && delta >= 0;
  const deltaText = delta !== undefined ? `${up ? '+' : ''}${delta} 个` : null;

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="studio-stat-label">{label}</p>
          <p className="studio-stat-value mt-1.5 text-[#1D2129]">{value}</p>
        </div>
        <div className={`studio-stat-icon rounded-full ${iconBg[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      {deltaText && (
        <p
          className={`studio-stat-delta mt-1.5 flex items-center gap-0.5 ${
            up ? 'text-[#f53f3f]' : 'text-[#00b42a]'
          }`}
        >
          {deltaHint}{' '}
          {up ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )}
          {deltaText}
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="studio-stat-card block transition-shadow hover:shadow-md"
      >
        {inner}
      </Link>
    );
  }

  return <div className="studio-stat-card">{inner}</div>;
}
