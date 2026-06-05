import { prisma } from '@acs/db';
import { getProfileByAccountId } from '@acs/account-profile';
import { searchAndLog } from '@acs/ima-provider';

export async function buildContext(input: {
  contentId: string;
  accountId?: string;
  platform?: string;
  count?: number;
}): Promise<Record<string, string>> {
  const content = await prisma.content.findUnique({
    where: { id: input.contentId },
    include: { topic: true },
  });
  if (!content) throw new Error('content not found');

  const lastIma = await prisma.imaSearchLog.findFirst({
    where: { contentId: input.contentId },
    orderBy: { createdAt: 'desc' },
  });

  let accountStyle = '';
  if (input.accountId) {
    const profile = await getProfileByAccountId(input.accountId);
    accountStyle = profile?.contentStyle ?? profile?.positioning ?? '';
  }

  return {
    topicTitle: content.topic?.title ?? content.title,
    topicDesc: content.topic?.description ?? '',
    title: content.title,
    body: content.body ?? '',
    summary: content.summary ?? '',
    imaSummary: lastIma?.resultSummary ?? '',
    accountStyle,
    platform: input.platform ?? 'WECHAT',
    count: String(input.count ?? 5),
  };
}

export async function runImaSearch(contentId: string, query: string) {
  return searchAndLog(contentId, query);
}
