import { snapshotContentBeforeWorkflow } from '@acs/content-center';
import type { Platform } from '@acs/db';
import { runWorkflow } from './run-workflow.js';

export async function orchestrateGenerate(
  contentId: string,
  accountId?: string,
  platforms: Platform[] = ['XIAOHONGSHU']
) {
  await snapshotContentBeforeWorkflow(contentId);

  const result = await runWorkflow('content.generate', {
    contentId,
    accountId,
    platforms,
  });

  return result.context.versions.map((v) => ({
    id: v.id,
    platform: v.platform,
  }));
}
