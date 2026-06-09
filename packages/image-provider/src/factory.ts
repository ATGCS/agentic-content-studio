import { imageProviderRegistry } from './registry.js';
import type { ImageProviderAdapter } from './types.js';

/** 未配置 IMAGE_PROVIDER 时的默认厂商 */
export const DEFAULT_IMAGE_PROVIDER = 'agnes';

/** 解析 .env 中 IMAGE_PROVIDER，返回已注册的厂商 ID */
export function resolveImageProviderId(): string {
  const raw = process.env.IMAGE_PROVIDER?.trim().toLowerCase();
  const id = raw || DEFAULT_IMAGE_PROVIDER;

  if (!imageProviderRegistry.has(id)) {
    throw new Error(
      `IMAGE_PROVIDER="${id}" 无效，请设置为: ${imageProviderRegistry.listIds().join(' | ')}`
    );
  }

  return id;
}

/** 获取当前（或指定）厂商适配器实例 */
export function getImageProvider(id?: string): ImageProviderAdapter {
  return imageProviderRegistry.get(id ?? resolveImageProviderId());
}

/** 列出所有已注册厂商（供设置页 / 调试） */
export function listImageProviders() {
  return imageProviderRegistry.list().map((adapter) => ({
    id: adapter.id,
    label: adapter.label,
    configured: adapter.isConfigured(),
    canGenerate: adapter.canGenerate(),
  }));
}
