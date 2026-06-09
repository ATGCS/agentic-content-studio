'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StatusBadge } from '@/components/studio/status-badge';
import { StudioCard } from '@/components/studio/studio-card';
import { StudioTabs } from '@/components/studio/studio-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import {
  materialRoleLabels,
  materialRoles,
  materialTypeLabels,
  materialTypes,
} from '@/lib/material-labels';

type AgentRun = {
  id: string;
  agentType: string;
  status: string;
  createdAt: string;
};

type Version = {
  id: string;
  platform: string;
  title?: string | null;
  body?: string | null;
  coverUrl?: string | null;
  tags?: string[] | string | null;
  status: string;
  createdAt: string;
  account?: { accountName: string } | null;
};

function normalizeTags(tags: string[] | string | null | undefined) {
  return (Array.isArray(tags) ? tags : (tags?.split(',') ?? []))
    .map((tag) => tag.trim())
    .filter(Boolean);
}

type Material = {
  id: string;
  type: string;
  role: string;
  name?: string | null;
  url?: string | null;
  localPath?: string | null;
};

type ContentDetail = {
  id: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  status: string;
  topicId?: string | null;
  creator?: { name: string; email: string } | null;
  versions: Version[];
  materials?: Material[];
};

const agentActions = [
  { type: 'TITLE', label: '生成标题', icon: Sparkles },
  { type: 'BODY', label: '生成正文', icon: FileText },
  { type: 'TAG', label: '生成标签', icon: Tag },
  { type: 'REVIEW', label: '审核检查', icon: CheckCircle2 },
];

const agentTypeLabels: Record<string, string> = {
  TITLE: '标题 Agent',
  REWRITE: '改写 Agent',
  REVIEW: '审核 Agent',
  BODY: '正文 Agent',
  TAG: '标签 Agent',
};

