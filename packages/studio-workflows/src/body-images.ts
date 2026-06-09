import { prisma, type Platform } from '@acs/db';
import { orchestrateImageGeneration } from './image-generation.js';

export type ImageSlot = {
  id: string;
  prompt: string;
  alt?: string;
};

export function parseImageSlots(formatConfig: unknown): ImageSlot[] {
  if (!formatConfig || typeof formatConfig !== 'object') return [];
  const slots = (formatConfig as { imageSlots?: unknown }).imageSlots;
  if (!Array.isArray(slots)) return [];
  return slots.filter(
    (s): s is ImageSlot =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as ImageSlot).id === 'string' &&
      typeof (s as ImageSlot).prompt === 'string'
  );
}

/** 将 [[IMAGE:id]] 替换为 Markdown 图片 */
export function injectImagesIntoBody(
  body: string,
  slotMap: Map<string, { url: string; alt?: string }>,
  failedSlotIds: Set<string> = new Set()
): string {
  return body.replace(/\[\[IMAGE:([^\]]+)\]\]/g, (_match, slotId: string) => {
    const item = slotMap.get(slotId);
    if (item?.url) {
      const alt = item.alt?.trim() || '配图';
      return `![${alt}](${item.url})`;
    }
    if (failedSlotIds.has(slotId)) {
      return `<!-- 配图生成失败: ${slotId} -->`;
    }
    return `[[IMAGE:${slotId}]]`;
  });
}

/** 为版本规划的正文插图批量出图 */
export async function orchestrateBodyImages(
  contentId: string,
  versionId: string,
  platform: Platform,
  slots: ImageSlot[],
  accountId?: string
): Promise<Map<string, { url: string; alt?: string }>> {
  const result = new Map<string, { url: string; alt?: string }>();

  for (const slot of slots) {
    try {
      const { material } = await orchestrateImageGeneration(contentId, {
        role: 'BODY',
        platform,
        versionId,
        accountId,
        prompt: slot.prompt,
        slotId: slot.id,
        slotAlt: slot.alt,
      });
      if (material.url) {
        result.set(slot.id, { url: material.url, alt: slot.alt });
      }
    } catch (error) {
      console.warn(
        `[body-image] ${platform} slot ${slot.id} 配图失败:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return result;
}

/** 回填正文插图并更新版本 */
export async function applyBodyImagesToVersion(versionId: string) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version?.body) return;

  const slots = parseImageSlots(version.formatConfig);
  if (slots.length === 0) return;

  const materials = await prisma.material.findMany({
    where: {
      contentId: version.contentId,
      type: 'IMAGE',
      role: 'BODY',
    },
    orderBy: { createdAt: 'desc' },
  });

  const slotMap = new Map<string, { url: string; alt?: string }>();
  const failedIds = new Set<string>();

  for (const slot of slots) {
    const material = materials.find((m) => {
      const meta = m.meta as { versionId?: string; slotId?: string } | null;
      return meta?.versionId === versionId && meta?.slotId === slot.id;
    });
    if (material?.url) {
      slotMap.set(slot.id, { url: material.url, alt: slot.alt });
    } else {
      failedIds.add(slot.id);
    }
  }

  const newBody = injectImagesIntoBody(version.body, slotMap, failedIds);
  if (newBody === version.body) return;

  await prisma.contentVersion.update({
    where: { id: versionId },
    data: { body: newBody },
  });
}
