import { prisma, type ContentStatus, type UserRole } from '@acs/db';
import {
  AppError,
  ErrorCodes,
  parsePagination,
  type AuthUser,
  requireRoles,
} from '@acs/core';

export async function listTopics(
  user: AuthUser,
  query: { status?: string; page?: string; pageSize?: string; search?: string }
) {
  const { page, pageSize, skip } = parsePagination(query);
  const where: {
    status?: ContentStatus;
    ownerId?: string;
    title?: { contains: string };
  } = {};
  if (query.status) where.status = query.status as ContentStatus;
  if (user.role === 'OPERATOR') where.ownerId = user.id;
  if (query.search) where.title = { contains: query.search };

  const [items, total] = await Promise.all([
    prisma.topic.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { contents: true } } },
    }),
    prisma.topic.count({ where }),
  ]);
  // Map _count up to contentCount for frontend
  return {
    items: items.map((t) => ({ ...t, contentCount: t._count.contents })),
    total,
    page,
    pageSize,
  };
}

export async function createTopic(
  user: AuthUser,
  data: {
    title: string;
    description?: string;
    targetPlatforms?: string[];
    source?: string;
    strategy?: TopicStrategy;
  }
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  return prisma.topic.create({
    data: {
      title: data.title,
      description: data.description,
      targetPlatforms: data.targetPlatforms ?? [],
      strategy: (data.strategy ?? {}) as object,
      source: data.source ?? 'manual',
      ownerId: user.id,
    },
  });
}

export async function getTopic(id: string) {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      contents: true,
      knowledgeBases: {
        include: { knowledgeBase: true },
      },
    },
  });
  if (!topic) throw new AppError(ErrorCodes.NOT_FOUND, 'topic not found', 404);
  // 将 knowledgeBases 映射为前端友好的格式
  return {
    ...topic,
    knowledgeBases: topic.knowledgeBases.map((kb) => ({
      id: kb.knowledgeBase.id,
      name: kb.knowledgeBase.name,
    })),
  };
}

export type TopicOutlineArticle = {
  order: number;
  title: string;
  summary: string;
  keyPoints?: string[];
};

export type TopicOutline = {
  summary: string;
  articles: TopicOutlineArticle[];
  targetPlatforms?: string[];
  plannedAt?: string;
};

/**
 * 系列策略配置
 */
export type TopicStrategy = {
  /** 系列定位：一句话说明这个系列是做什么的 */
  positioning?: string;
  /** 系列目标：如涨粉、品牌曝光、转化等 */
  goals?: string[];
  /** 目标用户画像 */
  targetAudience?: {
    description?: string;
    demographics?: string[];
    interests?: string[];
    painPoints?: string[];
  };
  /** 内容风格：如专业深度、轻松幽默、故事叙事等 */
  contentStyle?: string;
  /** 语气语调 */
  tone?: string;
  /** 竞品系列/账号 */
  competitors?: Array<{
    name: string;
    url?: string;
    strengths?: string;
    weaknesses?: string;
  }>;
  /** 爆款参考文章/视频 */
  viralReferences?: Array<{
    title: string;
    url?: string;
    platform?: string;
    whyViral?: string;
  }>;
  /** 热门话题参考 */
  trendingTopics?: string[];
  /** 关键词/标签 */
  keywords?: string[];
  /** 禁忌词/避免内容 */
  forbiddenWords?: string[];
  /** 发布策略 */
  publishStrategy?: string;
};

export async function updateTopicOutline(
  user: AuthUser,
  id: string,
  outline: TopicOutline
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  const topic = await getTopic(id);
  if (user.role === 'OPERATOR' && topic.ownerId !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  return prisma.topic.update({
    where: { id },
    data: { outline: outline as object },
  });
}

export async function getTopicStatus(id: string) {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      contents: {
        select: { id: true, title: true, status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!topic) throw new AppError(ErrorCodes.NOT_FOUND, 'topic not found', 404);

  const statusCounts: Record<string, number> = {};
  for (const c of topic.contents) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
  }

  const outline = topic.outline as TopicOutline | null;
  return {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    outline,
    contentCount: topic.contents.length,
    statusCounts,
    contents: topic.contents,
    targetPlatforms: topic.targetPlatforms,
  };
}

export async function updateTopic(
  user: AuthUser,
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: ContentStatus;
    targetPlatforms: string[];
    outline: TopicOutline;
    strategy: TopicStrategy;
  }>
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  const topic = await getTopic(id);
  if (user.role === 'OPERATOR' && topic.ownerId !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  return prisma.topic.update({ where: { id }, data });
}

export async function deleteTopic(user: AuthUser, id: string) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  const topic = await getTopic(id);
  if (user.role === 'OPERATOR' && topic.ownerId !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  // 级联解除关联：将属于该系列的文章的 topicId 置为 null
  await prisma.content.updateMany({
    where: { topicId: id },
    data: { topicId: null },
  });
  return prisma.topic.delete({ where: { id } });
}

/**
 * 获取系列绑定的知识库列表
 */
export async function getTopicKnowledgeBases(topicId: string) {
  const topic = await getTopic(topicId);
  const bindings = await prisma.topicKnowledgeBase.findMany({
    where: { topicId },
    include: {
      knowledgeBase: true,
    },
  });
  return bindings.map((b) => b.knowledgeBase);
}

/**
 * 为系列绑定知识库（全量替换）
 */
export async function bindTopicKnowledgeBases(
  user: AuthUser,
  topicId: string,
  knowledgeBaseIds: string[]
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  const topic = await getTopic(topicId);
  if (user.role === 'OPERATOR' && topic.ownerId !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }

  // 验证所有 knowledgeBaseId 存在
  const existing = await prisma.imaKnowledgeBase.findMany({
    where: { id: { in: knowledgeBaseIds } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((kb) => kb.id));
  const invalidIds = knowledgeBaseIds.filter((id) => !existingIds.has(id));
  if (invalidIds.length > 0) {
    throw new AppError(
      ErrorCodes.BAD_REQUEST,
      `知识库不存在: ${invalidIds.join(', ')}`,
      400
    );
  }

  // 全量替换
  await prisma.$transaction([
    prisma.topicKnowledgeBase.deleteMany({ where: { topicId } }),
    ...knowledgeBaseIds.map((knowledgeBaseId) =>
      prisma.topicKnowledgeBase.create({
        data: { topicId, knowledgeBaseId },
      })
    ),
  ]);

  return getTopicKnowledgeBases(topicId);
}
