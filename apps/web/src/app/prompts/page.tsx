'use client';

import { useEffect, useState } from 'react';
import { Edit, Eye, Loader2, Plus, Power } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/studio/empty-state';
import { StudioCard } from '@/components/studio/studio-card';
import { Badge } from '@/components/ui/badge';
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

const defaultPreviewVariables = {
  topicTitle: '618 大促活动',
  topicDesc: '围绕活动玩法、用户利益点和平台风格生成内容',
  title: '618 大促活动玩法拆解',
  body: '这里是一段待改写的正文内容。',
  summary: '活动内容摘要',
  imaSummary: '知识库返回的活动节奏、卖点和竞品参考',
  accountStyle: '专业、清晰、偏运营实战',
  platform: 'XIAOHONGSHU',
  count: '5',
};

type Prompt = {
  id: string;
  name: string;
  agentType: string;
  version: string;
  template: string;
  variables?: string[];
  enabled: boolean;
};

type PromptPreview = {
  text: string;
  missingVariables: string[];
  declaredVariables: string[];
  extraVariables: string[];
};

type PromptForm = {
  name: string;
  agentType: string;
  version: string;
  template: string;
};

const emptyPromptForm: PromptForm = {
  name: '',
  agentType: 'TITLE',
  version: 'v1',
  template: '',
};

export default function PromptsPage() {
  const [items, setItems] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPrompt, setPreviewPrompt] = useState<Prompt | null>(null);
  const [preview, setPreview] = useState<PromptPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVariables, setPreviewVariables] = useState(
    JSON.stringify(defaultPreviewVariables, null, 2)
  );
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PromptForm>(emptyPromptForm);
  const [saving, setSaving] = useState(false);

  async function loadPrompts() {
    setLoading(true);
    try {
      const res = await api<Prompt[]>('/api/prompts');
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPrompts();
  }, []);

  async function togglePrompt(prompt: Prompt) {
    await api<Prompt>(`/api/prompts/${prompt.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !prompt.enabled }),
    });
    await loadPrompts();
  }

  function openCreateForm() {
    setEditingPrompt(null);
    setForm(emptyPromptForm);
    setFormOpen(true);
  }

  function openEditForm(prompt: Prompt) {
    setEditingPrompt(prompt);
    setForm({
      name: prompt.name,
      agentType: prompt.agentType,
      version: prompt.version,
      template: prompt.template,
    });
    setFormOpen(true);
  }

  async function savePrompt(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingPrompt) {
        await api<Prompt>(`/api/prompts/${editingPrompt.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await api<Prompt>('/api/prompts', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setFormOpen(false);
      await loadPrompts();
    } finally {
      setSaving(false);
    }
  }

  async function openPreview(prompt: Prompt) {
    setPreviewPrompt(prompt);
    setPreview(null);
    await runPreview(prompt.template);
  }

  async function runPreview(template = previewPrompt?.template) {
    if (!template) return;
    setPreviewLoading(true);
    try {
      const variables = JSON.parse(previewVariables) as Record<string, string>;
      const res = await api<PromptPreview>('/api/prompts/preview', {
        method: 'POST',
        body: JSON.stringify({ template, variables }),
      });
      setPreview(res.data);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <StudioLayout>
      <PageContainer>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1D2129]">
              Prompt 管理
            </h2>
            <p className="text-xs text-[#86909C] mt-1">管理 Agent 提示词模板</p>
          </div>
          <Button
            className="bg-[#1664FF] text-white hover:bg-[#0E52D9]"
            onClick={openCreateForm}
          >
            <Plus className="size-4" />
            新建 Prompt
          </Button>
        </div>
        <StudioCard contentClassName="overflow-hidden">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-[#1664FF]" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="暂无 Prompt"
              description="种子数据加载后将显示 Agent 提示词模板"
            />
          ) : (
            <StudioTable>
              <StudioTableHeader>
                <StudioTableRow>
                  <StudioTableHead>名称</StudioTableHead>
                  <StudioTableHead>类型</StudioTableHead>
                  <StudioTableHead>版本</StudioTableHead>
                  <StudioTableHead>变量</StudioTableHead>
                  <StudioTableHead>启用</StudioTableHead>
                  <StudioTableHead className="text-right">操作</StudioTableHead>
                </StudioTableRow>
              </StudioTableHeader>
              <StudioTableBody>
                {items.map((p) => (
                  <StudioTableRow key={p.id}>
                    <StudioTableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="mt-1 max-w-[420px] truncate text-xs text-[#86909C]">
                        {p.template}
                      </div>
                    </StudioTableCell>
                    <StudioTableCell>
                      <Badge className="border-0 bg-[#7C3AED]/10 text-[#7C3AED]">
                        {p.agentType}
                      </Badge>
                    </StudioTableCell>
                    <StudioTableCell>{p.version}</StudioTableCell>
                    <StudioTableCell className="text-xs text-[#86909C]">
                      {(p.variables ?? []).join(', ') || '—'}
                    </StudioTableCell>
                    <StudioTableCell>
                      <Badge
                        className={
                          p.enabled
                            ? 'border-0 bg-[#1664FF] text-white'
                            : 'border-0 bg-gray-100 text-gray-500'
                        }
                      >
                        {p.enabled ? '已启用' : '未启用'}
                      </Badge>
                    </StudioTableCell>
                    <StudioTableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPreview(p)}
                        >
                          <Eye className="size-3.5" />
                          预览
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditForm(p)}
                        >
                          <Edit className="size-3.5" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePrompt(p)}
                        >
                          <Power className="size-3.5" />
                          {p.enabled ? '停用' : '启用'}
                        </Button>
                      </div>
                    </StudioTableCell>
                  </StudioTableRow>
                ))}
              </StudioTableBody>
            </StudioTable>
          )}
        </StudioCard>
      </PageContainer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? '编辑 Prompt' : '新建 Prompt'}
            </DialogTitle>
            <DialogDescription>配置 Agent 使用的提示词模板</DialogDescription>
          </DialogHeader>
          <form onSubmit={savePrompt} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>名称</Label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>版本</Label>
                <Input
                  value={form.version}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      version: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Agent 类型</Label>
              <Input
                value={form.agentType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    agentType: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>模板</Label>
              <Textarea
                className="min-h-[260px] font-mono text-xs"
                value={form.template}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    template: event.target.value,
                  }))
                }
                required
              />
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

      <Dialog
        open={!!previewPrompt}
        onOpenChange={(open) => !open && setPreviewPrompt(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Prompt 预览</DialogTitle>
            <DialogDescription>{previewPrompt?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-[#1D2129]">
                预览变量 JSON
              </div>
              <Textarea
                className="min-h-[260px] font-mono text-xs"
                value={previewVariables}
                onChange={(event) => setPreviewVariables(event.target.value)}
              />
              <Button
                className="mt-3"
                size="sm"
                isLoading={previewLoading}
                onClick={() => runPreview()}
              >
                重新渲染
              </Button>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-[#1D2129]">
                渲染结果
              </div>
              <pre className="min-h-[260px] whitespace-pre-wrap rounded-lg border border-[#E5E8EF] bg-[#F7F8FA] p-3 text-xs text-[#4E5969]">
                {preview?.text ?? '暂无预览'}
              </pre>
              <div className="mt-3 grid gap-2 text-xs text-[#86909C]">
                <div>
                  模板变量：{preview?.declaredVariables.join(', ') || '—'}
                </div>
                <div>
                  缺失变量：{preview?.missingVariables.join(', ') || '—'}
                </div>
                <div>额外变量：{preview?.extraVariables.join(', ') || '—'}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </StudioLayout>
  );
}
