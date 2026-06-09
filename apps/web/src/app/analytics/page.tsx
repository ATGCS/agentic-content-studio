'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Download,
  Eye,
  Gauge,
  MessageSquare,
  Share2,
  Star,
  ThumbsUp,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/platform-icon';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/* ---------- types ---------- */

type AggregateMetrics = {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalCollects: number;
};

type TopContentItem = {
  contentId: string;
  title: string;
  platform: string;
  views: string;
  interactions: string;
  completion: string;
};

type AggregateResponse = {
  metrics: AggregateMetrics;
  top10: TopContentItem[];
};

type AnalyticsReport = {
  id: string;
  contentId: string;
  summary: string;
  insights?: unknown;
  suggestions?: unknown;
  createdByAgent: boolean;
  createdAt: string;
};

/* ---------- constants ---------- */

const tabs = ['内容表现', '平台表现', '账号表现', 'Agent 表现', '知识库效果'];

const metricConfig = [
  {
    key: 'totalViews' as const,
    label: '阅读量',
    icon: Eye,
    bg: '#E8F3FF',
    color: '#1664FF',
  },
  {
    key: 'totalLikes' as const,
    label: '点赞数',
    icon: ThumbsUp,
    bg: '#E8FFFB',
    color: '#14C9C9',
  },
  {
    key: 'totalCollects' as const,
    label: '收藏数',
    icon: Star,
    bg: '#FFF7E8',
    color: '#FFB400',
  },
  {
    key: 'totalComments' as const,
    label: '评论数',
    icon: MessageSquare,
    bg: '#F0F3FF',
    color: '#4E6EF2',
  },
  {
    key: 'totalShares' as const,
    label: '转发数',
    icon: Share2,
    bg: '#E8FFEA',
    color: '#00B42A',
  },
  {
    key: undefined as never,
    label: '完读率',
    icon: Gauge,
    bg: '#E8F7FF',
    color: '#00A3FF',
  },
];

