import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getKnowledgeProvider } from './provider.js';
import {
  resolveExternalKnowledgeBaseId,
  getKnowledgeBase,
} from './knowledge-bases.js';

export async function searchAndLog(
  contentId: string,
  query: string,
  options: { limit?: number; knowledgeBaseId?: string } = {}
) {
  const limit = options.limit ?? 10;
  const externalId = await resolveExternalKnowledgeBaseId(
    options.knowledgeBaseId
  );

  const provider = await getKnowledgeProvider();
  let items;
  try {
    items = await provider.search({
      query,
      limit,
      knowledgeBaseId: externalId,
    });
  } catch (err) {
    if (!externalId && err instanceof Error) {
      throw new AppError(
        ErrorCodes.BAD_REQUEST,
        '请先同步知识库并选择默认知识库，或在搜索时指定 knowledgeBaseId',
        400
      );
    }
    throw err;
  }

  const summary = items.map((i) => i.title).join('；');
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
      rawResult: items as object,
    },
  });
  return { items, log, knowledgeBaseId: localKbId, externalKnowledgeBaseId: externalId };
}
