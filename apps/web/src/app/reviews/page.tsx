'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  MoreHorizontal,
  Calendar,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XOctagon,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api';

/* ---------- types ---------- */

type ReviewItem = {
  id: string;
  title: string;
  platform: string;
  account: string;
  reviewType: string;
  riskLevel: 'high' | 'medium' | 'low';
  submittedAt: string;
  source: string;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED';
  content?: { title: string };
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

type TabValue = 'all' | 'pending' | 'highRisk' | 'rejected' | 'approved';

const tabs: { value: TabValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'highRisk', label: '高风险' },
  { value: 'rejected', label: '已驳回' },
  { value: 'approved', label: '已通过' },
];

/* ---------- page ---------- */

export default function ReviewsPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewsStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  /* filter state */
  const [platformFilter, setPlatformFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [reviewTypeFilter, setReviewTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const tabStatusMap: Record<TabValue, string> = {
    all: '',
    pending: 'PENDING',
    highRisk: '',
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
    setAccountFilter('all');
    setReviewTypeFilter('all');
    setRiskFilter('all');
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

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: '待审核',
        value: stats.pending,
        delta: '+0',
        icon: Clock,
        iconBg: '#FFF7E6',
        iconColor: '#FF7D00',
      },
      {
        label: '高风险',
        value: 0,
        delta: '+0',
        icon: ShieldAlert,
        iconBg: '#FFF1F0',
        iconColor: '#F53F3F',
      },
      {
        label: '已驳回',
        value: stats.rejected,
        delta: '+0',
        icon: XOctagon,
        iconBg: '#F5F1FF',
        iconColor: '#7B61FF',
      },
      {
        label: '已通过',
        value: stats.approved,
        delta: '+0',
        icon: ShieldCheck,
        iconBg: '#E8FFEA',
        iconColor: '#00B42A',
      },
      {
        label: '今日审核量',
        value: 0,
        delta: '+0',
        icon: FileText,
        iconBg: '#E8F3FF',
        iconColor: '#1664FF',
      },
    ];
  }, [stats]);

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

  /* ---- helpers ---- */
  const getRiskBadge = (level: string) => {
    if (level === 'high')
      return (
        <Badge
          variant="secondary"
          className="bg-[#FFF1F0] text-[#F53F3F] hover:bg-[#FFF1F0] border-0"
        >
          高风险
        </Badge>
      );
    if (level === 'medium')
      return (
        <Badge
          variant="secondary"
          className="bg-[#FFF7E6] text-[#FF7D00] hover:bg-[#FFF7E6] border-0"
        >
          中风险
        </Badge>
      );
    return (
      <Badge
        variant="secondary"
        className="bg-[#E8FFEA] text-[#00B42A] hover:bg-[#E8FFEA] border-0"
      >
        低风险
      </Badge>
    );
  };

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

  const [showFilters, setShowFilters] = useState(true);

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
                title: reviewingItem.content?.title || reviewingItem.title,
                platform: reviewingItem.platform,
                submitTime: reviewingItem.submittedAt,
              }
            : undefined
        }
      />
      <StudioLayout>
        <PageContainer className="p-0 gap-0">
          <div className="flex min-h-screen">
            <div className="flex-1 p-4 md:p-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {statsLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="studio-stat-card flex items-start justify-between p-4 bg-white rounded-xl shadow-sm border border-[#EEF0F5]"
                      >
                        <div>
                          <div className="studio-stat-label text-xs text-[#86909C]">
                            加载中…
                          </div>
                          <div className="studio-stat-value mt-2 text-2xl font-bold text-[#1D2129]">
                            —
                          </div>
                        </div>
                      </div>
                    ))
                  : statCards.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={stat.label}
                          className="studio-stat-card flex items-start justify-between cursor-pointer relative p-4 bg-white rounded-xl shadow-sm border border-[#EEF0F5]"
                        >
                          <div>
                            <div className="studio-stat-label text-xs text-[#86909C]">
                              {stat.label}
                            </div>
                            <div className="studio-stat-value mt-2 text-2xl font-bold text-[#1D2129]">
                              {stat.value}
                            </div>
                            <div className="studio-stat-hint flex items-center gap-1 mt-1">
                              <span className="text-xs text-[#86909C]">
                                较昨日
                              </span>
                              <span className="text-[#F53F3F] font-medium text-xs">
                                {stat.delta}
                              </span>
                            </div>
                          </div>
                          <div
                            className="studio-stat-icon rounded-lg p-2"
                            style={{ backgroundColor: stat.iconBg }}
                          >
                            <Icon
                              className="size-6"
                              style={{ color: stat.iconColor }}
                            />
                          </div>
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#C9CDD4]" />
                        </div>
                      );
                    })}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-[#EEF0F5]">
                <div className="border-b border-[#E5E8EF] px-5 pt-5">
                  {/* 标签页 */}
                  <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-1">
                    {tabCounts.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTab(t.value)}
                        className={`flex items-center gap-1.5 pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                          tab === t.value
                            ? 'border-[#1664FF] text-[#1664FF]'
                            : 'border-transparent text-[#86909C] hover:text-[#4E5969]'
                        }`}
                      >
                        {t.label}
                        <span
                          className={`text-xs ${tab === t.value ? 'text-[#1664FF]/80' : 'text-[#A9AEB8]'}`}
                        >
                          {'count' in t && typeof t.count === 'number'
                            ? t.count
                            : 0}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* 筛选行 */}
                  <div className="flex flex-wrap items-center gap-3 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#86909C] min-w-[48px]">
                        平台
                      </span>
                      <Select
                        value={platformFilter}
                        onValueChange={setPlatformFilter}
                      >
                        <SelectTrigger size="sm" className="w-28 h-8 text-xs">
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
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#86909C] min-w-[48px]">
                        账号
                      </span>
                      <Select
                        value={accountFilter}
                        onValueChange={setAccountFilter}
                      >
                        <SelectTrigger size="sm" className="w-28 h-8 text-xs">
                          <SelectValue placeholder="全部账号" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部账号</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#86909C] min-w-[60px]">
                        审核类型
                      </span>
                      <Select
                        value={reviewTypeFilter}
                        onValueChange={setReviewTypeFilter}
                      >
                        <SelectTrigger size="sm" className="w-28 h-8 text-xs">
                          <SelectValue placeholder="全部类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部类型</SelectItem>
                          <SelectItem value="content">内容合规</SelectItem>
                          <SelectItem value="marketing">营销合规</SelectItem>
                          <SelectItem value="image">图片审核</SelectItem>
                          <SelectItem value="copyright">版权审核</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#86909C] min-w-[60px]">
                        风险等级
                      </span>
                      <Select value={riskFilter} onValueChange={setRiskFilter}>
                        <SelectTrigger size="sm" className="w-28 h-8 text-xs">
                          <SelectValue placeholder="全部风险" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部风险</SelectItem>
                          <SelectItem value="high">高风险</SelectItem>
                          <SelectItem value="medium">中风险</SelectItem>
                          <SelectItem value="low">低风险</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]"
                      >
                        <Calendar className="size-3.5 mr-1" />
                        开始日期 - 结束日期
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]"
                        onClick={resetFilters}
                      >
                        <RotateCcw className="size-3.5 mr-1" />
                        重置
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-[#1664FF] hover:bg-[#1664FF]/90"
                        onClick={() => load()}
                      >
                        <Search className="size-3.5 mr-1" />
                        筛选
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        {showFilters ? '收起' : '展开'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-[#E5E8EF]">
                        <TableHead className="w-10 py-3">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-[#C9CDD4] text-[#1664FF] focus:ring-[#1664FF]"
                          />
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3">
                          内容标题
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3">
                          平台
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3">
                          目标账号
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3">
                          审核类型
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3">
                          风险等级
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3">
                          提交时间
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3">
                          提交人来源
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3">
                          状态
                        </TableHead>
                        <TableHead className="text-xs text-[#86909C] font-normal py-3 text-right">
                          操作
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="py-8 text-center text-[#86909C]"
                          >
                            加载中…
                          </TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="py-8 text-center text-[#86909C]"
                          >
                            暂无待审核内容
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => {
                          const isPending =
                            item.status === 'pending' ||
                            item.status === 'PENDING';
                          return (
                            <TableRow
                              key={item.id}
                              className="hover:bg-[#F7F8FA] border-[#E5E8EF] group"
                            >
                              <TableCell className="py-3">
                                <input
                                  type="checkbox"
                                  className="size-4 rounded border-[#C9CDD4] text-[#1664FF] focus:ring-[#1664FF]"
                                />
                              </TableCell>
                              <TableCell className="py-3">
                                <Link
                                  href={`/reviews/${item.id}`}
                                  className="text-sm font-medium text-[#1D2129] hover:text-[#1664FF] hover:underline max-w-[260px] truncate block"
                                >
                                  {item.content?.title || item.title}
                                </Link>
                              </TableCell>
                              <TableCell className="py-3">
                                <PlatformBadge platform={item.platform} />
                              </TableCell>
                              <TableCell className="py-3 text-sm text-[#4E5969]">
                                {item.account || '-'}
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge
                                  variant="secondary"
                                  className="bg-[#F2F5FA] text-[#4E5969] hover:bg-[#F2F5FA] border-0"
                                >
                                  {item.reviewType || '内容合规'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3">
                                {getRiskBadge(item.riskLevel || 'low')}
                              </TableCell>
                              <TableCell className="py-3 text-sm text-[#86909C]">
                                {item.submittedAt
                                  ? new Date(item.submittedAt).toLocaleString(
                                      'zh-CN',
                                      {
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )
                                  : '-'}
                              </TableCell>
                              <TableCell className="py-3 text-sm text-[#86909C]">
                                {item.source || 'Agent生成'}
                              </TableCell>
                              <TableCell className="py-3">
                                {getStatusBadge(item.status)}
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  {isPending ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleReview(item)}
                                        className="text-sm text-[#1664FF] hover:underline font-medium"
                                      >
                                        审核
                                      </button>
                                      <Link
                                        href={`/reviews/${item.id}`}
                                        className="text-sm text-[#4E5969] hover:text-[#1664FF]"
                                      >
                                        详情
                                      </Link>
                                    </>
                                  ) : (
                                    <Link
                                      href={`/reviews/${item.id}`}
                                      className="text-sm text-[#4E5969] hover:text-[#1664FF]"
                                    >
                                      查看
                                    </Link>
                                  )}
                                  <Link
                                    href={`/reviews/${item.id}`}
                                    className="text-[#86909C] hover:text-[#4E5969] opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>

                  {/* 分页 */}
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-[#86909C]">共 {total} 条</div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={pageSize}
                        onValueChange={(v) => {
                          setPageSize(v);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger size="sm" className="w-20 h-8 text-xs">
                          <SelectValue placeholder="10条/页" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10条/页</SelectItem>
                          <SelectItem value="20">20条/页</SelectItem>
                          <SelectItem value="50">50条/页</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 bg-white border-[#E5E8EF]"
                          disabled={page <= 1}
                          onClick={() => setPage(page - 1)}
                        >
                          <ChevronLeft className="size-4 text-[#C9CDD4]" />
                        </Button>
                        {Array.from(
                          { length: Math.min(totalPages, 5) },
                          (_, i) => {
                            const p = Math.max(
                              1,
                              Math.min(page - 2, totalPages - 4 + i)
                            );
                            if (p + i > totalPages) return null;
                            const pageNum =
                              i === 0
                                ? Math.max(1, page - 2)
                                : Math.max(1, page - 2) + i;
                            if (pageNum > totalPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant="outline"
                                className={cn(
                                  'h-8 w-8 p-0',
                                  pageNum === page
                                    ? 'bg-[#1664FF] border-[#1664FF] text-white hover:bg-[#1664FF] hover:text-white'
                                    : 'bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                                )}
                                onClick={() => setPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        ).filter(Boolean)}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 bg-white border-[#E5E8EF]"
                          disabled={page >= totalPages}
                          onClick={() => setPage(page + 1)}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-[#86909C]">
                          第 {page}/{totalPages} 页
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 侧边栏：风险分布 */}
            <div className="w-64 border-l border-[#E5E8EF] bg-white p-5 hidden xl:block">
              {stats && (
                <>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-[#1D2129] mb-4">
                        审核状态分布
                      </h4>
                      <div className="space-y-3">
                        {[
                          {
                            label: '待审核',
                            value: stats.pending,
                            color: '#FF7D00',
                          },
                          {
                            label: '已通过',
                            value: stats.approved,
                            color: '#00B42A',
                          },
                          {
                            label: '已驳回',
                            value: stats.rejected,
                            color: '#F53F3F',
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-[#86909C]">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-[#4E5969] font-medium">
                              {item.value}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-[#E5E8EF]">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-[#1D2129]">总计</span>
                            <span className="text-[#1D2129]">
                              {stats.total}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#E5E8EF] pt-6">
                      <h4 className="text-sm font-medium text-[#1D2129] mb-4">
                        平台分布
                      </h4>
                      <div className="space-y-3">
                        {stats.platformDistribution.map((item) => (
                          <div key={item.platform} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <PlatformBadge
                                platform={item.platform}
                                size="sm"
                              />
                              <span className="text-[#4E5969] font-medium">
                                {item.count} ({item.percent})
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1664FF] rounded-full transition-all"
                                style={{ width: item.percent }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </StudioLayout>
    </>
  );
}
