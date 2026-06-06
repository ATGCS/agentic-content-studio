import { cn } from '@/lib/utils';

export function ActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('studio-action-bar', className)}>{children}</div>
  );
}
