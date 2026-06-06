'use client';

import { useEffect, useState } from 'react';
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

type MetricItem = {
  label: string;
  value: string;
  trend: string;
  icon: typeof Eye;
  bg: string;
  color: string;
};

type TopContent = {
  rank: number;
  title: string;
  platform: string;
  views: string;
  interactions: string;
  completion: string;
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

const metrics: MetricItem[] = [
  {
    label: '阅读量',
    value: '128.56w',
    trend: '↑ 18.6%',
    icon: Eye,
    bg: '#E8F3FF',
    color: '#1664FF',
  },
  {
    label: '点赞数',
    value: '8.92w',
    trend: '↑ 12.3%',
    icon: ThumbsUp,
    bg: '#E8FFFB',
    color: '#14C9C9',
  },
  {
    label: '收藏数',
    value: '3.45w',
    trend: '↑ 15.7%',
    icon: Star,
    bg: '#FFF7E8',
    color: '#FFB400',
  },
  {
    label: '评论数',
    value: '1.28w',
    trend: '↑ 9.8%',
    icon: MessageSquare,
    bg: '#F0F3FF',
    color: '#4E6EF2',
  },
  {
    label: '转发数',
    value: '2.76w',
    trend: '↑ 21.4%',
    icon: Share2,
    bg: '#E8FFEA',
    color: '#00B42A',
  },
  {
    label: '完读率',
    value: '42.35%',
    trend: '↑ 6.1%',
    icon: Gauge,
    bg: '#E8F7FF',
    color: '#00A3FF',
  },
];

const tabs = ['内容表现', '平台表现', '账号表现', 'Agent 表现', '知识库效果'];

const trendSeries = [
  { label: '阅读量', color: '#1664FF', values: [95, 118, 104, 98, 122, 109, 74] },
  { label: '点赞数', color: '#21CC8D', values: [48, 72, 80, 61, 84, 51, 35] },
  { label: '收藏数', color: '#FFB400', values: [24, 36, 41, 33, 40, 38, 19] },
  { label: '评论数', color: '#7B61FF', values: [72, 121, 112, 116, 120, 92, 58] },
  { label: '转发数', color: '#14C9C9', values: [62, 48, 70, 58, 78, 113, 46] },
  { label: '完读率(%)', color: '#FF5C8A', values: [31, 36, 34, 42, 49, 91, 61] },
];

const dates = ['05-18', '05-19', '05-20', '05-21', '05-22', '05-23', '05-24'];

const topContents: TopContent[] = [
  { rank: 1, title: '618大促活动玩法拆解与案例分享', platform: 'wecom', views: '8.26w', interactions: '1.32w', completion: '52.1%' },
  { rank: 2, title: '夏季新品来袭：清爽穿搭指南', platform: 'red', views: '7.35w', interactions: '1.08w', completion: '46.8%' },
  { rank: 3, title: '品牌故事：我们的初心与坚持', platform: 'douyin', views: '6.72w', interactions: '9,654', completion: '43.2%' },
  { rank: 4, title: '3个提升效率的小方法', platform: 'wecom', views: '5.48w', interactions: '7,812', completion: '48.9%' },
  { rank: 5, title: '行业趋势洞察：2025内容营销趋势', platform: 'red', views: '4.96w', interactions: '6,432', completion: '41.5%' },
  { rank: 6, title: '产品使用技巧：新手必看指南', platform: 'wecom', views: '4.21w', interactions: '5,890', completion: '49.3%' },
  { rank: 7, title: '用户评价精选', platform: 'douyin', views: '3.87w', interactions: '4,876', completion: '39.8%' },
  { rank: 8, title: '品牌活动回顾', platform: 'wecom', views: '3.65w', interactions: '4,321', completion: '42.7%' },
  { rank: 9, title: '生活方式分享：精致生活的日常', platform: 'red', views: '3.12w', interactions: '3,987', completion: '38.6%' },
  { rank: 10, title: '节日营销盘点：618政策解读', platform: 'wecom', views: '2.98w', interactions: '3,654', completion: '37.9%' },
];

const categoryData = [
  { label: '图文', value: '58.32w', percent: '45.4%', color: '#1664FF' },
  { label: '短视频', value: '46.18w', percent: '36.0%', color: '#14C9C9' },
  { label: '长图', value: '12.45w', percent: '9.7%', color: '#FFB400' },
  { label: '图集', value: '6.32w', percent: '4.9%', color: '#7B61FF' },
  { label: '其他', value: '5.29w', percent: '4.0%', color: '#FF7D00' },
];

const publishBars = [22, 48, 72, 108];

const platformRows = [
  ['微信公众号', '45.32w', '4.56w', '44.2%', '+18.3%', 'wecom'],
  ['小红书', '32.18w', '3.21w', '47.5%', '+14.6%', 'red'],
  ['抖音', '28.65w', '5.32w', '40.1%', '+21.7%', 'douyin'],
  ['视频号', '18.32w', '2.11w', '39.3%', '+9.8%', 'video'],
  ['知乎', '6.09w', '8,432', '36.8%', '-2.3%', 'zhihu'],
];

const accountRows = [
  ['品牌公众号', '28.65w', '2.90w', '+3,256'],
  ['品牌小红书号', '22.18w', '2.35w', '+2,145'],
  ['品牌抖音号', '19.32w', '3.12w', '+4,321'],
  ['品牌视频号', '11.24w', '1.32w', '+1,875'],
  ['品牌知乎号', '5.32w', '6,543', '+856'],
];

const agentRows = [
  ['内容生成 Agent', '256', '512', '4.32%', '9.2'],
  ['数据分析 Agent', '128', '128', '-', '9.6'],
  ['选题规划 Agent', '96', '192', '4.15%', '8.9'],
  ['素材创作 Agent', '178', '356', '3.98%', '8.7'],
  ['发布执行 Agent', '312', '624', '4.28%', '9.1'],
];

const knowledgeRows = [
  ['品牌知识库', '1,256', '92.3%', '8.7'],
  ['产品知识库', '985', '89.6%', '8.3'],
  ['行业报告库', '754', '87.2%', '7.8'],
  ['热点话题库', '632', '88.9%', '8.1'],
  ['用户反馈库', '421', '85.1%', '7.5'],
];

function FilterSelect({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('space-y-2', wide ? 'w-[235px]' : 'w-[180px]')}>
      <p className="text-xs font-medium text-[#4E5969]">{label}</p>
      <button className="flex h-9 w-full items-center justify-between rounded-md border border-[#E5E8EF] bg-white px-3 text-xs font-medium text-[#1D2129] shadow-sm">
        <span className="flex items-center gap-2">
          {label === '时间范围' && <Calendar className="size-3.5 text-[#4E5969]" />}
          {value}
        </span>
        <ChevronDown className="size-3 text-[#86909C]" />
      </button>
    </div>
  );
}

