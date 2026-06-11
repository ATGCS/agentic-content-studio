'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StudioNoticeType = 'success' | 'error' | 'info';

export type StudioNoticePayload = {
  type: StudioNoticeType;
  text: string;
};

const toneStyles: Record<StudioNoticeType, string> = {
  success: 'border-[#AFF0B5] bg-[#E8FFEA] text-[#00B42A]',
  error: 'border-[#FFCCC7] bg-[#FFF1F0] text-[#F53F3F]',
  info: 'border-[#C9D8FF] bg-[#F0F5FF] text-[#1664FF]',
};

const icons: Record<StudioNoticeType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function StudioNotice({
  notice,
  onDismiss,
  className,
}: {
  notice: StudioNoticePayload | null;
  onDismiss?: () => void;
  className?: string;
}) {
  if (!notice) return null;
  const Icon = icons[notice.type];
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        toneStyles[notice.type],
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-relaxed">{notice.text}</p>
      {onDismiss && (
        <button
          type="button"
          className="shrink-0 text-xs opacity-70 hover:opacity-100"
          onClick={onDismiss}
        >
          关闭
        </button>
      )}
    </div>
  );
}

export function useStudioNotice(durationMs = 4000) {
  const [notice, setNotice] = useState<StudioNoticePayload | null>(null);

  const dismiss = useCallback(() => setNotice(null), []);

  const notify = useCallback((type: StudioNoticeType, text: string) => {
    setNotice({ type, text });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [notice, durationMs]);

  return { notice, notify, dismiss };
}
