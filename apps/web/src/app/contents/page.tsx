'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Edit,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ContentEditDialog,
  type ContentEditForm,
} from '@/components/dialogs/content-edit-dialog';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/studio/empty-state';
import { CreationWorkflowGuide } from '@/components/studio/creation-workflow-guide';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StatusBadge } from '@/components/studio/status-badge';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getStatusLabel, getStatusStyle } from '@/lib/tokens';

type ContentStatus =
  | 'DRAFT'
  | 'PENDING_GENERATE'
  | 'GENERATING'
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'APPROVED'
  | 'PENDING_PUBLISH'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'REVIEWED'
  | 'ARCHIVED';

type ContentItem = {
  id: string;
  title: string;
  summary?: string | null;
  status: ContentStatus;
  topicId?: string | null;
  topic?: { id: string; title: string } | null;
  updatedAt: string;
  creator?: { name?: string | null; email?: string | null };
  versions: {
    platform: string;
    status: string;
    account?: { accountName: string; platform: string } | null;
  }[];
};

type ContentListResponse = {
  items: ContentItem[];
  total: number;
  statusCounts?: Record<string, number>;
};

const statusKeys: ContentStatus[] = [
  'DRAFT',
  'PENDING_GENERATE',
  'GENERATING',
  'PENDING_REVIEW',
  'PENDING_PUBLISH',
  'PUBLISHED',
  'REVIEWED',
];

const validStatusFilters = new Set<string>(['ALL', ...statusKeys]);

