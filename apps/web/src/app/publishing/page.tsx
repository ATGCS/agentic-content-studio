'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clipboard,
  Download,
  MessageCircle,
  Send,
  X,
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

type PublishStatus =
  | 'PENDING'
  | 'PUBLISHING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

type ApiPublishingTask = {
  id: string;
  platform: string;
  status: PublishStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  error?: string | null;
  content?: {
    id: string;
    title?: string | null;
    topicId?: string | null;
  } | null;
  version?: {
    id: string;
    title?: string | null;
    platform?: string | null;
  } | null;
  account?: { id: string; accountName?: string | null } | null;
  publishRecord?: {
    id: string;
    status?: string | null;
    externalUrl?: string | null;
    createdAt?: string;
  } | null;
};

type DraftItem = {
  id: string;
  title: string;
  project: string;
  syncedAt: string;
  status: 'synced' | 'syncing' | 'failed';
};

type PackageItem = {
  id: string;
  title: string;
  project: string;
  platform: string;
  account: string;
  status: string;
  time: string;
};

type PlatformAccount = {
  id: string;
  platform: string;
  accountName: string;
  authStatus: string;
  boundAt?: string | null;
};

/* ---------- mapping ---------- */

function mapPublishingTask(task: ApiPublishingTask) {
  return {
    id: task.id,
    title: task.version?.title ?? task.content?.title ?? '未命名内容',
    project: task.content?.topicId ?? '内容管理',
    platforms: [task.platform],
    account: task.account?.accountName ?? '未选择账号',
    schedule: task.scheduledAt ?? task.createdAt ?? '—',
    status: task.status,
  };
}

type PendingItem = ReturnType<typeof mapPublishingTask>;

/* ---------- status config ---------- */

