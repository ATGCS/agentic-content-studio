import { prisma, type Platform } from '@acs/db';
import { runAgentByType } from '../runtime/agent-runtime.js';
import { runImaSearch } from '../tool-engine.js';
import { orchestrateCoverImages } from './image-generation.js';
import { canGenerateImages } from '@acs/doubao-image-provider';

export async function orchestrateGenerate(
  contentId: string,
  accountId?: string,
  platforms: Platform[] = ['XIAOHONGSHU']
) {
  await prisma.content.update({
    where: { id: contentId },
    data: { status: 'GENERATING' },
  });

  try {
    await runImaSearch(contentId);

    await runAgentByType('TITLE', {
      contentId,
      accountId,
      overrides: { count: 5 },
    });
    await runAgentByType('BODY', { contentId, accountId });

    const versions = [];
    for (const platform of platforms) {
      let version = await prisma.contentVersion.findFirst({
        where: { contentId, platform },
      });
      if (!version) {
        version = await prisma.contentVersion.create({
          data: { contentId, platform, accountId, status: 'DRAFT' },
        });
      }
      await runAgentByType('REWRITE', {
        contentId,
        versionId: version.id,
        accountId,
        overrides: { platform },
      });
      versions.push(version);
    }

    if (canGenerateImages()) {
      await orchestrateCoverImages(contentId, platforms, accountId);
    }

    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'PENDING_REVIEW' },
    });

    return versions;
  } catch (error) {
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}
