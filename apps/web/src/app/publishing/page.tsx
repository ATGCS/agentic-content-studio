'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ContentEditDialog } from '@/components/dialogs/content-edit-dialog';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  MessageCircle,
  Send,
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

type Platform = 'wechat' | 'red' | 'douyin' | 'video' | 'zhihu' | 'taobao';

type PendingItem = {
  id: string;
  title: string;
  project: string;
  platforms: Platform[];
  account: string;
  schedule: string;
  status: PublishStatus;
};

type PublishStatus = 'PENDING' | 'PUBLISHING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

type ApiPublishingTask = {
  id: string;
  platform: string;
  status: PublishStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  error?: string | null;
  content?: { id: string; title?: string | null; topicId?: string | null } | null;
  version?: { id: string; title?: string | null; platform?: string | null } | null;
  account?: { id: string; accountName?: string | null } | null;
  publishRecord?: { id: string; status?: string | null; externalUrl?: string | null; createdAt?: string } | null;
};

type DraftItem = {
  title: string;
  project: string;
  syncedAt: string;
  status: 'synced' | 'syncing' | 'failed';
};

type PackageItem = {
  title: string;
  project: string;
  time: string;
  status: 'generated' | 'building' | 'stopped';
};

const summaryCards = [
  { label: '待发布内容', value: '36', diff: '+8', icon: Send, bg: '#E8F3FF', color: '#1664FF' },
  { label: '公众号草稿同步', value: '12', diff: '+3', icon: MessageCircle, bg: '#E8FFEA', color: '#00B42A' },
  { label: '小红书发布包', value: '18', diff: '+5', text: '小红', bg: '#FFF0F0', color: '#FE2C55' },
  { label: '抖音发布包', value: '14', diff: '+2', text: '抖', bg: '#F5F7FA', color: '#111827' },
  { label: '今日已发布', value: '26', diff: '+6', icon: CheckCircle2, bg: '#E8F3FF', color: '#1664FF' },
];

const draftItems: DraftItem[] = [
  { title: '618大促活动玩法拆解与案例分享', project: '618大促活动', syncedAt: '2025-05-24 09:15', status: 'synced' },
  { title: '品牌故事：我们的初心与坚持', project: '品牌故事', syncedAt: '2025-05-24 08:40', status: 'synced' },
  { title: '行业趋势洞察：2025内容营销趋势', project: '行业研究', syncedAt: '2025-05-24 07:30', status: 'syncing' },
  { title: '夏季新品来袭！清爽穿搭指南', project: '夏季新品推广', syncedAt: '2025-05-24 06:20', status: 'synced' },
  { title: '产品使用技巧：3个提升效率的小方法', project: '产品教程', syncedAt: '2025-05-23 22:10', status: 'failed' },
];

const redPackages: PackageItem[] = [
  { title: '夏季新品来袭！清爽穿搭指南', project: '夏季新品推广', time: '2025-05-24 09:20', status: 'generated' },
  { title: '618好物清单｜今天买爆不踩雷', project: '618大促活动', time: '2025-05-24 08:50', status: 'generated' },
  { title: '平价好物分享｜学生党必备清单', project: '平价好物推荐', time: '2025-05-24 07:45', status: 'generated' },
  { title: '夏日防晒攻略｜选对不晒黑', project: '产品教程', time: '2025-05-23 22:30', status: 'building' },
  { title: '居家好物｜提升幸福感的小物件', project: '生活方式', time: '2025-05-23 20:15', status: 'stopped' },
];

const douyinPackages: PackageItem[] = [
  { title: '3秒抓住你！618大促活动', project: '618大促活动', time: '2025-05-24 09:10', status: 'generated' },
  { title: '品牌故事｜从0到1的成长之路', project: '品牌故事', time: '2025-05-24 08:30', status: 'generated' },
  { title: '产品使用技巧｜提升效率的3个方法', project: '产品教程', time: '2025-05-24 07:20', status: 'generated' },
  { title: '行业趋势解读｜内容营销新机会', project: '行业研究', time: '2025-05-23 23:00', status: 'building' },
  { title: '夏季穿搭分享｜清爽又好看', project: '夏季新品推广', time: '2025-05-23 21:40', status: 'stopped' },
];

