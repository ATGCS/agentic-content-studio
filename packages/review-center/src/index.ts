import { prisma, type PublishStatus } from '@acs/db';
import {
  AppError,
  ErrorCodes,
  parsePagination,
  type AuthUser,
  canReview,
  requireRoles,
} from '@acs/core';
import { getContent, computeContentStatus } from '@acs/content-center';

export async function listReviews(
  user: AuthUser,
  query: {
    status?: string;
    page?: string;
    pageSize?: string;
    platform?: string;
  }
) {
  const { page, pageSize, skip } = parsePagination(query);
  const where: Record<string, unknown> = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.platform && query.platform !== 'all') {
    where.version = { platform: query.platform };
  }

  const [items, total] = await Promise.all([
    prisma.reviewTask.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { content: true, version: true },
    }),
    prisma.reviewTask.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function submitReview(
  user: AuthUser,
  data: { contentId: string; versionId?: string }
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  await getContent(data.contentId);

  if (data.versionId) {
    const existing = await prisma.reviewTask.findFirst({
      where: {
        contentId: data.contentId,
        versionId: data.versionId,
        status: 'PENDING',
      },
    });
    if (existing) {
      throw new AppError(ErrorCodes.REVIEW_INVALID, '该版本已在审核中', 409);
    }
  }

  const task = await prisma.reviewTask.create({
    data: {
      contentId: data.contentId,
      versionId: data.versionId,
      status: 'PENDING',
    },
  });
  if (data.versionId) {
    // 简化流程：直接设为 APPROVED，跳过审核
    await prisma.contentVersion.update({
      where: { id: data.versionId },
      data: { status: 'APPROVED' },
    });
  }
  // 基于所有版本状态计算内容级状态
  const allVersions = await prisma.contentVersion.findMany({
    where: { contentId: data.contentId },
    select: { status: true },
  });
  const computedStatus = computeContentStatus(allVersions.map((v) => v.status));
  await prisma.content.update({
    where: { id: data.contentId },
    data: { status: computedStatus },
  });
  return task;
}

export async function approveReview(user: AuthUser, reviewId: string) {
  requireRoles(user, 'ADMIN', 'REVIEWER');
  const task = await prisma.reviewTask.findUnique({
    where: { id: reviewId },
    include: { content: true, version: true },
  });
  if (!task) throw new AppError(ErrorCodes.NOT_FOUND, 'review not found', 404);
  if (!canReview(user, task.content.createdBy)) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'cannot review own content', 403);
  }

  const updated = await prisma.reviewTask.update({
    where: { id: reviewId },
    data: {
      status: 'APPROVED',
      reviewerId: user.id,
      reviewedAt: new Date(),
    },
  });

  if (task.versionId) {
    await prisma.contentVersion.update({
      where: { id: task.versionId },
      data: { status: 'APPROVED' },
    });
    // 审核通过后自动创建发布任务
    const version = await prisma.contentVersion.findUnique({
      where: { id: task.versionId },
    });
    if (version && version.accountId) {
      await prisma.publishingTask
        .create({
          data: {
            contentId: task.contentId,
            versionId: task.versionId,
            accountId: version.accountId,
            platform: version.platform,
            status: 'PENDING',
          },
        })
        .catch(() => {
          // 如果发布任务已存在则忽略
        });
    }
  }
  // 基于所有版本状态计算内容级状态
  const allVersions = await prisma.contentVersion.findMany({
    where: { contentId: task.contentId },
    select: { status: true },
  });
  const computedStatus = computeContentStatus(allVersions.map((v) => v.status));
  await prisma.content.update({
    where: { id: task.contentId },
    data: { status: computedStatus },
  });
  return updated;
}

export async function rejectReview(
  user: AuthUser,
  reviewId: string,
  comment?: string
) {
  requireRoles(user, 'ADMIN', 'REVIEWER');
  const task = await prisma.reviewTask.findUnique({
    where: { id: reviewId },
    include: { content: true },
  });
  if (!task) throw new AppError(ErrorCodes.NOT_FOUND, 'review not found', 404);
  if (!canReview(user, task.content.createdBy)) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'cannot review own content', 403);
  }

  const updated = await prisma.reviewTask.update({
    where: { id: reviewId },
    data: {
      status: 'REJECTED',
      reviewerId: user.id,
      comment,
      reviewedAt: new Date(),
    },
  });

  if (task.versionId) {
    await prisma.contentVersion.update({
      where: { id: task.versionId },
      data: { status: 'REJECTED' },
    });
  }
  // 基于所有版本状态计算内容级状态
  const allVersions = await prisma.contentVersion.findMany({
    where: { contentId: task.contentId },
    select: { status: true },
  });
  const computedStatus = computeContentStatus(allVersions.map((v) => v.status));
  await prisma.content.update({
    where: { id: task.contentId },
    data: { status: computedStatus },
  });
  return updated;
}

export async function createPublishingTask(data: {
  versionId: string;
  accountId: string;
  scheduledAt?: Date | null;
}) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: data.versionId },
  });
  if (!version)
    throw new AppError(ErrorCodes.NOT_FOUND, 'version not found', 404);
  if (version.status !== 'APPROVED') {
    throw new AppError(
      ErrorCodes.PUBLISH_INVALID,
      'version must be approved',
      400
    );
  }
  return prisma.publishingTask.create({
    data: {
      contentId: version.contentId,
      versionId: data.versionId,
      accountId: data.accountId,
      platform: version.platform,
      scheduledAt: data.scheduledAt ?? undefined,
      status: 'PENDING',
    },
  });
}

export async function listPublishingTasks(query: { status?: string }) {
  const where: { status?: PublishStatus } = {};
  if (query.status) {
    where.status = query.status as PublishStatus;
  }
  return prisma.publishingTask.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      content: true,
      account: true,
      version: true,
      publishRecord: true,
    },
  });
}

export async function getPublishingTask(id: string) {
  const task = await prisma.publishingTask.findUnique({
    where: { id },
    include: { publishRecord: true, version: true },
  });
  if (!task) throw new AppError(ErrorCodes.NOT_FOUND, 'task not found', 404);
  return task;
}

export async function cancelPublishingTask(id: string) {
  const task = await prisma.publishingTask.findUnique({ where: { id } });
  if (!task) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'publishing task not found', 404);
  }
  if (task.status === 'SUCCESS') {
    throw new AppError(
      ErrorCodes.BAD_REQUEST,
      'cannot cancel a successfully published task',
      400
    );
  }
  if (task.status === 'CANCELLED') {
    throw new AppError(ErrorCodes.BAD_REQUEST, 'task already cancelled', 400);
  }
  return prisma.publishingTask.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
}
