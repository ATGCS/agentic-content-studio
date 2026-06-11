'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clipboard, Download, Send, X } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/platform-icon';
import { StudioCard } from '@/components/studio/studio-card';
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
import { getPlatformLabel } from '@/lib/tokens';

import { cn } from '@/lib/utils';

const PACKAGE_PLATFORMS = [
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'DOUYIN', label: '抖音' },
] as const;

type PackagePlatform = (typeof PACKAGE_PLATFORMS)[number]['value'];

function formatPackageTime(value: string) {
  if (!value || value === '—') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

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
  generated: { label: '待发布', className: 'bg-[#FFF7E6] text-[#FF7D00]' },
  approved: { label: '已通过', className: 'bg-[#E8FFEA] text-[#00B42A]' },
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
  const searchParams = useSearchParams();
  const packagesSectionRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<ApiPublishingTask[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [redPackages, setRedPackages] = useState<PackageItem[]>([]);
  const [douyinPackages, setDouyinPackages] = useState<PackageItem[]>([]);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllPending, setShowAllPending] = useState(false);
  const [packagePlatform, setPackagePlatform] =
    useState<PackagePlatform>('XIAOHONGSHU');
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  const packagesByPlatform = useMemo(
    () => ({
      XIAOHONGSHU: redPackages,
      DOUYIN: douyinPackages,
    }),
    [redPackages, douyinPackages]
  );
  const activePackages = packagesByPlatform[packagePlatform];
  const packageCount = activePackages.length;

  useEffect(() => {
    if (searchParams.get('packages') !== '1') return;
    packagesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [searchParams, loading, packageCount]);

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

  const publishedTodayCount = recordItems.filter(
    (item) => item.status === 'SUCCESS'
  ).length;

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
      <StudioTable size="compact">
        <StudioTableHeader>
          <StudioTableRow className="border-[#EEF0F5]">
            {[
              '内容标题',
              '内容管理',
              '目标平台',
              '目标账号',
              '计划发布时间',
              '状态',
              '操作',
            ].map((head) => (
              <StudioTableHead
                key={head}
                className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
              >
                {head}
              </StudioTableHead>
            ))}
          </StudioTableRow>
        </StudioTableHeader>
        <StudioTableBody>
          {display.length === 0 ? (
            <StudioTableRow className="border-0">
              <StudioTableCell
                colSpan={7}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                <div className="space-y-1">
                  <p>暂无待发布任务</p>
                  <p className="text-[11px] font-normal text-[#C9CDD4]">
                    一键发布需先绑定平台账号并创建发布任务。未绑定时请使用下方「发布包导出」复制或下载后手动发布。
                  </p>
                </div>
              </StudioTableCell>
            </StudioTableRow>
          ) : (
            display.map((item) => (
              <StudioTableRow key={item.id} className="border-0">
                <StudioTableCell className="min-w-[180px] px-3 py-2">
                  <Link
                    href={`/contents/${item.id}`}
                    className="font-semibold text-[#1D2129] hover:text-[#1664FF] hover:underline"
                  >
                    {item.title}
                  </Link>
                </StudioTableCell>
                <StudioTableCell className="px-3 text-[#1664FF]">
                  {item.project}
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <PlatformMark platform={item.platforms[0]} />
                </StudioTableCell>
                <StudioTableCell className="px-3 text-[#4E5969]">
                  {item.account}
                </StudioTableCell>
                <StudioTableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                  {item.schedule}
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <StatusPill value={item.status} />
                </StudioTableCell>
                <StudioTableCell className="px-3">
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
                </StudioTableCell>
              </StudioTableRow>
            ))
          )}
        </StudioTableBody>
      </StudioTable>
    );
  }

  function DraftSyncTable() {
    return (
      <StudioTable size="compact">
        <StudioTableHeader>
          <StudioTableRow className="border-[#EEF0F5]">
            {['草稿标题', '内容管理', '同步时间', '状态', '操作'].map(
              (head) => (
                <StudioTableHead
                  key={head}
                  className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
                >
                  {head}
                </StudioTableHead>
              )
            )}
          </StudioTableRow>
        </StudioTableHeader>
        <StudioTableBody>
          {drafts.length === 0 ? (
            <StudioTableRow className="border-0">
              <StudioTableCell
                colSpan={5}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无草稿
              </StudioTableCell>
            </StudioTableRow>
          ) : (
            drafts.slice(0, 5).map((item) => (
              <StudioTableRow key={item.id} className="border-0">
                <StudioTableCell className="max-w-[200px] truncate px-3 py-2">
                  <span className="font-semibold text-[#1D2129]">
                    {item.title}
                  </span>
                </StudioTableCell>
                <StudioTableCell className="px-3 text-[#4E5969]">
                  {item.project}
                </StudioTableCell>
                <StudioTableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                  {item.syncedAt}
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <StatusPill value={item.status} />
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <span className="font-semibold text-[#1664FF] hover:underline cursor-pointer">
                    {item.status === 'failed' ? '重试' : '查看'}
                  </span>
                </StudioTableCell>
              </StudioTableRow>
            ))
          )}
        </StudioTableBody>
      </StudioTable>
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
      <StudioTable size="compact">
        <StudioTableHeader>
          <StudioTableRow className="border-[#EEF0F5]">
            {['标题', '内容管理', '生成时间', '状态', '操作'].map((head) => (
              <StudioTableHead
                key={head}
                className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
              >
                {head}
              </StudioTableHead>
            ))}
          </StudioTableRow>
        </StudioTableHeader>
        <StudioTableBody>
          {display.length === 0 ? (
            <StudioTableRow className="border-0">
              <StudioTableCell
                colSpan={5}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无发布包
              </StudioTableCell>
            </StudioTableRow>
          ) : (
            display.map((item) => (
              <StudioTableRow key={item.id} className="border-0">
                <StudioTableCell className="max-w-[200px] truncate px-3 py-2">
                  <span className="font-semibold text-[#1D2129] hover:text-[#1664FF]">
                    {item.title}
                  </span>
                </StudioTableCell>
                <StudioTableCell className="px-3 text-[#4E5969]">
                  {item.project}
                </StudioTableCell>
                <StudioTableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                  {item.time}
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <StatusPill value={item.status} />
                </StudioTableCell>
                <StudioTableCell className="px-3">
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
                </StudioTableCell>
              </StudioTableRow>
            ))
          )}
        </StudioTableBody>
      </StudioTable>
    );
  }

  function RecordsTable({ items }: { items: PendingItem[] }) {
    return (
      <StudioTable size="compact">
        <StudioTableHeader>
          <StudioTableRow className="border-[#EEF0F5]">
            {[
              '内容标题',
              '内容管理',
              '发布平台',
              '账号名称',
              '发布时间',
              '状态',
              '操作',
            ].map((head) => (
              <StudioTableHead
                key={head}
                className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
              >
                {head}
              </StudioTableHead>
            ))}
          </StudioTableRow>
        </StudioTableHeader>
        <StudioTableBody>
          {items.length === 0 ? (
            <StudioTableRow className="border-0">
              <StudioTableCell
                colSpan={7}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无发布记录
              </StudioTableCell>
            </StudioTableRow>
          ) : (
            items.slice(0, 5).map((item) => (
              <StudioTableRow key={item.id} className="border-0">
                <StudioTableCell className="max-w-[200px] truncate px-3 py-2">
                  <span className="font-semibold text-[#1D2129]">
                    {item.title}
                  </span>
                </StudioTableCell>
                <StudioTableCell className="px-3 text-[#4E5969]">
                  {item.project}
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <PlatformMark platform={item.platforms[0]} />
                </StudioTableCell>
                <StudioTableCell className="px-3 text-[#4E5969]">
                  {item.account}
                </StudioTableCell>
                <StudioTableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                  {item.schedule}
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <StatusPill value={item.status} />
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <span className="flex gap-2 whitespace-nowrap font-semibold text-[#1664FF]">
                    <Link href="/analytics">数据</Link>
                  </span>
                </StudioTableCell>
              </StudioTableRow>
            ))
          )}
        </StudioTableBody>
      </StudioTable>
    );
  }

  function AccountTable() {
    return (
      <StudioTable size="compact">
        <StudioTableHeader>
          <StudioTableRow className="border-[#EEF0F5]">
            {['平台', '账号名称', '授权状态', '绑定时间', '操作'].map(
              (head) => (
                <StudioTableHead
                  key={head}
                  className="h-9 px-3 text-[11px] font-medium text-[#86909C]"
                >
                  {head}
                </StudioTableHead>
              )
            )}
          </StudioTableRow>
        </StudioTableHeader>
        <StudioTableBody>
          {accounts.length === 0 ? (
            <StudioTableRow className="border-0">
              <StudioTableCell
                colSpan={5}
                className="px-3 py-8 text-center text-[#86909C]"
              >
                暂无账号
              </StudioTableCell>
            </StudioTableRow>
          ) : (
            accounts.slice(0, 5).map((acc) => (
              <StudioTableRow key={acc.id} className="border-0">
                <StudioTableCell className="px-3 py-2">
                  <PlatformMark platform={acc.platform} />
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <Link
                    href={`/accounts/${acc.id}`}
                    className="font-semibold text-[#1D2129] hover:text-[#1664FF]"
                  >
                    {acc.accountName}
                  </Link>
                </StudioTableCell>
                <StudioTableCell className="px-3">
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
                </StudioTableCell>
                <StudioTableCell className="px-3 text-[11px] text-[#86909C]">
                  {acc.boundAt
                    ? new Date(acc.boundAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </StudioTableCell>
                <StudioTableCell className="px-3">
                  <Link
                    href="/accounts"
                    className="font-semibold text-[#1664FF] hover:underline"
                  >
                    管理
                  </Link>
                </StudioTableCell>
              </StudioTableRow>
            ))
          )}
        </StudioTableBody>
      </StudioTable>
    );
  }

  function SummaryCard({ item }: { item: (typeof summaryCards)[number] }) {
    const Icon = 'icon' in item && item.icon ? item.icon : null;
    return (
      <StudioCard contentClassName="flex items-center justify-between p-4">
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
      <PageContainer className="max-w-none gap-2 p-4">
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
            <StudioCard contentClassName="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#1D2129]">
                    一键发布任务
                  </h2>
                  <p className="mt-1 text-xs text-[#86909C]">
                    需已绑定平台账号且已创建发布任务；点击「发布」推送到对应平台。
                    {publishedTodayCount > 0 &&
                      ` 今日已成功发布 ${publishedTodayCount} 篇。`}
                  </p>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-[#E8F3FF] px-3 py-1 text-xs font-semibold text-[#1664FF]">
                  <Send className="size-3.5" />
                  {pendingTaskItems.length} 个任务
                </span>
              </div>
              <PendingTable
                items={pendingTaskItems}
                showAll={showAllPending || pendingTaskItems.length <= 5}
              />
              {pendingTaskItems.length > 5 && (
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#1664FF]"
                    onClick={() => setShowAllPending((v) => !v)}
                  >
                    {showAllPending
                      ? '收起'
                      : `查看全部（${pendingTaskItems.length}）`}
                  </button>
                </div>
              )}
            </StudioCard>

            <div ref={packagesSectionRef}>
              <StudioCard contentClassName="p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F5] pb-2">
                  <div>
                    <h2 className="text-sm font-bold text-[#1D2129]">
                      发布包导出
                    </h2>
                    <p className="mt-0.5 text-xs text-[#86909C]">
                      审核通过后导出 .md 或复制，到对应 App 手动发布。
                    </p>
                  </div>
                  <span className="rounded-full bg-[#E8FFEA] px-2.5 py-0.5 text-xs font-semibold text-[#00B42A]">
                    {getPlatformLabel(packagePlatform)} {packageCount} 个
                  </span>
                </div>

                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {PACKAGE_PLATFORMS.map((platform) => (
                      <button
                        key={platform.value}
                        type="button"
                        className={cn(
                          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                          packagePlatform === platform.value
                            ? 'bg-[#E8F3FF] text-[#1664FF]'
                            : 'text-[#4E5969] hover:bg-[#F5F7FA]'
                        )}
                        onClick={() => {
                          setPackagePlatform(platform.value);
                          setShowAllPackages(false);
                        }}
                      >
                        {platform.label}
                        <span className="ml-1 text-[#86909C]">
                          ({packagesByPlatform[platform.value].length})
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1664FF]"
                    onClick={
                      showAllPackages
                        ? () => setShowAllPackages(false)
                        : () =>
                            handleDownloadAllPackages(
                              activePackages,
                              getPlatformLabel(packagePlatform)
                            )
                    }
                  >
                    <Download className="size-3.5" />
                    {showAllPackages ? '收起' : '下载全部'}
                  </button>
                </div>

                <PackageTable
                  items={activePackages}
                  showAll={showAllPackages}
                />
              </StudioCard>
            </div>

            <div className="rounded-xl border border-[#E5E8EF] bg-white">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-[#4E5969] hover:text-[#1664FF]"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                <span>高级选项（草稿同步 / 发布记录 / 账号状态）</span>
                <span className="text-xs font-normal text-[#86909C]">
                  {advancedOpen ? '收起' : '展开'}
                </span>
              </button>
              {advancedOpen && (
                <div className="space-y-2 border-t border-[#EEF0F5] p-4">
                  <div className="grid grid-cols-[1.12fr_0.88fr] gap-2">
                    <StudioCard contentClassName="p-4">
                      <SectionHeader
                        title="公众号草稿同步"
                        action="同步设置"
                        onAction={() => window.open('/settings/ima', '_blank')}
                      />
                      <DraftSyncTable />
                    </StudioCard>
                    <StudioCard contentClassName="p-4">
                      <SectionHeader
                        title="账号授权状态"
                        action="管理账号 >"
                        onAction={() => (window.location.href = '/accounts')}
                      />
                      <AccountTable />
                    </StudioCard>
                  </div>

                  <StudioCard contentClassName="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-[#1D2129]">
                        发布记录
                      </h2>
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
                    <RecordsTable items={recordItems} />
                  </StudioCard>
                </div>
              )}
            </div>
          </>
        )}
      </PageContainer>
    </StudioLayout>
  );
}
