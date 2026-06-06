import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({
  title = '暂无数据',
  description = '创建第一条记录开始使用',
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="studio-empty">
      <div className="studio-empty-icon">
        <Inbox className="size-5 text-[#1664ff]" />
      </div>
      <p className="text-base font-semibold text-[#1D2129]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-[#86909c]">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
