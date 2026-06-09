import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getKnowledgeProvider } from './provider.js';
import {
  resolveExternalKnowledgeBaseId,
  getKnowledgeBase,
} from './knowledge-bases.js';
import { formatKnowledgeSummary } from './summary.js';

export async function searchAndLog(
  contentId: string,
  query: string,
  options: { limit?: number; knowledgeBaseId?: string } = {}
) {
  const limit = options.limit ?? 10;
  const externalId = await resolveExternalKnowledgeBaseId(
    options.knowledgeBaseId
  );

  if (!externalId) {
    throw new AppError(
      ErrorCodes.BAD_REQUEST,
      '未找到可用知识库，请前往「设置 → IMA 知识库」同步并设置默认知识库',
      400
    );
  }

  const provider = await getKnowledgeProvider();
  let result;
  try {
    result = await provider.search({
      query,
      limit,
      knowledgeBaseId: externalId,
    });
  } catch (err) {
    if (err instanceof Error) {
      throw new AppError(
        ErrorCodes.BAD_REQUEST,
        `IMA 知识库检索失败: ${err.message}`,
        400
      );
    }
    throw err;
  }

  const { items, raw, mode } = result;
  const summary = formatKnowledgeSummary(items);

  let localKbId: string | undefined;
  if (options.knowledgeBaseId) {
    try {
      const kb = await getKnowledgeBase(options.knowledgeBaseId);
      localKbId = kb.id;
    } catch {
      const kb = await prisma.imaKnowledgeBase.findUnique({
        where: { externalId: options.knowledgeBaseId },
      });
      localKbId = kb?.id;
    }
  } else if (externalId) {
    const kb = await prisma.imaKnowledgeBase.findUnique({
      where: { externalId },
    });
    localKbId = kb?.id;
  }

  const log = await prisma.imaSearchLog.create({
    data: {
      contentId,
      knowledgeBaseId: localKbId,
      query,
      resultSummary: summary,
      rawResult: { mode, items, raw } as object,
    },
  });
  return {
    items,
    log,
    mode,
    knowledgeBaseId: localKbId,
    externalKnowledgeBaseId: externalId,
  };
}
