import { buildImaSearchQuery, searchAndLog } from '@acs/ima-provider';
import { prisma } from '@acs/db';

export { buildContext } from './context/context-engine.js';
export type { ContextBuildInput, ContextProvider } from './context/types.js';

export async function runImaSearch(
  contentId: string,
  options: {
    query?: string;
    platform?: string;
    knowledgeBaseId?: string;
    limit?: number;
  } = {}
) {
  let query = options.query;
  if (!query) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { topic: true },
    });
    query = buildImaSearchQuery({
      title: content?.title,
      summary: content?.summary,
      topicTitle: content?.topic?.title,
      topicDesc: content?.topic?.description,
      platform: options.platform,
    });
  }

  return searchAndLog(contentId, query, {
    knowledgeBaseId: options.knowledgeBaseId,
    limit: options.limit,
  });
}
