'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { GenerationResultPreview } from '@/components/studio/generation-result-preview';
import { AiImagePanel } from '@/components/studio/ai-image-panel';
import type { GenerationPreviewData } from '@/components/studio/generation-result-preview';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StudioNoticeType } from '@/components/studio/studio-notice';
import { api } from '@/lib/api';
import { getPlatformLabel } from '@/lib/tokens';
import { cn } from '@/lib/utils';

const PLATFORM_OPTIONS = [
  { value: 'WECHAT', label: '微信公众号' },
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'VIDEO_CHANNEL', label: '视频号' },
  { value: 'ZHIHU', label: '知乎' },
];

const PRODUCTION_STEPS = [
  { id: 'body', label: '写正文' },
  { id: 'rewrite', label: '分平台改写' },
  { id: 'bodyImages', label: '正文配图' },
  { id: 'cover', label: '生成封面' },
];

type ContentOption = GenerationPreviewData & {
  id: string;
  status?: string;
};

type AccountOption = {
  id: string;
  platform: string;
  accountName: string;
};

type AiProductionPanelProps = {
  /** 固定内容 ID（嵌入内容详情时使用） */
  contentId?: string;
  /** 默认选中的平台 */
  defaultPlatforms?: string[];
  /** 与父级平台 Tab 同步（嵌入内容详情时使用） */
  activePlatform?: string;
  /** 生成完成后回调（刷新父页面） */
  onGenerated?: () => void;
  /** 操作反馈（嵌入内容详情时使用） */
  onNotice?: (type: StudioNoticeType, message: string) => void;
  /** 嵌入模式：隐藏内容选择器 */
  embedded?: boolean;
};

