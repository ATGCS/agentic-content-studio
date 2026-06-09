import { randomUUID } from 'node:crypto';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getKnowledgeBase } from './knowledge-bases.js';

export async function listDocuments(
  knowledgeBaseId: string,
  options?: { search?: string; source?: string }
) {
  await getKnowledgeBase(knowledgeBaseId);

  const where: {
    knowledgeBaseId: string;
    source?: string;
    OR?: Array<{
      title?: { contains: string };
      content?: { contains: string };
    }>;
  } = { knowledgeBaseId };

  if (options?.source) where.source = options.source;
  if (options?.search?.trim()) {
    const q = options.search.trim();
    where.OR = [{ title: { contains: q } }, { content: { contains: q } }];
  }

  return prisma.imaKnowledgeDocument.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
  });
}

export async function getDocument(knowledgeBaseId: string, documentId: string) {
  const doc = await prisma.imaKnowledgeDocument.findFirst({
    where: { id: documentId, knowledgeBaseId },
  });
  if (!doc) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'document not found', 404);
  }
  return doc;
}

export async function createDocument(
  knowledgeBaseId: string,
  data: { title: string; content?: string; summary?: string }
) {
  await getKnowledgeBase(knowledgeBaseId);
  const content = data.content?.trim() || null;
  const summary =
    data.summary?.trim() ||
    (content && content.length > 500 ? `${content.slice(0, 500)}…` : content);

  return prisma.imaKnowledgeDocument.create({
    data: {
      knowledgeBaseId,
      externalMediaId: `local-${randomUUID()}`,
      title: data.title.trim(),
      summary,
      content,
      source: 'local',
      syncedAt: new Date(),
    },
  });
}

export async function updateDocument(
  knowledgeBaseId: string,
  documentId: string,
  data: Partial<{ title: string; content: string; summary: string }>
) {
  await getDocument(knowledgeBaseId, documentId);

  const content =
    data.content !== undefined ? data.content.trim() || null : undefined;
  const summary =
    data.summary !== undefined
      ? data.summary.trim() || null
      : content !== undefined
        ? content && content.length > 500
          ? `${content.slice(0, 500)}…`
          : content
        : undefined;

  return prisma.imaKnowledgeDocument.update({
    where: { id: documentId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(summary !== undefined ? { summary } : {}),
    },
  });
}

export async function deleteDocument(
  knowledgeBaseId: string,
  documentId: string
) {
  await getDocument(knowledgeBaseId, documentId);
  return prisma.imaKnowledgeDocument.delete({ where: { id: documentId } });
}

export async function deleteDocuments(
  knowledgeBaseId: string,
  documentIds: string[]
) {
  await getKnowledgeBase(knowledgeBaseId);
  return prisma.imaKnowledgeDocument.deleteMany({
    where: {
      knowledgeBaseId,
      id: { in: documentIds },
    },
  });
}