export default function ContentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [tab, setTab] = useState('draft');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [matName, setMatName] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matType, setMatType] = useState<string>('IMAGE');
  const [matRole, setMatRole] = useState<string>('COVER');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [versionTitle, setVersionTitle] = useState('');
  const [versionBody, setVersionBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [cRes, rRes, mRes] = await Promise.all([
      api<ContentDetail>(`/api/contents/${id}`),
      api<AgentRun[]>(`/api/agent-runs?contentId=${id}`).catch(() => ({
        data: [],
      })),
      api<Material[]>(`/api/contents/${id}/materials`).catch(() => ({
        data: [],
      })),
    ]);
    setContent(cRes.data);
    setAgentRuns(rRes.data ?? []);
    setMaterials(mRes.data ?? []);
    setDraftTitle(cRes.data.title);
    setDraftSummary(cRes.data.summary ?? '');
    setDraftBody(cRes.data.body ?? '');
    if (cRes.data.versions[0]) {
      setSelectedVersion((prev) => prev || cRes.data.versions[0].id);
    }
  }, [id]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  useEffect(() => {
    if (tab === 'draft') return;
    const v = content?.versions.find((ver) => ver.id === tab);
    if (v) {
      setVersionTitle(v.title ?? '');
      setVersionBody(v.body ?? '');
      setSelectedVersion(v.id);
    }
  }, [tab, content]);

  async function runAgent(type: string) {
    setRunningAgent(type);
    try {
      await api('/api/agents/run', {
        method: 'POST',
        body: JSON.stringify({
          agentType: type,
          contentId: id,
          versionId: selectedVersion || undefined,
          overrides: { count: 3 },
        }),
      });
      const rRes = await api<AgentRun[]>(`/api/agent-runs?contentId=${id}`);
      setAgentRuns(rRes.data);
      await load();
    } finally {
      setRunningAgent(null);
    }
  }

  async function submitReview() {
    if (!content || !selectedVersion) return;
    setSubmitting(true);
    try {
      await api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          contentId: content.id,
          versionId: selectedVersion,
        }),
      });
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function addMaterial() {
    if (!matUrl.trim()) return;
    await api(`/api/contents/${id}/materials`, {
      method: 'POST',
      body: JSON.stringify({
        name: matName.trim() || undefined,
        url: matUrl.trim(),
        type: matType,
        role: matRole,
        source: 'manual',
      }),
    });
    setMatName('');
    setMatUrl('');
    await load();
  }

  async function removeMaterial(materialId: string) {
    await api(`/api/materials/${materialId}`, { method: 'DELETE' });
    await load();
  }

  async function saveContent() {
    setSaving(true);
    try {
      await api(`/api/contents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: draftTitle,
          summary: draftSummary || undefined,
          body: draftBody || undefined,
        }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveVersion() {
    if (!selectedVersion) return;
    setSaving(true);
    try {
      await api(`/api/contents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          versionId: selectedVersion,
          title: versionTitle,
          body: versionBody || undefined,
        }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!content) {
    return (
      <StudioLayout>
        <PageContainer>
          <p className="text-sm text-[#86909c]">加载中…</p>
        </PageContainer>
      </StudioLayout>
    );
  }

  const platformTabs = [
    { value: 'draft', label: '总稿' },
    ...content.versions.map((v) => ({
      value: v.id,
      label: v.platform,
    })),
  ];

  const currentVersion =
    tab === 'draft' ? null : content.versions.find((v) => v.id === tab);
  const currentVersionTags = normalizeTags(currentVersion?.tags);

  return (
    <StudioLayout>
      <PageContainer className="max-w-none">
        <div className="mb-2">
          <Link
            href="/contents"
            className="inline-flex items-center gap-1 text-sm text-[#86909c] hover:text-[#1664ff]"
          >
            <ArrowLeft className="size-4" />
            返回内容管理列表
          </Link>
        </div>

        <div className="flex flex-col gap-6 xl:flex-row">
          {/* ===== 左侧：项目信息 ===== */}
          <aside className="w-full shrink-0 xl:w-64">
            <StudioCard contentClassName="space-y-4 p-4">
              <h3 className="text-sm font-semibold text-[#1D2129]">项目信息</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-[#86909c]">系列标题</p>
                  <p className="font-medium text-[#1D2129]">{content.title}</p>
                </div>
                <div>
                  <p className="text-xs text-[#86909c]">负责人</p>
                  <p className="text-[#4e5969]">
                    {content.creator?.name ?? content.creator?.email ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#86909c]">当前状态</p>
                  <div className="mt-0.5">
                    <StatusBadge status={content.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#86909c]">目标平台</p>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {content.versions.length > 0
                      ? content.versions.map((v) => (
                          <PlatformBadge key={v.id} platform={v.platform} />
                        ))
                      : '—'}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#86909c]">摘要</p>
                  <p className="text-xs leading-relaxed text-[#4e5969]">
                    {content.summary ?? '暂无摘要'}
                  </p>
                </div>
              </div>
            </StudioCard>

            {/* 审核操作 */}
            <StudioCard contentClassName="space-y-3 p-4">
              <h3 className="text-sm font-semibold text-[#1D2129]">审核操作</h3>
              <div className="space-y-2">
                <Label className="text-xs text-[#86909c]">
                  选择版本提交审核
                </Label>
                <Select
                  value={selectedVersion}
                  onValueChange={setSelectedVersion}
                >
                  <SelectTrigger className="studio-input">
                    <SelectValue placeholder="选择版本" />
                  </SelectTrigger>
                  <SelectContent>
                    {content.versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={submitting || !selectedVersion}
                  onClick={submitReview}
                >
                  <Send className="size-4" />
                  {submitting ? '提交中…' : '提交审核'}
                </Button>
              </div>
            </StudioCard>
          </aside>

          {/* ===== 中间：主编辑区 ===== */}
          <div className="min-w-0 flex-1 space-y-4">
            <StudioTabs items={platformTabs} value={tab} onChange={setTab} />

            {tab === 'draft' ? (
              <StudioCard contentClassName="space-y-5 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1D2129]">
                    总稿编辑
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={saveContent}
                    isLoading={saving}
                  >
                    <Save className="size-3.5" />
                    保存修改
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#86909c]">标题</Label>
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="studio-input text-base font-semibold"
                    placeholder="内容标题"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#86909c]">摘要</Label>
                  <Textarea
                    value={draftSummary}
                    onChange={(e) => setDraftSummary(e.target.value)}
                    rows={3}
                    className="studio-input resize-none"
                    placeholder="内容摘要"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#86909c]">正文</Label>
                  <Textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={12}
                    className="studio-input resize-none font-mono text-sm"
                    placeholder="正文内容…"
                  />
                </div>
              </StudioCard>
            ) : currentVersion ? (
              <StudioCard contentClassName="space-y-5 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1D2129]">
                    {currentVersion.platform} 版本
                  </h3>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={currentVersion.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveVersion}
                      isLoading={saving}
                    >
                      <Save className="size-3.5" />
                      保存
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#86909c]">标题</Label>
                  <Input
                    value={versionTitle}
                    onChange={(e) => setVersionTitle(e.target.value)}
                    className="studio-input text-base font-semibold"
                  />
                </div>
                {currentVersion.coverUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs text-[#86909c]">封面</Label>
                    <div className="flex h-32 items-center justify-center rounded-lg bg-[#f5f7fa] text-xs text-[#86909c]">
                      <img
                        src={currentVersion.coverUrl}
                        alt="封面"
                        className="h-full rounded-lg object-cover"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-[#86909c]">正文</Label>
                  <Textarea
                    value={versionBody}
                    onChange={(e) => setVersionBody(e.target.value)}
                    rows={10}
                    className="studio-input resize-none font-mono text-sm"
                  />
                </div>
                {currentVersionTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-[#86909c]">标签</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {currentVersionTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#f0f5ff] px-2 py-0.5 text-xs text-[#1664ff]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </StudioCard>
            ) : null}

            {/* 平台版本表格 */}
            <StudioCard contentClassName="overflow-hidden">
              <h3 className="border-b border-[#e5e8ef] px-5 py-3 text-sm font-semibold text-[#1D2129]">
                平台版本
              </h3>
              {content.versions.length === 0 ? (
                <div className="flex h-24 items-center justify-center">
                  <p className="text-xs text-[#a9aeb8]">
                    暂无版本，使用右侧 Agent 生成
                  </p>
                </div>
              ) : (
                <Table className="studio-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12" />
                      <TableHead>平台</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {content.versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <input
                            type="radio"
                            className="accent-[#1664ff]"
                            checked={selectedVersion === v.id}
                            onChange={() => setSelectedVersion(v.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <PlatformBadge platform={v.platform} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {v.title ?? '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={v.status} />
                        </TableCell>
                        <TableCell className="text-sm text-[#86909c]">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </StudioCard>

            {/* Agent 运行记录 */}
            <StudioCard contentClassName="overflow-hidden">
              <h3 className="border-b border-[#e5e8ef] px-5 py-3 text-sm font-semibold text-[#1D2129]">
                Agent 运行记录
              </h3>
              {agentRuns.length === 0 ? (
                <div className="flex h-24 items-center justify-center">
                  <p className="text-xs text-[#a9aeb8]">暂无运行记录</p>
                </div>
              ) : (
                <div className="divide-y divide-[#e5e8ef]">
                  {agentRuns.slice(0, 10).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center gap-3 px-5 py-2.5 text-sm"
                    >
                      <span className="text-xs font-medium text-[#4e5969]">
                        {agentTypeLabels[run.agentType] ?? run.agentType}
                      </span>
                      <StatusBadge status={run.status} />
                      <span className="ml-auto text-xs text-[#86909c]">
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </StudioCard>
          </div>

          {/* ===== 右侧：Agent 面板 + 素材 ===== */}
          <aside className="w-full shrink-0 xl:w-64">
            <StudioCard contentClassName="space-y-3 p-4">
              <h3 className="text-sm font-semibold text-[#1D2129]">
                Agent 操作
              </h3>
              <p className="text-xs text-[#86909c]">
                使用 AI Agent 自动生成或检查内容
              </p>
              <div className="space-y-2">
                {agentActions.map((action) => (
                  <Button
                    key={action.type}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={runningAgent === action.type}
                    onClick={() => runAgent(action.type)}
                  >
                    {runningAgent === action.type ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <action.icon className="size-3.5" />
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
            </StudioCard>

            {/* 运行状态 */}
            <StudioCard contentClassName="p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#1D2129]">
                运行状态
              </h3>
              <div className="space-y-2">
                {agentRuns.slice(0, 5).map((run) => (
                  <div key={run.id} className="flex items-center gap-2 text-xs">
                    {run.status === 'COMPLETED' ? (
                      <CheckCircle2 className="size-3 text-[#00b42a]" />
                    ) : run.status === 'FAILED' ? (
                      <XCircle className="size-3 text-[#f53f3f]" />
                    ) : (
                      <RefreshCw className="size-3 animate-spin text-[#1664ff]" />
                    )}
                    <span className="text-[#4e5969]">
                      {agentTypeLabels[run.agentType] ?? run.agentType}
                    </span>
                  </div>
                ))}
                {agentRuns.length === 0 && (
                  <p className="text-xs text-[#a9aeb8]">尚无运行记录</p>
                )}
              </div>
            </StudioCard>

            {/* 素材管理 */}
            <StudioCard contentClassName="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1D2129]">
                  素材管理
                </h3>
                <Link
                  href="/materials"
                  className="text-xs text-[#1664ff] hover:underline"
                >
                  素材中心
                </Link>
              </div>
              {materials.length > 0 && (
                <ul className="mb-4 space-y-2">
                  {materials.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-[#e5e8ef] p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {m.name ?? materialTypeLabels[m.type]}
                        </p>
                        <p className="text-xs text-[#86909c]">
                          {materialTypeLabels[m.type]} ·{' '}
                          {materialRoleLabels[m.role]}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-[#f53f3f] hover:text-red-600"
                        onClick={() => removeMaterial(m.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-3 border-t border-[#e5e8ef] pt-4">
                <p className="text-xs font-medium text-[#86909c]">
                  添加素材（URL）
                </p>
                <Input
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="素材名称"
                  className="studio-input h-8 text-sm"
                />
                <Input
                  value={matUrl}
                  onChange={(e) => setMatUrl(e.target.value)}
                  placeholder="https://..."
                  className="studio-input h-8 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={matType} onValueChange={setMatType}>
                    <SelectTrigger className="studio-input h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {materialTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {materialTypeLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={matRole} onValueChange={setMatRole}>
                    <SelectTrigger className="studio-input h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {materialRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {materialRoleLabels[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  variant="outline"
                  onClick={addMaterial}
                >
                  <Plus className="size-4" />
                  添加素材
                </Button>
              </div>
            </StudioCard>
          </aside>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
