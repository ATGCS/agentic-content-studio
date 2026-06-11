/** 各平台封面比例与展示说明（与 image-generation / platform-cover-guides 对齐） */
export type PlatformCoverInfo = {
  aspect: string;
  aspectLabel: string;
  coverTextOnImage: boolean;
  description: string;
};

export const PLATFORM_COVER_INFO: Record<string, PlatformCoverInfo> = {
  XIAOHONGSHU: {
    aspect: 'aspect-[3/4]',
    aspectLabel: '3:4 竖版',
    coverTextOnImage: true,
    description: '笔记首图，封面文案叠在图上',
  },
  WECHAT: {
    aspect: 'aspect-[4/3]',
    aspectLabel: '4:3 横版小图',
    coverTextOnImage: false,
    description: '订阅号列表：标题在左、封面缩略图在右',
  },
  DOUYIN: {
    aspect: 'aspect-[9/16]',
    aspectLabel: '9:16 竖版',
    coverTextOnImage: true,
    description: '视频封面/首帧，可叠大字标题',
  },
  VIDEO_CHANNEL: {
    aspect: 'aspect-[9/16]',
    aspectLabel: '9:16 竖版',
    coverTextOnImage: true,
    description: '视频封面/首帧，风格略偏真实场景',
  },
  ZHIHU: {
    aspect: 'aspect-video',
    aspectLabel: '16:9 横版',
    coverTextOnImage: false,
    description: '文章头图，封面文案作副标题',
  },
  BILIBILI: {
    aspect: 'aspect-video',
    aspectLabel: '16:9 横版',
    coverTextOnImage: true,
    description: '视频/专栏封面，标题叠在图上',
  },
};

export const DEFAULT_COVER_INFO: PlatformCoverInfo = {
  aspect: 'aspect-video',
  aspectLabel: '16:9 横版',
  coverTextOnImage: false,
  description: '头图 + 封面文案',
};

export function getPlatformCoverInfo(platform: string): PlatformCoverInfo {
  return PLATFORM_COVER_INFO[platform] ?? DEFAULT_COVER_INFO;
}

export type CoverMaterial = {
  role?: string;
  url?: string | null;
  type?: string;
  meta?: Record<string, unknown> | null;
};

/** 按平台 / 版本从素材库选取封面图 */
export function pickCoverUrl(
  materials?: CoverMaterial[] | null,
  options?: { platform?: string; versionId?: string }
): string | null {
  const covers =
    materials?.filter(
      (m) => m.role === 'COVER' && m.url && m.type !== 'VIDEO'
    ) ?? [];

  if (options?.versionId) {
    const matched = covers.find((m) => m.meta?.versionId === options.versionId);
    if (matched?.url) return matched.url;
  }

  if (options?.platform) {
    const matched = covers.find((m) => m.meta?.platform === options.platform);
    if (matched?.url) return matched.url;
  }

  return covers[0]?.url ?? null;
}

/** 紧凑预览区宽度（按平台比例） */
export function getCompactCoverThumbWidth(aspect: string) {
  if (aspect === 'aspect-video') return 'w-[220px]';
  if (aspect === 'aspect-[9/16]') return 'w-[100px]';
  return 'w-[120px]';
}
