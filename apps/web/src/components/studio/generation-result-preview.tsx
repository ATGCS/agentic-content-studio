'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Share2, Star } from 'lucide-react';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { cn } from '@/lib/utils';
import { getPlatformLabel } from '@/lib/tokens';
import {
  resolveBodyImagePlaceholders,
  splitInlineFormatting,
  type PreviewMaterial,
} from '@/lib/preview-body';
import {
  getCompactCoverThumbWidth,
  getPlatformCoverInfo,
  pickCoverUrl,
} from '@/lib/platform-cover';

export type GenerationPreviewData = {
  title: string;
  summary?: string | null;
  body?: string | null;
  coverText?: string | null;
  topic?: { title: string } | null;
  materials?: PreviewMaterial[];
  versions?: Array<{
    id: string;
    platform: string;
    title?: string | null;
    body?: string | null;
    coverText?: string | null;
    tags?: unknown;
    status: string;
    formatConfig?: {
      renderedHtml?: string;
      imageSlots?: unknown;
    } | null;
    account?: { accountName: string } | null;
  }>;
  imaSearchLogs?: unknown[];
  agentRuns?: unknown[];
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

/** 公众号消息列表：封面 + 正文配图，最多 3 张（多图横排样式） */
function pickWechatFeedImages(
  materials: GenerationPreviewData['materials'],
  coverUrl: string | null,
  versionId?: string
): string[] {
  const urls: string[] = [];
  if (coverUrl) urls.push(coverUrl);

  for (const m of materials ?? []) {
    if (m.role !== 'BODY' || !m.url) continue;
    const meta = m.meta as { versionId?: string } | null;
    if (versionId && meta?.versionId && meta.versionId !== versionId) continue;
    if (!urls.includes(m.url)) urls.push(m.url);
    if (urls.length >= 3) break;
  }

  return urls.slice(0, 3);
}

function WechatFeedThumb({ url }: { url: string | null }) {
  if (url) {
    return <img src={url} alt="封面" className="size-full object-cover" />;
  }
  return (
    <div className="flex size-full items-center justify-center bg-[#F2F3F5] text-[10px] text-[#C9CDD4]">
      封面
    </div>
  );
}

/** 订阅号消息列表单条（左文右图 / 多图横排） */
function WechatFeedListCard({
  title,
  accountName,
  images,
}: {
  title: string;
  accountName?: string;
  images: string[];
}) {
  const multiImage = images.length >= 2;
  const account = accountName ?? '公众号名称';

  return (
    <div className="bg-white px-3 py-3">
      {multiImage ? (
        <>
          <p className="line-clamp-2 text-[15px] font-medium leading-[1.45] text-[#1D2129]">
            {title}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {images.slice(0, 3).map((url, i) => (
              <div
                key={i}
                className="aspect-[4/3] overflow-hidden bg-[#F2F3F5]"
              >
                <img
                  src={url}
                  alt={`配图 ${i + 1}`}
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-[#B2B2B2]">{account}</span>
            <span className="text-xs text-[#D9D9D9]">×</span>
          </div>
        </>
      ) : (
        <div className="flex gap-3">
          <div className="flex min-h-[72px] min-w-0 flex-1 flex-col justify-between py-0.5">
            <p className="line-clamp-3 text-[15px] font-medium leading-[1.45] text-[#1D2129]">
              {title}
            </p>
            <span className="mt-2 text-xs text-[#B2B2B2]">{account}</span>
          </div>
          <div className="h-[72px] w-[96px] shrink-0 overflow-hidden bg-[#F2F3F5]">
            <WechatFeedThumb url={images[0] ?? null} />
          </div>
        </div>
      )}
    </div>
  );
}

function renderInlineText(text: string) {
  return splitInlineFormatting(text).map((part, idx) => {
    if (part.bold) {
      return (
        <strong key={idx} className="font-semibold text-[#1D2129]">
          {part.text}
        </strong>
      );
    }
    if (part.italic) {
      return <em key={idx}>{part.text}</em>;
    }
    return <span key={idx}>{part.text}</span>;
  });
}

function renderBodyParagraphs(
  body: string,
  materials?: PreviewMaterial[],
  versionId?: string
) {
  const resolved = resolveBodyImagePlaceholders(body, materials, versionId);
  const lines = resolved.replace(/\r\n/g, '\n').split('\n');

  return lines.map((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return <div key={i} className="h-2" />;

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      return (
        <figure key={i} className="my-4 text-center">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || '配图'}
            className="mx-auto max-h-96 w-full rounded-lg object-contain"
          />
          {imgMatch[1] && (
            <figcaption className="mt-1 text-xs text-[#86909C]">
              {imgMatch[1]}
            </figcaption>
          )}
        </figure>
      );
    }

    const slotMatch = line.match(/^\[\[IMAGE:([^\]]+)\]\]$/);
    if (slotMatch) {
      return (
        <figure
          key={i}
          className="my-4 flex min-h-24 items-center justify-center rounded-lg border border-dashed border-[#E5E8EF] bg-[#F7F8FA] px-4 text-center"
        >
          <figcaption className="text-xs text-[#86909C]">
            配图位 {slotMatch[1]}（生成中或未配置图片服务）
          </figcaption>
        </figure>
      );
    }

    if (line.startsWith('> ')) {
      return (
        <blockquote
          key={i}
          className="my-3 border-l-4 border-[#1664FF] bg-[#F0F5FF] px-3 py-2 text-sm text-[#4E5969]"
        >
          {renderInlineText(line.slice(2))}
        </blockquote>
      );
    }

    const isHeading = /^#{1,3}\s/.test(line);
    const text = line.replace(/^#{1,3}\s*/, '');
    if (isHeading) {
      return (
        <h4
          key={i}
          className="mb-2 mt-4 text-base font-semibold text-[#1D2129] first:mt-0"
        >
          {renderInlineText(text)}
        </h4>
      );
    }

    if (/^[-*]\s+/.test(line)) {
      return (
        <p key={i} className="mb-2 pl-3 text-sm leading-relaxed text-[#4E5969]">
          <span className="mr-1.5 text-[#86909C]">•</span>
          {renderInlineText(line.replace(/^[-*]\s+/, ''))}
        </p>
      );
    }

    return (
      <p key={i} className="mb-3 text-sm leading-relaxed text-[#4E5969]">
        {renderInlineText(text)}
      </p>
    );
  });
}

function renderBodyContent(
  body: string,
  materials?: PreviewMaterial[],
  versionId?: string,
  fill?: boolean
) {
  if (!body.trim()) return null;
  return (
    <div
      className={cn(
        'overflow-y-auto',
        fill ? 'min-h-0 flex-1' : 'max-h-[min(75vh,900px)]'
      )}
    >
      {renderBodyParagraphs(body, materials, versionId)}
    </div>
  );
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
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10">
            <p className="text-base font-semibold leading-snug text-white drop-shadow">
              {coverText}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center rounded-lg bg-[#F2F3F5] p-6 text-center',
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

/** 手机 Feed 外壳：限制最大宽度 375px，居中显示，带圆角边框模拟手机屏幕 */
function PhoneFrame({
  children,
  fill,
  className,
}: {
  children: React.ReactNode;
  fill?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-center',
        fill ? 'min-h-0 flex-1 overflow-y-auto py-2' : 'py-2'
      )}
    >
      <div
        className={cn(
          'w-full max-w-[375px] overflow-hidden rounded-2xl border border-[#E5E8EF] bg-white shadow-sm',
          fill && 'flex min-h-0 flex-1 flex-col',
          className
        )}
      >
        {children}
      </div>
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
  materials,
  versionId,
  fill,
}: {
  title: string;
  body: string;
  tags: string[];
  coverUrl: string | null;
  coverText?: string | null;
  accountName?: string;
  materials?: PreviewMaterial[];
  versionId?: string;
  fill?: boolean;
}) {
  return (
    <PhoneFrame fill={fill}>
      <CoverArea
        coverUrl={coverUrl}
        coverText={coverText}
        aspect="aspect-[3/4]"
        overlay={Boolean(coverText?.trim())}
      />
      <div className={cn('p-4', fill && 'flex min-h-0 flex-1 flex-col')}>
        <p className="shrink-0 text-lg font-bold leading-snug text-[#1D2129]">
          {title}
        </p>
        {body && (
          <div className={cn('mt-3', fill && 'flex min-h-0 flex-1 flex-col')}>
            {renderBodyContent(body, materials, versionId, fill)}
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
        <div className="mt-4 flex items-center justify-between pt-3 text-[#86909C]">
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
    </PhoneFrame>
  );
}

function WechatPreview({
  title,
  body,
  summary,
  coverUrl,
  coverText,
  accountName,
  renderedHtml,
  materials,
  versionId,
  fill,
}: {
  title: string;
  body: string;
  summary?: string | null;
  coverUrl: string | null;
  coverText?: string | null;
  accountName?: string;
  renderedHtml?: string | null;
  materials?: PreviewMaterial[];
  versionId?: string;
  fill?: boolean;
}) {
  const feedImages = pickWechatFeedImages(materials, coverUrl, versionId);
  const hasArticleBody = Boolean(renderedHtml?.trim() || body.trim());

  return (
    <PhoneFrame fill={fill}>
      {/* 订阅号消息列表 */}
      <div className="shrink-0 bg-[#EDEDED] p-3">
        <p className="mb-2 text-[11px] text-[#888]">订阅号消息列表</p>
        <div className="overflow-hidden">
          <WechatFeedListCard
            title={title}
            accountName={accountName}
            images={feedImages}
          />
        </div>
        {(coverText || summary) && (
          <p className="mt-2 px-1 text-[11px] text-[#999]">
            封面文案 / 摘要：{coverText || summary}
          </p>
        )}
      </div>

      {/* 点开后正文排版 */}
      {hasArticleBody && (
        <div
          className={cn(
            'bg-white px-5 py-4',
            fill && 'flex min-h-0 flex-1 flex-col'
          )}
        >
          <p className="mb-3 shrink-0 text-xs text-[#86909C]">
            正文排版（点开后）
          </p>
          {renderedHtml ? (
            <div
              className={cn(
                'overflow-y-auto',
                fill ? 'min-h-0 flex-1' : 'max-h-[min(80vh,1000px)]'
              )}
            >
              <div
                className="acs-wechat-body"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          ) : (
            <div className={cn(fill && 'flex min-h-0 flex-1 flex-col')}>
              {renderBodyContent(body, materials, versionId, fill)}
            </div>
          )}
        </div>
      )}
    </PhoneFrame>
  );
}

function DouyinPreview({
  title,
  body,
  tags,
  coverUrl,
  coverText,
  accountName,
  fill,
}: {
  title: string;
  body: string;
  tags: string[];
  coverUrl: string | null;
  coverText?: string | null;
  accountName?: string;
  fill?: boolean;
}) {
  return (
    <PhoneFrame fill={fill} className="!max-w-[375px] !bg-black">
      <div className="relative aspect-[9/16] w-full">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt="封面"
            className="size-full object-cover opacity-90"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-6 text-center">
            <p className="text-xs text-white/50">视频封面 / 首帧</p>
            {coverText && (
              <p className="mt-3 text-lg font-bold leading-snug text-white">
                {coverText}
              </p>
            )}
          </div>
        )}
        {coverUrl && coverText && (
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-4 pb-16 pt-5">
            <p className="text-lg font-bold leading-snug text-white drop-shadow">
              {coverText}
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
    </PhoneFrame>
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
  materials,
  versionId,
  fill,
}: {
  title: string;
  body: string;
  summary?: string | null;
  coverUrl: string | null;
  coverText?: string | null;
  platform: string;
  accountName?: string;
  materials?: PreviewMaterial[];
  versionId?: string;
  fill?: boolean;
}) {
  return (
    <PhoneFrame fill={fill}>
      <div className="flex shrink-0 items-center gap-2 border-b border-[#F2F3F5] px-4 py-2.5">
        <PlatformBadge platform={platform} size="sm" />
        <span className="text-xs text-[#86909C]">
          {accountName ?? '平台账号'}
        </span>
      </div>
      <div className={cn('p-4', fill && 'flex min-h-0 flex-1 flex-col')}>
        <h2 className="shrink-0 text-lg font-bold text-[#1D2129]">{title}</h2>
        {(summary || coverText) && (
          <p className="mt-2 shrink-0 text-sm text-[#86909C]">
            {coverText || summary}
          </p>
        )}
        <div className="mt-4 shrink-0">
          <CoverArea
            coverUrl={coverUrl}
            coverText={coverText}
            aspect="aspect-video"
          />
        </div>
        {body ? (
          <div className={cn('mt-4', fill && 'flex min-h-0 flex-1 flex-col')}>
            {renderBodyContent(body, materials, versionId, fill)}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#C9CDD4]">（正文待生成）</p>
        )}
      </div>
    </PhoneFrame>
  );
}

function CoverAssetsPreview({
  platform,
  coverUrl,
  coverText,
  tags,
  compact,
}: {
  platform: string;
  coverUrl: string | null;
  coverText?: string | null;
  tags: string[];
  compact?: boolean;
}) {
  const info = getPlatformCoverInfo(platform);
  const text = coverText?.trim();

  return (
    <div className={cn('shrink-0', compact ? 'mb-3' : 'mb-4')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-[#1D2129]">
          封面预览 · {getPlatformLabel(platform)}
        </h4>
        <span className="text-xs text-[#86909C]">{info.aspectLabel}</span>
      </div>

      <div
        className={cn(
          'gap-3',
          compact
            ? 'flex flex-wrap items-start'
            : 'grid lg:grid-cols-[minmax(0,220px)_1fr]'
        )}
      >
        <div
          className={cn(
            'shrink-0',
            compact ? getCompactCoverThumbWidth(info.aspect) : 'w-full'
          )}
        >
          <p className="mb-1 text-xs text-[#86909C]">封面图</p>
          {coverUrl ? (
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-lg bg-[#F2F3F5]',
                info.aspect
              )}
            >
              <img
                src={coverUrl}
                alt="封面"
                className="size-full object-cover"
              />
              {info.coverTextOnImage && text && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                  <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">
                    {text}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              className={cn(
                'flex w-full flex-col items-center justify-center rounded-lg bg-[#F2F3F5] px-2 py-4 text-center',
                info.aspect
              )}
            >
              <p className="text-[10px] text-[#86909C]">未生成</p>
              {text && (
                <p className="mt-1 line-clamp-3 text-[10px] font-medium text-[#4E5969]">
                  {text}
                </p>
              )}
            </div>
          )}
        </div>

        <div className={cn('min-w-0 space-y-2', compact && 'flex-1')}>
          <div>
            <p className="mb-1 text-xs text-[#86909C]">封面文案</p>
            <p
              className={cn('text-[#1D2129]', compact ? 'text-xs' : 'text-sm')}
            >
              {text || '（分平台改写步骤产出，一键生成后显示）'}
            </p>
          </div>
          {tags.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-[#86909C]">话题标签</p>
              <p className="text-xs text-[#1677FF]">
                {tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}
              </p>
            </div>
          )}
        </div>
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
  renderedHtml,
  materials,
  versionId,
  fill,
}: {
  platform: string;
  title: string;
  body: string;
  summary?: string | null;
  tags: string[];
  coverUrl: string | null;
  coverText?: string | null;
  accountName?: string;
  renderedHtml?: string | null;
  materials?: PreviewMaterial[];
  versionId?: string;
  fill?: boolean;
}) {
  const props = {
    title,
    body,
    tags,
    coverUrl,
    coverText,
    accountName,
    summary,
    materials,
    versionId,
    fill,
  };

  switch (platform) {
    case 'XIAOHONGSHU':
      return <XiaohongshuPreview {...props} />;
    case 'WECHAT':
      return <WechatPreview {...props} renderedHtml={renderedHtml} />;
    case 'DOUYIN':
    case 'VIDEO_CHANNEL':
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
  showHeader = true,
  fill = false,
}: {
  data: GenerationPreviewData;
  /** 受控：当前预览的平台（draft = 总稿） */
  activePlatform?: string;
  onPlatformChange?: (platform: string) => void;
  /** 与生成面板「目标平台」同步，保证 Tab 与所选平台一致 */
  availablePlatforms?: string[];
  /** 嵌入双栏面板时可隐藏标题区 */
  showHeader?: boolean;
  /** 铺满父容器（双栏面板右侧） */
  fill?: boolean;
}) {
  const versions = data.versions ?? [];

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
  const previewRenderedHtml =
    activeVersion?.formatConfig?.renderedHtml?.trim() || null;
  const coverUrl = pickCoverUrl(data.materials, {
    platform: isDraft ? undefined : activeTab,
    versionId: activeVersion?.id,
  });

  return (
    <div className={cn(fill ? 'flex h-full min-h-0 flex-col' : 'space-y-4')}>
      {showHeader && (
        <div>
          <h3 className="text-sm font-semibold text-[#1D2129]">发布预览</h3>
          <p className="mt-0.5 text-xs text-[#86909C]">
            切换平台 Tab 查看封面图、封面文案与 Feed 效果
          </p>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap gap-1.5" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'draft'}
          onClick={() => setActiveTab('draft')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            activeTab === 'draft'
              ? 'bg-[#7B61FF] text-white'
              : 'bg-[#F2F3F5] text-[#4E5969] hover:bg-[#E5E8EF]'
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
              'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              activeTab === platform
                ? 'bg-[#7B61FF] text-white'
                : 'bg-[#F2F3F5] text-[#4E5969] hover:bg-[#E5E8EF]'
            )}
          >
            {getPlatformLabel(platform)}
          </button>
        ))}
      </div>

      <div
        key={activeTab}
        className={cn(
          'flex min-h-0 flex-col',
          fill && 'flex-1 overflow-hidden'
        )}
      >
        {!isDraft && !activeVersion && (
          <p className="mb-3 shrink-0 text-center text-xs text-[#86909C]">
            该平台版本尚未生成，请先一键生成或勾选该平台后重新生成
          </p>
        )}
        {isDraft && (
          <p className="mb-3 shrink-0 text-xs text-[#86909C]">
            「总稿」为 AI 原始正文。封面图与封面文案在各平台 Tab 独立预览。
          </p>
        )}
        {!isDraft && activeVersion && (
          <CoverAssetsPreview
            platform={activeTab}
            coverUrl={coverUrl}
            coverText={previewCoverText}
            tags={previewTags}
            compact={fill}
          />
        )}
        {!isDraft && activeVersion && (
          <p className="mb-2 shrink-0 text-xs text-[#86909C]">
            ↓ 平台 Feed 效果
          </p>
        )}
        {isDraft ? (
          <WechatPreview
            title={previewTitle}
            body={previewBody}
            summary={data.summary}
            coverUrl={coverUrl}
            coverText={previewCoverText}
            materials={data.materials}
            fill={fill}
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
            renderedHtml={previewRenderedHtml}
            materials={data.materials}
            versionId={activeVersion?.id}
            fill={fill}
          />
        )}
      </div>

      {!isDraft && !coverUrl && (
        <p className="shrink-0 text-xs text-[#86909C]">
          提示：当前平台封面未生成，也可在素材管理中手动上传
        </p>
      )}
    </div>
  );
}
