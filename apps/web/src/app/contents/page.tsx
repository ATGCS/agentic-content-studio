'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Edit,
  Layers,
  Plus,
  RefreshCw,
  Search,
  WandSparkles,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
};

const statusKeys: ContentStatus[] = [
  'PENDING_GENERATE',
  'GENERATING',
  'PENDING_REVIEW',
  'PENDING_PUBLISH',
  'PUBLISHED',
  'REVIEWED',
];

export default function ContentsPage() {
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
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const statusCounts = items.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

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
      <PageContainer className="max-w-none gap-4 p-6">
        <CreationWorkflowGuide currentStep="content" />

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86909c]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索内容"
                className="studio-input h-10 w-60 pl-10 pr-4 text-sm"
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-10"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw
                className={`size-4 text-[#86909c] ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button
              size="sm"
              className="h-10 bg-[#1664FF] text-white hover:bg-[#0E52D9]"
              onClick={openCreateDialog}
            >
              <Plus className="size-4" />
              新建内容
            </Button>
            <Link href="/topics">
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 border-[#E5E8EF] text-xs"
              >
                <Layers className="size-4" />
                系列管理
              </Button>
            </Link>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                load();
              }}
            >
              <SelectTrigger className="h-9 w-36 bg-white text-xs">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                {statusKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {getStatusLabel(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 系列筛选 */}
        {topics.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#86909C]">按系列筛选：</span>
            <button
              onClick={() => {
                setTopicFilter('');
                load();
              }}
              className={`rounded-lg border px-3 py-1 text-xs transition-all ${!topicFilter ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]' : 'border-[#E5E8EF] text-[#4E5969] hover:border-[#C9D8FF]'}`}
            >
              全部
            </button>
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTopicFilter(t.id);
                  load();
                }}
                className={`rounded-lg border px-3 py-1 text-xs transition-all ${topicFilter === t.id ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]' : 'border-[#E5E8EF] text-[#4E5969] hover:border-[#C9D8FF]'}`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        <StudioCard
          className="overflow-hidden px-6 py-5"
          contentClassName="p-0"
        >
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {statusKeys.map((key) => {
              const style = getStatusStyle(key);
              const count = statusCounts[key] || 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold ${style.bg} ${style.text}`}
                  >
                    {count}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#1D2129]">
                      {getStatusLabel(key)}
                    </p>
                    <p className="text-[11px] text-[#86909c]">共 {count} 条</p>
                  </div>
                </div>
              );
            })}
          </div>
        </StudioCard>

        {loadError && (
          <StudioCard contentClassName="p-4">
            <p className="text-sm text-[#F53F3F]">{loadError}</p>
          </StudioCard>
        )}

        <StudioCard contentClassName="overflow-hidden px-5 pt-4">
          <div className="mb-3 flex items-center justify-between px-1 text-xs text-[#86909c]">
            <span>共 {filteredItems.length} 条内容</span>
            <span>已选 {selected.length} 条</span>
          </div>

          {loading ? (
            <EmptyState
              title="内容加载中…"
              description="正在读取内容管理列表"
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="暂无内容"
              description="新建内容后可在这里管理内容"
            />
          ) : (
            <StudioTable>
              <StudioTableHeader>
                <StudioTableRow>
                  <StudioTableHead className="w-12">
                    <input
                      type="checkbox"
                      className="accent-[#1664ff]"
                      checked={
                        selected.length === filteredItems.length &&
                        filteredItems.length > 0
                      }
                      onChange={toggleAll}
                    />
                  </StudioTableHead>
                  <StudioTableHead>标题</StudioTableHead>
                  <StudioTableHead>系列</StudioTableHead>
                  <StudioTableHead>目标平台</StudioTableHead>
                  <StudioTableHead>目标账号</StudioTableHead>
                  <StudioTableHead>当前状态</StudioTableHead>
                  <StudioTableHead>负责人</StudioTableHead>
                  <StudioTableHead>最近更新时间</StudioTableHead>
                  <StudioTableHead className="text-right">操作</StudioTableHead>
                </StudioTableRow>
              </StudioTableHeader>
              <StudioTableBody>
                {filteredItems.map((c) => {
                  const firstPlatform = c.versions?.[0]?.platform || '';
                  const firstAccount =
                    c.versions?.[0]?.account?.accountName || '';
                  return (
                    <StudioTableRow key={c.id} className="h-14">
                      <StudioTableCell>
                        <input
                          type="checkbox"
                          className="accent-[#1664ff]"
                          checked={selected.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </StudioTableCell>
                      <StudioTableCell className="max-w-xs">
                        <Link
                          href={`/contents/${c.id}`}
                          className="font-medium text-[#1D2129] hover:text-[#1664ff] hover:underline"
                        >
                          {c.title}
                        </Link>
                        {c.summary && (
                          <p className="mt-1 truncate text-xs text-[#86909C]">
                            {c.summary}
                          </p>
                        )}
                      </StudioTableCell>
                      <StudioTableCell>
                        {c.topic ? (
                          <Link
                            href={`/topics/${c.topic.id}`}
                            className="text-xs text-[#1664FF] hover:underline"
                          >
                            {c.topic.title}
                          </Link>
                        ) : (
                          <span className="text-xs text-[#C9CDD4]">—</span>
                        )}
                      </StudioTableCell>
                      <StudioTableCell>
                        {firstPlatform ? (
                          <PlatformBadge platform={firstPlatform} size="sm" />
                        ) : (
                          <span className="text-xs text-[#86909c]">未指定</span>
                        )}
                      </StudioTableCell>
                      <StudioTableCell className="text-sm text-[#4e5969]">
                        {firstAccount || '未指定'}
                      </StudioTableCell>
                      <StudioTableCell>
                        <StatusBadge status={c.status} />
                      </StudioTableCell>
                      <StudioTableCell>
                        <span className="inline-flex items-center gap-2 text-sm text-[#4e5969]">
                          <span className="flex size-6 items-center justify-center rounded-full bg-[#f5f7fa] text-[11px] font-medium text-[#86909c]">
                            {(c.creator?.name || 'U').slice(0, 1)}
                          </span>
                          {c.creator?.name || '未分配'}
                        </span>
                      </StudioTableCell>
                      <StudioTableCell className="text-xs text-[#86909c]">
                        {new Date(c.updatedAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </StudioTableCell>
                      <StudioTableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-[#1664FF] border-[#1664FF]"
                            onClick={() => openAiGenerate(c.id)}
                          >
                            <WandSparkles className="size-3.5" />
                            AI 生成
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(c)}
                          >
                            <Edit className="size-3.5" />
                            编辑
                          </Button>
                        </div>
                      </StudioTableCell>
                    </StudioTableRow>
                  );
                })}
              </StudioTableBody>
            </StudioTable>
          )}

          <div className="flex items-center justify-between border-t border-[#f5f7fa] px-2 py-3 text-xs text-[#86909c]">
            <span>共 {total} 条记录</span>
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled>
              当前第 1 页
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1" disabled>
              10 条/页
            </Button>
          </div>
        </StudioCard>
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
    </StudioLayout>
  );
}
