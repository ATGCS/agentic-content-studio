import { prisma } from '@acs/db';
import {
  generateImage,
  resolveImageSize,
  type ImageRole,
} from '@acs/doubao-image-provider';
import type { OutputApplier } from '../runtime/types.js';

export const noopApplier: OutputApplier = async () => {};

export const titleApplier: OutputApplier = async ({ contentId, output }) => {
  const o = output as { titles: string[] };
  if (!o.titles[0]) return;

  await prisma.content.update({
    where: { id: contentId },
    data: { title: o.titles[0], aiGenerated: true },
  });
};

export const bodyApplier: OutputApplier = async ({ contentId, output }) => {
  const o = output as { body: string };
  await prisma.content.update({
    where: { id: contentId },
    data: { body: o.body, aiGenerated: true, status: 'PENDING_REVIEW' },
  });
};

export const rewriteApplier: OutputApplier = async ({ versionId, output }) => {
  if (!versionId) return;

  const o = output as {
    title: string;
    body: string;
    coverText?: string;
    tags?: string[];
  };

  await prisma.contentVersion.update({
    where: { id: versionId },
    data: {
      title: o.title,
      body: o.body,
      coverText: o.coverText,
      tags: o.tags ?? [],
      status: 'PENDING_REVIEW',
    },
  });
};

export const imageApplier: OutputApplier = async ({
  contentId,
  output,
  overrides,
}) => {
  const o = output as {
    prompt: string;
    style?: string;
    aspectRatio?: string;
  };
  const role = (overrides?.imageRole ?? 'COVER') as ImageRole;
  const platform = overrides?.platform;
  const prompt = [o.prompt, o.style].filter(Boolean).join('，风格：');
  const size = resolveImageSize(platform, role, o.aspectRatio);

  const result = await generateImage({ prompt, size });

  await prisma.material.create({
    data: {
      contentId,
      type: 'IMAGE',
      role,
      name: role === 'COVER' ? 'AI 封面' : 'AI 配图',
      url: result.url,
      source: 'doubao-seedream',
      meta: {
        prompt,
        model: result.model,
        platform,
        mock: result.mock ?? false,
      },
    },
  });
};

export const outputAppliers = {
  noop: noopApplier,
  title: titleApplier,
  body: bodyApplier,
  rewrite: rewriteApplier,
  image: imageApplier,
};
