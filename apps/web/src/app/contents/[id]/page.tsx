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
import { getReviewUiState } from '@/lib/content-workflow';
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
  const { notice, notify, dismiss } = useStudioNotice();
  const generateSectionRef = useRef<HTMLDivElement>(null);
  const editSectionRef = useRef<HTMLDivElement>(null);
  const reviewSectionRef = useRef<HTMLDivElement>(null);

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

  const reviewVersion =
    tab && tab !== 'draft'
      ? content?.versions.find((v) => v.id === tab)
      : undefined;
  const reviewVersionId = reviewVersion?.id;

  const workflowInput = useMemo(
    () => ({
      contentStatus: content?.status ?? 'DRAFT',
      versions: content?.versions ?? [],
    }),
    [content?.status, content?.versions]
  );

  const reviewUiState = content
    ? getReviewUiState(workflowInput, reviewVersion?.status)
    : 'no_version';
  const canSubmitReview =
    reviewUiState === 'ready' || reviewUiState === 'rejected';

  async function submitReview() {
    if (!content || !reviewVersion || !canSubmitReview) return;
    setSubmitting(true);
    try {
      await api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          contentId: content.id,
          versionId: reviewVersionId,
        }),
      });
      await load();
      notify(
        'success',
        '已提交审核，审核员将在审核中心处理。你可前往审核中心查看进度。'
      );
    } catch (e) {
      if (e instanceof ApiError) {
        notify(
          'info',
          e.message === '该版本已在审核中'
            ? '该版本已在审核中，请前往审核中心查看。'
            : e.message
        );
      } else {
        notify('error', '提交审核失败，请稍后重试');
      }
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
    } else if (step === 'review') {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
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

            {/* 审核操作 */}
            <div ref={reviewSectionRef}>
              <h3 className="text-xs font-semibold text-[#86909C] uppercase tracking-wider mb-3">
                审核操作
              </h3>
              {reviewUiState === 'pending' && (
                <p className="text-xs leading-relaxed text-[#FF6A00] mb-3">
                  审核中，请等待审核员处理。{' '}
                  <Link
                    href="/reviews?status=pending"
                    className="text-[#1664FF] hover:underline"
                  >
                    查看审核中心
                  </Link>
                </p>
              )}
              {reviewUiState === 'approved' && (
                <p className="text-xs leading-relaxed text-[#00B42A] mb-3">
                  已通过审核。请到发布管理查看。{' '}
                  <Link
                    href="/publishing?packages=1"
                    className="text-[#1664FF] hover:underline"
                  >
                    前往发布包
                  </Link>
                </p>
              )}
              {reviewUiState === 'rejected' && (
                <p className="text-xs leading-relaxed text-[#F53F3F] mb-3">
                  审核已驳回，请修改后重新提交。
                </p>
              )}
              {(reviewUiState === 'ready' ||
                reviewUiState === 'no_version') && (
                <p className="text-xs leading-relaxed text-[#86909C] mb-3">
                  将当前平台版本提交至审核中心。
                </p>
              )}
              <div className="space-y-2">
                {reviewVersion ? (
                  <div className="rounded-lg bg-[#F7F8FA] px-3 py-2">
                    <p className="text-xs text-[#86909C]">将提交</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-[#1D2129]">
                      {getPlatformLabel(reviewVersion.platform)}
                      {reviewVersion.title ? ` · ${reviewVersion.title}` : ''}
                    </p>
                  </div>
                ) : tab === 'draft' && (content?.versions.length ?? 0) > 0 ? (
                  <p className="text-xs text-[#86909C]">
                    请切换到平台标签再提交审核。
                  </p>
                ) : (
                  <p className="text-xs text-[#86909C]">
                    请先生成平台版本，再提交审核。
                  </p>
                )}
                {reviewUiState === 'approved' ? (
                  <Button className="w-full" size="sm" asChild>
                    <Link href="/publishing">去发布管理</Link>
                  </Button>
                ) : reviewUiState === 'pending' ? (
                  <Button
                    className="w-full"
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <Link href="/reviews?status=pending">查看审核进度</Link>
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-[#7B61FF] hover:bg-[#6A50E6]"
                    size="sm"
                    disabled={submitting || !reviewVersion || !canSubmitReview}
                    onClick={submitReview}
                  >
                    <Send className="size-4 mr-1.5" />
                    {submitting
                      ? '提交中…'
                      : reviewUiState === 'rejected'
                        ? '重新提交审核'
                        : reviewVersion
                          ? `提交「${getPlatformLabel(reviewVersion.platform)}」审核`
                          : '提交审核'}
                  </Button>
                )}
              </div>
            </div>

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

          {/* ===== 右侧：AI 生成 + 编辑区 ===== */}
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
