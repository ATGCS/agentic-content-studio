'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Edit,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/platform-icon';
import { EmptyState } from '@/components/studio/empty-state';
import { StatusBadge } from '@/components/studio/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

type Topic = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  source?: string | null;
  targetPlatforms?: string[];
  createdAt: string;
  contentCount?: number;
};

type TopicListResponse = {
  items: Topic[];
  total: number;
};

const platformOptions = [
  { value: 'WECHAT', label: '公众号' },
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'VIDEO_CHANNEL', label: '视频号' },
  { value: 'BILIBILI', label: 'B站' },
  { value: 'ZHIHU', label: '知乎' },
];

type TopicForm = {
  title: string;
  description: string;
  targetPlatforms: string[];
};

const emptyForm: TopicForm = {
  title: '',
  description: '',
  targetPlatforms: [],
};

export default function TopicsPage() {
  const [items, setItems] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [form, setForm] = useState<TopicForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api<TopicListResponse>('/api/topics');
      setItems(res.data.items ?? []);
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError('系列列表加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function openCreateForm() {
    setEditingTopic(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEditForm(topic: Topic) {
    setEditingTopic(topic);
    setForm({
      title: topic.title,
      description: topic.description ?? '',
      targetPlatforms: topic.targetPlatforms ?? [],
    });
    setFormOpen(true);
  }

  async function saveTopic(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const body = {
      title: form.title,
      description: form.description || undefined,
      targetPlatforms: form.targetPlatforms,
    };

    try {
      if (editingTopic) {
        await api(`/api/topics/${editingTopic.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await api('/api/topics', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTopic(topic: Topic) {
    if (deletingId) return;
    setDeletingId(topic.id);
    try {
      await api(`/api/topics/${topic.id}`, { method: 'DELETE' });
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <StudioLayout>
      <PageContainer className="gap-2 !p-2 md:!p-3">
        {/* 顶部栏 */}
        <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
              <Layers className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-gray-900">
                系列管理
              </h1>
              <p className="text-xs text-gray-400">{items.length} 个系列</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw
                className={`size-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button
              size="sm"
              className="h-8 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]"
              onClick={openCreateForm}
            >
              <Plus className="size-3.5" />
              新建系列
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-[#F53F3F]">{loadError}</p>
          </div>
        )}

        {/* 卡片列表 */}
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
            <p className="text-center text-sm text-gray-400">加载中…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
            <EmptyState
              title="暂无系列"
              description="创建第一个系列，开始内容规划"
              actionLabel="新建系列"
              onAction={openCreateForm}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((t) => (
              <Link
                key={t.id}
                href={`/topics/${t.id}`}
                className="group relative flex flex-col rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-md"
              >
                {/* 卡片头部 */}
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Layers className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-purple-600">
                      {t.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={t.status} />
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <FileText className="size-3" />
                        {t.contentCount ?? 0} 篇
                      </span>
                    </div>
                  </div>
                </div>

                {/* 描述 */}
                {t.description && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
                    {t.description}
                  </p>
                )}

                {/* 目标平台 */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.targetPlatforms && t.targetPlatforms.length > 0 ? (
                    t.targetPlatforms.map((p) => (
                      <PlatformBadge key={p} platform={p} size="sm" />
                    ))
                  ) : (
                    <span className="text-xs text-gray-300">未指定平台</span>
                  )}
                </div>

                {/* 底部：时间 + 操作 */}
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEditForm(t);
                      }}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600"
                    >
                      <Edit className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteTopic(t);
                      }}
                      disabled={deletingId === t.id}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTopic ? '编辑系列' : '新建系列'}</DialogTitle>
            <DialogDescription>配置系列标题、描述和目标平台</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveTopic} className="space-y-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                className="min-h-[120px]"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>目标平台</Label>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((p) => {
                  const selected = form.targetPlatforms.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() =>
                        setForm((curr) => ({
                          ...curr,
                          targetPlatforms: selected
                            ? curr.targetPlatforms.filter((x) => x !== p.value)
                            : [...curr.targetPlatforms, p.value],
                        }))
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                        selected
                          ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]'
                          : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:border-[#C9D8FF]'
                      }`}
                    >
                      {selected && <X className="size-3" />}
                      <PlatformBadge platform={p.value} size="sm" />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#F2F3F5] pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                isLoading={saving}
                className="bg-[#1664FF] text-white hover:bg-[#0E52D9]"
              >
                保存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </StudioLayout>
  );
}
