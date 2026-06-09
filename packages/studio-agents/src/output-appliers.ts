import {
  snapshotDraftBeforeUpdate,
  snapshotVersionBeforeUpdate,
} from '@acs/content-center';
import { prisma } from '@acs/db';
import {
  generateImage,
  getImageMaterialSource,
  resolveImageSize,
  type ImageRole,
} from '@acs/image-provider';
import {
  composeSeedreamPrompt,
  type ImageAgentOutput,
} from './compose-seedream-prompt.js';
import type { OutputApplier } from '@acs/ai-runtime';

export const noopApplier: OutputApplier = async () => {};

export const titleApplier: OutputApplier = async ({
  contentId,
  output,
  type,
  agentRunId,
}) => {
  const o = output as { titles: string[] };
  if (!o.titles[0]) return;

  await snapshotDraftBeforeUpdate(contentId, {
    trigger: 'agent',
    agentType: type,
    agentRunId,
    label: '标题生成前',
  });

  await prisma.content.update({
    where: { id: contentId },
    data: { title: o.titles[0], aiGenerated: true },
  });
};

export const bodyApplier: OutputApplier = async ({
  contentId,
  output,
  type,
  agentRunId,
}) => {
  const o = output as { body: string; title?: string; titles?: string[] };
  const title = o.title?.trim() || o.titles?.[0]?.trim();

  await snapshotDraftBeforeUpdate(contentId, {
    trigger: 'agent',
    agentType: type,
    agentRunId,
    label: '正文生成前',
  });

  await prisma.content.update({
    where: { id: contentId },
    data: {
      ...(title ? { title } : {}),
      body: o.body,
      aiGenerated: true,
      status: 'PENDING_REVIEW',
    },
  });
};

export const rewriteApplier: OutputApplier = async ({
  versionId,
  output,
  type,
  agentRunId,
  overrides,
}) => {
  if (!versionId) return;

  const o = output as {
    title: string;
    body: string;
    coverText?: string;
    tags?: string[];
    imageSlots?: Array<{ id: string; prompt: string; alt?: string }>;
  };

  const existing = await prisma.contentVersion.findUnique({
    where: { id: versionId },
    select: { formatConfig: true },
  });
  const prevConfig =
    existing?.formatConfig && typeof existing.formatConfig === 'object'
      ? (existing.formatConfig as Record<string, unknown>)
      : {};

  await snapshotVersionBeforeUpdate(versionId, {
    trigger: 'agent',
    agentType: type,
    agentRunId,
    platform: overrides?.platform,
    label: '平台改写前',
  });

  await prisma.contentVersion.update({
    where: { id: versionId },
    data: {
      title: o.title,
      body: o.body,
      coverText: o.coverText,
      tags: o.tags ?? [],
      status: 'PENDING_REVIEW',
      formatConfig: {
        ...prevConfig,
        imageSlots: o.imageSlots ?? [],
      },
    },
  });
};

export const imageApplier: OutputApplier = async ({
  contentId,
  output,
  overrides,
  versionId,
}) => {
  const o = output as ImageAgentOutput;
  const role = (overrides?.imageRole ?? 'COVER') as ImageRole;
  const platform = overrides?.platform;

  const [content, version] = await Promise.all([
    prisma.content.findUnique({
      where: { id: contentId },
      select: { title: true, summary: true },
    }),
    versionId
      ? prisma.contentVersion.findUnique({
          where: { id: versionId },
          select: { title: true, coverText: true },
        })
      : null,
  ]);

  const seedreamPrompt = composeSeedreamPrompt(o, {
    title: version?.title ?? content?.title,
    coverText: version?.coverText ?? undefined,
    platform,
    imageRole: role,
  });

  const size = resolveImageSize(platform, role, o.aspectRatio);

  const result = await generateImage({ prompt: seedreamPrompt, size });

  await prisma.material.create({
    data: {
      contentId,
      type: 'IMAGE',
      role,
      name: role === 'COVER' ? 'AI 封面' : 'AI 配图',
      url: result.url,
      source: getImageMaterialSource(),
      meta: {
        prompt: seedreamPrompt,
        model: result.model,
        platform,
        versionId,
        keyElements: o.keyElements,
        mock: result.mock ?? false,
      },
    },
  });
};

export const studioOutputAppliers = {
  noop: noopApplier,
  title: titleApplier,
  body: bodyApplier,
  rewrite: rewriteApplier,
  image: imageApplier,
};
