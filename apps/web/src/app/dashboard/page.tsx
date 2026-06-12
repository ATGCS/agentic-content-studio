'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { DashboardTodoRail } from '@/components/studio/dashboard-todo-rail';
import { CreationWorkflowGuide } from '@/components/studio/creation-workflow-guide';
import { QuickAction } from '@/components/studio/quick-action';
import { DashboardMetricCard } from '@/components/studio/dashboard-metric-card';
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
  StudioTable,
  StudioTableBody,
  StudioTableCell,
  StudioTableEmpty,
  StudioTableFrame,
  StudioTableHead,
  StudioTableHeader,
  StudioTableRow,
} from '@/components/studio/studio-table';
import { api } from '@/lib/api';

type DashboardStats = {
  pendingGenerate: number;
  generating: number;
  pendingPublish: number;
  publishedTotal: number;
  reviewed: number;
  topicCount: number;
};

const metricLinks: Record<string, string> = {
  pendingGenerate: '/contents?status=DRAFT',
  generating: '/contents?status=GENERATING',
  pendingPublish: '/publishing',
  publishedTotal: '/contents?status=PUBLISHED',
};

const metricConfig = [
  {
    key: 'pendingGenerate' as const,
    label: '待生成',
    icon: FileText,
    tone: 'blue' as const,
  },
  {
    key: 'generating' as const,
    label: '生成中',
    icon: Loader2,
    tone: 'cyan' as const,
  },
  {
    key: 'pendingPublish' as const,
    label: '待发布',
    icon: Send,
    tone: 'purple' as const,
  },
  {
    key: 'publishedTotal' as const,
    label: '已发布',
    icon: CheckCircle,
    tone: 'green' as const,
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
        pendingPublish: stats.pendingPublish,
        published: stats.publishedTotal,
        reviewed: stats.reviewed,
      }
    : {};

  return (
    <StudioLayout>
      <CreationWorkflowGuide />
      <PageContainer className="max-w-none -mt-2 gap-2 p-3 md:p-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <QuickAction
                href="/contents"
                label="新建文章"
                description="填写标题即可开始，创建后一键 AI 生成"
                icon={Sparkles}
                tone="blue"
              />
              <QuickAction
                href="/topics"
                label="创建系列（可选）"
                description="多篇同主题文章需要归组时再使用"
                icon={Layers}
                tone="purple"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              {metricConfig.map(({ key, label, icon, tone }) => (
                <DashboardMetricCard
                  key={key}
                  label={label}
                  value={loading ? '—' : (stats?.[key] ?? 0)}
                  icon={icon}
                  tone={tone}
                  href={metricLinks[key]}
                />
              ))}
              <DashboardMetricCard
                label="系列总数"
                value={loading ? '—' : (stats?.topicCount ?? 0)}
                icon={Layers}
                tone="purple"
                href="/topics"
              />
            </div>

            <StudioCard contentClassName="p-3">
              <WorkflowKanban items={items} counts={kanbanCounts} />
            </StudioCard>

            <StudioCard contentClassName="overflow-hidden p-0">
              <div className="flex items-center justify-between px-4 py-3">
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
                <StudioTable>
                  <StudioTableHeader>
                    <StudioTableRow>
                      <StudioTableHead>系列</StudioTableHead>
                      <StudioTableHead>目标平台</StudioTableHead>
                      <StudioTableHead>目标账号</StudioTableHead>
                      <StudioTableHead>当前状态</StudioTableHead>
                      <StudioTableHead>负责人</StudioTableHead>
                      <StudioTableHead>最近更新时间</StudioTableHead>
                    </StudioTableRow>
                  </StudioTableHeader>
                  <StudioTableBody>
                    {items.slice(0, 10).map((c) => {
                      const version = c.versions?.[0];
                      const owner = c.creator?.name ?? c.creator?.email ?? '—';
                      return (
                        <StudioTableRow key={c.id}>
                          <StudioTableCell className="max-w-[200px]">
                            <Link
                              href={`/contents/${c.id}`}
                              className="truncate font-medium text-[#1664ff] hover:underline"
                            >
                              {c.title}
                            </Link>
                          </StudioTableCell>
                          <StudioTableCell>
                            {version?.platform ? (
                              <PlatformBadge platform={version.platform} />
                            ) : (
                              <span className="text-xs text-[#86909c]">—</span>
                            )}
                          </StudioTableCell>
                          <StudioTableCell className="text-sm text-[#4e5969]">
                            {version?.account?.accountName ?? '—'}
                          </StudioTableCell>
                          <StudioTableCell>
                            <StatusDot status={c.status} />
                          </StudioTableCell>
                          <StudioTableCell>
                            <span className="inline-flex items-center gap-2 text-sm text-[#4e5969]">
                              <span className="flex size-6 items-center justify-center rounded-full bg-[#f0f5ff] text-[10px] font-medium text-[#1664ff]">
                                {owner.slice(0, 1)}
                              </span>
                              {owner}
                            </span>
                          </StudioTableCell>
                          <StudioTableCell className="text-sm text-[#86909c]">
                            {new Date(c.updatedAt).toLocaleString('zh-CN', {
                              hour12: false,
                            })}
                          </StudioTableCell>
                        </StudioTableRow>
                      );
                    })}
                  </StudioTableBody>
                </StudioTable>
              )}
            </StudioCard>
          </div>

          <DashboardTodoRail
            stats={stats}
            items={items.map((item) => ({
              id: item.id,
              title: item.title,
              status: item.status,
              versions: item.versions ?? [],
            }))}
          />
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
