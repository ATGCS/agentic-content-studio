'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogWrapper } from '@/components/dialog-wrapper';
import { GenerationResultPreview } from '@/components/studio/generation-result-preview';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import {
  reviewPreviewPlatform,
  toGenerationPreviewData,
  type ReviewPreviewPayload,
} from '@/lib/review-preview';
import { getPlatformLabel } from '@/lib/tokens';

interface ContentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (id: string) => Promise<void> | void;
  onReject?: (id: string, comment?: string) => Promise<void> | void;
  content?: {
    id?: string;
    title?: string;
    platform?: string;
    submitTime?: string;
  };
}

export function ContentReviewDialog({
  open,
  onOpenChange,
  onApprove,
  onReject,
  content,
}: ContentReviewDialogProps) {
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | ''>(
    ''
  );
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewPreviewPayload | null>(null);

  useEffect(() => {
    if (!open || !content?.id) {
      setReview(null);
      return;
    }
    setLoading(true);
    api<ReviewPreviewPayload>(`/api/reviews/${content.id}`)
      .then((res) => setReview(res.data))
      .catch(() => setReview(null))
      .finally(() => setLoading(false));
  }, [open, content?.id]);

  const previewData = useMemo(
    () => (review ? toGenerationPreviewData(review) : null),
    [review]
  );
  const previewPlatform = review ? reviewPreviewPlatform(review) : 'draft';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content?.id || submitting || !reviewAction) return;

    setSubmitting(true);
    try {
      if (reviewAction === 'approve') {
        await onApprove?.(content.id);
      } else {
        await onReject?.(content.id, reviewComment || undefined);
      }
      setReviewAction('');
      setReviewComment('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const platformLabel = review?.version?.platform
    ? getPlatformLabel(review.version.platform)
    : content?.platform;

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="内容审核"
      description="预览与内容详情页一致，确认后提交审核结果"
      className="sm:max-w-[900px]"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#86909C]">
          <span>
            {content?.title ?? review?.content.title ?? '—'}
            {platformLabel ? ` · ${platformLabel}` : ''}
            {content?.submitTime
              ? ` · 提交于 ${new Date(content.submitTime).toLocaleString('zh-CN')}`
              : ''}
          </span>
          {content?.id && (
            <Link
              href={`/reviews/${content.id}`}
              className="inline-flex items-center gap-1 text-[#1664FF] hover:underline"
              onClick={() => onOpenChange(false)}
            >
              全屏审核页
              <ExternalLink className="size-3" />
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-[#E5E8EF] bg-[#F7F8FA]">
          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-sm text-[#86909C]">
              <Loader2 className="size-4 animate-spin" />
              加载预览…
            </div>
          ) : previewData && review ? (
            <div className="h-[min(420px,50vh)] min-h-[280px] p-3">
              <GenerationResultPreview
                data={previewData}
                activePlatform={previewPlatform}
                availablePlatforms={
                  review.version ? [review.version.platform] : []
                }
                showHeader={false}
                fill
              />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-[#86909C]">
              预览加载失败，请使用「全屏审核页」查看
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">
              审核结果
            </Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReviewAction('approve')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs transition-all ${
                  reviewAction === 'approve'
                    ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]'
                    : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:border-[#C9D8FF]'
                }`}
              >
                <CheckCircle2 className="size-4 text-[#00B42A]" />
                通过
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('reject')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs transition-all ${
                  reviewAction === 'reject'
                    ? 'border-[#F53F3F] bg-[#FFF1F0] text-[#F53F3F]'
                    : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:border-[#C9D8FF]'
                }`}
              >
                <XCircle className="size-4 text-[#F53F3F]" />
                驳回
              </button>
            </div>
          </div>

          {reviewAction === 'reject' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#4E5969]">
                驳回说明
              </Label>
              <Textarea
                className="min-h-[80px] resize-none text-sm"
                placeholder="请说明需要修改的地方"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-[#F2F3F5] pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]"
              disabled={!reviewAction || submitting}
            >
              {submitting ? '提交中…' : '提交审核结果'}
            </Button>
          </div>
        </form>
      </div>
    </DialogWrapper>
  );
}
