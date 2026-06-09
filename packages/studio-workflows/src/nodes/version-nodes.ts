import { prisma } from '@acs/db';
import type { Platform } from '@acs/db';
import { updateVersionRenderedHtml } from '../platform-body-renderer.js';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const versionEnsureNode: WorkflowNodeHandler = async (ctx) => {
  const platform = ctx.platform;
  if (!platform) throw new Error('version.ensure requires ctx.platform');

  let version = await prisma.contentVersion.findFirst({
    where: { contentId: ctx.contentId, platform },
  });

  if (!version) {
    version = await prisma.contentVersion.create({
      data: {
        contentId: ctx.contentId,
        platform,
        accountId: ctx.accountId,
        status: 'DRAFT',
      },
    });
  }

  const versions = [
    ...ctx.versions.filter((v) => v.id !== version.id),
    {
      id: version.id,
      platform: version.platform as Platform,
    },
  ];

  return {
    patch: { versionId: version.id, versions },
    output: { versionId: version.id, platform },
  };
};

export const versionRenderHtmlNode: WorkflowNodeHandler = async (ctx) => {
  if (!ctx.versionId) throw new Error('version.renderHtml requires versionId');
  await updateVersionRenderedHtml(ctx.versionId);
  return { output: { renderedVersionId: ctx.versionId } };
};
