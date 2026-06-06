'use client';

import { useEffect, useState } from 'react';
import { Edit, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import {
  PageContainer,
  PageHeader,
} from '@/components/layout/page-container';
import { ActionBar } from '@/components/studio/action-bar';
import { EmptyState } from '@/components/studio/empty-state';
import { StatusBadge } from '@/components/studio/status-badge';
import { StudioCard } from '@/components/studio/studio-card';
import { MiniBar } from '@/components/charts';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
};

type TopicListResponse = {
  items: Topic[];
  total: number;
};

type TopicForm = {
  title: string;
  description: string;
  targetPlatforms: string;
};

const emptyForm: TopicForm = {
  title: '',
  description: '',
  targetPlatforms: '',
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
      setLoadError('选题列表加载失败，请稍后重试');
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
      targetPlatforms: topic.targetPlatforms?.join(', ') ?? '',
    });
    setFormOpen(true);
  }

  async function saveTopic(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const targetPlatforms = form.targetPlatforms
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const body = {
      title: form.title,
      description: form.description || undefined,
      targetPlatforms,
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
        <div className="flex items-start justify-between gap-4">
          <PageHeader title="选题管理" description="创建与管理内容选题" />
          <Button className="bg-[#1664FF] text-white hover:bg-[#0E52D9]" onClick={openCreateForm}>
            <Plus className="size-4" />
            新建选题
          </Button>
        </div>
        <ActionBar>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </ActionBar>

        {loadError && (
          <StudioCard contentClassName="p-4">
            <p className="text-sm text-[#F53F3F]">{loadError}</p>
          </StudioCard>
        )}

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#86909c]">总计</span>
              <span className="font-semibold text-[#1D2129]">{total}</span>
            </div>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2 text-sm">
                <StatusBadge status={status} />
                <span className="font-medium text-[#1D2129]">{count}</span>
              </div>
            ))}
          </div>
        )}

        {Object.keys(statusCounts).length > 1 && (
          <StudioCard contentClassName="p-4">
            <MiniBar
              data={Object.entries(statusCounts).map(([label, value]) => ({
                label,
                value,
              }))}
              height={56}
            />
          </StudioCard>
        )}

        <StudioCard contentClassName="overflow-hidden">
          {loading ? (
            <EmptyState
              title="选题加载中…"
              description="正在读取内容选题"
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="暂无选题"
              description="创建第一个选题，开始内容规划"
              actionLabel="新建选题"
              onAction={openCreateForm}
            />
          ) : (
            <Table className="studio-table">
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>目标平台</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="max-w-sm truncate text-sm text-[#86909C]">
                      {t.description || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-[#4E5969]">
                      {t.targetPlatforms?.join(', ') || '未指定'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(t.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditForm(t)}>
                          <Edit className="size-3.5" />
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" isLoading={deletingId === t.id} onClick={() => deleteTopic(t)}>
                          <Trash2 className="size-3.5" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </StudioCard>
      </PageContainer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTopic ? '编辑选题' : '新建选题'}</DialogTitle>
            <DialogDescription>配置选题标题、描述和目标平台</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveTopic} className="space-y-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                className="min-h-[120px]"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>目标平台</Label>
              <Input
                value={form.targetPlatforms}
                onChange={(event) => setForm((current) => ({ ...current, targetPlatforms: event.target.value }))}
                placeholder="例如：XIAOHONGSHU, DOUYIN"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-[#F2F3F5] pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                取消
              </Button>
              <Button type="submit" isLoading={saving} className="bg-[#1664FF] text-white hover:bg-[#0E52D9]">
                保存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </StudioLayout>
  );
}
