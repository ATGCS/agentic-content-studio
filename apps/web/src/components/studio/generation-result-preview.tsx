'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Share2, Star } from 'lucide-react';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { cn } from '@/lib/utils';

export type GenerationPreviewData = {
  title: string;
  summary?: string | null;
  body?: string | null;
  coverText?: string | null;
  topic?: { title: string } | null;
  materials?: Array<{
    role: string;
    url?: string | null;
    type?: string;
    name?: string | null;
  }>;
  versions?: Array<{
    id: string;
    platform: string;
    title?: string | null;
    body?: string | null;
    coverText?: string | null;
    tags?: unknown;
    status: string;
    account?: { accountName: string } | null;
  }>;
  imaSearchLogs?: unknown[];
  agentRuns?: unknown[];
};

const PLATFORM_LABELS: Record<string, string> = {
  WECHAT: '微信公众号',
  XIAOHONGSHU: '小红书',
  DOUYIN: '抖音',
  VIDEO_CHANNEL: '视频号',
  BILIBILI: 'B站',
  ZHIHU: '知乎',
};

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((t): t is string => typeof t === 'string');
  }
  if (typeof tags === 'string') {
    return tags
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function pickCoverUrl(
  materials: GenerationPreviewData['materials']
): string | null {
  const cover = materials?.find(
    (m) => m.role === 'COVER' && m.url && m.type !== 'VIDEO'
  );
  return cover?.url ?? materials?.find((m) => m.url)?.url ?? null;
}

function renderBodyParagraphs(body: string) {
  const lines = body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, i) => {
    const isHeading = /^#{1,3}\s/.test(line);
    const text = line.replace(/^#{1,3}\s*/, '');
    if (isHeading) {
      return (
        <h4
          key={i}
          className="mb-2 mt-4 text-base font-semibold text-[#1D2129] first:mt-0"
        >
          {text}
        </h4>
      );
    }
    return (
      <p key={i} className="mb-3 text-sm leading-relaxed text-[#4E5969]">
        {text}
      </p>
    );
  });
}

function CoverArea({
  coverUrl,
  coverText,
  aspect = 'aspect-[3/4]',
  overlay = false,
}: {
  coverUrl: string | null;
  coverText?: string | null;
  aspect?: string;
  overlay?: boolean;
}) {
  if (coverUrl) {
    return (
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg bg-[#F2F3F5]',
          aspect
        )}
      >
        <img src={coverUrl} alt="封面" className="size-full object-cover" />
        {overlay && coverText && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-sm font-medium text-white">{coverText}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-[#E8F3FF] to-[#F0F5FF] p-6 text-center',
        aspect
      )}
    >
      <p className="text-xs text-[#86909C]">封面图</p>
      <p className="mt-2 text-sm font-medium text-[#4E5969]">
        {coverText?.trim() || '（待上传封面，可先填封面文案）'}
      </p>
    </div>
  );
}

