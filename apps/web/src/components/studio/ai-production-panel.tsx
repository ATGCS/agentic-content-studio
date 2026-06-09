'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
  WandSparkles,
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
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const PLATFORM_OPTIONS = [
  { value: 'WECHAT', label: '微信公众号' },
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'VIDEO_CHANNEL', label: '视频号' },
  { value: 'ZHIHU', label: '知乎' },
];

const PRODUCTION_STEPS = [
  { id: 'ima', label: '检索知识库' },
  { id: 'title', label: '生成标题' },
  { id: 'body', label: '撰写正文' },
  { id: 'rewrite', label: '分平台改写' },
  { id: 'cover', label: '生成封面图' },
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
  /** 生成完成后回调（刷新父页面） */
  onGenerated?: () => void;
  /** 嵌入模式：隐藏内容选择器 */
  embedded?: boolean;
};

export function AiProductionPanel({
  contentId: fixedContentId,
  defaultPlatforms = ['XIAOHONGSHU'],
  onGenerated,
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

  const loadContentDetail = useCallback(
    async (id: string) => {
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
              : defaultPlatforms
        );
      }
    },
    [defaultPlatforms]
  );

  useEffect(() => {
    if (embedded && fixedContentId) {
      loadContentDetail(fixedContentId).catch(console.error);
      return;
    }
    setLoadingContents(true);
    api<{ items: ContentOption[] }>('/api/contents?pageSize=100')
      .then((res) => {
        setContents(res.data.items ?? []);
        if (fixedContentId) {
          setSelectedContentId(fixedContentId);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingContents(false));
  }, [embedded, fixedContentId, loadContentDetail]);

  useEffect(() => {
    if (effectiveContentId) {
      loadContentDetail(effectiveContentId).catch(console.error);
    }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : '一键生成失败，请稍后重试');
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
    } catch (e) {
      setError(e instanceof Error ? e.message : '优化失败');
    } finally {
      setRefining(null);
    }
  }

  const previewVisible =
    contentDetail && (hasDraft || hasVersions) && !producing;

  return (
    <StudioCard contentClassName="p-0 overflow-hidden">
      <div className="border-b border-[#E5E8EF] bg-gradient-to-r from-[#F0F5FF] to-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#1664FF] text-white">
                <WandSparkles className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#1D2129]">
                  AI 生成面板
                </h2>
                <p className="text-xs text-[#86909C]">
                  一键完成知识库检索、标题、正文、分平台改写与封面图；不满意再单独优化
                </p>
              </div>
            </div>
          </div>
          {!embedded && effectiveContentId && (
            <Link
              href={`/contents/${effectiveContentId}`}
              className="text-xs text-[#1664FF] hover:underline"
            >
              打开内容详情编辑 →
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {!embedded && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-[#86909C]">
                目标内容
              </label>
              <Select
                value={selectedContentId || undefined}
                onValueChange={setSelectedContentId}
                disabled={loadingContents}
              >
                <SelectTrigger className="h-9 bg-white text-sm">
                  <SelectValue
                    placeholder={
                      loadingContents ? '加载中…' : '选择要生成的内容'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {contents.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#86909C]">
                发布账号（可选）
              </label>
              <Select
                value={accountId || 'ANY'}
                onValueChange={(v) => setAccountId(v === 'ANY' ? '' : v)}
              >
                <SelectTrigger className="h-9 bg-white text-sm">
                  <SelectValue placeholder="不指定账号" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">不指定</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs text-[#86909C]">目标平台</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs transition-all',
                  platforms.includes(p.value)
                    ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF] font-medium'
                    : 'border-[#E5E8EF] text-[#4E5969] hover:border-[#C9D8FF]',
                  previewPlatform === p.value &&
                    previewVisible &&
                    'ring-2 ring-[#1664FF]/30'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-[#FFCCC7] bg-[#FFF1F0] px-3 py-2 text-xs text-[#F53F3F]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="h-10 gap-2 bg-[#1664FF] px-6 hover:bg-[#0E52D9]"
            disabled={producing || !effectiveContentId}
            onClick={runProduction}
          >
            {producing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {producing ? '生成中…' : hasDraft ? '重新一键生成' : '一键生成'}
          </Button>
          {hasDraft && !producing && (
            <span className="text-xs text-[#86909C]">
              已有内容会被覆盖，可在下方编辑器手动微调
            </span>
          )}
        </div>

        {(producing || activeStep >= 0) && (
          <div className="flex flex-wrap gap-4 rounded-lg border border-[#E5E8EF] bg-[#FAFBFC] px-4 py-3">
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
                    'flex items-center gap-2 text-xs',
                    done && 'text-[#00B42A]',
                    active && 'font-medium text-[#1664FF]',
                    !done && !active && 'text-[#C9CDD4]'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border',
                      done && 'border-[#00B42A] bg-[#E8FFEA]',
                      active && 'border-[#1664FF] bg-[#E8F3FF]',
                      !done && !active && 'border-[#E5E8EF]'
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

        {previewVisible && contentDetail && (
          <div className="rounded-lg border border-[#E5E8EF] bg-white p-4">
            <GenerationResultPreview
              data={contentDetail}
              activePlatform={previewPlatform}
              onPlatformChange={setPreviewPlatform}
              availablePlatforms={platforms}
            />
          </div>
        )}

        {effectiveContentId && contentDetail && !producing && (
          <AiImagePanel
            contentId={effectiveContentId}
            materials={contentDetail.materials}
            defaultPlatform={platforms[0] ?? 'XIAOHONGSHU'}
            versionId={
              contentDetail.versions?.find(
                (v) => v.platform === previewPlatform
              )?.id ?? contentDetail.versions?.[0]?.id
            }
            onUpdated={() => loadContentDetail(effectiveContentId)}
            compact
          />
        )}

        <div className="border-t border-[#F2F3F5] pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-xs text-[#4E5969] hover:text-[#1664FF]"
            onClick={() => setRefineOpen((v) => !v)}
          >
            <span className="font-medium">
              精细优化（仅当某部分不满意时使用）
            </span>
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
                className="h-8 text-xs"
                disabled={!!refining || !effectiveContentId}
                onClick={() => refineAgent('TITLE')}
              >
                {refining === 'TITLE' ? (
                  <RefreshCw className="size-3 animate-spin" />
                ) : null}
                仅重做标题
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!!refining || !effectiveContentId}
                onClick={() => refineAgent('BODY')}
              >
                {refining === 'BODY' ? (
                  <RefreshCw className="size-3 animate-spin" />
                ) : null}
                仅重做正文
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!!refining || !effectiveContentId}
                onClick={() =>
                  refineAgent(
                    'IMAGE',
                    contentDetail?.versions?.find(
                      (v) => v.platform === previewPlatform
                    )?.id,
                    previewPlatform
                  )
                }
              >
                {refining === 'IMAGE' ? (
                  <RefreshCw className="size-3 animate-spin" />
                ) : null}
                仅重做封面图
              </Button>
              {contentDetail?.versions?.map((v) => (
                <Button
                  key={v.id}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!!refining || !effectiveContentId}
                  onClick={() => refineAgent('REWRITE', v.id, v.platform)}
                >
                  {refining === 'REWRITE' ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : null}
                  重做 {v.platform}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudioCard>
  );
}
