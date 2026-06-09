import type { ImageRole } from './types.js';

/**
 * 各平台推荐出图像素（需满足 Seedream 5.0-lite 最小总像素 2560×1440）。
 * 参考：https://www.volcengine.com/docs/82379/1541523
 */
const PLATFORM_SIZES: Record<string, { COVER: string; BODY: string }> = {
  XIAOHONGSHU: { COVER: '1728x2304', BODY: '1728x2304' },
  WECHAT: { COVER: '2560x1440', BODY: '2560x1440' },
  DOUYIN: { COVER: '1440x2560', BODY: '1440x2560' },
  VIDEO_CHANNEL: { COVER: '1440x2560', BODY: '1440x2560' },
  ZHIHU: { COVER: '2560x1440', BODY: '2048x1536' },
  BILIBILI: { COVER: '2560x1440', BODY: '2560x1440' },
};

export function resolveImageSize(
  platform?: string,
  role: ImageRole = 'COVER',
  aspectRatio?: string
): string {
  if (aspectRatio?.includes('x')) return aspectRatio;
  if (platform && PLATFORM_SIZES[platform]) {
    return PLATFORM_SIZES[platform][role];
  }
  return role === 'COVER' ? '1728x2304' : '2048x1536';
}
