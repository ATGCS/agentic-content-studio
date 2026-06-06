import { cn } from '@/lib/utils';
import { getStatusLabel, getStatusStyle } from '@/lib/tokens';

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = getStatusStyle(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border-0 px-2 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