const accountRows = [
  ['微信', '品牌公众号', '已授权', '2026-05-01', 'wechat'],
  ['小红书', '品牌小红书号', '已授权', '2026-04-18', 'red'],
  ['抖音', '品牌抖音号', '已授权', '2026-03-30', 'douyin'],
  ['视频号', '品牌视频号', '已授权', '2026-05-10', 'video'],
  ['淘宝', '品牌淘宝店铺', '已授权', '2026-02-28', 'taobao'],
];

const statusConfig = {
  synced: { label: '已同步', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  syncing: { label: '同步中', className: 'bg-[#E8F3FF] text-[#1664FF]' },
  failed: { label: '同步失败', className: 'bg-[#FFF1F0] text-[#F53F3F]' },
  generated: { label: '已生成', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  building: { label: '生成中', className: 'bg-[#E8F3FF] text-[#1664FF]' },
  stopped: { label: '停止生成', className: 'bg-[#FFF7E8] text-[#FF7D00]' },
  published: { label: '已发布', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  PENDING: { label: '待发布', className: 'bg-[#FFF7E6] text-[#FF7D00]' },
  PUBLISHING: { label: '发布中', className: 'bg-[#E8F3FF] text-[#1664FF]' },
  SUCCESS: { label: '已发布', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  FAILED: { label: '发布失败', className: 'bg-[#FFF1F0] text-[#F53F3F]' },
  CANCELLED: { label: '已取消', className: 'bg-[#F2F3F5] text-[#86909C]' },
};

const platformMap: Record<string, Platform> = {
  WECHAT: 'wechat',
  XIAOHONGSHU: 'red',
  DOUYIN: 'douyin',
  VIDEO_CHANNEL: 'video',
  ZHIHU: 'zhihu',
  OTHER: 'wechat',
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function mapPublishingTask(task: ApiPublishingTask): PendingItem {
  return {
    id: task.id,
    title: task.version?.title ?? task.content?.title ?? '未命名内容',
    project: task.content?.topicId ?? '内容项目',
    platforms: [platformMap[task.platform] ?? 'wechat'],
    account: task.account?.accountName ?? '未选择账号',
    schedule: formatDateTime(task.scheduledAt ?? task.createdAt),
    status: task.status,
  };
}

function PlatformMark({ platform }: { platform: Platform }) {
  return <PlatformBadge platform={platform} size="sm" />;
}

function Thumbnail({ index }: { index: number }) {
  const gradients = [
    'from-[#78A8FF] via-[#E8F3FF] to-[#FFB7A8]',
    'from-[#FFB86B] via-[#FFF2D6] to-[#80D7FF]',
    'from-[#111827] via-[#334155] to-[#64748B]',
    'from-[#E8D2B4] via-[#C6E7D8] to-[#9BB8F6]',
    'from-[#A8E6CF] via-[#DDEBFF] to-[#FFD3B6]',
  ];
  return <span className={cn('inline-block size-9 rounded-md bg-gradient-to-br shadow-sm', gradients[index % gradients.length])} />;
}

function SectionHeader({ title, action, download }: { title: string; action?: string; download?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-bold text-[#1D2129]">{title}</h2>
      {action && (
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-[#1664FF]">
          {download && <Download className="size-3.5" />}
          {action}
        </button>
      )}
    </div>
  );
}

function StatusPill({ value }: { value: keyof typeof statusConfig }) {
  const item = statusConfig[value];
  return <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold', item.className)}>{item.label}</span>;
}

function SummaryCard({ item }: { item: (typeof summaryCards)[number] | { label: string; value: string; diff: string; icon?: typeof Send; text?: string; bg: string; color: string } }) {
  const Icon = 'icon' in item ? item.icon : null;
  return (
    <StudioCard contentClassName="flex items-center justify-between p-5">
      <div>
        <p className="text-sm font-semibold text-[#4E5969]">{item.label}</p>
        <p className="mt-2 text-2xl font-bold leading-none text-[#1D2129]">{item.value}</p>
        <p className="mt-2 text-[11px] text-[#86909C]">较昨日 <span className="font-semibold text-[#1664FF]">{item.diff}</span></p>
      </div>
      <span className="flex size-12 items-center justify-center rounded-xl font-bold" style={{ backgroundColor: item.bg, color: item.color }}>
        {Icon ? <Icon className="size-6" /> : item.text}
      </span>
    </StudioCard>
  );
}

function PendingTable({ items, onEdit, onPublish, onCancel }: { items: PendingItem[]; onEdit?: (item: PendingItem) => void; onPublish?: (item: PendingItem) => void; onCancel?: (item: PendingItem) => void }) {
  return (
    <Table className="studio-table text-xs">
      <TableHeader>
        <TableRow className="border-[#EEF0F5]">
          {['内容标题', '内容项目', '目标平台', '目标账号', '计划发布时间', '状态', '操作'].map((head) => <TableHead key={head} className="h-9 px-3 text-[11px] font-medium text-[#86909C]">{head}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow className="border-0">
            <TableCell colSpan={7} className="px-3 py-8 text-center text-[#86909C]">暂无待发布内容</TableCell>
          </TableRow>
        ) : items.map((item, index) => (
          <TableRow key={item.id} className="border-0">
            <TableCell className="min-w-[220px] px-3 py-2"><span className="flex items-center gap-3"><Link href="/contents"><Thumbnail index={index} /></Link><Link href="/contents" className="font-semibold text-[#1D2129] hover:text-[#1664FF] hover:underline">{item.title}</Link></span></TableCell>
            <TableCell className="px-3 text-[#1664FF]">{item.project}</TableCell>
            <TableCell className="px-3"><span className="flex gap-1">{item.platforms.map((p) => <PlatformMark key={p} platform={p} />)}</span></TableCell>
            <TableCell className="px-3 text-[#4E5969]">{item.account}</TableCell>
            <TableCell className="whitespace-nowrap px-3 text-[#4E5969]">{item.schedule}</TableCell>
            <TableCell className="px-3"><StatusPill value={item.status} /></TableCell>
            <TableCell className="px-3"><span className="flex gap-2 whitespace-nowrap font-semibold text-[#1664FF]"><button>预览</button><button type="button" onClick={() => onEdit?.(item)}>编辑</button><button type="button" onClick={() => onPublish?.(item)} disabled={item.status === 'PUBLISHING'} className="disabled:text-[#C9CDD4]">发布</button><button type="button" onClick={() => onCancel?.(item)} disabled={item.status !== 'PENDING'} className="disabled:text-[#C9CDD4]">取消</button><ChevronDown className="size-3" /></span></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DraftSyncTable() {
  return (
    <Table className="studio-table text-xs">
      <TableHeader><TableRow className="border-[#EEF0F5]">{['草稿标题', '内容项目', '同步时间', '状态', '操作'].map((head) => <TableHead key={head} className="h-9 px-3 text-[11px] font-medium text-[#86909C]">{head}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {draftItems.map((item) => (
          <TableRow key={item.title} className="border-0">
            <TableCell className="max-w-[230px] truncate px-3 py-2"><Link href="/contents" className="font-semibold text-[#1D2129] hover:text-[#1664FF] hover:underline">{item.title}</Link></TableCell>
            <TableCell className="px-3 text-[#4E5969]">{item.project}</TableCell>
            <TableCell className="whitespace-nowrap px-3 text-[#4E5969]">{item.syncedAt}</TableCell>
            <TableCell className="px-3"><StatusPill value={item.status} /></TableCell>
            <TableCell className="px-3"><Link href="/contents" className="font-semibold text-[#1664FF] hover:underline">{item.status === 'failed' ? '重试' : item.status === 'syncing' ? '查看' : '查看'}</Link></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PackageTable({ items }: { items: PackageItem[] }) {
  return (
    <Table className="studio-table text-xs">
      <TableHeader><TableRow className="border-[#EEF0F5]">{['封面', '标题', '内容项目', '生成时间', '状态', '操作'].map((head) => <TableHead key={head} className="h-9 px-3 text-[11px] font-medium text-[#86909C]">{head}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.title} className="border-0">
            <TableCell className="px-3 py-2"><Link href="/contents"><Thumbnail index={index} /></Link></TableCell>
            <TableCell className="max-w-[230px] truncate px-3"><Link href="/contents" className="font-semibold text-[#1D2129] hover:text-[#1664FF] hover:underline">{item.title}</Link></TableCell>
            <TableCell className="px-3 text-[#4E5969]">{item.project}</TableCell>
            <TableCell className="whitespace-nowrap px-3 text-[#4E5969]">{item.time}</TableCell>
            <TableCell className="px-3"><StatusPill value={item.status} /></TableCell>
            <TableCell className="px-3"><span className="flex gap-3 whitespace-nowrap font-semibold text-[#1664FF]"><button>{item.status === 'generated' ? '下载' : '生成'}</button><button>预览</button></span></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RecordsTable({ items }: { items: PendingItem[] }) {
  return (
    <Table className="studio-table text-xs">
      <TableHeader><TableRow className="border-[#EEF0F5]">{['内容标题', '内容项目', '发布平台', '账号名称', '发布时间', '状态', '阅读/播放量', '操作'].map((head) => <TableHead key={head} className="h-9 px-3 text-[11px] font-medium text-[#86909C]">{head}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow className="border-0">
            <TableCell colSpan={8} className="px-3 py-8 text-center text-[#86909C]">暂无发布记录</TableCell>
          </TableRow>
        ) : items.map((item) => (
          <TableRow key={item.id} className="border-0">
            <TableCell className="max-w-[230px] truncate px-3 py-2"><Link href="/contents" className="font-semibold text-[#1D2129] hover:text-[#1664FF] hover:underline">{item.title}</Link></TableCell>
            <TableCell className="px-3 text-[#4E5969]">{item.project}</TableCell>
            <TableCell className="px-3"><PlatformMark platform={item.platforms[0]} /></TableCell>
            <TableCell className="px-3 text-[#4E5969]">{item.account}</TableCell>
            <TableCell className="whitespace-nowrap px-3 text-[#4E5969]">{item.schedule}</TableCell>
            <TableCell className="px-3"><StatusPill value={item.status} /></TableCell>
            <TableCell className="px-3 font-semibold text-[#1D2129]">-</TableCell>
            <TableCell className="px-3"><span className="flex gap-2 whitespace-nowrap font-semibold text-[#1664FF]"><Link href="/analytics" className="hover:underline">数据</Link><Link href="/contents" className="hover:underline">详情</Link></span></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AccountTable() {
  return (
    <Table className="studio-table text-xs">
      <TableHeader><TableRow className="border-[#EEF0F5]">{['平台', '账号名称', '授权状态', '授权到期时间', '操作'].map((head) => <TableHead key={head} className="h-9 px-3 text-[11px] font-medium text-[#86909C]">{head}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {accountRows.map(([, account, status, expire, key]) => (
          <TableRow key={account} className="border-0">
            <TableCell className="px-3 py-2"><Link href="/accounts"><PlatformMark platform={key as Platform} /></Link></TableCell>
            <TableCell className="px-3"><Link href="/accounts" className="font-semibold text-[#1D2129] hover:text-[#1664FF]">{account}</Link></TableCell>
            <TableCell className="px-3"><span className="rounded-full bg-[#E8FFEA] px-2 py-1 text-[11px] font-semibold text-[#00B42A]">{status}</span></TableCell>
            <TableCell className="px-3 text-[#4E5969]">{expire}</TableCell>
            <TableCell className="px-3"><Link href="/accounts" className="font-semibold text-[#1664FF] hover:underline">重新授权</Link></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function PublishingPage() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<PendingItem | null>(null);
  const [tasks, setTasks] = useState<ApiPublishingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadTasks() {
    try {
      const res = await api<ApiPublishingTask[]>('/api/publishing/tasks');
      setTasks(res.data);
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError('发布任务加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks().catch(console.error);
  }, []);

  const taskItems = useMemo(() => tasks.map(mapPublishingTask), [tasks]);
  const pendingTaskItems = taskItems.filter((item) => item.status === 'PENDING' || item.status === 'PUBLISHING');
  const recordItems = taskItems.filter((item) => item.status === 'SUCCESS' || item.status === 'FAILED' || item.status === 'CANCELLED');
  const dynamicSummaryCards = [
    { ...summaryCards[0], value: String(pendingTaskItems.length), diff: '+0' },
    summaryCards[1],
    summaryCards[2],
    summaryCards[3],
    { ...summaryCards[4], value: String(recordItems.filter((item) => item.status === 'SUCCESS').length), diff: '+0' },
  ];

  const handleEdit = (item: PendingItem) => {
    setEditingContent(item);
    setEditDialogOpen(true);
  };

  async function handlePublish(item: PendingItem) {
    await api(`/api/publishing/tasks/${item.id}/publish`, { method: 'POST' });
    await loadTasks();
  }

  async function handleCancel(item: PendingItem) {
    await api(`/api/publishing/tasks/${item.id}/cancel`, { method: 'POST' });
    await loadTasks();
  }

  return (
    <>
      <ContentEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        content={editingContent ? {
          title: editingContent.title,
          project: editingContent.project,
          platforms: editingContent.platforms,
        } : undefined}
      />
      <StudioLayout>
        <PageContainer className="max-w-none gap-4 p-6">
        <div>
          <p className="mb-3 text-sm font-medium text-[#4E5969]">发布管理 <span className="mx-2 text-[#C9CDD4]">/</span> <span className="font-semibold text-[#1D2129]">发布准备台</span></p>
          <h1 className="text-2xl font-bold text-[#1D2129]">发布准备台</h1>
          <p className="mt-2 text-sm font-medium text-[#4E5969]">统一管理多平台内容发布，支持批量发布、草稿同步、发布包下载与发布记录追踪</p>
        </div>

        <div className="grid grid-cols-5 gap-4">{dynamicSummaryCards.map((item) => <SummaryCard key={item.label} item={item} />)}</div>

        {loadError && (
          <StudioCard contentClassName="p-4">
            <p className="text-xs text-[#F53F3F]">{loadError}</p>
          </StudioCard>
        )}

        <div className="grid grid-cols-[1.12fr_0.88fr] gap-4">
          <StudioCard contentClassName="p-5">
            <SectionHeader title="待发布内容" action={`查看全部（${pendingTaskItems.length}）`} />
            {loading ? (
              <p className="py-8 text-center text-xs text-[#86909C]">发布任务加载中…</p>
            ) : (
              <PendingTable items={pendingTaskItems} onEdit={handleEdit} onPublish={handlePublish} onCancel={handleCancel} />
            )}
          </StudioCard>
          <StudioCard contentClassName="p-5">
            <SectionHeader title="公众号草稿同步" action="同步设置" />
            <DraftSyncTable />
            <div className="mt-4 text-center"><button className="text-xs font-semibold text-[#1664FF]">查看全部（12）</button></div>
          </StudioCard>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StudioCard contentClassName="p-5">
            <SectionHeader title="小红书发布包" action="下载全部" download />
            <PackageTable items={redPackages} />
            <div className="mt-4 text-center"><button className="text-xs font-semibold text-[#1664FF]">查看全部（18）</button></div>
          </StudioCard>
          <StudioCard contentClassName="p-5">
            <SectionHeader title="抖音发布包" action="下载全部" download />
            <PackageTable items={douyinPackages} />
            <div className="mt-4 text-center"><button className="text-xs font-semibold text-[#1664FF]">查看全部（14）</button></div>
          </StudioCard>
        </div>

        <div className="grid grid-cols-[1.12fr_0.88fr] gap-4">
          <StudioCard contentClassName="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1D2129]">发布记录</h2>
              <div className="flex items-center gap-3">
                <button className="flex h-8 items-center gap-1 rounded-md border border-[#E5E8EF] px-3 text-xs text-[#4E5969]">全部平台 <ChevronDown className="size-3" /></button>
                <button className="flex h-8 items-center gap-1 rounded-md border border-[#E5E8EF] px-3 text-xs text-[#4E5969]">全部状态 <ChevronDown className="size-3" /></button>
                <button className="flex h-8 items-center gap-2 rounded-md border border-[#E5E8EF] px-3 text-xs text-[#4E5969]">2025-05-18 ~ 2025-05-24 <ChevronDown className="size-3" /></button>
                <Button variant="outline" size="sm" className="h-8 gap-1 border-[#E5E8EF] text-xs"><Download className="size-3.5" />导出</Button>
              </div>
            </div>
            {loading ? (
              <p className="py-8 text-center text-xs text-[#86909C]">发布记录加载中…</p>
            ) : (
              <RecordsTable items={recordItems} />
            )}
            <div className="mt-4 text-center"><button className="text-xs font-semibold text-[#1664FF]">查看全部（{recordItems.length}）</button></div>
          </StudioCard>
          <StudioCard contentClassName="p-5">
            <SectionHeader title="账号授权状态" action="管理账号 >" />
            <AccountTable />
            <div className="mt-4 text-center"><button className="text-xs font-semibold text-[#1664FF]">查看全部（8）</button></div>
          </StudioCard>
        </div>
      </PageContainer>
    </StudioLayout>
    </>
  );
}
