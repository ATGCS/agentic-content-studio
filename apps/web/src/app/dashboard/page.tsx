'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  ChevronRight,
  FileText,
  Loader2,
  Send,
  Shield,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { DashboardAlertRail } from '@/components/studio/dashboard-alert-rail';
import {
  DashboardMetricCard,
  pseudoDelta,
} from '@/components/studio/dashboard-metric-card';
import { EmptyState } from '@/components/studio/empty-state';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StudioCard } from '@/components/studio/studio-card';
import {
  StatusDot,
  WorkflowKanban,
  type KanbanContent,
} from '@/components/studio/workflow-kanban';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';

type DashboardStats = {
  pendingGenerate: number;
  generating: number;
  pendingReview: number;
  pendingPublish: number;
  publishedTotal: number;
  reviewed: number;
};

const metricConfig = [
  {
    key: 'pendingGenerate' as const,
    label: '待生成',
    icon: FileText,
    tone: 'blue' as const,
    salt: 1,
  },
  {
    key: 'generating' as const,
    label: '生成中',
    icon: Loader2,
    tone: 'cyan' as const,
    salt: 2,
  },
  {
    key: 'pendingReview' as const,
    label: '待审核',
    icon: Shield,
    tone: 'orange' as const,
    salt: 3,
  },
  {
    key: 'pendingPublish' as const,
    label: '待发布',
    icon: Send,
    tone: 'purple' as const,
    salt: 4,
  },
  {
    key: 'publishedTotal' as const,
    label: '已发布',
    icon: CheckCircle,
    tone: 'green' as const,
    salt: 5,
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [items, setItems] = useState<KanbanContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<DashboardStats>('/api/dashboard/stats'),
      api<{ items: KanbanContent[] }>('/api/contents?pageSize=50'),
    ])
      .then(([s, c]) => {
        setStats(s.data);
        setItems(c.data.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kanbanCounts = stats
    ? {
        pendingGenerate: stats.pendingGenerate,
        generating: stats.generating,
        pendingReview: stats.pendingReview,
        pendingPublish: stats.pendingPublish,
        published: stats.publishedTotal,
        reviewed: stats.reviewed,
      }
    : {};

  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-4 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              {metricConfig.map(({ key, label, icon, tone, salt }) => (
                <DashboardMetricCard
                  key={key}
                  label={label}
                  value={loading ? '—' : (stats?.[key] ?? 0)}
                  delta={stats ? pseudoDelta(stats[key], salt) : undefined}
                  icon={icon}
                  tone={tone}
                />
              ))}
            </div>

            <StudioCard contentClassName="p-5">
              <WorkflowKanban items={items} counts={kanbanCounts} />
            </StudioCard>

            <StudioCard contentClassName="overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-sm font-semibold text-[#1D2129]">
                  最近内容管理列表
                </h3>
                <Link
                  href="/contents"
                  className="flex items-center gap-1 text-xs text-[#1664ff]"
                >
                  查看全部 <ChevronRight className="size-3" />
                </Link>
              </div>
              {items.length === 0 && !loading ? (
                <div className="py-10">
                  <EmptyState
                    title="还没有内容"
                    description="从新建内容开始你的运营流程"
                  />
                  <div className="flex justify-center pb-6">
                    <Button asChild>
                      <Link href="/contents">新建内容</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <Table className="studio-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>系列</TableHead>
                      <TableHead>目标平台</TableHead>
                      <TableHead>目标账号</TableHead>
                      <TableHead>当前状态</TableHead>
                      <TableHead>负责人</TableHead>
                      <TableHead>最近更新时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.slice(0, 10).map((c) => {
                      const version = c.versions?.[0];
                      const owner = c.creator?.name ?? c.creator?.email ?? '—';
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="max-w-[200px]">
                            <Link
                              href={`/contents/${c.id}`}
                              className="truncate font-medium text-[#1664ff] hover:underline"
                            >
                              {c.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {version?.platform ? (
                              <PlatformBadge platform={version.platform} />
                            ) : (
                              <span className="text-xs text-[#86909c]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-[#4e5969]">
                            {version?.account?.accountName ?? '—'}
                          </TableCell>
                          <TableCell>
                            <StatusDot status={c.status} />
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-2 text-sm text-[#4e5969]">
                              <span className="flex size-6 items-center justify-center rounded-full bg-[#f0f5ff] text-[10px] font-medium text-[#1664ff]">
                                {owner.slice(0, 1)}
                              </span>
                              {owner}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-[#86909c]">
                            {new Date(c.updatedAt).toLocaleString('zh-CN', {
                              hour12: false,
                            })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </StudioCard>
          </div>

          <DashboardAlertRail />
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