export default function ContentsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status')?.toUpperCase() ?? 'ALL';
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(
    null
  );
  const [total, setTotal] = useState(0);
  const [topicFilter, setTopicFilter] = useState('');
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [aiContentId, setAiContentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(
    validStatusFilters.has(initialStatus) ? initialStatus : 'ALL'
  );
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (topicFilter) params.set('topicId', topicFilter);
      if (statusFilter && statusFilter !== 'ALL')
        params.set('status', statusFilter);
      const qs = params.toString();
      const res = await api<ContentListResponse>(
        `/api/contents${qs ? '?' + qs : ''}`
      );
      setItems(res.data.items || []);
      setTotal(res.data.total ?? res.data.items?.length ?? 0);
      setStatusCounts(res.data.statusCounts ?? {});
      setSelected([]);
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError('内容列表加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, [topicFilter, statusFilter]);

  useEffect(() => {
    api<{ items: { id: string; title: string }[] }>('/api/topics?pageSize=200')
      .then((r) => setTopics(r.data.items ?? []))
      .catch(() => {});
  }, []);

  const filteredItems = items.filter((item) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return true;
    return [item.title, item.summary, item.creator?.name, item.creator?.email]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedKeyword));
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openAiGenerate = (contentId: string) => {
    setAiContentId(contentId);
    window.location.href = `/ai-generate?contentId=${contentId}`;
  };

  const toggleAll = () => {
    setSelected(
      selected.length === filteredItems.length
        ? []
        : filteredItems.map((c) => c.id)
    );
  };

  function openCreateDialog() {
    setEditingContent(null);
    setDialogOpen(true);
  }

  function openEditDialog(content: ContentItem) {
    setEditingContent(content);
    setDialogOpen(true);
  }

  async function doDelete() {
    if (!deleteDialogId) return;
    setDeletingId(deleteDialogId);
    setDeleteDialogId(null);
    try {
      await api(`/api/contents/${deleteDialogId}`, { method: 'DELETE' });
      await load();
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('not found')) {
        // 内容已被删除，刷新列表即可
        await load();
      } else {
        setLoadError('删除失败，请重试');
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function saveContent(form: ContentEditForm): Promise<string | void> {
    const topicId =
      form.topicId && form.topicId.trim() ? form.topicId.trim() : undefined;
    const body = {
      title: form.title,
      summary: form.summary || undefined,
      topicId,
    };

    if (editingContent) {
      await api(`/api/contents/${editingContent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: form.title,
          summary: form.summary || undefined,
          topicId,
        }),
      });
      return;
    }

    const res = await api<{ id: string }>('/api/contents', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (form.platforms.length > 0) {
      await api(`/api/contents/${res.data.id}/versions/generate`, {
        method: 'POST',
        body: JSON.stringify({ platforms: form.platforms }),
      });
    }
    await load();
    return res.data.id;
  }

  return (
    <StudioLayout>
      <CreationWorkflowGuide currentStep="content" />
      <PageContainer className="max-w-none gap-4 p-6">
        {/* 工具栏：搜索 + 操作 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#86909c]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索内容"
              className="studio-input h-8 w-48 rounded-lg pl-8 pr-3 text-xs"
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              className={`size-3.5 text-[#86909c] ${loading ? 'animate-spin' : ''}`}
            />
          </Button>
          <div className="mx-1 h-5 w-px bg-[#E5E8EF]" />
          <Button
            size="sm"
            className="h-8 bg-[#1664FF] px-3 text-xs text-white hover:bg-[#0E52D9]"
            onClick={openCreateDialog}
          >
            <Plus className="size-3.5" />
            新建内容
          </Button>
          <Link href="/topics">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-[#E5E8EF] px-2.5 text-xs"
            >
              <Layers className="size-3.5" />
              系列管理
            </Button>
          </Link>

          {/* 系列筛选 pills */}
          {topics.length > 0 && (
            <>
              <div className="mx-1 h-5 w-px bg-[#E5E8EF]" />
              <button
                onClick={() => setTopicFilter('')}
                className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${!topicFilter ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]' : 'border-[#E5E8EF] text-[#86909C] hover:border-[#C9D8FF]'}`}
              >
                全部
              </button>
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTopicFilter(t.id)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${topicFilter === t.id ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]' : 'border-[#E5E8EF] text-[#86909C] hover:border-[#C9D8FF]'}`}
                >
                  {t.title}
                </button>
              ))}
            </>
          )}
        </div>

        {/* 状态筛选 tabs（替代大卡片 + 下拉） */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === 'ALL' ? 'bg-[#1664FF] text-white' : 'bg-[#F2F3F5] text-[#4E5969] hover:bg-[#E5E8EF]'}`}
          >
            全部 <span className="ml-0.5 text-[10px] opacity-70">{total}</span>
          </button>
          {statusKeys.map((key) => {
            const count = statusCounts[key] || 0;
            const style = getStatusStyle(key);
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${active ? `${style.bg} ${style.text} ring-1 ring-current/20` : 'bg-[#F2F3F5] text-[#4E5969] hover:bg-[#E5E8EF]'}`}
              >
                {getStatusLabel(key)}{' '}
                <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {loadError && (
          <StudioCard contentClassName="p-4">
            <p className="text-sm text-[#F53F3F]">{loadError}</p>
          </StudioCard>
        )}

        <div className="mb-2 flex items-center justify-between text-xs text-[#86909c]">
          <span>共 {filteredItems.length} 条内容</span>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              className="accent-[#1664ff]"
              checked={
                selected.length === filteredItems.length &&
                filteredItems.length > 0
              }
              onChange={toggleAll}
            />
            全选
          </label>
        </div>

        {loading ? (
          <StudioCard contentClassName="p-8">
            <EmptyState
              title="内容加载中…"
              description="正在读取内容管理列表"
            />
          </StudioCard>
        ) : filteredItems.length === 0 ? (
          <StudioCard contentClassName="p-8">
            <EmptyState
              title="暂无内容"
              description="新建内容后可在这里管理内容"
            />
          </StudioCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((c) => {
              const platforms = [
                ...new Set(c.versions.map((v) => v.platform)),
              ];
              const accounts = c.versions
                .map((v) => v.account?.accountName)
                .filter(Boolean);
              const isSelected = selected.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`group relative flex flex-col rounded-xl border bg-white p-4 transition-all hover:shadow-md ${isSelected ? 'border-[#1664FF] ring-1 ring-[#1664FF]/20' : 'border-[#E5E8EF] hover:border-[#C9D8FF]'}`}
                >
                  {/* 选中标记 */}
                  <label className="absolute right-3 top-3 flex items-center">
                    <input
                      type="checkbox"
                      className="accent-[#1664ff]"
                      checked={isSelected}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </label>

                  {/* 标题 + 摘要 */}
                  <Link
                    href={`/contents/${c.id}`}
                    className="block pr-6"
                  >
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#1D2129] group-hover:text-[#1664FF]">
                      {c.title}
                    </h3>
                    {c.summary && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#86909C]">
                        {c.summary}
                      </p>
                    )}
                  </Link>

                  {/* 系列 + 状态 */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={c.status} />
                    {c.topic && (
                      <Link
                        href={`/topics/${c.topic.id}`}
                        className="rounded-full bg-[#F0F5FF] px-2 py-0.5 text-[11px] font-medium text-[#1664FF] hover:underline"
                      >
                        {c.topic.title}
                      </Link>
                    )}
                  </div>

                  {/* 平台 + 账号 */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {platforms.length > 0 ? (
                      platforms.map((p) => (
                        <PlatformBadge key={p} platform={p} size="sm" />
                      ))
                    ) : (
                      <span className="text-[11px] text-[#C9CDD4]">
                        未指定平台
                      </span>
                    )}
                    {accounts.length > 0 && (
                      <span className="text-[11px] text-[#86909C]">
                        · {accounts.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* 底部：负责人 + 时间 */}
                  <div className="mt-auto flex items-center justify-between border-t border-[#F2F3F5] pt-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#86909C]">
                      <span className="flex size-5 items-center justify-center rounded-full bg-[#F2F3F5] text-[10px] font-medium text-[#4E5969]">
                        {(c.creator?.name || 'U').slice(0, 1)}
                      </span>
                      {c.creator?.name || '未分配'}
                    </span>
                    <span className="text-[11px] text-[#C9CDD4]">
                      {new Date(c.updatedAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 text-[11px] text-[#1664FF] border-[#E5E8EF]"
                      onClick={() => openAiGenerate(c.id)}
                    >
                      <WandSparkles className="size-3 mr-1" />
                      AI 生成
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 text-[11px] border-[#E5E8EF]"
                      onClick={() => openEditDialog(c)}
                    >
                      <Edit className="size-3 mr-1" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-[#C9CDD4] hover:text-[#F53F3F] hover:bg-red-50"
                      disabled={deletingId === c.id}
                      onClick={() => setDeleteDialogId(c.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#86909c]">
          <span>共 {total} 条记录</span>
          <span>当前第 1 页 · 10 条/页</span>
        </div>
      </PageContainer>
      <ContentEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        content={
          editingContent
            ? {
                id: editingContent.id,
                title: editingContent.title,
                summary: editingContent.summary,
                topicId: editingContent.topicId,
                platforms: editingContent.versions.map(
                  (version) => version.platform
                ),
              }
            : undefined
        }
        onSubmit={saveContent}
      />
      <AlertDialog
        open={!!deleteDialogId}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后数据不可恢复，确定要删除这条内容吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#F53F3F] hover:bg-[#D92E2E]"
              onClick={doDelete}
            >
              {deletingId ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudioLayout>
  );
}
