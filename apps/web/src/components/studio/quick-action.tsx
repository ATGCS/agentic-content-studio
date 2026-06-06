import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

const iconColors: Record<string, string> = {
  blue: 'text-[#1664ff]',
  purple: 'text-[#7c3aed]',
  orange: 'text-[#ff6a00]',
  cyan: 'text-[#06b6d4]',
};

export function QuickAction({
  href,
  label,
  description,
  icon: Icon,
  tone = 'blue',
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone?: 'blue' | 'purple' | 'orange' | 'cyan';
}) {
  return (
    <Link href={href} className="studio-quick-action">
      <div className="studio-quick-action-icon">
        <Icon className={`size-5 ${iconColors[tone]}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1D2129]">{label}</p>
        <p className="text-xs text-[#86909c] truncate">{description}</p>
      </div>
    </Link>
  );
}
