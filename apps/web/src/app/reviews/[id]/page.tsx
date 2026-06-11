'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { GenerationResultPreview } from '@/components/studio/generation-result-preview';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import {
  reviewPreviewPlatform,
  toGenerationPreviewData,
  type ReviewPreviewPayload,
} from '@/lib/review-preview';

const reviewItems = [
  { key: 'title', label: '标题' },
  { key: 'cover', label: '封面' },
  { key: 'body', label: '正文' },
  { key: 'tags', label: '标签' },
  { key: 'compliance', label: '合规' },
];

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [review, setReview] = useState<ReviewPreviewPayload | null>(null);
  const [comment, setComment] = useState('');
  const [operating, setOperating] = useState(false);

  useEffect(() => {
    api<ReviewPreviewPayload>(`/api/reviews/${id}`)
      .then((r) => {
        setReview(r.data);
        setComment(r.data.comment ?? '');
      })
      .catch(console.error);
  }, [id]);

  const previewData = useMemo(
    () => (review ? toGenerationPreviewData(review) : null),
    [review]
  );
  const previewPlatform = review ? reviewPreviewPlatform(review) : 'draft';

  async function handleApprove() {
    setOperating(true);
    try {
      await api(`/api/reviews/${id}/approve`, { method: 'POST' });
      router.push('/reviews');
    } finally {
      setOperating(false);
    }
  }

  async function handleReject() {
    setOperating(true);
    try {
      await api(`/api/reviews/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment: comment || '需修改' }),
      });
      router.push('/reviews');
    } finally {
      setOperating(false);
    }
  }

  if (!review || !previewData) {
    return (
      <StudioLayout>
        <PageContainer>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7B61FF] border-t-transparent" />
          </div>
        </PageContainer>
      </StudioLayout>
    );
  }

  const isPending = review.status === 'PENDING' || review.status === 'pending';

  const statusConfig = {
    PENDING: { label: '待审核', color: '#FF7D00', bg: '#FFF7E6', icon: Clock },
    APPROVED: {
      label: '已通过',
      color: '#00B42A',
      bg: '#E8FFEA',
      icon: ShieldCheck,
    },
    REJECTED: {
      label: '已驳回',
      color: '#F53F3F',
      bg: '#FFF1F0',
      icon: XCircle,
    },
    pending: { label: '待审核', color: '#FF7D00', bg: '#FFF7E6', icon: Clock },
    approved: {
      label: '已通过',
      color: '#00B42A',
      bg: '#E8FFEA',
      icon: ShieldCheck,
    },
    rejected: {
      label: '已驳回',
      color: '#F53F3F',
      bg: '#FFF1F0',
      icon: XCircle,
    },
  };
  const sc =
    statusConfig[review.status as keyof typeof statusConfig] ||
    statusConfig.PENDING;
  const StatusIcon = sc.icon;

  return (
    <StudioLayout>
      <PageContainer className="p-4 md:p-6">
        {/* 顶部信息栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/reviews')}
              className="flex items-center gap-1.5 text-sm text-[#86909C] hover:text-[#7B61FF] transition-colors"
            >
              <ArrowLeft className="size-4" />
              返回
            </button>
            <div className="flex items-center gap-2">
              {review.version && (
                <PlatformBadge platform={review.version.platform} />
              )}
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: sc.bg, color: sc.color }}
              >
                <StatusIcon className="size-3" />
                {sc.label}
              </span>
            </div>
          </div>
          <Link
            href={`/contents/${review.contentId}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#7B61FF] hover:underline"
          >
            <ExternalLink className="size-3.5" />
            编辑内容
          </Link>
        </div>

        <div className="flex gap-6">
          {/* 内容预览 - 直接渲染，无多余包裹 */}
          <div className="flex-1 min-w-0">
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

          {/* 右侧审核面板 - 扁平化 */}
          <aside className="w-72 shrink-0 space-y-6 hidden xl:block">
            {/* 基本信息 */}
            <div>
              <h3 className="text-xs font-semibold text-[#86909C] uppercase tracking-wider mb-3">
                基本信息
              </h3>
              <div className="space-y-2.5 text-sm">
                <div>
                  <span className="text-xs text-[#86909C]">标题</span>
                  <p className="text-[#1D2129] font-medium mt-0.5">
                    {review.content.title}
                  </p>
                </div>
                {review.version && (
                  <div>
                    <span className="text-xs text-[#86909C]">版本</span>
                    <p className="text-[#4E5969] mt-0.5">
                      {review.version.title ?? review.content.title}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-[#86909C]">提交时间</span>
                  <p className="text-[#4E5969] mt-0.5">
                    {new Date(review.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* 审核项 */}
            <div>
              <h3 className="text-xs font-semibold text-[#86909C] uppercase tracking-wider mb-3">
                审核项
              </h3>
              <div className="space-y-1.5">
                {reviewItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-[#4E5969]">{item.label}</span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: isPending ? '#FF7D00' : '#00B42A' }}
                    >
                      {isPending ? '待确认' : '已处理'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 审核操作 */}
            {isPending && (
              <div className="pt-4 border-t border-[#E5E8EF]">
                <h3 className="text-xs font-semibold text-[#86909C] uppercase tracking-wider mb-3">
                  审核操作
                </h3>
                <div className="space-y-3">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                    placeholder="驳回备注（可选）…"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#7B61FF] hover:bg-[#6A50E6]"
                      disabled={operating}
                      onClick={handleApprove}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" />
                      通过
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-[#F53F3F] text-[#F53F3F] hover:bg-[#FFF1F0]"
                      disabled={operating}
                      onClick={handleReject}
                    >
                      <XCircle className="size-4 mr-1.5" />
                      驳回
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
