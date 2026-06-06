import type { Platform } from '@acs/db';

/** URL slug used in /api/oauth/:platform/* routes */
export function platformToSlug(platform: Platform | string): string {
  const map: Record<string, string> = {
    WECHAT: 'wechat',
    XIAOHONGSHU: 'xiaohongshu',
    DOUYIN: 'douyin',
    KUAISHOU: 'kuaishou',
    VIDEO_CHANNEL: 'shipinhao',
    BILIBILI: 'bilibili',
    ZHIHU: 'zhihu',
    OTHER: 'other',
  };
  const upper = platform.toUpperCase();
  return map[upper] ?? platform.toLowerCase();
}

/** Resolve route param to Platform enum */
export function slugToPlatform(slug: string): Platform {
  const aliases: Record<string, Platform> = {
    wechat: 'WECHAT',
    weixin: 'WECHAT',
    xiaohongshu: 'XIAOHONGSHU',
    red: 'XIAOHONGSHU',
    douyin: 'DOUYIN',
    kuaishou: 'KUAISHOU',
    shipinhao: 'VIDEO_CHANNEL',
    video: 'VIDEO_CHANNEL',
    video_channel: 'VIDEO_CHANNEL',
    bilibili: 'BILIBILI',
    zhihu: 'ZHIHU',
    other: 'OTHER',
  };
  const key = slug.toLowerCase().replace(/-/g, '_');
  const platform = aliases[key] ?? slug.toUpperCase();
  const valid: Platform[] = [
    'WECHAT',
    'XIAOHONGSHU',
    'DOUYIN',
    'KUAISHOU',
    'VIDEO_CHANNEL',
    'BILIBILI',
    'ZHIHU',
    'OTHER',
  ];
  if (!valid.includes(platform as Platform)) {
    throw new Error(`platform not supported: ${slug}`);
  }
  return platform as Platform;
}

export function oauthPublicBase(): string {
  return (
    process.env.API_BASE_URL ??
    process.env.WEB_BASE_URL ??
    'http://localhost:3001'
  );
}
