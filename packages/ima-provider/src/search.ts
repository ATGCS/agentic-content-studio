import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getKnowledgeBase } from './knowledge-bases.js';
import { searchLocalKnowledge } from './local-search.js';

export async function searchAndLog(
  contentId: string,
  query: string,
  options: {
    limit?: number;
    knowledgeBaseId?: string;
    agentType?: string;
  } = {}
) {
  const limit = options.limit ?? 10;
  const result = await searchLocalKnowledge({
    query,
    limit,
    knowledgeBaseId: options.knowledgeBaseId,
    agentType: options.agentType,
  });

  if (result.knowledgeBaseIds.length === 0) {
    throw new AppError(
      ErrorCodes.BAD_REQUEST,
      '未找到可用知识库，请前往「知识库」同步 IMA 内容到本地',
      400
    );
  }

  let localKbId = result.knowledgeBaseIds[0];
  if (options.knowledgeBaseId) {
    try {
      const kb = await getKnowledgeBase(options.knowledgeBaseId);
      localKbId = kb.id;
    } catch {
      const kb = await prisma.imaKnowledgeBase.findUnique({
        where: { externalId: options.knowledgeBaseId },
      });
      if (kb) localKbId = kb.id;
    }
  }

  const log = await prisma.imaSearchLog.create({
    data: {
      contentId,
      knowledgeBaseId: localKbId,
      query,
      resultSummary: result.summary,
      rawResult: {
        mode: result.mode,
        items: result.items,
        source: 'local',
        knowledgeBaseIds: result.knowledgeBaseIds,
      } as object,
    },
  });

  return {
    items: result.items,
    log,
    mode: result.mode,
    knowledgeBaseId: localKbId,
    externalKnowledgeBaseId: undefined,
  };
}
