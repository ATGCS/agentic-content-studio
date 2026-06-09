import { randomUUID } from 'node:crypto';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getImaConfig } from './config.js';
import { extractKnowledgeBases } from './parsers.js';
import { imaRequest } from './client.js';

function isMockExternalId(externalId: string): boolean {
  return externalId.startsWith('mock-kb-');
}

/** 是否应调用 IMA 远程 API（排除 mock / 本地自建库） */
export function isImaRemoteKnowledgeBase(kb: {
  externalId: string;
  source?: string | null;
}): boolean {
  if (kb.source === 'local') return false;
  if (kb.externalId.startsWith('local-')) return false;
  if (isMockExternalId(kb.externalId)) return false;
  return Boolean(kb.externalId.trim());
}

async function findUsableKnowledgeBase() {
  const candidates = await prisma.imaKnowledgeBase.findMany({
    where: { enabled: true },
    orderBy: [{ isDefault: 'desc' }, { syncedAt: 'desc' }],
  });
  return candidates.find((kb) => isImaRemoteKnowledgeBase(kb));
}

async function ensureSyncedKnowledgeBase(): Promise<string | undefined> {
  const existing = await findUsableKnowledgeBase();
  if (existing) return existing.externalId;

  const config = await getImaConfig();
  if (!config.clientId || !config.apiKey) return undefined;

  await syncKnowledgeBasesFromIma({ all: true });
  const synced = await findUsableKnowledgeBase();
  return synced?.externalId;
}

export async function listKnowledgeBases(query?: { enabledOnly?: boolean }) {
  const where = query?.enabledOnly ? { enabled: true } : {};
  return prisma.imaKnowledgeBase.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { documents: true } },
    },
  });
}

export async function getKnowledgeBase(id: string) {
  const kb = await prisma.imaKnowledgeBase.findUnique({ where: { id } });
  if (!kb)
    throw new AppError(ErrorCodes.NOT_FOUND, 'knowledge base not found', 404);
  return kb;
}

export async function resolveExternalKnowledgeBaseId(
  knowledgeBaseId?: string
): Promise<string | undefined> {
  if (!knowledgeBaseId) {
    const kb = await findUsableKnowledgeBase();
    if (kb) return kb.externalId;
    return ensureSyncedKnowledgeBase();
  }

  const byLocal = await prisma.imaKnowledgeBase.findUnique({
    where: { id: knowledgeBaseId },
  });
  if (byLocal) {
    if (!isImaRemoteKnowledgeBase(byLocal)) {
      return ensureSyncedKnowledgeBase();
    }
    return byLocal.externalId;
  }

  const byExternal = await prisma.imaKnowledgeBase.findUnique({
    where: { externalId: knowledgeBaseId },
  });
  if (byExternal) {
    if (!isImaRemoteKnowledgeBase(byExternal)) {
      return ensureSyncedKnowledgeBase();
    }
    return byExternal.externalId;
  }

  if (!isImaRemoteKnowledgeBase({ externalId: knowledgeBaseId })) {
    return ensureSyncedKnowledgeBase();
  }

  return knowledgeBaseId;
}

// 根据知识库名称自动推断 Agent 类型
function inferAgentType(name: string): string | null {
  if (name.includes('选题')) return 'TOPIC';
  if (name.includes('标题')) return 'TITLE';
  if (name.includes('封面')) return 'COVER';
  if (name.includes('正文')) return 'BODY';
  if (name.includes('标签')) return 'TAG';
  if (name.includes('平台规则')) return 'PLATFORM_RULE';
  if (name.includes('账号风格')) return 'ACCOUNT_STYLE';
  if (name.includes('素材')) return 'MATERIAL';
  return null;
}