function XiaohongshuPreview({
  title,
  body,
  tags,
  coverUrl,
  coverText,
  accountName,
}: {
  title: string;
  body: string;
  tags: string[];
  coverUrl: string | null;
  coverText?: string | null;
  accountName?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-[#E5E8EF] bg-white shadow-sm">
      <CoverArea
        coverUrl={coverUrl}
        coverText={coverText}
        aspect="aspect-[3/4]"
      />
      <div className="p-4">
        <p className="text-base font-bold leading-snug text-[#1D2129]">
          {title}
        </p>
        {body && (
          <div className="mt-3 max-h-48 overflow-y-auto">
            {renderBodyParagraphs(body)}
          </div>
        )}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="text-xs text-[#1677FF]">
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-[#F2F3F5] pt-3 text-[#86909C]">
          <div className="flex items-center gap-0.5">
            <div className="size-6 rounded-full bg-[#FFE4E8]" />
            <span className="ml-1.5 text-xs">{accountName ?? '你的账号'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Heart className="size-4" />
            <Star className="size-4" />
            <MessageCircle className="size-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function WechatPreview({
  title,
  body,
  summary,
  coverUrl,
  coverText,
  accountName,
}: {
  title: string;
  body: string;
  summary?: string | null;
  coverUrl: string | null;
  coverText?: string | null;
  accountName?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-lg border border-[#E5E8EF] bg-white shadow-sm">
      <div className="border-b border-[#F2F3F5] px-5 py-4">
        <p className="text-xl font-bold leading-snug text-[#1D2129]">{title}</p>
        <p className="mt-2 text-xs text-[#86909C]">
          {accountName ?? '公众号名称'} · 刚刚
        </p>
        {(summary || coverText) && (
          <p className="mt-2 text-sm text-[#86909C]">{coverText || summary}</p>
        )}
      </div>
      <div className="px-5 py-4">
        <CoverArea
          coverUrl={coverUrl}
          coverText={coverText}
          aspect="aspect-video"
        />
        {body ? (
          <div className="mt-4 max-h-80 overflow-y-auto">
            {renderBodyParagraphs(body)}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#C9CDD4]">（正文待生成）</p>
        )}
      </div>
    </div>
  );
}

function DouyinPreview({
  title,
  body,
  tags,
  coverUrl,
  coverText,
  accountName,
}: {
  title: string;
  body: string;
  tags: string[];
  coverUrl: string | null;
  coverText?: string | null;
  accountName?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-[#1D2129] bg-black shadow-lg">
      <div className="relative aspect-[9/16] w-full">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt="封面"
            className="size-full object-cover opacity-90"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-6 text-center">
            <p className="text-sm text-white/80">
              {coverText || '视频封面 / 首帧'}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16">
          <p className="text-sm font-semibold text-white">
            {accountName ?? '@你的账号'}
          </p>
          <p className="mt-1 text-sm leading-snug text-white/95">{title}</p>
          {body && (
            <p className="mt-2 line-clamp-3 text-xs text-white/80">{body}</p>
          )}
          {tags.length > 0 && (
            <p className="mt-2 text-xs text-white/70">
              {tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}
            </p>
          )}
        </div>
        <div className="absolute bottom-20 right-3 flex flex-col items-center gap-4 text-white">
          <Heart className="size-6" />
          <MessageCircle className="size-6" />
          <Share2 className="size-6" />
        </div>
      </div>
    </div>
  );
}

function GenericArticlePreview({
  title,
  body,
  summary,
  coverUrl,
  coverText,
  platform,
  accountName,
}: {
  title: string;
  body: string;
  summary?: string | null;
  coverUrl: string | null;
  coverText?: string | null;
  platform: string;
  accountName?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-lg border border-[#E5E8EF] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#F2F3F5] px-4 py-2">
        <PlatformBadge platform={platform} size="sm" />
        <span className="text-xs text-[#86909C]">
          {accountName ?? '平台账号'}
        </span>
      </div>
      <div className="p-5">
        <h2 className="text-lg font-bold text-[#1D2129]">{title}</h2>
        {(summary || coverText) && (
          <p className="mt-2 text-sm text-[#86909C]">{coverText || summary}</p>
        )}
        <div className="mt-4">
          <CoverArea
            coverUrl={coverUrl}
            coverText={coverText}
            aspect="aspect-video"
          />
        </div>
        {body ? (
          <div className="mt-4 max-h-80 overflow-y-auto">
            {renderBodyParagraphs(body)}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#C9CDD4]">（正文待生成）</p>
        )}
      </div>
    </div>
  );
}

function PlatformPublishPreview({
  platform,
  title,
  body,
  summary,
  tags,
  coverUrl,
  coverText,
  accountName,
}: {
  platform: string;
  title: string;
  body: string;
  summary?: string | null;
  tags: string[];
  coverUrl: string | null;
  coverText?: string | null;
  accountName?: string;
}) {
  const props = {
    title,
    body,
    tags,
    coverUrl,
    coverText,
    accountName,
    summary,
  };

  switch (platform) {
    case 'XIAOHONGSHU':
      return <XiaohongshuPreview {...props} />;
    case 'WECHAT':
      return <WechatPreview {...props} />;
    case 'DOUYIN':
      return <DouyinPreview {...props} />;
    default:
      return <GenericArticlePreview {...props} platform={platform} />;
  }
}

export function GenerationResultPreview({
  data,
  activePlatform,
  onPlatformChange,
  availablePlatforms,
}: {
  data: GenerationPreviewData;
  /** 受控：当前预览的平台（draft = 总稿） */
  activePlatform?: string;
  onPlatformChange?: (platform: string) => void;
  /** 与生成面板「目标平台」同步，保证 Tab 与所选平台一致 */
  availablePlatforms?: string[];
}) {
  const versions = data.versions ?? [];
  const coverUrl = pickCoverUrl(data.materials);

  const platformTabs = useMemo(() => {
    const fromVersions = [...new Set(versions.map((v) => v.platform))];
    const platforms =
      availablePlatforms && availablePlatforms.length > 0
        ? availablePlatforms
        : fromVersions;
    return platforms;
  }, [versions, availablePlatforms]);

  const [internalTab, setInternalTab] = useState(platformTabs[0] ?? 'draft');

  const activeTab = activePlatform ?? internalTab;

  const setActiveTab = (tab: string) => {
    onPlatformChange?.(tab);
    if (activePlatform === undefined) {
      setInternalTab(tab);
    }
  };

  useEffect(() => {
    const valid = activeTab === 'draft' || platformTabs.includes(activeTab);
    if (!valid && platformTabs.length > 0) {
      setActiveTab(platformTabs[0]);
    }
  }, [platformTabs, activeTab]);

  const versionByPlatform = useMemo(() => {
    const map = new Map<string, (typeof versions)[number]>();
    for (const v of versions) {
      if (!map.has(v.platform)) map.set(v.platform, v);
    }
    return map;
  }, [versions]);

  const isDraft = activeTab === 'draft';
  const activeVersion = isDraft ? null : versionByPlatform.get(activeTab);

  const previewTitle = isDraft
    ? data.title || '（无标题）'
    : activeVersion?.title?.trim() || '（该平台标题待生成）';
  const previewBody = isDraft
    ? data.body || ''
    : activeVersion?.body?.trim() || '';
  const previewCoverText = isDraft
    ? data.coverText || null
    : activeVersion?.coverText?.trim() || null;
  const previewTags = activeVersion ? normalizeTags(activeVersion.tags) : [];
  const accountName = activeVersion?.account?.accountName;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[#1D2129]">发布预览</h3>
        <p className="mt-0.5 text-xs text-[#86909C]">
          切换平台查看发布效果；各平台展示独立标题与正文
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'draft'}
          onClick={() => setActiveTab('draft')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
            activeTab === 'draft'
              ? 'border-[#1664FF] bg-[#1664FF] text-white shadow-sm'
              : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:border-[#1664FF]/40'
          )}
        >
          总稿
        </button>
        {platformTabs.map((platform) => (
          <button
            key={platform}
            type="button"
            role="tab"
            aria-selected={activeTab === platform}
            onClick={() => setActiveTab(platform)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
              activeTab === platform
                ? 'border-[#1664FF] bg-[#1664FF] text-white shadow-sm'
                : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:border-[#1664FF]/40'
            )}
          >
            {PLATFORM_LABELS[platform] ?? platform}
          </button>
        ))}
      </div>

      <div key={activeTab} className="rounded-xl bg-[#F7F8FA] p-4 sm:p-6">
        {!isDraft && !activeVersion && (
          <p className="mb-4 rounded-lg border border-dashed border-[#E5E8EF] bg-white px-3 py-2 text-center text-xs text-[#86909C]">
            该平台版本尚未生成，请先一键生成或勾选该平台后重新生成
          </p>
        )}
        {isDraft ? (
          <WechatPreview
            title={previewTitle}
            body={previewBody}
            summary={data.summary}
            coverUrl={coverUrl}
            coverText={previewCoverText}
          />
        ) : (
          <PlatformPublishPreview
            platform={activeTab}
            title={previewTitle}
            body={
              previewBody ||
              '（该平台正文待生成，可一键生成或在下方编辑器填写）'
            }
            summary={data.summary}
            tags={previewTags}
            coverUrl={coverUrl}
            coverText={previewCoverText}
            accountName={accountName}
          />
        )}
      </div>

      {!coverUrl && (
        <p className="text-xs text-[#86909C]">
          提示：在素材管理中上传封面图后，预览将显示真实封面效果
        </p>
      )}
    </div>
  );
}
