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
  query: { status?: string; page?: string; pageSize?: string }
) {
  const { page, pageSize, skip } = parsePagination(query);
  const where: { status?: ContentStatus; ownerId?: string } = {};
  if (query.status) where.status = query.status as ContentStatus;
  if (user.role === 'OPERATOR') where.ownerId = user.id;

  const [items, total] = await Promise.all([
    prisma.topic.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.topic.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createTopic(
  user: AuthUser,
  data: {
    title: string;
    description?: string;
    targetPlatforms?: string[];
    source?: string;
  }
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  return prisma.topic.create({
    data: {
      title: data.title,
      description: data.description,
      targetPlatforms: data.targetPlatforms ?? [],
      source: data.source ?? 'manual',
      ownerId: user.id,
    },
  });
}

export async function getTopic(id: string) {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { contents: true },
  });
  if (!topic) throw new AppError(ErrorCodes.NOT_FOUND, 'topic not found', 404);
  return topic;
}

export async function updateTopic(
  user: AuthUser,
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: ContentStatus;
    targetPlatforms: string[];
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
  const count = await prisma.content.count({ where: { topicId: id } });
  if (count > 0)
    throw new AppError(ErrorCodes.BAD_REQUEST, 'topic has contents', 400);
  return prisma.topic.delete({ where: { id } });
}