function PlatformMark({ platform }: { platform: string }) {
  return <PlatformBadge platform={platform} size="sm" />;
}

function linePath(values: number[]) {
  const width = 470;
  const height = 160;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / 140) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function TrendChart() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#4E5969]">
        {trendSeries.map((series) => (
          <span key={series.label} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: series.color }} />
            {series.label}
          </span>
        ))}
      </div>
      <div className="relative h-[210px] overflow-hidden rounded-lg bg-white">
        <div className="absolute inset-x-10 top-3 bottom-8 grid grid-rows-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="border-t border-[#EEF0F5]" />
          ))}
        </div>
        <div className="absolute left-0 top-2 flex h-[170px] flex-col justify-between text-[10px] text-[#86909C]">
          {['150,000', '120,000', '90,000', '60,000', '30,000'].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
        <svg className="absolute left-16 top-3 h-[160px] w-[470px] overflow-visible" viewBox="0 0 470 160">
          {trendSeries.map((series) => (
            <g key={series.label}>
              <path d={linePath(series.values)} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {series.values.map((value, index) => {
                const x = (index / (series.values.length - 1)) * 470;
                const y = 160 - (value / 140) * 160;
                return <circle key={`${series.label}-${index}`} cx={x} cy={y} r="3" fill="#fff" stroke={series.color} strokeWidth="2" />;
              })}
            </g>
          ))}
        </svg>
        <div className="absolute bottom-0 left-16 right-5 grid grid-cols-7 text-center text-[10px] text-[#86909C]">
          {dates.map((date) => (
            <span key={date}>{date}</span>
          ))}
        </div>
        <div className="absolute right-0 top-2 flex h-[170px] flex-col justify-between text-[10px] text-[#86909C]">
          {['75%', '60%', '45%', '30%', '15%'].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonutSummary() {
  return (
    <div className="flex items-center gap-5">
      <div className="relative size-36 shrink-0 rounded-full" style={{ background: 'conic-gradient(#1664FF 0 45%, #14C9C9 45% 81%, #FFB400 81% 90.7%, #7B61FF 90.7% 95.6%, #FF7D00 95.6% 100%)' }}>
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-lg font-bold text-[#1D2129]">128.56w</span>
          <span className="text-[10px] text-[#86909C]">总阅读量</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {categoryData.map((item) => (
          <div key={item.label} className="grid grid-cols-[1fr_70px_50px] items-center text-xs">
            <span className="inline-flex items-center gap-2 text-[#4E5969]">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="text-right font-medium text-[#1D2129]">{item.value}</span>
            <span className="text-right text-[#4E5969]">{item.percent}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublishBars() {
  return (
    <div className="flex h-40 items-end justify-around gap-4 px-4 pt-5">
      {publishBars.map((value, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end justify-center rounded-t-md bg-[#F5F7FA]">
            <div className="w-9 rounded-t-md bg-[#1664FF]" style={{ height: `${value}%` }} />
          </div>
          <span className="text-[10px] text-[#86909C]">{['0-6点', '6-12点', '12-18点', '18-24点'][index]}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ title, subtitle, action = true }: { title: string; subtitle?: string; action?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-bold text-[#1D2129]">{title}</h3>
        {subtitle && <p className="mt-1 text-[11px] text-[#86909C]">{subtitle}</p>}
      </div>
      {action && <button className="text-xs font-medium text-[#1664FF]">查看全部 &gt;</button>}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function countArrayLike(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function ReportsTable({ reports, loading, error }: { reports: AnalyticsReport[]; loading: boolean; error: string | null }) {
  return (
    <Table className="studio-table text-xs">
      <TableHeader>
        <TableRow className="border-[#EEF0F5]">
          {['报告摘要', '内容 ID', '洞察数', '建议数', '来源', '生成时间'].map((header) => (
            <TableHead key={header} className="h-8 whitespace-nowrap px-2 text-[11px] font-medium text-[#86909C]">{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-[#86909C]">分析报告加载中…</TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-[#F53F3F]">{error}</TableCell>
          </TableRow>
        ) : reports.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-[#86909C]">暂无分析报告</TableCell>
          </TableRow>
        ) : reports.map((report) => (
          <TableRow key={report.id} className="border-0">
            <TableCell className="max-w-[420px] truncate px-2 py-2 font-medium text-[#1D2129]">{report.summary}</TableCell>
            <TableCell className="px-2 py-2 text-[#4E5969]">{report.contentId.slice(0, 8)}</TableCell>
            <TableCell className="px-2 py-2 text-[#4E5969]">{countArrayLike(report.insights)}</TableCell>
            <TableCell className="px-2 py-2 text-[#4E5969]">{countArrayLike(report.suggestions)}</TableCell>
            <TableCell className="px-2 py-2 text-[#4E5969]">{report.createdByAgent ? 'Agent 生成' : '人工创建'}</TableCell>
            <TableCell className="whitespace-nowrap px-2 py-2 text-[#4E5969]">{formatDateTime(report.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CompactTable({ headers, rows, type }: { headers: string[]; rows: string[][]; type: 'platform' | 'account' | 'agent' | 'knowledge' }) {
  return (
    <Table className="studio-table text-xs">
      <TableHeader>
        <TableRow className="border-[#EEF0F5]">
          {headers.map((header) => (
            <TableHead key={header} className="h-8 whitespace-nowrap px-2 text-[11px] font-medium text-[#86909C]">
              {header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${type}-${index}`} className="border-0">
            {row.map((cell, cellIndex) => (
              <TableCell key={cellIndex} className={cn('h-8 whitespace-nowrap px-2 py-1 text-xs text-[#1D2129]', cell.includes('+') && 'text-[#00B42A]', cell.includes('-') && 'text-[#F53F3F]')}>
                {cellIndex === 0 && type === 'platform' ? (
                  <span className="inline-flex items-center gap-2">
                    <PlatformMark platform={row[5]} />
                    {cell}
                  </span>
                ) : cellIndex === 5 && type === 'platform' ? null : (
                  cell
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AnalyticsPage() {
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  async function loadReports() {
    setReportsLoading(true);
    try {
      const res = await api<AnalyticsReport[]>('/api/analytics/reports');
      setReports(res.data);
      setReportsError(null);
    } catch (error) {
      console.error(error);
      setReportsError('分析报告加载失败，请稍后重试');
    } finally {
      setReportsLoading(false);
    }
  }

  useEffect(() => {
    loadReports().catch(console.error);
  }, []);

  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1D2129]">数据复盘看板</h1>
          <p className="mt-2 text-sm font-medium text-[#4E5969]">全面复盘内容运营效果，驱动策略优化与持续增长</p>
        </div>

        <StudioCard contentClassName="p-4">
          <div className="flex flex-wrap items-end gap-5">
            <FilterSelect label="时间范围" value="2025-05-18  ~  2025-05-24" wide />
            <FilterSelect label="内容类型" value="全部" />
            <FilterSelect label="平台" value="全部" />
            <FilterSelect label="账号" value="全部" />
            <FilterSelect label="内容标签" value="全部" />
            <div className="ml-auto flex gap-3">
              <Button variant="outline" className="h-9 border-[#E5E8EF] px-7 text-xs">重置</Button>
              <Button className="h-9 bg-[#1664FF] px-8 text-xs hover:bg-[#0E55E8]">查询</Button>
            </div>
          </div>
        </StudioCard>

        <StudioCard contentClassName="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1D2129]">核心指标（所选时间范围内）</h2>
            <Button variant="outline" size="sm" className="h-8 gap-1 border-[#DDE6FF] text-xs text-[#1664FF]">
              <Download className="size-3.5" />
              导出数据
            </Button>
          </div>
          <div className="grid grid-cols-6 gap-8">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="flex items-center gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: metric.bg, color: metric.color }}>
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[#4E5969]">{metric.label}</p>
                    <p className="mt-1 text-2xl font-bold leading-none text-[#1D2129]">{metric.value}</p>
                    <p className="mt-2 text-[11px] text-[#86909C]">较上周期 <span className="font-semibold text-[#00B42A]">{metric.trend}</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        </StudioCard>

        <StudioCard contentClassName="p-0">
          <div className="flex border-b border-[#EEF0F5] px-5">
            {tabs.map((tab, index) => (
              <button key={tab} className={cn('relative px-5 py-4 text-sm font-semibold text-[#4E5969]', index === 0 && 'text-[#1664FF]')}>
                {tab}
                {index === 0 && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-[#1664FF]" />}
              </button>
            ))}
          </div>
        </StudioCard>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="space-y-4">
            <StudioCard contentClassName="p-5">
              <div className="mb-2 flex items-center justify-between">
                <SectionTitle title="内容表现趋势" subtitle="所选时间范围内" action={false} />
                <button className="flex h-8 items-center gap-1 rounded-md border border-[#E5E8EF] px-3 text-xs text-[#4E5969]">按天 <ChevronDown className="size-3" /></button>
              </div>
              <TrendChart />
            </StudioCard>

            <div className="grid grid-cols-2 gap-4">
              <StudioCard contentClassName="p-5">
                <SectionTitle title="内容类型分布" subtitle="按阅读量" action={false} />
                <DonutSummary />
              </StudioCard>
              <StudioCard contentClassName="p-5">
                <SectionTitle title="内容发布时间表现" subtitle="按阅读量" />
                <PublishBars />
              </StudioCard>
            </div>
          </div>

          <StudioCard contentClassName="p-5">
            <SectionTitle title="内容 Top10" />
            <Table className="studio-table text-xs">
              <TableHeader>
                <TableRow className="border-[#EEF0F5]">
                  {['排名', '内容标题', '平台', '阅读量', '互动量', '完读率'].map((header) => (
                    <TableHead key={header} className="h-8 whitespace-nowrap px-2 text-[11px] font-medium text-[#86909C]">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {topContents.map((item) => (
                  <TableRow key={item.rank} className="border-0">
                    <TableCell className="h-9 px-2 py-1 font-semibold text-[#1D2129]">{item.rank}</TableCell>
                    <TableCell className="max-w-[220px] truncate px-2 py-1 font-medium text-[#1D2129]">{item.title}</TableCell>
                    <TableCell className="px-2 py-1"><PlatformMark platform={item.platform} /></TableCell>
                    <TableCell className="px-2 py-1 font-medium text-[#1D2129]">{item.views}</TableCell>
                    <TableCell className="px-2 py-1 text-[#4E5969]">{item.interactions}</TableCell>
                    <TableCell className="px-2 py-1 font-medium text-[#1D2129]">{item.completion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </StudioCard>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StudioCard contentClassName="p-5">
            <SectionTitle title="平台表现" />
            <CompactTable headers={['平台', '阅读量', '互动量', '完读率', '较上期']} rows={platformRows} type="platform" />
          </StudioCard>
          <StudioCard contentClassName="p-5">
            <SectionTitle title="账号表现" />
            <CompactTable headers={['账号名称', '阅读量', '互动量', '粉丝增长']} rows={accountRows} type="account" />
          </StudioCard>
          <StudioCard contentClassName="p-5">
            <SectionTitle title="Agent 表现" />
            <CompactTable headers={['Agent 名称', '任务数', '内容量', '互动率', '效率评分']} rows={agentRows} type="agent" />
          </StudioCard>
          <StudioCard contentClassName="p-5">
            <SectionTitle title="知识库效果" />
            <CompactTable headers={['知识库名称', '调用次数', '命中率', '内容质量分']} rows={knowledgeRows} type="knowledge" />
          </StudioCard>
        </div>

        <StudioCard contentClassName="p-5">
          <SectionTitle title="分析报告" subtitle="来自后端 analytics reports" action={false} />
          <ReportsTable reports={reports} loading={reportsLoading} error={reportsError} />
        </StudioCard>

        <p className="text-xs text-[#86909C]">数据更新时间：{new Date().toLocaleString('zh-CN', { hour12: false })}</p>
      </PageContainer>
    </StudioLayout>
  );
}
