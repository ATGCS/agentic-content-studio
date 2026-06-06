import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export function StudioCard({
  children,
  className,
  contentClassName,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <Card className={cn('studio-card border', className)} onClick={onClick}>
      <CardContent className={cn('p-4 md:p-5', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
