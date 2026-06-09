import {
  buildImaSearchQuery,
  searchLocalKnowledge,
  type LocalSearchResult,
} from '@acs/ima-provider';
import { resolveKbAgentTypes } from './knowledge/kb-agent-resolver.js';
import { prisma } from '@acs/db';

export { buildContext } from './context/context-engine.js';
export type { ContextBuildInput, ContextProvider } from './context/types.js';

export async function runLocalKnowledgeSearch(
  contentId: string,
  options: {
    query?: string;
    platform?: string;
    agentType?: string;
    knowledgeBaseId?: string;
    limit?: number;
  } = {}
): Promise<LocalSearchResult> {
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

  return searchLocalKnowledge({
    query,
    kbAgentTypes: resolveKbAgentTypes(options.agentType),
    knowledgeBaseId: options.knowledgeBaseId,
    limit: options.limit,
  });
}

/** @deprecated 使用 runLocalKnowledgeSearch */
export const runImaSearch = runLocalKnowledgeSearch;
