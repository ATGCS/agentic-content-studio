import type { ImageRole } from './types.js';

/**
 * Agnes Image 2.0 Flash 支持的尺寸：1024x768、1024x1024、768x1024
 * @see https://agnes-ai.com/doc/agnes-image-20-flash
 */
const PLATFORM_SIZES: Record<string, { COVER: string; BODY: string }> = {
  XIAOHONGSHU: { COVER: '768x1024', BODY: '768x1024' },
  WECHAT: { COVER: '1024x768', BODY: '1024x768' },
  DOUYIN: { COVER: '768x1024', BODY: '768x1024' },
  VIDEO_CHANNEL: { COVER: '768x1024', BODY: '768x1024' },
  ZHIHU: { COVER: '1024x768', BODY: '1024x768' },
  BILIBILI: { COVER: '1024x768', BODY: '1024x768' },
};

const AGNES_SIZES = new Set(['1024x768', '1024x1024', '768x1024']);

function normalizeAgnesSize(size: string): string {
  if (AGNES_SIZES.has(size)) return size;
  const [wRaw, hRaw] = size.split('x').map((n) => parseInt(n, 10));
  if (!wRaw || !hRaw) return '768x1024';
  const ratio = wRaw / hRaw;
  if (ratio > 1.05) return '1024x768';
  if (ratio < 0.95) return '768x1024';
  return '1024x1024';
}

export function resolveImageSize(
  platform?: string,
  role: ImageRole = 'COVER',
  aspectRatio?: string
): string {
  if (aspectRatio?.includes('x')) return normalizeAgnesSize(aspectRatio);
  if (platform && PLATFORM_SIZES[platform]) {
    return PLATFORM_SIZES[platform][role];
  }
  return role === 'COVER' ? '768x1024' : '1024x768';
}
