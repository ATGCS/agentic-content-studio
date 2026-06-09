import { prisma } from '@acs/db';
import { canGenerateImages } from '@acs/image-provider';
import {
  applyBodyImagesToVersion,
  orchestrateBodyImages,
  parseImageSlots,
} from '../body-images.js';
import { orchestrateCoverImages } from '../image-generation.js';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const imageBodySlotsNode: WorkflowNodeHandler = async (ctx) => {
  if (!ctx.versionId || !ctx.platform) {
    throw new Error('image.bodySlots requires versionId and platform');
  }

  const version = await prisma.contentVersion.findUnique({
    where: { id: ctx.versionId },
  });
  const slots = parseImageSlots(version?.formatConfig);

  if (!canGenerateImages() || slots.length === 0) {
    return { output: { hasImageSlots: false, slotCount: 0 } };
  }

  await orchestrateBodyImages(
    ctx.contentId,
    ctx.versionId,
    ctx.platform,
    slots,
    ctx.accountId
  );
  await applyBodyImagesToVersion(ctx.versionId);

  return { output: { hasImageSlots: true, slotCount: slots.length } };
};

export const imageDetectSlotsNode: WorkflowNodeHandler = async (ctx) => {
  if (!ctx.versionId) return { output: { hasImageSlots: false, slotCount: 0 } };

  const version = await prisma.contentVersion.findUnique({
    where: { id: ctx.versionId },
  });
  const slots = parseImageSlots(version?.formatConfig);

  return {
    output: {
      hasImageSlots: slots.length > 0,
      slotCount: slots.length,
    },
    patch: { vars: { hasImageSlots: slots.length > 0 } },
  };
};

export const imageCoversNode: WorkflowNodeHandler = async (ctx) => {
  const materials = await orchestrateCoverImages(
    ctx.contentId,
    ctx.platforms,
    ctx.accountId
  );
  return { output: { coverCount: materials.length } };
};
