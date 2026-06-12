'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Clipboard,
  Download,
  Send,
  X,
  RefreshCw,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/platform-icon';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getPlatformLabel } from '@/lib/tokens';
import { cn } from '@/lib/utils';

const PACKAGE_PLATFORMS = [
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'DOUYIN', label: '抖音' },
] as const;

type PackagePlatform = (typeof PACKAGE_PLATFORMS)[number]['value'];

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

function StatusPill({ value }: { value: string }) {
  const item = statusConfig[value] ?? {
    label: value,
    className: 'bg-[#F2F3F5] text-[#86909C]',
  };
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        item.className
      )}
    >
      {item.label}
    </span>
  );
}

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

type Notification = { type: 'success' | 'error'; message: string };
let notifId = 0;

type CopyPreview = {
  title: string;
  content: string;
  versionId: string;
} | null;

type TabValue = 'all' | 'pending' | 'published' | 'packages' | 'records' | 'drafts';

const tabs: { value: TabValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待发布' },
  { value: 'published', label: '已发布' },
  { value: 'packages', label: '发布包' },
  { value: 'records', label: '发布记录' },
  { value: 'drafts', label: '草稿同步' },
];

export default function PublishingPage() {
  const searchParams = useSearchParams();
  const packagesSectionRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<ApiPublishingTask[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [redPackages, setRedPackages] = useState<PackageItem[]>([]);
  const [douyinPackages, setDouyinPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [packagePlatform, setPackagePlatform] =
    useState<PackagePlatform>('XIAOHONGSHU');
  const [notifications, setNotifications] = useState<
    (Notification & { id: number })[]
  >([]);
  const [tab, setTab] = useState<TabValue | null>(null); // null 表示自动选择
  const [copyPreview, setCopyPreview] = useState<CopyPreview>(null);

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
      const [tasksRes, draftsRes, redPkgRes, douyinPkgRes] =
        await Promise.all([
          api<ApiPublishingTask[]>('/api/publishing/tasks'),
          api<DraftItem[]>('/api/publishing/drafts'),
          api<PackageItem[]>('/api/publishing/packages?platform=XIAOHONGSHU'),
          api<PackageItem[]>('/api/publishing/packages?platform=DOUYIN'),
        ]);
      setTasks(tasksRes.data);
      setDrafts(draftsRes.data);
      setRedPackages(redPkgRes.data);
      setDouyinPackages(douyinPkgRes.data);
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

  const taskItems = useMemo(() => tasks.map(mapPublishingTask), [tasks]);
  const pendingTaskItems = taskItems.filter(
    (item) => item.status === 'PENDING' || item.status === 'PUBLISHING'
  );
  const publishedTaskItems = taskItems.filter(
    (item) => item.status === 'SUCCESS'
  );
  const recordItems = taskItems.filter(
    (item) =>
      item.status === 'FAILED' ||
      item.status === 'CANCELLED'
  );

  const publishedTodayCount = recordItems.filter(
    (item) => item.status === 'SUCCESS'
  ).length;

  // 数据加载完成后自动选择默认标签
  useEffect(() => {
    if (!loading && tab === null) {
      setTab('all'); // 默认显示全部
    }
  }, [loading, tab, publishedTaskItems]);

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
        
        // 构建纯文本内容（适合直接粘贴到平台）
        const lines: string[] = [];
        lines.push(v.title ?? item.title);
        lines.push('');
        if (v.coverText) {
          lines.push(v.coverText);
          lines.push('');
        }
        if (tags.length > 0) {
          lines.push(tags.map(t => `#${t}`).join(' '));
          lines.push('');
        }
        lines.push(v.body ?? '');
        const plainText = lines.join('\n').trim();
        
        // 显示预览弹窗
        setCopyPreview({
          title: item.title,
          content: plainText,
          versionId: item.id,
        });
      })
      .catch(() => notify('error', '复制失败，无法获取内容详情'));
  }

  function confirmCopy() {
    if (!copyPreview) return;
    navigator.clipboard
      .writeText(copyPreview.content)
      .then(() => {
        notify('success', `已复制「${copyPreview.title}」内容`);
        setCopyPreview(null);
      })
      .catch(() => {
        notify('error', '复制失败，浏览器未授权剪贴板权限');
      });
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

  const tabCounts = useMemo(() => {
    const totalCount = pendingTaskItems.length + publishedTaskItems.length + packageCount + recordItems.length + drafts.length;
    return tabs.map((t) => {
      let count = 0;
      if (t.value === 'all') count = totalCount;
      else if (t.value === 'pending') count = pendingTaskItems.length;
      else if (t.value === 'published') count = publishedTaskItems.length;
      else if (t.value === 'packages') count = packageCount;
      else if (t.value === 'records') count = recordItems.length;
      else if (t.value === 'drafts') count = drafts.length;
      return { ...t, count };
    });
  }, [pendingTaskItems, publishedTaskItems, packageCount, recordItems, drafts]);

  const activeTab = tab ?? 'pending';

  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-3 p-4">
        {/* notification */}
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

        {/* 紧凑工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {tabCounts.map((t) => {
              const active = activeTab === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${active ? 'bg-[#1664FF] text-white ring-1 ring-current/20' : 'bg-[#F2F3F5] text-[#4E5969] hover:bg-[#E5E8EF]'}`}
                >
                  {t.label}{' '}
                  <span className="ml-0.5 text-[10px] opacity-70">{t.count}</span>
                </button>
              );
            })}
          </div>

          <div className="mx-1 h-5 w-px bg-[#E5E8EF]" />

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-[#86909C]"
            onClick={loadAll}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

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
        ) : loadError ? (
          <p className="py-4 text-sm text-[#F53F3F]">{loadError}</p>
        ) : (
          <>
            {/* 全部 */}
            {activeTab === 'all' && (
              <div className="space-y-6">
                {/* 待发布 */}
                {pendingTaskItems.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
                      待发布 <span className="ml-1 text-xs font-normal text-[#86909C]">({pendingTaskItems.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {pendingTaskItems.map((item) => (
                        <div
                          key={item.id}
                          className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md hover:border-[#1664FF]/40 transition-all"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#1664FF] transition-colors">
                              {item.title}
                            </h3>
                            <StatusPill value={item.status} />
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                            <PlatformBadge platform={item.platforms[0]} size="sm" />
                            <span className="truncate">{item.account}</span>
                            <span className="ml-auto whitespace-nowrap">
                              {item.schedule !== '—'
                                ? new Date(item.schedule).toLocaleString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 border-t border-[#F2F3F5] pt-2">
                            <Button
                              size="sm"
                              className="h-7 flex-1 text-[11px] bg-[#1664FF] hover:bg-[#0E52D9] text-white"
                              onClick={() => handlePublish(item)}
                              disabled={item.status === 'PUBLISHING'}
                            >
                              <Send className="size-3 mr-1" />
                              发布
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 flex-1 text-[11px] border-[#E5E8EF]"
                              onClick={() => handleCancel(item)}
                              disabled={item.status !== 'PENDING'}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 已发布 */}
                {publishedTaskItems.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
                      已发布 <span className="ml-1 text-xs font-normal text-[#86909C]">({publishedTaskItems.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {publishedTaskItems.map((item) => (
                        <div
                          key={item.id}
                          className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#1664FF] transition-colors">
                              {item.title}
                            </h3>
                            <StatusPill value={item.status} />
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                            <PlatformBadge platform={item.platforms[0]} size="sm" />
                            <span className="truncate">{item.account}</span>
                            <span className="ml-auto whitespace-nowrap">
                              {item.schedule !== '—'
                                ? new Date(item.schedule).toLocaleString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                          <div className="mt-2 border-t border-[#F2F3F5] pt-2">
                            <Link
                              href="/analytics"
                              className="flex items-center justify-center h-7 text-[11px] text-[#1664FF] hover:underline"
                            >
                              查看数据
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 发布包 */}
                {packageCount > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
                      发布包 <span className="ml-1 text-xs font-normal text-[#86909C]">({packageCount})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {activePackages.map((item) => (
                        <div
                          key={item.id}
                          className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md transition-all"
                        >
                          <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] group-hover:text-[#1664FF] transition-colors">
                            {item.title}
                          </h3>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                            <PlatformBadge platform={item.platform} size="sm" />
                            <span className="truncate">{item.account}</span>
                            <span className="ml-auto whitespace-nowrap">
                              {item.time}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 border-t border-[#F2F3F5] pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 flex-1 text-[11px] border-[#E5E8EF]"
                              onClick={() => handleExportMarkdown(item)}
                            >
                              <Download className="size-3 mr-1" />
                              导出
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 flex-1 text-[11px] border-[#E5E8EF]"
                              onClick={() => handleCopyContent(item)}
                            >
                              <Clipboard className="size-3 mr-1" />
                              复制
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 发布记录 */}
                {recordItems.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
                      发布记录 <span className="ml-1 text-xs font-normal text-[#86909C]">({recordItems.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {recordItems.map((item) => (
                        <div
                          key={item.id}
                          className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#1664FF] transition-colors">
                              {item.title}
                            </h3>
                            <StatusPill value={item.status} />
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                            <PlatformBadge platform={item.platforms[0]} size="sm" />
                            <span className="truncate">{item.account}</span>
                            <span className="ml-auto whitespace-nowrap">
                              {item.schedule !== '—'
                                ? new Date(item.schedule).toLocaleString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                          <div className="mt-2 border-t border-[#F2F3F5] pt-2">
                            <Link
                              href="/analytics"
                              className="flex items-center justify-center h-7 text-[11px] text-[#1664FF] hover:underline"
                            >
                              查看数据
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 草稿同步 */}
                {drafts.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
                      草稿同步 <span className="ml-1 text-xs font-normal text-[#86909C]">({drafts.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {drafts.map((item) => (
                        <div
                          key={item.id}
                          className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#1664FF] transition-colors">
                              {item.title}
                            </h3>
                            <StatusPill value={item.status} />
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                            <span className="truncate">{item.project}</span>
                            <span className="ml-auto whitespace-nowrap">
                              {item.syncedAt}
                            </span>
                          </div>
                          <div className="mt-2 border-t border-[#F2F3F5] pt-2">
                            <span className="flex items-center justify-center h-7 text-[11px] text-[#1664FF] hover:underline cursor-pointer">
                              {item.status === 'failed' ? '重试' : '查看'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 全部为空 */}
                {pendingTaskItems.length === 0 && publishedTaskItems.length === 0 && packageCount === 0 && recordItems.length === 0 && drafts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-[#86909C]">
                    <Send className="size-10 mb-2 text-[#C9CDD4]" />
                    <p className="text-sm">暂无内容</p>
                  </div>
                )}
              </div>
            )}

            {/* 待发布 */}
            {activeTab === 'pending' && (
              <div>
                {pendingTaskItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#86909C]">
                    <Send className="size-10 mb-2 text-[#C9CDD4]" />
                    <p className="text-sm">暂无待发布任务</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {pendingTaskItems.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md hover:border-[#1664FF]/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#1664FF] transition-colors">
                            {item.title}
                          </h3>
                          <StatusPill value={item.status} />
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                          <PlatformBadge platform={item.platforms[0]} size="sm" />
                          <span className="truncate">{item.account}</span>
                          <span className="ml-auto whitespace-nowrap">
                            {item.schedule !== '—'
                              ? new Date(item.schedule).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 border-t border-[#F2F3F5] pt-2">
                          <Button
                            size="sm"
                            className="h-7 flex-1 text-[11px] bg-[#1664FF] hover:bg-[#0E52D9] text-white"
                            onClick={() => handlePublish(item)}
                            disabled={item.status === 'PUBLISHING'}
                          >
                            <Send className="size-3 mr-1" />
                            发布
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 text-[11px] border-[#E5E8EF]"
                            onClick={() => handleCancel(item)}
                            disabled={item.status !== 'PENDING'}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 已发布 */}
            {activeTab === 'published' && (
              <div>
                {publishedTaskItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#86909C]">
                    <Send className="size-10 mb-2 text-[#C9CDD4]" />
                    <p className="text-sm">暂无已发布内容</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {publishedTaskItems.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#1664FF] transition-colors">
                            {item.title}
                          </h3>
                          <StatusPill value={item.status} />
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                          <PlatformBadge platform={item.platforms[0]} size="sm" />
                          <span className="truncate">{item.account}</span>
                          <span className="ml-auto whitespace-nowrap">
                            {item.schedule !== '—'
                              ? new Date(item.schedule).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>
                        <div className="mt-2 border-t border-[#F2F3F5] pt-2">
                          <Link
                            href="/analytics"
                            className="flex items-center justify-center h-7 text-[11px] text-[#1664FF] hover:underline"
                          >
                            查看数据
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 发布包 */}
            {activeTab === 'packages' && (
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {PACKAGE_PLATFORMS.map((platform) => (
                    <button
                      key={platform.value}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${packagePlatform === platform.value ? 'bg-[#E8F3FF] text-[#1664FF] ring-1 ring-[#1664FF]/20' : 'bg-[#F2F3F5] text-[#4E5969] hover:bg-[#E5E8EF]'}`}
                      onClick={() => setPackagePlatform(platform.value)}
                    >
                      {platform.label}
                      <span className="ml-0.5 text-[10px] opacity-70">
                        ({packagesByPlatform[platform.value].length})
                      </span>
                    </button>
                  ))}
                  <div className="ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-[#E5E8EF]"
                      onClick={() =>
                        handleDownloadAllPackages(
                          activePackages,
                          getPlatformLabel(packagePlatform)
                        )
                      }
                    >
                      <Download className="size-3 mr-1" />
                      下载全部
                    </Button>
                  </div>
                </div>

                {activePackages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#86909C]">
                    <Download className="size-10 mb-2 text-[#C9CDD4]" />
                    <p className="text-sm">暂无发布包</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {activePackages.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md transition-all"
                      >
                        <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] group-hover:text-[#1664FF] transition-colors">
                          {item.title}
                        </h3>

                        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                          <PlatformBadge platform={item.platform} size="sm" />
                          <span className="truncate">{item.account}</span>
                          <span className="ml-auto whitespace-nowrap">
                            {item.time}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 border-t border-[#F2F3F5] pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 text-[11px] border-[#E5E8EF]"
                            onClick={() => handleExportMarkdown(item)}
                          >
                            <Download className="size-3 mr-1" />
                            导出
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 text-[11px] border-[#E5E8EF]"
                            onClick={() => handleCopyContent(item)}
                          >
                            <Clipboard className="size-3 mr-1" />
                            复制
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 发布记录 */}
            {activeTab === 'records' && (
              <div>
                <div className="flex justify-end mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-[#E5E8EF]"
                    onClick={() => handleExportRecords(recordItems)}
                  >
                    <Download className="size-3 mr-1" />
                    导出 CSV
                  </Button>
                </div>

                {recordItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#86909C]">
                    <Send className="size-10 mb-2 text-[#C9CDD4]" />
                    <p className="text-sm">暂无发布记录</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {recordItems.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#1664FF] transition-colors">
                            {item.title}
                          </h3>
                          <StatusPill value={item.status} />
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                          <PlatformBadge platform={item.platforms[0]} size="sm" />
                          <span className="truncate">{item.account}</span>
                          <span className="ml-auto whitespace-nowrap">
                            {item.schedule !== '—'
                              ? new Date(item.schedule).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>

                        <div className="mt-2 border-t border-[#F2F3F5] pt-2">
                          <Link
                            href="/analytics"
                            className="flex items-center justify-center h-7 text-[11px] text-[#1664FF] hover:underline"
                          >
                            查看数据
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 草稿同步 */}
            {activeTab === 'drafts' && (
              <div>
                {drafts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#86909C]">
                    <p className="text-sm">暂无草稿</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {drafts.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col rounded-xl border border-[#E5E8EF] bg-white p-3 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="line-clamp-2 text-sm font-semibold text-[#1D2129] flex-1 group-hover:text-[#1664FF] transition-colors">
                            {item.title}
                          </h3>
                          <StatusPill value={item.status} />
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#86909C]">
                          <span className="truncate">{item.project}</span>
                          <span className="ml-auto whitespace-nowrap">
                            {item.syncedAt}
                          </span>
                        </div>

                        <div className="mt-2 border-t border-[#F2F3F5] pt-2">
                          <span className="flex items-center justify-center h-7 text-[11px] text-[#1664FF] hover:underline cursor-pointer">
                            {item.status === 'failed' ? '重试' : '查看'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 复制预览弹窗 */}
        {copyPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E5E8EF] px-5 py-3">
                <h3 className="text-sm font-semibold text-[#1D2129]">
                  复制内容预览
                </h3>
                <button
                  onClick={() => setCopyPreview(null)}
                  className="p-1 rounded hover:bg-[#F2F3F5] text-[#86909C]"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="mb-2 text-xs font-medium text-[#86909C]">
                  标题
                </div>
                <div className="mb-4 rounded-lg bg-[#F7F8FA] px-3 py-2 text-sm font-medium text-[#1D2129]">
                  {copyPreview.title}
                </div>
                <div className="mb-2 text-xs font-medium text-[#86909C]">
                  内容预览（将复制到剪贴板）
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-[#E5E8EF] bg-[#FAFBFC] px-3 py-2 text-xs leading-relaxed text-[#4E5969] whitespace-pre-wrap">
                  {copyPreview.content}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[#E5E8EF] px-5 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCopyPreview(null)}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  className="bg-[#1664FF] hover:bg-[#0E52D9]"
                  onClick={confirmCopy}
                >
                  <Clipboard className="size-3.5 mr-1.5" />
                  确认复制
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </StudioLayout>
  );
}
