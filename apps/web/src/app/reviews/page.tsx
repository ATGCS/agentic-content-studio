'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ContentReviewDialog } from '@/components/dialogs/content-review-dialog';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/platform-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api';

/* ---------- types ---------- */

type ReviewItem = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  content?: { id: string; title: string } | null;
  version?: { id: string; platform: string; title?: string } | null;
};

type ReviewsResponse = {
  items: ReviewItem[];
  total: number;
  page: number;
  pageSize: number;
};

type ReviewsStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  platformDistribution: { platform: string; count: number; percent: string }[];
};

/* ---------- tab config ---------- */

type TabValue = 'all' | 'pending' | 'rejected' | 'approved';

const tabs: { value: TabValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'rejected', label: '已驳回' },
  { value: 'approved', label: '已通过' },
];

/* ---------- page ---------- */

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('status');
  const [tab, setTab] = useState<TabValue>(() => {
    if (initialTab === 'pending') return 'pending';
    if (initialTab === 'approved') return 'approved';
    if (initialTab === 'rejected') return 'rejected';
    return 'all';
  });
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewsStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setStatsLoading] = useState(true);

  const [platformFilter, setPlatformFilter] = useState('all');

  const tabStatusMap: Record<TabValue, string> = {
    all: '',
    pending: 'PENDING',
    rejected: 'REJECTED',
    approved: 'APPROVED',
  };

  /* ---- load reviews ---- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const status = tabStatusMap[tab];
      if (status) params.set('status', status);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      params.set('page', String(page));
      params.set('pageSize', pageSize);
      const res = await api<ReviewsResponse>(
        `/api/reviews?${params.toString()}`
      );
      setItems(res.data.items);
      setTotal(res.data.total ?? res.data.items.length);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, [tab, platformFilter, page, pageSize]);

  /* ---- load stats ---- */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api<ReviewsStats>('/api/reviews/stats');
      setStats(res.data);
    } catch {
      // 非必需
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  useEffect(() => {
    loadStats().catch(console.error);
  }, [loadStats]);

  /* reset to page 1 on filter change */
  useEffect(() => {
    setPage(1);
  }, [tab, platformFilter, pageSize]);

  function resetFilters() {
    setPlatformFilter('all');
    setTab('all');
  }

  /* ---- review actions ---- */
  const handleReview = (item: ReviewItem) => {
    setReviewingItem(item);
    setReviewDialogOpen(true);
  };

  async function approve(id: string) {
    await api(`/api/reviews/${id}/approve`, { method: 'POST' });
    await Promise.all([load(), loadStats()]);
  }

  async function reject(id: string, comment?: string) {
    await api(`/api/reviews/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    await Promise.all([load(), loadStats()]);
  }

  /* ---- computed ---- */
  const totalPages = Math.max(1, Math.ceil(total / Number(pageSize)));

  const tabCounts = useMemo(() => {
    if (!stats) return tabs;
    return tabs.map((t) => ({
      ...t,
      count:
        t.value === 'all'
          ? stats.total
          : t.value === 'pending'
            ? stats.pending
            : t.value === 'approved'
              ? stats.approved
              : t.value === 'rejected'
                ? stats.rejected
                : 0,
    }));
  }, [stats]);

  const getStatusBadge = (status: string) => {
    if (status === 'pending' || status === 'PENDING')
      return (
        <Badge
          variant="secondary"
          className="bg-[#FFF7E6] text-[#FF7D00] hover:bg-[#FFF7E6] border-0"
        >
          待审核
        </Badge>
      );
    if (status === 'approved' || status === 'APPROVED')
      return (
        <Badge
          variant="secondary"
          className="bg-[#E8FFEA] text-[#00B42A] hover:bg-[#E8FFEA] border-0"
        >
          已通过
        </Badge>
      );
    return (
      <Badge
        variant="secondary"
        className="bg-[#FFF1F0] text-[#F53F3F] hover:bg-[#FFF1F0] border-0"
      >
        已驳回
      </Badge>
    );
  };

  return (
    <>
      <ContentReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onApprove={approve}
        onReject={reject}
        content={
          reviewingItem
            ? {
                id: reviewingItem.id,
                title: reviewingItem.content?.title || reviewingItem.version?.title || '',
                platform: reviewingItem.version?.platform || '',
                submitTime: reviewingItem.createdAt,
              }
            : undefined
        }
      />
      <StudioLayout>
        <PageContainer className="max-w-none gap-3 p-4">
          {/* 紧凑工具栏：状态 tabs + 平台筛选 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {tabCounts.map((t) => {
                const active = tab === t.value;
                const count = 'count' in t && typeof t.count === 'number' ? t.count : 0;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${active ? 'bg-[#7B61FF] text-white ring-1 ring-current/20' : 'bg-[#F2F3F5] text-[#4E5969] hover:bg-[#E5E8EF]'}`}
                  >
                    {t.label}{' '}
                    <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mx-1 h-5 w-px bg-[#E5E8EF]" />

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger size="sm" className="w-24 h-8 text-xs">
                <SelectValue placeholder="全部平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                <SelectItem value="WECHAT">微信公众号</SelectItem>
                <SelectItem value="XIAOHONGSHU">小红书</SelectItem>
                <SelectItem value="DOUYIN">抖音</SelectItem>
                <SelectItem value="ZHIHU">知乎</SelectItem>
                <SelectItem value="BILIBILI">B站</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-[#86909C]"
              onClick={resetFilters}
            >
              <RotateCcw className="size-3.5 mr-1" />
              重置
            </Button>
          </div>

          <div>
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-[#E5E8EF] rounded-xl p-3 space-y-2 animate-pulse"
                >
                  <div className="h-4 bg-[#F2F3F5] rounded w-3/4" />
                  <div className="h-3 bg-[#F7F8FA] rounded w-1/2" />
                  <div className="h-3 bg-[#F7F8FA] rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#86909C]">
              <ShieldAlert className="size-10 mb-2 text-[#C9CDD4]" />
              <p className="text-sm">暂无审核内容</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const isPending =
                  item.status === 'pending' || item.status === 'PENDING';
                return (
                  <Link
                    key={item.id}
                    href={`/reviews/${item.id}`}
                    className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md hover:border-[#7B61FF]/40 transition-all cursor-pointer"
                  >
                    {/* 标题 + 状态 */}
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#7B61FF] transition-colors">
                        {item.content?.title || item.version?.title || '未命名内容'}
                      </h3>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* 平台 + 时间 */}
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                      <PlatformBadge platform={item.version?.platform} size="sm" />
                      <span className="ml-auto whitespace-nowrap">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </span>
                    </div>

                    {/* 操作 */}
                    <div
                      className="mt-2 flex items-center gap-1.5 border-t border-[#F2F3F5] pt-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      {isPending && (
                        <Button
                          size="sm"
                          className="h-7 flex-1 text-[11px] bg-[#7B61FF] hover:bg-[#6A50E6] text-white"
                          onClick={() => handleReview(item)}
                        >
                          审核
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-[11px] border-[#E5E8EF]"
                      >
                        详情
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* 分页 */}
          <div className="flex items-center justify-between text-xs text-[#86909c]">
            <span>共 {total} 条 · 第 {page}/{totalPages} 页</span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 bg-white border-[#E5E8EF]"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4 + i));
                if (pageNum + i > totalPages) return null;
                const p = i === 0 ? Math.max(1, page - 2) : Math.max(1, page - 2) + i;
                if (p > totalPages) return null;
                return (
                  <Button
                    key={p}
                    size="sm"
                    variant="outline"
                    className={cn(
                      'h-7 w-7 p-0 text-xs',
                      p === page
                        ? 'bg-[#7B61FF] border-[#7B61FF] text-white hover:bg-[#7B61FF]'
                        : 'bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                    )}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              }).filter(Boolean)}
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 bg-white border-[#E5E8EF]"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Select
                value={pageSize}
                onValueChange={(v) => {
                  setPageSize(v);
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-20 h-7 text-xs ml-2">
                  <SelectValue placeholder="10条/页" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10条/页</SelectItem>
                  <SelectItem value="20">20条/页</SelectItem>
                  <SelectItem value="50">50条/页</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PageContainer>
      </StudioLayout>
    </>
  );
}
