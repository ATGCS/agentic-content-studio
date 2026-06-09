'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { AiProductionPanel } from '@/components/studio/ai-production-panel';
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

type ContentDetail = {
  id: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  status: string;
  topicId?: string | null;
  creator?: { name: string; email: string } | null;
  versions: Version[];
};

export default function ContentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [tab, setTab] = useState('draft');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [versionTitle, setVersionTitle] = useState('');
  const [versionBody, setVersionBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const cRes = await api<ContentDetail>(`/api/contents/${id}`);
    setContent(cRes.data);
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

          {/* ===== 中间：AI 生成 + 编辑区 ===== */}
          <div className="min-w-0 flex-1 space-y-4">
            <AiProductionPanel
              contentId={id}
              embedded
              defaultPlatforms={content.versions.map((v) => v.platform)}
              onGenerated={load}
            />

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
                    暂无版本，在上方 AI 生成面板选择平台后一键生成
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
          </div>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
