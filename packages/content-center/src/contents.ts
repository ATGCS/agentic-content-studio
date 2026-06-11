import { prisma, type ContentStatus, type Platform } from '@acs/db';
import {
  AppError,
  ErrorCodes,
  parsePagination,
  type AuthUser,
  requireRoles,
} from '@acs/core';
import { assertTransition } from './status-machine.js';
import {
  snapshotDraftBeforeUpdate,
  snapshotVersionBeforeUpdate,
} from './revisions.js';

export async function listContents(
  user: AuthUser,
  query: { status?: string; topicId?: string; page?: string; pageSize?: string }
) {
  const { page, pageSize, skip } = parsePagination(query);
  const where: {
    status?: ContentStatus;
    topicId?: string;
    createdBy?: string;
  } = {};
  if (query.status) where.status = query.status as ContentStatus;
  if (query.topicId) where.topicId = query.topicId;
  if (user.role === 'OPERATOR') where.createdBy = user.id;

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        topic: true,
        creator: { select: { id: true, name: true, email: true } },
        versions: {
          select: {
            id: true,
            platform: true,
            status: true,
            account: {
              select: { id: true, accountName: true, platform: true },
            },
          },
          take: 3,
        },
      },
    }),
    prisma.content.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createContent(
  user: AuthUser,
  data: { title: string; topicId?: string; summary?: string }
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  return prisma.content.create({
    data: {
      title: data.title,
      topicId: data.topicId,
      summary: data.summary,
      createdBy: user.id,
    },
  });
}

export async function getContent(id: string) {
  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      topic: true,
      versions: {
        include: { account: { select: { accountName: true, platform: true } } },
      },
      materials: { orderBy: { createdAt: 'desc' } },
      agentRuns: {
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { agent: { select: { type: true, name: true } } },
      },
      imaSearchLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!content)
    throw new AppError(ErrorCodes.CONTENT_NOT_FOUND, 'content not found', 404);
  return content;
}

export async function updateContent(
  id: string,
  data: Partial<{
    title: string;
    summary: string;
    body: string;
    coverText: string;
    status: ContentStatus;
    topicId: string | null;
  }>,
  options?: { createdBy?: string }
) {
  const existing = await getContent(id);
  if (data.status && data.status !== existing.status) {
    assertTransition(existing.status, data.status);
  }

  const hasContentChange =
    (data.title !== undefined && data.title !== existing.title) ||
    (data.summary !== undefined && data.summary !== existing.summary) ||
    (data.body !== undefined && data.body !== existing.body) ||
    (data.coverText !== undefined && data.coverText !== existing.coverText);

  if (hasContentChange) {
    await snapshotDraftBeforeUpdate(id, {
      trigger: 'manual',
      label: '手动保存前',
      createdBy: options?.createdBy,
    });
  }

  return prisma.content.update({ where: { id }, data });
}

export async function generateVersions(
  contentId: string,
  platforms: Platform[],
  accountIds?: string[]
) {
  const content = await getContent(contentId);
  const versions = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const accountId = accountIds?.[i] ?? accountIds?.[0];
    const v = await prisma.contentVersion.create({
      data: {
        contentId,
        platform,
        accountId,
        title: content.title,
        body: content.body ?? '',
        status: 'DRAFT',
      },
    });
    versions.push(v);
  }
  return versions;
}

export async function updateVersion(
  versionId: string,
  data: Partial<{
    title: string | null;
    body: string | null;
    coverText: string | null;
    tags: string[];
    formatConfig: Record<string, unknown>;
    status: ContentStatus;
    accountId: string | null;
  }>,
  options?: { createdBy?: string }
) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version)
    throw new AppError(ErrorCodes.NOT_FOUND, 'version not found', 404);
  if (data.status && data.status !== version.status) {
    assertTransition(version.status, data.status);
  }

  const hasContentChange =
    (data.title !== undefined && data.title !== version.title) ||
    (data.body !== undefined && data.body !== version.body) ||
    (data.coverText !== undefined && data.coverText !== version.coverText) ||
    (data.tags !== undefined &&
      JSON.stringify(data.tags) !== JSON.stringify(version.tags)) ||
    (data.formatConfig !== undefined &&
      JSON.stringify(data.formatConfig) !==
        JSON.stringify(version.formatConfig));

  if (hasContentChange) {
    await snapshotVersionBeforeUpdate(versionId, {
      trigger: 'manual',
      label: '手动保存前',
      createdBy: options?.createdBy,
    });
  }

  return prisma.contentVersion.update({
    where: { id: versionId },
    data: {
      ...data,
      tags: data.tags,
      formatConfig: data.formatConfig as object | undefined,
    },
  });
}

export async function getVersion(versionId: string) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
    include: { content: true, account: true },
  });
  if (!version)
    throw new AppError(ErrorCodes.NOT_FOUND, 'version not found', 404);
  return version;
}

export async function listVersions(contentId: string) {
  return prisma.contentVersion.findMany({
    where: { contentId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteContent(user: AuthUser, id: string) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  const content = await getContent(id);
  if (user.role === 'OPERATOR' && content.createdBy !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  return prisma.content.delete({ where: { id } });
}
