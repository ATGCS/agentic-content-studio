'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StatusBadge } from '@/components/studio/status-badge';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

type ReviewDetail = {
  id: string;
  status: string;
  riskLevel?: string;
  reviewType?: string;
  comment?: string | null;
  createdAt: string;
  content: {
    id: string;
    title: string;
    summary?: string | null;
    body?: string | null;
  };
  version: {
    id: string;
    platform: string;
    title?: string | null;
    body?: string | null;
    coverUrl?: string | null;
    tags?: string[] | string | null;
  };
};

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .filter((t) => typeof t === 'string')
      .map((t) => (t as string).trim());
  }
  if (typeof tags === 'string' && tags) {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

const reviewItems = [
  { key: 'title', label: '标题审核' },
  { key: 'cover', label: '封面审核' },
  { key: 'body', label: '正文审核' },
  { key: 'copyright', label: '图片版权审核' },
  { key: 'tags', label: '标签审核' },
  { key: 'compliance', label: '合规审核' },
  { key: 'platform', label: '平台适配审核' },
];

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [comment, setComment] = useState('');
  const [operating, setOperating] = useState(false);

  useEffect(() => {
    api<ReviewDetail>(`/api/reviews/${id}`)
      .then((r) => {
        setReview(r.data);
        setComment(r.data.comment ?? '');
      })
      .catch(console.error);
  }, [id]);

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

  if (!review) {
    return (
      <StudioLayout>
        <PageContainer>
          <p className="text-sm text-[#86909c]">加载中…</p>
        </PageContainer>
      </StudioLayout>
    );
  }

  const tags = normalizeTags(review.version.tags);

  return (
    <StudioLayout>
      <PageContainer className="max-w-none">
        <div className="mb-2">
          <button
            type="button"
            onClick={() => router.push('/reviews')}
            className="inline-flex items-center gap-1 text-sm text-[#86909c] hover:text-[#1664ff]"
          >
            <ArrowLeft className="size-4" />
            返回审核中心
          </button>
        </div>

        <div className="flex flex-col gap-6 xl:flex-row">
          {/* 左侧：内容预览 */}
          <div className="min-w-0 flex-1 space-y-4">
            <StudioCard contentClassName="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1D2129]">
                  内容预览
                </h3>
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={review.version.platform} />
                  <StatusBadge status={review.status} />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-lg font-semibold text-[#1D2129]">
                  {review.version.title ?? review.content.title}
                </p>
                {review.version.coverUrl && (
                  <div className="flex h-40 items-center justify-center rounded-lg bg-[#f5f7fa]">
                    <img
                      src={review.version.coverUrl}
                      alt="封面"
                      className="h-full rounded-lg object-cover"
                    />
                  </div>
                )}
                <p className="text-sm leading-relaxed text-[#4e5969]">
                  {review.version.body ?? review.content.body ?? '暂无正文'}
                </p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[#f0f5ff] px-2 py-0.5 text-xs text-[#1664ff]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </StudioCard>
          </div>

          {/* 右侧：审核面板 */}
          <aside className="w-full shrink-0 xl:w-96 space-y-4">
            <StudioCard contentClassName="p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
                审核项清单
              </h3>
              <div className="space-y-2">
                {reviewItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg bg-[#fafbfc] px-3 py-2"
                  >
                    <span className="text-sm text-[#4e5969]">{item.label}</span>
                    <span className="rounded bg-[#f0f5ff] px-2 py-0.5 text-xs text-[#1664ff]">
                      待审核
                    </span>
                  </div>
                ))}
              </div>
            </StudioCard>

            <StudioCard contentClassName="space-y-4 p-4">
              <h3 className="text-sm font-semibold text-[#1D2129]">审核意见</h3>
              <div className="space-y-2">
                <Label className="text-xs text-[#86909c]">备注</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="studio-input resize-none"
                  placeholder="输入审核意见…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  disabled={operating}
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="size-4" />
                  审核通过
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-[#f53f3f]"
                  disabled={operating}
                  onClick={handleReject}
                >
                  <XCircle className="size-4" />
                  驳回
                </Button>
              </div>
            </StudioCard>

            <StudioCard contentClassName="p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#1D2129]">
                审核信息
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#86909c]">提交时间</span>
                  <span className="text-[#4e5969]">
                    {new Date(review.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86909c]">当前状态</span>
                  <StatusBadge status={review.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86909c]">关联内容</span>
                  <span className="max-w-[140px] truncate text-[#4e5969]">
                    {review.content.title}
                  </span>
                </div>
              </div>
            </StudioCard>
          </aside>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
