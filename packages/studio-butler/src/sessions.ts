import { prisma } from '@acs/db';
import { AppError, ErrorCodes, type AuthUser } from '@acs/core';
import type { ButlerSessionWithMessages } from './types.js';

export async function listSessions(
  user: AuthUser,
  query?: { topicId?: string; page?: number; pageSize?: number }
) {
  const page = query?.page ?? 1;
  const pageSize = Math.min(query?.pageSize ?? 20, 50);
  const skip = (page - 1) * pageSize;

  const where: { userId: string; topicId?: string } = { userId: user.id };
  if (query?.topicId) where.topicId = query.topicId;

  const [items, total] = await Promise.all([
    prisma.butlerSession.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        topic: { select: { id: true, title: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.butlerSession.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function createSession(
  user: AuthUser,
  data?: { topicId?: string; title?: string }
) {
  let title = data?.title?.trim();
  if (data?.topicId && !title) {
    const topic = await prisma.topic.findUnique({
      where: { id: data.topicId },
      select: { title: true },
    });
    title = topic ? `大管家 · ${topic.title}` : '大管家会话';
  }

  return prisma.butlerSession.create({
    data: {
      userId: user.id,
      topicId: data?.topicId,
      title: title ?? '大管家会话',
    },
    include: { topic: { select: { id: true, title: true } } },
  });
}

export async function getSession(user: AuthUser, id: string) {
  const session = await prisma.butlerSession.findUnique({
    where: { id },
    include: {
      topic: { select: { id: true, title: true, outline: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!session)
    throw new AppError(ErrorCodes.NOT_FOUND, 'session not found', 404);
  if (session.userId !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  return session as ButlerSessionWithMessages;
}

export async function updateSession(
  user: AuthUser,
  sessionId: string,
  data: { topicId?: string | null; title?: string }
) {
  await assertSessionOwner(user, sessionId);

  const updateData: { topicId?: string | null; title?: string } = {};
  if (data.topicId !== undefined) updateData.topicId = data.topicId;
  if (data.title !== undefined) updateData.title = data.title;

  if (data.topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: data.topicId },
      select: { title: true },
    });
    if (topic) updateData.title = `大管家 · ${topic.title}`;
  } else if (data.topicId === null) {
    updateData.title = '大管家会话';
  }

  return prisma.butlerSession.update({
    where: { id: sessionId },
    data: updateData,
    include: {
      topic: { select: { id: true, title: true, outline: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function assertSessionOwner(user: AuthUser, sessionId: string) {
  const session = await prisma.butlerSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, topicId: true, title: true },
  });
  if (!session)
    throw new AppError(ErrorCodes.NOT_FOUND, 'session not found', 404);
  if (session.userId !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  return session;
}
