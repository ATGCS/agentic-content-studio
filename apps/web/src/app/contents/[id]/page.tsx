'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Save,
  Send,
  Trash2,
  ListOrdered,
  X,
} from 'lucide-react';
import { AiProductionPanel } from '@/components/studio/ai-production-panel';
import { ContentRevisionHistory } from '@/components/studio/content-revision-history';
import { ContentWorkflowStepper } from '@/components/studio/content-workflow-stepper';
import {
  StudioNotice,
  useStudioNotice,
} from '@/components/studio/studio-notice';
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
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StatusBadge } from '@/components/studio/status-badge';
import { StudioTabs } from '@/components/studio/studio-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';

import {
  getPlatformCoverInfo,
  pickCoverUrl,
  type CoverMaterial,
} from '@/lib/platform-cover';
import { getPlatformLabel } from '@/lib/tokens';
import { cn } from '@/lib/utils';
import {
  MaterialPickerDialog,
  type PickedMaterial,
} from '@/components/dialogs/material-picker-dialog';

type Version = {
  id: string;
  platform: string;
  title?: string | null;
  body?: string | null;
  coverText?: string | null;
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

type TopicOutlineArticle = {
  order: number;
  title: string;
  summary: string;
  keyPoints?: string[];
};

type TopicOutline = {
  summary: string;
  articles: TopicOutlineArticle[];
};

type TopicInfo = {
  id: string;
  title: string;
  outline?: TopicOutline | null;
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
  materials?: CoverMaterial[];
};

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [tab, setTab] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [versionTitle, setVersionTitle] = useState('');
  const [versionBody, setVersionBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [materialInsertTarget, setMaterialInsertTarget] = useState<
    'draft' | 'version'
  >('draft');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [topic, setTopic] = useState<TopicInfo | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const { notice, notify, dismiss } = useStudioNotice();
  const generateSectionRef = useRef<HTMLDivElement>(null);
  const editSectionRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const cRes = await api<ContentDetail>(`/api/contents/${id}`);
    setContent(cRes.data);
    setDraftTitle(cRes.data.title);
    setDraftSummary(cRes.data.summary ?? '');
    setDraftBody(cRes.data.body ?? '');
  }, [id]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  // 加载系列大纲
  useEffect(() => {
    if (!content?.topicId) {
      setTopic(null);
      return;
    }
    api<TopicInfo>(`/api/topics/${content.topicId}`)
      .then((r) => setTopic(r.data))
      .catch(() => setTopic(null));
  }, [content?.topicId]);

  useEffect(() => {
    if (!content) return;
    if (content.versions.length > 0) {
      setTab((prev) =>
        prev && content.versions.some((v) => v.id === prev)
          ? prev
          : content.versions[0].id
      );
    } else {
      setTab('');
    }
  }, [content]);

  useEffect(() => {
    if (!tab) return;
    const v = content?.versions.find((ver) => ver.id === tab);
    if (v) {
      setVersionTitle(v.title ?? '');
      setVersionBody(v.body ?? '');
    }
  }, [tab, content]);

  const workflowInput = useMemo(
    () => ({
      contentStatus: content?.status ?? 'DRAFT',
      versions: content?.versions ?? [],
    }),
    [content?.status, content?.versions]
  );

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
      notify('success', '总稿已保存');
    } catch {
      notify('error', '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  async function saveVersion() {
    if (tab === 'draft') return;
    setSaving(true);
    try {
      await api(`/api/contents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          versionId: tab,
          title: versionTitle,
          body: versionBody || undefined,
        }),
      });
      await load();
      notify('success', '平台版本已保存');
    } catch {
      notify('error', '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteDialogOpen(false);
    setDeleting(true);
    try {
      await api(`/api/contents/${id}`, { method: 'DELETE' });
      router.push('/contents');
    } catch {
      notify('error', '删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  }

  function handleMaterialPick(material: PickedMaterial) {
    const ref =
      material.type === 'IMAGE'
        ? `![${material.name}](${material.url})`
        : `[${material.name}](${material.url})`;

    if (materialInsertTarget === 'draft') {
      setDraftBody((prev) => (prev ? prev + '\n\n' + ref : ref));
    } else {
      setVersionBody((prev) => (prev ? prev + '\n\n' + ref : ref));
    }
  }

  function openMaterialPicker(target: 'draft' | 'version') {
    setMaterialInsertTarget(target);
    setMaterialPickerOpen(true);
  }

  function scrollToStep(step: string) {
    if (step === 'generate') {
      generateSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (step === 'edit') {
      editSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const defaultPlatforms = useMemo(
    () =>
      content?.versions.map((v) => v.platform).length
        ? content!.versions.map((v) => v.platform)
        : ['XIAOHONGSHU'],
    [content?.versions]
  );

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
      label: getPlatformLabel(v.platform),
    })),
  ];

  const currentVersion =
    tab === 'draft' ? null : content.versions.find((v) => v.id === tab);
  const currentVersionTags = normalizeTags(currentVersion?.tags);
  const currentCoverInfo = currentVersion
    ? getPlatformCoverInfo(currentVersion.platform)
    : null;
  const currentCoverUrl = currentVersion
    ? pickCoverUrl(content.materials, {
        versionId: currentVersion.id,
        platform: currentVersion.platform,
      })
    : null;
  const activeEditorPlatform =
    tab !== 'draft' ? currentVersion?.platform : undefined;

  return (
    <StudioLayout>
      <PageContainer className="p-4 md:p-6">
        <StudioNotice notice={notice} onDismiss={dismiss} className="mb-4" />
        <ContentWorkflowStepper
          input={workflowInput}
          onStepClick={scrollToStep}
          className="mb-6"
        />
        <div className="flex gap-6">
          {/* ===== 左侧：项目信息 ===== */}
          <aside className="w-56 shrink-0 space-y-6 hidden xl:block">
            {/* 项目信息 */}
            <div>
              <h3 className="text-xs font-semibold text-[#86909C] uppercase tracking-wider mb-3">
                项目信息
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-[#86909C]">标题</p>
                  <p className="font-medium text-[#1D2129] mt-0.5">
                    {content.title}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#86909C]">负责人</p>
                  <p className="text-[#4E5969] mt-0.5">
                    {content.creator?.name ?? content.creator?.email ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#86909C]">状态</p>
                  <div className="mt-1">
                    <StatusBadge status={content.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#86909C]">目标平台</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {content.versions.length > 0
                      ? content.versions.map((v) => (
                          <PlatformBadge key={v.id} platform={v.platform} />
                        ))
                      : '—'}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#86909C]">摘要</p>
                  <p className="text-xs leading-relaxed text-[#4E5969] mt-0.5">
                    {content.summary ?? '暂无摘要'}
                  </p>
                </div>
              </div>
            </div>

            {/* 发布操作 */}
            {(content.status === 'APPROVED' ||
              content.status === 'PENDING_PUBLISH') && (
              <div className="border-t border-[#E5E8EF] pt-4">
                <h3 className="text-xs font-semibold text-[#86909C] uppercase tracking-wider mb-3">
                  发布操作
                </h3>
                <p className="text-xs leading-relaxed text-[#00B42A] mb-3">
                  内容已确认，可以前往发布管理进行发布。
                </p>
                <Button className="w-full" size="sm" asChild>
                  <Link href="/publishing">去发布管理</Link>
                </Button>
              </div>
            )}

            {/* 删除 */}
            <div className="border-t border-[#E5E8EF] pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[#F53F3F] hover:text-[#F53F3F] hover:bg-red-50"
                disabled={deleting}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="size-4 mr-1.5" />
                {deleting ? '删除中…' : '删除内容'}
              </Button>
            </div>

            {/* 高级选项 */}
            <div className="border-t border-[#E5E8EF] pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-xs font-medium text-[#4E5969] hover:text-[#7B61FF]"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                <span>生成历史</span>
                {advancedOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {advancedOpen && (
                <div className="mt-3">
                  <ContentRevisionHistory contentId={id} onRestored={load} />
                </div>
              )}
            </div>
          </aside>

          {/* ===== 中间：AI 生成 + 编辑区 ===== */}
          <div className="min-w-0 flex-1">
            <div ref={generateSectionRef} className="mb-6">
              <AiProductionPanel
                contentId={id}
                embedded
                activePlatform={activeEditorPlatform}
                defaultPlatforms={defaultPlatforms}
                onGenerated={load}
                onNotice={notify}
              />
            </div>

            <div ref={editSectionRef}>
              <StudioTabs items={platformTabs} value={tab} onChange={setTab} />

              {tab === 'draft' ? (
                <div className="mt-4 space-y-4">
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
                      <Save className="size-3.5 mr-1.5" />
                      保存修改
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#86909C]">标题</Label>
                    <Input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="text-base font-semibold"
                      placeholder="内容标题"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#86909C]">摘要</Label>
                    <Textarea
                      value={draftSummary}
                      onChange={(e) => setDraftSummary(e.target.value)}
                      rows={3}
                      className="resize-none"
                      placeholder="内容摘要"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-[#86909C]">正文</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-[#1664FF]"
                        onClick={() => openMaterialPicker('draft')}
                      >
                        <ImagePlus className="size-3.5 mr-1" />
                        插入素材
                      </Button>
                    </div>
                    <Textarea
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      rows={12}
                      className="resize-none font-mono text-sm"
                      placeholder="正文内容…"
                    />
                  </div>
                </div>
              ) : currentVersion ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#1D2129]">
                      {getPlatformLabel(currentVersion.platform)} 版本
                    </h3>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={currentVersion.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={saveVersion}
                        isLoading={saving}
                      >
                        <Save className="size-3.5 mr-1.5" />
                        保存
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#86909C]">标题</Label>
                    <Input
                      value={versionTitle}
                      onChange={(e) => setVersionTitle(e.target.value)}
                      className="text-base font-semibold"
                    />
                  </div>
                  {currentCoverUrl && currentCoverInfo && (
                    <div className="space-y-2">
                      <Label className="text-xs text-[#86909C]">
                        封面
                        <span className="ml-1 font-normal">
                          ({currentCoverInfo.aspectLabel})
                        </span>
                      </Label>
                      <div
                        className={cn(
                          'mx-auto max-h-80 max-w-xs overflow-hidden rounded-lg bg-[#F7F8FA]',
                          currentCoverInfo.aspect
                        )}
                      >
                        <img
                          src={currentCoverUrl}
                          alt="封面"
                          className="size-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-[#86909C]">正文</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-[#1664FF]"
                        onClick={() => openMaterialPicker('version')}
                      >
                        <ImagePlus className="size-3.5 mr-1" />
                        插入素材
                      </Button>
                    </div>
                    <Textarea
                      value={versionBody}
                      onChange={(e) => setVersionBody(e.target.value)}
                      rows={10}
                      className="resize-none font-mono text-sm"
                    />
                  </div>
                  {currentVersionTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-[#86909C]">标签</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {currentVersionTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-[#F0F5FF] px-2 py-0.5 text-xs text-[#1664FF]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ===== 右侧：系列大纲侧边栏 ===== */}
        {topic?.outline && (
          <>
            {/* 浮动按钮 */}
            {!outlineOpen && (
              <button
                onClick={() => setOutlineOpen(true)}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 rounded-full bg-[#7B61FF] px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-[#6A50E6] transition-all"
                title="系列大纲"
              >
                <ListOrdered className="size-4" />
                <span>大纲</span>
              </button>
            )}

            {/* 侧边栏面板 */}
            {outlineOpen && (
              <div className="fixed right-0 top-0 bottom-0 z-50 flex">
                <div className="w-80 bg-white border-l border-[#E5E8EF] shadow-xl flex flex-col overflow-hidden">
                  {/* 头部 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E8EF]">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="size-4 text-[#7B61FF]" />
                      <h3 className="text-sm font-semibold text-[#1D2129]">
                        系列大纲
                      </h3>
                    </div>
                    <button
                      onClick={() => setOutlineOpen(false)}
                      className="p-1 rounded hover:bg-[#F2F3F5] text-[#86909C] hover:text-[#4E5969]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* 系列标题 */}
                  <div className="px-4 py-3 border-b border-[#F2F3F5]">
                    <Link
                      href={`/topics/${topic.id}`}
                      className="text-sm font-medium text-[#1664FF] hover:underline"
                    >
                      {topic.title}
                    </Link>
                    {topic.outline.summary && (
                      <p className="mt-1.5 text-xs leading-relaxed text-[#86909C]">
                        {topic.outline.summary}
                      </p>
                    )}
                  </div>

                  {/* 文章列表 */}
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <div className="space-y-3">
                      {topic.outline.articles.map((article) => (
                        <div
                          key={article.order}
                          className="group rounded-lg border border-[#E5E8EF] p-3 hover:border-[#7B61FF]/40 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-2">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#F0EDFF] text-[10px] font-bold text-[#7B61FF]">
                              {article.order}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold text-[#1D2129] leading-snug group-hover:text-[#7B61FF] transition-colors">
                                {article.title}
                              </h4>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#86909C] line-clamp-3">
                                {article.summary}
                              </p>
                              {article.keyPoints &&
                                article.keyPoints.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {article.keyPoints
                                      .slice(0, 3)
                                      .map((point, i) => (
                                        <span
                                          key={i}
                                          className="rounded bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] text-[#4E5969]"
                                        >
                                          {point}
                                        </span>
                                      ))}
                                    {article.keyPoints.length > 3 && (
                                      <span className="text-[10px] text-[#C9CDD4]">
                                        +{article.keyPoints.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 遮罩层 */}
                <div
                  className="flex-1 bg-black/20"
                  onClick={() => setOutlineOpen(false)}
                />
              </div>
            )}
          </>
        )}
      </PageContainer>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              onClick={handleDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MaterialPickerDialog
        open={materialPickerOpen}
        onOpenChange={setMaterialPickerOpen}
        contentId={id}
        onPick={handleMaterialPick}
      />
    </StudioLayout>
  );
}