function formatViews(value: number): string {
  if (value >= 10000) return (value / 10000).toFixed(2) + 'w';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
  return String(value);
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  wide?: boolean;
}) {
  return (
    <div className={cn('space-y-2', wide ? 'w-[235px]' : 'w-[180px]')}>
      <p className="text-xs font-medium text-[#4E5969]">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full items-center rounded-md border border-[#E5E8EF] bg-white px-3 text-xs font-medium text-[#1D2129] shadow-sm outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-[#1D2129]">{title}</h3>
      {subtitle && (
        <p className="mt-1 text-[11px] text-[#86909C]">{subtitle}</p>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export default function AnalyticsPage() {
  const [aggregate, setAggregate] = useState<AggregateResponse | null>(null);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [aggregateLoading, setAggregateLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  /* filters (UI state only for now) */
  const [timeRange, setTimeRange] = useState('7d');
  const [contentType, setContentType] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const loadAggregate = useCallback(async () => {
    setAggregateLoading(true);
    try {
      const res = await api<AggregateResponse>('/api/analytics/aggregate');
      setAggregate(res.data);
    } catch {
      // 静默失败，页面仍可展示空状态
    } finally {
      setAggregateLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await api<AnalyticsReport[]>('/api/analytics/reports');
      setReports(res.data);
      setReportsError(null);
    } catch {
      setReportsError('分析报告加载失败，请稍后重试');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadAggregate(), loadReports()]).catch(console.error);
  }, [loadAggregate, loadReports]);

  const metrics = useMemo(() => {
    const m = aggregate?.metrics;
    if (!m) return null;
    return [
      {
        label: '阅读量',
        value: formatViews(m.totalViews),
        delta: '—',
        icon: Eye,
        bg: '#E8F3FF',
        color: '#1664FF',
      },
      {
        label: '点赞数',
        value: formatViews(m.totalLikes),
        delta: '—',
        icon: ThumbsUp,
        bg: '#E8FFFB',
        color: '#14C9C9',
      },
      {
        label: '收藏数',
        value: formatViews(m.totalCollects),
        delta: '—',
        icon: Star,
        bg: '#FFF7E8',
        color: '#FFB400',
      },
      {
        label: '评论数',
        value: formatViews(m.totalComments),
        delta: '—',
        icon: MessageSquare,
        bg: '#F0F3FF',
        color: '#4E6EF2',
      },
      {
        label: '转发数',
        value: formatViews(m.totalShares),
        delta: '—',
        icon: Share2,
        bg: '#E8FFEA',
        color: '#00B42A',
      },
      {
        label: '完读率',
        value:
          m.totalViews > 0
            ? ((m.totalLikes / m.totalViews) * 100).toFixed(1) + '%'
            : '0%',
        delta: '—',
        icon: Gauge,
        bg: '#E8F7FF',
        color: '#00A3FF',
      },
    ];
  }, [aggregate]);

  const top10 = aggregate?.top10 ?? [];

  function handleExport() {
    const rows = [['排名', '内容标题', '平台', '阅读量', '互动量', '完读率']];
    top10.forEach((item, i) => {
      rows.push([
        String(i + 1),
        item.title,
        item.platform,
        item.views,
        item.interactions,
        item.completion,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-4 p-6">
        <StudioCard contentClassName="p-4">
          <div className="flex flex-wrap items-end gap-5">
            <FilterSelect
              label="时间范围"
              value={timeRange}
              onChange={setTimeRange}
              options={[
                { value: '7d', label: '最近 7 天' },
                { value: '30d', label: '最近 30 天' },
                { value: '90d', label: '最近 90 天' },
              ]}
              wide
            />
            <FilterSelect
              label="内容类型"
              value={contentType}
              onChange={setContentType}
              options={[
                { value: 'all', label: '全部' },
                { value: '图文', label: '图文' },
                { value: '短视频', label: '短视频' },
              ]}
            />
            <FilterSelect
              label="平台"
              value={platformFilter}
              onChange={setPlatformFilter}
              options={[
                { value: 'all', label: '全部' },
                { value: 'WECHAT', label: '微信' },
                { value: 'XIAOHONGSHU', label: '小红书' },
                { value: 'DOUYIN', label: '抖音' },
              ]}
            />
            <FilterSelect
              label="账号"
              value={accountFilter}
              onChange={setAccountFilter}
              options={[{ value: 'all', label: '全部' }]}
            />
            <FilterSelect
              label="内容标签"
              value={tagFilter}
              onChange={setTagFilter}
              options={[{ value: 'all', label: '全部' }]}
            />
            <div className="ml-auto flex gap-3">
              <Button
                variant="outline"
                className="h-9 border-[#E5E8EF] px-7 text-xs"
                onClick={() => {
                  setTimeRange('7d');
                  setContentType('all');
                  setPlatformFilter('all');
                  setAccountFilter('all');
                  setTagFilter('all');
                }}
              >
                重置
              </Button>
              <Button
                className="h-9 bg-[#1664FF] px-8 text-xs hover:bg-[#0E55E8]"
                onClick={loadAggregate}
              >
                查询
              </Button>
            </div>
          </div>
        </StudioCard>

        <StudioCard contentClassName="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1D2129]">
              核心指标（所选时间范围内）
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-[#DDE6FF] text-xs text-[#1664FF]"
              onClick={handleExport}
            >
              <Download className="size-3.5" />
              导出数据
            </Button>
          </div>
          {aggregateLoading ? (
            <p className="py-8 text-center text-sm text-[#86909C]">
              指标加载中…
            </p>
          ) : !metrics ? (
            <p className="py-8 text-center text-sm text-[#86909C]">暂无数据</p>
          ) : (
            <div className="grid grid-cols-6 gap-8">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="flex items-center gap-4">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: metric.bg,
                        color: metric.color,
                      }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-[#4E5969]">
                        {metric.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold leading-none text-[#1D2129]">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-[11px] text-[#86909C]">
                        较上周期{' '}
                        <span className="font-semibold text-[#00B42A]">
                          {metric.delta}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </StudioCard>

        <StudioCard contentClassName="p-0">
          <div className="flex border-b border-[#EEF0F5] px-5">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                className={cn(
                  'relative px-5 py-4 text-sm font-semibold text-[#4E5969] transition-colors hover:text-[#1D2129]',
                  index === activeTab && 'text-[#1664FF]'
                )}
                onClick={() => setActiveTab(index)}
              >
                {tab}
                {index === activeTab && (
                  <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-[#1664FF]" />
                )}
              </button>
            ))}
          </div>
        </StudioCard>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-4">
          <StudioCard contentClassName="p-5">
            <SectionHeader title="内容 Top10" subtitle="按阅读量排名" />
            {top10.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#86909C]">
                暂无内容数据
              </p>
            ) : (
              <Table className="studio-table text-xs">
                <TableHeader>
                  <TableRow className="border-[#EEF0F5]">
                    {[
                      '排名',
                      '内容标题',
                      '平台',
                      '阅读量',
                      '互动量',
                      '完读率',
                    ].map((header) => (
                      <TableHead
                        key={header}
                        className="h-8 whitespace-nowrap px-2 text-[11px] font-medium text-[#86909C]"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top10.map((item, index) => (
                    <TableRow key={item.contentId} className="border-0">
                      <TableCell className="h-9 px-2 py-1 font-semibold text-[#1D2129]">
                        {index + 1}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate px-2 py-1 font-medium text-[#1D2129]">
                        {item.title}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <PlatformBadge
                          platform={item.platform.toLowerCase()}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1 font-medium text-[#1D2129]">
                        {item.views}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-[#4E5969]">
                        {item.interactions}
                      </TableCell>
                      <TableCell className="px-2 py-1 font-medium text-[#1D2129]">
                        {item.completion}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </StudioCard>

          <StudioCard contentClassName="p-5">
            <SectionHeader title="分析报告" />
            {reportsLoading ? (
              <p className="py-8 text-center text-sm text-[#86909C]">
                报告加载中…
              </p>
            ) : reportsError ? (
              <p className="py-8 text-center text-sm text-[#F53F3F]">
                {reportsError}
              </p>
            ) : reports.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#86909C]">
                暂无分析报告
              </p>
            ) : (
              <Table className="studio-table text-xs">
                <TableHeader>
                  <TableRow className="border-[#EEF0F5]">
                    {['报告摘要', '生成时间', '来源'].map((header) => (
                      <TableHead
                        key={header}
                        className="h-8 whitespace-nowrap px-2 text-[11px] font-medium text-[#86909C]"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.slice(0, 5).map((report) => (
                    <TableRow key={report.id} className="border-0">
                      <TableCell className="max-w-[280px] truncate px-2 py-2 font-medium text-[#1D2129]">
                        {report.summary ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-2 text-[#4E5969]">
                        {new Date(report.createdAt).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-[#4E5969]">
                        {report.createdByAgent ? 'Agent 生成' : '人工'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </StudioCard>
        </div>

        <p className="text-xs text-[#86909C]">
          数据更新时间：{new Date().toLocaleString('zh-CN', { hour12: false })}
        </p>
      </PageContainer>
    </StudioLayout>
  );
}