const statusConfig: Record<string, { label: string; className: string }> = {
  synced: { label: '已同步', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  syncing: { label: '同步中', className: 'bg-[#E8F3FF] text-[#1664FF]' },
  failed: { label: '同步失败', className: 'bg-[#FFF1F0] text-[#F53F3F]' },
  draft: { label: '草稿', className: 'bg-[#F2F3F5] text-[#86909C]' },
  generated: { label: '已生成', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  published: { label: '已发布', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  PENDING: { label: '待发布', className: 'bg-[#FFF7E6] text-[#FF7D00]' },
  PUBLISHING: { label: '发布中', className: 'bg-[#E8F3FF] text-[#1664FF]' },
  SUCCESS: { label: '已发布', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  FAILED: { label: '发布失败', className: 'bg-[#FFF1F0] text-[#F53F3F]' },
  CANCELLED: { label: '已取消', className: 'bg-[#F2F3F5] text-[#86909C]' },
};

/* ---------- helpers ---------- */

function StatusPill({ value }: { value: string }) {
  const item = statusConfig[value] ?? {
    label: value,
    className: 'bg-[#F2F3F5] text-[#86909C]',
  };
  return (
    <span
      className={cn(
        'rounded-full px-2 py-1 text-[11px] font-semibold',
        item.className
      )}
    >
      {item.label}
    </span>
  );
}

/* ---------- download helpers ---------- */

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildMarkdown(
  title: string,
  body: string,
  tags: string[],
  coverText?: string
): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  if (coverText) {
    lines.push(`> ${coverText}`);
    lines.push('');
  }
  if (tags.length > 0) {
    lines.push(`**标签：** ${tags.join('、')}`);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push(body);
  lines.push('');
  return lines.join('\n');
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- notification ---------- */

type Notification = { type: 'success' | 'error'; message: string };
let notifId = 0;

function SectionHeader({
  title,
  action,
  onAction,
  download,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  download?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-bold text-[#1D2129]">{title}</h2>
      {action && (
        <button
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1664FF]"
          onClick={onAction}
        >
          {download && <Download className="size-3.5" />}
          {action}
        </button>
      )}
    </div>
  );
}

function PlatformMark({ platform }: { platform: string }) {
  return <PlatformBadge platform={platform.toLowerCase()} size="sm" />;
}

/* ---------- page ---------- */

export default function PublishingPage() {
  const [tasks, setTasks] = useState<ApiPublishingTask[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [redPackages, setRedPackages] = useState<PackageItem[]>([]);
  const [douyinPackages, setDouyinPackages] = useState<PackageItem[]>([]);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllRed, setShowAllRed] = useState(false);
  const [showAllDouyin, setShowAllDouyin] = useState(false);
  const [notifications, setNotifications] = useState<
    (Notification & { id: number })[]
  >([]);

  function notify(type: 'success' | 'error', message: string) {
    const id = ++notifId;
    setNotifications((prev) => [...prev, { type, message, id }]);
    setTimeout(
      () => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      3000
    );
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, draftsRes, redPkgRes, douyinPkgRes, accountsRes] =
        await Promise.all([
          api<ApiPublishingTask[]>('/api/publishing/tasks'),
          api<DraftItem[]>('/api/publishing/drafts'),
          api<PackageItem[]>('/api/publishing/packages?platform=XIAOHONGSHU'),
          api<PackageItem[]>('/api/publishing/packages?platform=DOUYIN'),
          api<PlatformAccount[]>('/api/accounts'),
        ]);
      setTasks(tasksRes.data);
      setDrafts(draftsRes.data);
      setRedPackages(redPkgRes.data);
      setDouyinPackages(douyinPkgRes.data);
      setAccounts(accountsRes.data);
      setLoadError(null);
    } catch {
      setLoadError('部分数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll().catch(console.error);
  }, [loadAll]);

  /* ---- computed ---- */
  const taskItems = useMemo(() => tasks.map(mapPublishingTask), [tasks]);
  const pendingTaskItems = taskItems.filter(
    (item) => item.status === 'PENDING' || item.status === 'PUBLISHING'
  );
  const recordItems = taskItems.filter(
    (item) =>
      item.status === 'SUCCESS' ||
      item.status === 'FAILED' ||
      item.status === 'CANCELLED'
  );

  const summaryCards = [
    {
      label: '待发布内容',
      value: String(pendingTaskItems.length),
      icon: Send,
      bg: '#E8F3FF',
      color: '#1664FF',
    },
    {
      label: '公众号草稿',
      value: String(drafts.length),
      icon: MessageCircle,
      bg: '#E8FFEA',
      color: '#00B42A',
    },
    {
      label: '小红书发布包',
      value: String(redPackages.length),
      text: '小红',
      bg: '#FFF0F0',
      color: '#FE2C55',
    },
    {
      label: '抖音发布包',
      value: String(douyinPackages.length),
      text: '抖',
      bg: '#F5F7FA',
      color: '#111827',
    },
    {
      label: '今日已发布',
      value: String(
        recordItems.filter((item) => item.status === 'SUCCESS').length
      ),
      icon: CheckCircle2,
      bg: '#E8F3FF',
      color: '#1664FF',
    },
  ];

  /* ---- actions ---- */
  async function handlePublish(item: PendingItem) {
    try {
      await api(`/api/publishing/tasks/${item.id}/publish`, { method: 'POST' });
      notify('success', `「${item.title}」已发布成功`);
      await loadAll();
    } catch {
      notify('error', `发布「${item.title}」失败，请重试`);
    }
  }

  async function handleCancel(item: PendingItem) {
    try {
      await api(`/api/publishing/tasks/${item.id}/cancel`, { method: 'POST' });
      notify('success', `「${item.title}」已取消发布`);
      await loadAll();
    } catch {
      notify('error', `取消「${item.title}」失败，请重试`);
    }
  }

  function handleExportMarkdown(item: PackageItem) {
    const safeName = item.title.replace(/[\\/:*?"<>|]/g, '_');
    api<{
      id: string;
      title?: string;
      body?: string;
      tags?: unknown;
      coverText?: string;
    }>(`/api/versions/${item.id}`)
      .then((res) => {
        const v = res.data;
        const tags: string[] = Array.isArray(v.tags)
          ? v.tags.filter((t): t is string => typeof t === 'string')
          : [];
        const md = buildMarkdown(
          v.title ?? item.title,
          v.body ?? '',
          tags,
          v.coverText ?? undefined
        );
        downloadText(md, `${safeName}.md`);
        notify('success', `已导出「${item.title}」为 Markdown`);
      })
      .catch(() => notify('error', '导出失败，无法获取内容详情'));
  }

  function handleCopyContent(item: PackageItem) {
    api<{
      id: string;
      title?: string;
      body?: string;
      tags?: unknown;
      coverText?: string;
    }>(`/api/versions/${item.id}`)
      .then((res) => {
        const v = res.data;
        const tags: string[] = Array.isArray(v.tags)
          ? v.tags.filter((t): t is string => typeof t === 'string')
          : [];
        const md = buildMarkdown(
          v.title ?? item.title,
          v.body ?? '',
          tags,
          v.coverText ?? undefined
        );
        navigator.clipboard
          .writeText(md)
          .then(() => {
            notify('success', `已复制「${item.title}」内容到剪贴板`);
          })
          .catch(() => {
            notify('error', '复制失败，浏览器未授权剪贴板权限');
          });
      })
      .catch(() => notify('error', '复制失败，无法获取内容详情'));
  }

  function handleDownloadAllPackages(items: PackageItem[], platform: string) {
    downloadJson(items, `${platform.toLowerCase()}-发布包.json`);
    notify('success', `已下载全部 ${platform} 发布包`);
  }

  function handleExportRecords(items: PendingItem[]) {
    const headers = [
      '内容标题',
      '内容管理',
      '发布平台',
      '账号名称',
      '发布时间',
      '状态',
    ];
    const rows = items.map((i) => [
      i.title,
      i.project,
      i.platforms[0],
      i.account,
      i.schedule,
      statusConfig[i.status]?.label ?? i.status,
    ]);
    downloadCsv(
      [headers, ...rows],
      `发布记录_${new Date().toISOString().slice(0, 10)}.csv`
    );
    notify('success', `已导出 ${items.length} 条发布记录`);
  }

  /* ---- sub tables ---- */

  function PendingTable({
    items,
    showAll,
  }: {
    items: PendingItem[];
    showAll?: boolean;
  }) {
    const display = showAll ? items : items.slice(0, 5);
    return (
      <Table className="studio-table text-xs">
        <TableHeader>
          <TableRow className="border-[#EEF0F5]">
            {[
              '内容标题',
              '内容管理',
              '目标平台',
              '目标账号',
              '计划发布时间',
              '状态',
              '操作',
            ].map((head) => (
              <TableHead
                key={head}
                className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
              >
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {display.length === 0 ? (
            <TableRow className="border-0">
              <TableCell
                colSpan={7}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无待发布内容
              </TableCell>
            </TableRow>
          ) : (
            display.map((item) => (
              <TableRow key={item.id} className="border-0">
                <TableCell className="min-w-[180px] px-3 py-2">
                  <Link
                    href={`/contents/${item.id}`}
                    className="font-semibold text-[#1D2129] hover:text-[#1664FF] hover:underline"
                  >
                    {item.title}
                  </Link>
                </TableCell>
                <TableCell className="px-3 text-[#1664FF]">
                  {item.project}
                </TableCell>
                <TableCell className="px-3">
                  <PlatformMark platform={item.platforms[0]} />
                </TableCell>
                <TableCell className="px-3 text-[#4E5969]">
                  {item.account}
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                  {item.schedule}
                </TableCell>
                <TableCell className="px-3">
                  <StatusPill value={item.status} />
                </TableCell>
                <TableCell className="px-3">
                  <span className="flex gap-2 whitespace-nowrap font-semibold text-[#1664FF]">
                    <button
                      type="button"
                      onClick={() => handlePublish(item)}
                      disabled={item.status === 'PUBLISHING'}
                      className="disabled:text-[#C9CDD4]"
                    >
                      发布
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancel(item)}
                      disabled={item.status !== 'PENDING'}
                      className="disabled:text-[#C9CDD4]"
                    >
                      取消
                    </button>
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  }

  function DraftSyncTable() {
    return (
      <Table className="studio-table text-xs">
        <TableHeader>
          <TableRow className="border-[#EEF0F5]">
            {['草稿标题', '内容管理', '同步时间', '状态', '操作'].map(
              (head) => (
                <TableHead
                  key={head}
                  className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
                >
                  {head}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {drafts.length === 0 ? (
            <TableRow className="border-0">
              <TableCell
                colSpan={5}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无草稿
              </TableCell>
            </TableRow>
          ) : (
            drafts.slice(0, 5).map((item) => (
              <TableRow key={item.id} className="border-0">
                <TableCell className="max-w-[200px] truncate px-3 py-2">
                  <span className="font-semibold text-[#1D2129]">
                    {item.title}
                  </span>
                </TableCell>
                <TableCell className="px-3 text-[#4E5969]">
                  {item.project}
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                  {item.syncedAt}
                </TableCell>
                <TableCell className="px-3">
                  <StatusPill value={item.status} />
                </TableCell>
                <TableCell className="px-3">
                  <span className="font-semibold text-[#1664FF] hover:underline cursor-pointer">
                    {item.status === 'failed' ? '重试' : '查看'}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  }

  function PackageTable({
    items,
    showAll,
  }: {
    items: PackageItem[];
    showAll?: boolean;
  }) {
    const display = showAll ? items : items.slice(0, 5);
    return (
      <Table className="studio-table text-xs">
        <TableHeader>
          <TableRow className="border-[#EEF0F5]">
            {['标题', '内容管理', '生成时间', '状态', '操作'].map((head) => (
              <TableHead
                key={head}
                className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
              >
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {display.length === 0 ? (
            <TableRow className="border-0">
              <TableCell
                colSpan={5}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无发布包
              </TableCell>
            </TableRow>
          ) : (
            display.map((item) => (
              <TableRow key={item.id} className="border-0">
                <TableCell className="max-w-[200px] truncate px-3 py-2">
                  <span className="font-semibold text-[#1D2129] hover:text-[#1664FF]">
                    {item.title}
                  </span>
                </TableCell>
                <TableCell className="px-3 text-[#4E5969]">
                  {item.project}
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                  {item.time}
                </TableCell>
                <TableCell className="px-3">
                  <StatusPill value={item.status} />
                </TableCell>
                <TableCell className="px-3">
                  <span className="flex gap-3 whitespace-nowrap text-xs font-semibold text-[#1664FF]">
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => handleExportMarkdown(item)}
                    >
                      导出 .md
                    </span>
                    <span
                      className="cursor-pointer hover:text-[#0E52D9]"
                      onClick={() => handleCopyContent(item)}
                      title="复制内容"
                    >
                      <Clipboard className="size-3.5" />
                    </span>
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  }

  function RecordsTable({ items }: { items: PendingItem[] }) {
    return (
      <Table className="studio-table text-xs">
        <TableHeader>
          <TableRow className="border-[#EEF0F5]">
            {[
              '内容标题',
              '内容管理',
              '发布平台',
              '账号名称',
              '发布时间',
              '状态',
              '操作',
            ].map((head) => (
              <TableHead
                key={head}
                className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
              >
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow className="border-0">
              <TableCell
                colSpan={7}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无发布记录
              </TableCell>
            </TableRow>
          ) : (
            items.slice(0, 5).map((item) => (
              <TableRow key={item.id} className="border-0">
                <TableCell className="max-w-[200px] truncate px-3 py-2">
                  <span className="font-semibold text-[#1D2129]">
                    {item.title}
                  </span>
                </TableCell>
                <TableCell className="px-3 text-[#4E5969]">
                  {item.project}
                </TableCell>
                <TableCell className="px-3">
                  <PlatformMark platform={item.platforms[0]} />
                </TableCell>
                <TableCell className="px-3 text-[#4E5969]">
                  {item.account}
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                  {item.schedule}
                </TableCell>
                <TableCell className="px-3">
                  <StatusPill value={item.status} />
                </TableCell>
                <TableCell className="px-3">
                  <span className="flex gap-2 whitespace-nowrap font-semibold text-[#1664FF]">
                    <Link href="/analytics">数据</Link>
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  }

  function AccountTable() {
    return (
      <Table className="studio-table text-xs">
        <TableHeader>
          <TableRow className="border-[#EEF0F5]">
            {['平台', '账号名称', '授权状态', '操作'].map((head) => (
              <TableHead
                key={head}
                className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
              >
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow className="border-0">
              <TableCell
                colSpan={4}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无账号
              </TableCell>
            </TableRow>
          ) : (
            accounts.slice(0, 5).map((acc) => (
              <TableRow key={acc.id} className="border-0">
                <TableCell className="px-3 py-2">
                  <PlatformMark platform={acc.platform} />
                </TableCell>
                <TableCell className="px-3">
                  <Link
                    href={`/accounts/${acc.id}`}
                    className="font-semibold text-[#1D2129] hover:text-[#1664FF]"
                  >
                    {acc.accountName}
                  </Link>
                </TableCell>
                <TableCell className="px-3">
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-[11px] font-semibold',
                      acc.authStatus === 'active'
                        ? 'bg-[#E8FFEA] text-[#00B42A]'
                        : 'bg-[#FFF7E6] text-[#FF7D00]'
                    )}
                  >
                    {acc.authStatus === 'active' ? '已授权' : '待授权'}
                  </span>
                </TableCell>
                <TableCell className="px-3">
                  <Link
                    href="/accounts"
                    className="font-semibold text-[#1664FF] hover:underline"
                  >
                    管理
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  }

  function SummaryCard({ item }: { item: (typeof summaryCards)[number] }) {
    const Icon = 'icon' in item && item.icon ? item.icon : null;
    return (
      <StudioCard contentClassName="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-semibold text-[#4E5969]">{item.label}</p>
          <p className="mt-2 text-2xl font-bold leading-none text-[#1D2129]">
            {item.value}
          </p>
        </div>
        <span
          className="flex size-12 items-center justify-center rounded-xl font-bold"
          style={{ backgroundColor: item.bg, color: item.color }}
        >
          {Icon ? <Icon className="size-6" /> : item.text}
        </span>
      </StudioCard>
    );
  }

  /* ---- render ---- */
  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-4 p-6">
        {/* ---- notification bar ---- */}
        {notifications.length > 0 && (
          <div className="fixed right-6 top-6 z-50 flex flex-col gap-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${n.type === 'success' ? 'bg-[#00B42A] text-white' : 'bg-[#F53F3F] text-white'}`}
              >
                <span>{n.message}</span>
                <button
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.filter((x) => x.id !== n.id)
                    )
                  }
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-[#86909C]">加载中…</p>
        ) : loadError ? (
          <p className="py-4 text-sm text-[#F53F3F]">{loadError}</p>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-4">
              {summaryCards.map((item) => (
                <SummaryCard key={item.label} item={item} />
              ))}
            </div>

            <div className="grid grid-cols-[1.12fr_0.88fr] gap-4">
              <StudioCard contentClassName="p-5">
                <SectionHeader
                  title="待发布内容"
                  action={
                    showAllPending
                      ? '收起'
                      : `查看全部（${pendingTaskItems.length}）`
                  }
                  onAction={() => setShowAllPending((v) => !v)}
                />
                <PendingTable
                  items={pendingTaskItems}
                  showAll={showAllPending}
                />
              </StudioCard>
              <StudioCard contentClassName="p-5">
                <SectionHeader
                  title="公众号草稿同步"
                  action="同步设置"
                  onAction={() => window.open('/settings/ima', '_blank')}
                />
                <DraftSyncTable />
                <div className="mt-4 text-center">
                  <button
                    className="text-xs font-semibold text-[#1664FF]"
                    onClick={() => loadAll()}
                  >
                    刷新列表
                  </button>
                </div>
              </StudioCard>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StudioCard contentClassName="p-5">
                <SectionHeader
                  title="小红书发布包"
                  action={showAllRed ? '收起' : '下载全部'}
                  download
                  onAction={
                    showAllRed
                      ? () => setShowAllRed(false)
                      : () => handleDownloadAllPackages(redPackages, '小红书')
                  }
                />
                <PackageTable items={redPackages} showAll={showAllRed} />
                <div className="mt-4 text-center">
                  {redPackages.length > 5 && (
                    <button
                      className="text-xs font-semibold text-[#1664FF]"
                      onClick={() => setShowAllRed((v) => !v)}
                    >
                      {showAllRed
                        ? '收起'
                        : `查看全部（${redPackages.length}）`}
                    </button>
                  )}
                </div>
              </StudioCard>
              <StudioCard contentClassName="p-5">
                <SectionHeader
                  title="抖音发布包"
                  action={showAllDouyin ? '收起' : '下载全部'}
                  download
                  onAction={
                    showAllDouyin
                      ? () => setShowAllDouyin(false)
                      : () => handleDownloadAllPackages(douyinPackages, '抖音')
                  }
                />
                <PackageTable items={douyinPackages} showAll={showAllDouyin} />
                <div className="mt-4 text-center">
                  {douyinPackages.length > 5 && (
                    <button
                      className="text-xs font-semibold text-[#1664FF]"
                      onClick={() => setShowAllDouyin((v) => !v)}
                    >
                      {showAllDouyin
                        ? '收起'
                        : `查看全部（${douyinPackages.length}）`}
                    </button>
                  )}
                </div>
              </StudioCard>
            </div>

            <div className="grid grid-cols-[1.12fr_0.88fr] gap-4">
              <StudioCard contentClassName="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#1D2129]">发布记录</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-[#E5E8EF] text-xs"
                      onClick={() => handleExportRecords(recordItems)}
                    >
                      <Download className="size-3.5" />
                      导出
                    </Button>
                  </div>
                </div>
                <RecordsTable items={recordItems} />
              </StudioCard>
              <StudioCard contentClassName="p-5">
                <SectionHeader
                  title="账号授权状态"
                  action="管理账号 >"
                  onAction={() => (window.location.href = '/accounts')}
                />
                <AccountTable />
              </StudioCard>
            </div>
          </>
        )}
      </PageContainer>
    </StudioLayout>
  );
}
