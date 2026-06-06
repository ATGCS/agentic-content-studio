'use client';

import { cn } from '@/lib/utils';

export function StudioTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="studio-tabs">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'studio-tab',
            value === item.value && 'studio-tab--active'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
