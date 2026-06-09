'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Edit, FileText, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/platform-icon';

import { CreationWorkflowGuide } from '@/components/studio/creation-workflow-guide';
import { StatusBadge } from '@/components/studio/status-badge';
import { StudioCard } from '@/components/studio/studio-card';
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
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const res = await api<TopicListResponse>('/api/topics');
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? res.data.items?.length ?? 0);
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

  const statusCounts = items.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <StudioLayout>
      <PageContainer>
        <CreationWorkflowGuide currentStep="series" compact className="mb-4" />

        {loadError && (
          <StudioCard contentClassName="p-4">
            <p className="text-sm text-[#F53F3F]">{loadError}</p>
          </StudioCard>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {items.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-[#86909c]">总计</span>
                  <span className="font-semibold text-[#1D2129]">{total}</span>
                </div>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center gap-1.5 text-sm"
                  >
                    <StatusBadge status={status} />
                    <span className="font-medium text-[#1D2129]">{count}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1 text-xs"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw
                className={`size-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              刷新
            </Button>
            <Button
              className="h-9 bg-[#1664FF] px-4 text-xs text-white hover:bg-[#0E52D9]"
              onClick={openCreateForm}
            >
              <Plus className="size-4" />
              新建系列
            </Button>
          </div>
        </div>

        <StudioCard contentClassName="overflow-hidden p-0">
          <StudioTableFrame
            bare
            loading={loading}
            isEmpty={items.length === 0}
            empty={{
              title: '暂无系列',
              description: '创建第一个系列，开始内容规划',
              actionLabel: '新建系列',
              onAction: openCreateForm,
            }}
            toolbar={<span>共 {items.length} 个系列</span>}
          >
            <StudioTable>
              <StudioTableHeader>
                <StudioTableRow>
                  <StudioTableHead>系列标题</StudioTableHead>
                  <StudioTableHead>描述</StudioTableHead>
                  <StudioTableHead>文章数</StudioTableHead>
                  <StudioTableHead>目标平台</StudioTableHead>
                  <StudioTableHead>状态</StudioTableHead>
                  <StudioTableHead>创建时间</StudioTableHead>
                  <StudioTableHead align="right">操作</StudioTableHead>
                </StudioTableRow>
              </StudioTableHeader>
              <StudioTableBody>
                {items.map((t) => (
                  <StudioTableRow key={t.id} className="group cursor-pointer">
                    <StudioTableCell variant="primary">
                      <Link
                        href={`/topics/${t.id}`}
                        className="flex items-center gap-2 hover:text-[#1664FF]"
                      >
                        <FileText className="size-4 text-[#C9CDD4] group-hover:text-[#1664FF]" />
                        {t.title}
                      </Link>
                    </StudioTableCell>
                    <StudioTableCell
                      variant="muted"
                      className="max-w-sm truncate"
                    >
                      {t.description || '—'}
                    </StudioTableCell>
                    <StudioTableCell>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F5FF] px-2.5 py-1 text-xs font-medium text-[#1664FF]">
                        <FileText className="size-3" />
                        {t.contentCount ?? 0}
                      </span>
                    </StudioTableCell>
                    <StudioTableCell>
                      <div className="flex flex-wrap gap-1">
                        {t.targetPlatforms && t.targetPlatforms.length > 0 ? (
                          t.targetPlatforms.map((p) => (
                            <PlatformBadge key={p} platform={p} size="sm" />
                          ))
                        ) : (
                          <span className="text-xs text-[#C9CDD4]">未指定</span>
                        )}
                      </div>
                    </StudioTableCell>
                    <StudioTableCell>
                      <StatusBadge status={t.status} />
                    </StudioTableCell>
                    <StudioTableCell variant="muted">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </StudioTableCell>
                    <StudioTableCell variant="actions">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditForm(t)}
                        >
                          <Edit className="size-3.5" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={deletingId === t.id}
                          onClick={() => deleteTopic(t)}
                        >
                          <Trash2 className="size-3.5" />
                          删除
                        </Button>
                      </div>
                    </StudioTableCell>
                  </StudioTableRow>
                ))}
              </StudioTableBody>
            </StudioTable>
          </StudioTableFrame>
        </StudioCard>
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