export async function syncKnowledgeBasesFromIma(options?: { all?: boolean }) {
  const config = await getImaConfig();
  const res = await imaRequest(
    config,
    'openapi/wiki/v1/search_knowledge_base',
    { query: '', cursor: '', limit: 20 }
  );
  const remote = extractKnowledgeBases(res);
  const synced = [];
  for (const item of remote) {
    if (!options?.all && !item.name.includes('智能运营中台')) {
      console.log(`⏭️  跳过非业务知识库: ${item.name}`);
      continue;
    }

    // 自动推断 Agent 类型
    const agentType = inferAgentType(item.name);

    // 根据名称查找或创建,确保名称唯一
    const existingBy = await prisma.imaKnowledgeBase.findFirst({
      where: { name: item.name },
    });

    const row = existingBy
      ? await prisma.imaKnowledgeBase.update({
          where: { id: existingBy.id },
          data: {
            name: item.name,
            description: item.description,
            agentType: agentType,
            externalId: item.externalId,
            source: 'ima',
            rawData: item.raw as object,
            syncedAt: new Date(),
          },
        })
      : await prisma.imaKnowledgeBase.create({
          data: {
            externalId: item.externalId,
            name: item.name,
            description: item.description,
            agentType: agentType,
            source: 'ima',
            rawData: item.raw as object,
            syncedAt: new Date(),
          },
        });

    synced.push(row);
  }

  // 清理数据库中不再存在于远程的知识库(根据名称匹配)
  if (!options?.all) {
    const remoteNames = new Set(remote.map((item) => item.name));
    const localKbs = await prisma.imaKnowledgeBase.findMany({
      where: {
        name: {
          contains: '智能运营中台',
        },
      },
    });

    const toDelete = localKbs.filter((kb) => !remoteNames.has(kb.name));
    if (toDelete.length > 0) {
      console.log(`🗑️  清理 ${toDelete.length} 个已删除的知识库`);
      await prisma.imaKnowledgeBase.deleteMany({
        where: {
          id: {
            in: toDelete.map((kb) => kb.id),
          },
        },
      });
    }
  }

  if (synced.length > 0) {
    const currentDefault = await prisma.imaKnowledgeBase.findFirst({
      where: { isDefault: true, enabled: true },
    });
    const needsDefault =
      !currentDefault || isMockExternalId(currentDefault.externalId);
    if (needsDefault) {
      const firstReal = synced.find((kb) => !isMockExternalId(kb.externalId));
      if (firstReal) {
        await prisma.imaKnowledgeBase.updateMany({
          data: { isDefault: false },
        });
        await prisma.imaKnowledgeBase.update({
          where: { id: firstReal.id },
          data: { isDefault: true },
        });
      }
    }
  }

  return synced;
}

/** 同步知识库元数据 + 文档正文到本地 */
export async function syncAllFromIma(options?: { all?: boolean }) {
  const synced = await syncKnowledgeBasesFromIma(options);
  const { syncKnowledgeDocumentsFromIma } = await import('./sync-documents.js');
  const documents = await syncKnowledgeDocumentsFromIma({
    enabledOnly: true,
  });
  return { knowledgeBases: synced, documents };
}

export async function createLocalKnowledgeBase(data: {
  name: string;
  description?: string;
  agentType?: string;
}) {
  const name = data.name.trim();
  if (!name) {
    throw new AppError(ErrorCodes.BAD_REQUEST, '知识库名称不能为空', 400);
  }

  const existing = await prisma.imaKnowledgeBase.findFirst({ where: { name } });
  if (existing) {
    throw new AppError(ErrorCodes.BAD_REQUEST, '知识库名称已存在', 400);
  }

  return prisma.imaKnowledgeBase.create({
    data: {
      externalId: `local-${randomUUID()}`,
      name,
      description: data.description?.trim() || null,
      agentType: data.agentType || null,
      source: 'local',
      enabled: true,
      syncedAt: new Date(),
    },
  });
}

export async function updateKnowledgeBase(
  id: string,
  data: Partial<{
    enabled: boolean;
    isDefault: boolean;
    name: string;
    agentType: string | null;
    description: string | null;
  }>
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

export async function deleteKnowledgeBases(ids: string[]) {
  return prisma.imaKnowledgeBase.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });
}
