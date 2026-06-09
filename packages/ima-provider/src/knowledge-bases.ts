import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getImaConfig } from './config.js';
import { extractKnowledgeBases } from './parsers.js';
import { imaRequest } from './client.js';

export async function listKnowledgeBases(query?: { enabledOnly?: boolean }) {
  const where = query?.enabledOnly ? { enabled: true } : {};
  return prisma.imaKnowledgeBase.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
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

export async function syncKnowledgeBasesFromIma() {
  const config = await getImaConfig();
  const res = await imaRequest(
    config,
    'openapi/wiki/v1/search_knowledge_base',
    { query: '', cursor: '', limit: 20 }
  );
  const remote = extractKnowledgeBases(res);
  const synced = [];
  for (const item of remote) {
    // 只同步名称包含"智能运营中台"的知识库
    if (!item.name.includes('智能运营中台')) {
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
            rawData: item.raw as object,
            syncedAt: new Date(),
          },
        });

    synced.push(row);
  }

  // 清理数据库中不再存在于远程的知识库(根据名称匹配)
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

  return synced;
}

export async function updateKnowledgeBase(
  id: string,
  data: Partial<{
    enabled: boolean;
    isDefault: boolean;
    name: string;
    agentType: string;
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
