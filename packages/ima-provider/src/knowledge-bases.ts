import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getImaConfig } from './config.js';
import { getKnowledgeProvider } from './provider.js';
import { extractKnowledgeBases } from './parsers.js';
import { imaRequest } from './client.js';

export async function listKnowledgeBases(query?: {
  enabledOnly?: boolean;
}) {
  const where = query?.enabledOnly ? { enabled: true } : {};
  return prisma.imaKnowledgeBase.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function getKnowledgeBase(id: string) {
  const kb = await prisma.imaKnowledgeBase.findUnique({ where: { id } });
  if (!kb) throw new AppError(ErrorCodes.NOT_FOUND, 'knowledge base not found', 404);
  return kb;
}

export async function resolveExternalKnowledgeBaseId(
  knowledgeBaseId?: string
): Promise<string | undefined> {
  if (!knowledgeBaseId) {
    const defaultKb = await prisma.imaKnowledgeBase.findFirst({
      where: { isDefault: true, enabled: true },
    });
    return defaultKb?.externalId;
  }

  const byLocal = await prisma.imaKnowledgeBase.findUnique({
    where: { id: knowledgeBaseId },
  });
  if (byLocal) return byLocal.externalId;

  const byExternal = await prisma.imaKnowledgeBase.findUnique({
    where: { externalId: knowledgeBaseId },
  });
  if (byExternal) return byExternal.externalId;

  return knowledgeBaseId;
}

export async function syncKnowledgeBasesFromIma() {
  const config = await getImaConfig();
  if (config.useMock) {
    const provider = await getKnowledgeProvider();
    const remote = (await provider.listKnowledgeBases?.()) ?? [];
    const synced = [];
    for (const item of remote) {
      const row = await prisma.imaKnowledgeBase.upsert({
        where: { externalId: item.externalId },
        update: {
          name: item.name,
          description: item.description,
          syncedAt: new Date(),
        },
        create: {
          externalId: item.externalId,
          name: item.name,
          description: item.description,
          syncedAt: new Date(),
        },
      });
      synced.push(row);
    }
    return synced;
  }

  const res = await imaRequest(
    config,
    'openapi/wiki/v1/search_knowledge_base',
    { query: '', cursor: '', limit: 50 }
  );
  const remote = extractKnowledgeBases(res);
  const synced = [];
  for (const item of remote) {
    const row = await prisma.imaKnowledgeBase.upsert({
      where: { externalId: item.externalId },
      update: {
        name: item.name,
        description: item.description,
        rawData: item.raw as object,
        syncedAt: new Date(),
      },
      create: {
        externalId: item.externalId,
        name: item.name,
        description: item.description,
        rawData: item.raw as object,
        syncedAt: new Date(),
      },
    });
    synced.push(row);
  }
  return synced;
}

export async function updateKnowledgeBase(
  id: string,
  data: Partial<{ enabled: boolean; isDefault: boolean; name: string }>
) {
  await getKnowledgeBase(id);

  if (data.isDefault) {
    await prisma.imaKnowledgeBase.updateMany({ data: { isDefault: false } });
  }

  return prisma.imaKnowledgeBase.update({
    where: { id },
    data,
  });
}