export function AiProductionPanel({
  contentId: fixedContentId,
  defaultPlatforms = ['XIAOHONGSHU'],
  activePlatform,
  onGenerated,
  onNotice,
  embedded = false,
}: AiProductionPanelProps) {
  const [contents, setContents] = useState<ContentOption[]>([]);
  const [selectedContentId, setSelectedContentId] = useState(
    fixedContentId ?? ''
  );
  const [contentDetail, setContentDetail] = useState<ContentOption | null>(
    null
  );
  const [platforms, setPlatforms] = useState<string[]>(defaultPlatforms);
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [producing, setProducing] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refining, setRefining] = useState<string | null>(null);
  const [loadingContents, setLoadingContents] = useState(!embedded);
  const [previewPlatform, setPreviewPlatform] = useState<string>('draft');

  const effectiveContentId = fixedContentId ?? selectedContentId;
  const defaultPlatformsRef = useRef(defaultPlatforms);
  defaultPlatformsRef.current = defaultPlatforms;

  const loadContentDetail = useCallback(async (id: string) => {
    if (!id) {
      setContentDetail(null);
      return;
    }
    const res = await api<ContentOption>(`/api/contents/${id}`);
    setContentDetail(res.data);
    if (res.data.versions?.length) {
      const existing = res.data.versions.map((v) => v.platform);
      setPlatforms((prev) =>
        prev.length > 0
          ? prev
          : existing.length > 0
            ? existing
            : defaultPlatformsRef.current
      );
      setPreviewPlatform((prev) =>
        prev === 'draft' ? (existing[0] ?? prev) : prev
      );
    }
  }, []);

  const refreshContentDetail = useCallback(() => {
    if (!effectiveContentId) return Promise.resolve();
    return loadContentDetail(effectiveContentId);
  }, [effectiveContentId, loadContentDetail]);

  useEffect(() => {
    if (embedded) return;
    let cancelled = false;
    setLoadingContents(true);
    api<{ items: ContentOption[] }>('/api/contents?pageSize=100')
      .then((res) => {
        if (cancelled) return;
        setContents(res.data.items ?? []);
        if (fixedContentId) setSelectedContentId(fixedContentId);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoadingContents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [embedded, fixedContentId]);

  useEffect(() => {
    if (!effectiveContentId) {
      setContentDetail(null);
      return;
    }
    loadContentDetail(effectiveContentId).catch(console.error);
  }, [effectiveContentId, loadContentDetail]);

  useEffect(() => {
    const platform = platforms[0] ?? 'XIAOHONGSHU';
    api<AccountOption[]>(`/api/accounts?platform=${platform}&authStatus=active`)
      .then((res) => setAccounts(res.data ?? []))
      .catch(() => setAccounts([]));
  }, [platforms]);

  const hasDraft = Boolean(
    contentDetail?.body ||
    contentDetail?.summary ||
    contentDetail?.title?.length
  );
  const hasVersions = (contentDetail?.versions?.length ?? 0) > 0;

  const togglePlatform = (value: string) => {
    setPlatforms((prev) => {
      if (prev.includes(value)) {
        return prev.length > 1 ? prev.filter((p) => p !== value) : prev;
      }
      return [...prev, value];
    });
    setPreviewPlatform(value);
  };

  async function runProduction() {
    if (!effectiveContentId) {
      setError('请先选择内容');
      return;
    }
    setError(null);
    setProducing(true);
    setActiveStep(0);

    const stepTimer = window.setInterval(() => {
      setActiveStep((prev) =>
        prev < PRODUCTION_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 5000);

    try {
      await api(`/api/contents/${effectiveContentId}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          platforms,
          accountId: accountId || undefined,
        }),
      });
      setActiveStep(PRODUCTION_STEPS.length);
      await loadContentDetail(effectiveContentId);
      if (platforms[0]) setPreviewPlatform(platforms[0]);
      onGenerated?.();
      onNotice?.('success', '生成完成，请检查右侧预览，确认无误后提交审核。');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '一键生成失败，请稍后重试';
      setError(msg);
      onNotice?.('error', msg);
      setActiveStep(-1);
    } finally {
      window.clearInterval(stepTimer);
      setProducing(false);
    }
  }

  async function refineAgent(
    agentType: string,
    versionId?: string,
    platform?: string
  ) {
    if (!effectiveContentId) return;
    setRefining(agentType);
    setError(null);
    try {
      await api('/api/agents/run', {
        method: 'POST',
        body: JSON.stringify({
          agentType,
          contentId: effectiveContentId,
          versionId,
          accountId: accountId || undefined,
          overrides: {
            count: 3,
            platform: platform ?? platforms[0],
            imageRole: agentType === 'IMAGE' ? 'COVER' : undefined,
          },
        }),
      });
      await loadContentDetail(effectiveContentId);
      onGenerated?.();
      onNotice?.('success', '重做完成');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '优化失败';
      setError(msg);
      onNotice?.('error', msg);
    } finally {
      setRefining(null);
    }
  }

  useEffect(() => {
    if (activePlatform && activePlatform !== 'draft') {
      setPreviewPlatform(activePlatform);
    }
  }, [activePlatform]);

  const imageTargetPlatform =
    previewPlatform !== 'draft'
      ? previewPlatform
      : (platforms[0] ?? 'XIAOHONGSHU');

  const imageTargetVersionId = contentDetail?.versions?.find(
    (v) => v.platform === imageTargetPlatform
  )?.id;
  const previewVisible = contentDetail && (hasDraft || hasVersions);

  return (
    <StudioCard
      className={cn(embedded && '-mt-2')}
      contentClassName="p-0 overflow-hidden"
    >
      <div
        className={cn(
          'grid lg:items-stretch lg:divide-x lg:divide-[#E5E8EF]',
          embedded
            ? 'lg:grid-cols-[minmax(0,280px)_minmax(0,2.5fr)] lg:min-h-[70vh]'
            : 'lg:min-h-[75vh] lg:grid-cols-[minmax(0,320px)_minmax(0,2fr)]'
        )}
      >
        {/* 左侧：功能操作 */}
        <div className={cn('space-y-4', embedded ? 'px-2 pb-2 pt-0' : 'p-4')}>
          {!embedded && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs text-[#86909C]">
                  目标内容
                </label>
                <Select
                  value={selectedContentId || undefined}
                  onValueChange={setSelectedContentId}
                  disabled={loadingContents}
                >
                  <SelectTrigger className="h-9 w-full min-w-0 bg-white text-sm">
                    <SelectValue
                      placeholder={
                        loadingContents ? '加载中…' : '选择要生成的内容'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                    {contents.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.id}
                        title={item.title}
                        className="min-w-0"
                      >
                        <span className="block truncate">{item.title}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs text-[#86909C]">
                  发布账号（可选）
                </label>
                <Select
                  value={accountId || 'ANY'}
                  onValueChange={(v) => setAccountId(v === 'ANY' ? '' : v)}
                >
                  <SelectTrigger className="h-9 w-full min-w-0 bg-white text-sm">
                    <SelectValue placeholder="不指定账号" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="ANY">不指定</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem
                        key={a.id}
                        value={a.id}
                        title={a.accountName}
                        className="min-w-0"
                      >
                        <span className="block truncate">{a.accountName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs text-[#86909C]">平台</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs transition-all',
                    platforms.includes(p.value)
                      ? 'bg-[#7B61FF] text-white font-medium'
                      : 'bg-[#F2F3F5] text-[#4E5969] hover:bg-[#E5E8EF]'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-[#F53F3F]">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="h-9 gap-2 bg-[#7B61FF] px-5 hover:bg-[#6A50E6]"
              disabled={producing || !effectiveContentId}
              onClick={runProduction}
            >
              {producing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {producing ? '生成中…' : hasDraft ? '重新生成' : '一键生成'}
            </Button>
            {hasDraft && !producing && (
              <span className="text-xs text-[#86909C]">会覆盖已有内容</span>
            )}
          </div>

          {(producing || activeStep >= 0) && (
            <div className="flex flex-wrap gap-3">
              {PRODUCTION_STEPS.map((step, index) => {
                const done =
                  !producing && activeStep >= PRODUCTION_STEPS.length
                    ? true
                    : index < activeStep;
                const active = producing && index === activeStep;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-1.5 text-xs',
                      done && 'text-[#00B42A]',
                      active && 'font-medium text-[#7B61FF]',
                      !done && !active && 'text-[#C9CDD4]'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-full text-[10px]',
                        done && 'bg-[#00B42A] text-white',
                        active && 'bg-[#7B61FF] text-white',
                        !done && !active && 'bg-[#F2F3F5] text-[#C9CDD4]'
                      )}
                    >
                      {done ? (
                        <Check className="size-3" />
                      ) : active ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    {step.label}
                  </div>
                );
              })}
            </div>
          )}

          {effectiveContentId && contentDetail && !producing && (
            <AiImagePanel
              contentId={effectiveContentId}
              materials={contentDetail.materials}
              defaultPlatform={imageTargetPlatform}
              versionId={imageTargetVersionId}
              onUpdated={() => {
                refreshContentDetail().catch(console.error);
              }}
              compact
            />
          )}

          {!embedded && (
            <div className="pt-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left text-xs text-[#4E5969] hover:text-[#7B61FF]"
                onClick={() => setRefineOpen((v) => !v)}
              >
                <span className="font-medium">单独重做</span>
                {refineOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {refineOpen && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!!refining || !effectiveContentId}
                    onClick={() => refineAgent('TITLE')}
                  >
                    {refining === 'TITLE' ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : null}
                    重做标题
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!!refining || !effectiveContentId}
                    onClick={() => refineAgent('BODY')}
                  >
                    {refining === 'BODY' ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : null}
                    重做正文
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!!refining || !effectiveContentId}
                    onClick={() =>
                      refineAgent(
                        'IMAGE',
                        imageTargetVersionId,
                        imageTargetPlatform
                      )
                    }
                  >
                    {refining === 'IMAGE' ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : null}
                    重做封面
                  </Button>
                  {contentDetail?.versions?.map((v) => (
                    <Button
                      key={v.id}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!!refining || !effectiveContentId}
                      onClick={() => refineAgent('REWRITE', v.id, v.platform)}
                    >
                      {refining === 'REWRITE' ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : null}
                      重做 {getPlatformLabel(v.platform)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：发布预览 */}
        <div
          className={cn(
            'relative flex flex-col bg-[#F7F8FA]',
            embedded
              ? 'min-h-[520px] px-2 pb-2 pt-0 lg:min-h-0'
              : 'min-h-[560px] p-4 lg:p-5'
          )}
        >
          {producing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="size-6 animate-spin text-[#7B61FF]" />
                <p className="text-sm text-[#4E5969]">AI 生成中，请稍候…</p>
              </div>
            </div>
          )}

          {previewVisible && contentDetail ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <GenerationResultPreview
                data={contentDetail}
                activePlatform={previewPlatform}
                onPlatformChange={setPreviewPlatform}
                availablePlatforms={platforms}
                showHeader={false}
                fill
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-[#4E5969]">预览区</p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#86909C]">
                选好平台后点「一键生成」
              </p>
            </div>
          )}
        </div>
      </div>
    </StudioCard>
  );
}
