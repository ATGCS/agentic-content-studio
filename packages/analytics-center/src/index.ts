import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getPublishProvider } from '@acs/turbopush-adapter';
import { runAgentByType } from '@acs/ai-runtime';
import {
  countContentDeltaVsYesterday,
  diffMetrics,
  engagementRate,
  getDayRange,
  getPeriodRange,
  sumAnalyticsMetrics,
} from './stats.js';

export async function syncAnalytics(publishRecordId: string) {
  const record = await prisma.publishRecord.findUnique({
    where: { id: publishRecordId },
    include: { task: true },
  });
  if (!record)
    throw new AppError(ErrorCodes.NOT_FOUND, 'publish record not found', 404);

  const metrics = await getPublishProvider().syncMetrics(publishRecordId);

  return prisma.analyticsData.create({
    data: {
      publishRecordId,
      contentId: record.task.contentId,
      versionId: record.task.versionId,
      platform: record.platform,
      accountId: record.accountId,
      views: metrics.views ?? 0,
      likes: metrics.likes ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      collects: metrics.collects ?? 0,
      rawData: metrics as object,
    },
  });
}

export async function getContentAnalytics(contentId: string) {
  return prisma.analyticsData.findMany({
    where: { contentId },
    orderBy: { collectedAt: 'desc' },
  });
}

export async function generateReport(contentId: string) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { analyticsData: true },
  });
  if (!content)
    throw new AppError(ErrorCodes.CONTENT_NOT_FOUND, 'content not found', 404);

  const run = await runAgentByType('SUMMARY', { contentId });
  if (!run)
    throw new AppError(ErrorCodes.AGENT_FAILED, 'summary agent failed', 500);
  const output = run.output as {
    summary?: string;
    insights?: unknown[];
    suggestions?: unknown[];
  };

  return prisma.analyticsReport.create({
    data: {
      contentId,
      summary: output.summary ?? '暂无总结',
      insights: (output.insights ?? []) as object,
      suggestions: (output.suggestions ?? []) as object,
      createdByAgent: true,
    },
  });
}

export async function getReport(id: string) {
  const report = await prisma.analyticsReport.findUnique({ where: { id } });
  if (!report)
    throw new AppError(ErrorCodes.NOT_FOUND, 'report not found', 404);
  return report;
}

export async function listReports(contentId?: string) {
  return prisma.analyticsReport.findMany({
    where: contentId ? { contentId } : {},
    orderBy: { createdAt: 'desc' },
  });
}

const DASHBOARD_STATUS_BUCKETS = {
  pendingGenerate: ['DRAFT', 'PENDING_GENERATE'] as const,
  generating: ['GENERATING'] as const,
  pendingReview: ['PENDING_REVIEW'] as const,
  pendingPublish: ['APPROVED', 'PENDING_PUBLISH'] as const,
  publishedTotal: ['PUBLISHED', 'PUBLISHING'] as const,
  reviewed: ['REVIEWED'] as const,
};

export async function getDashboardStats() {
  const [
    pendingGenerate,
    generating,
    pendingReview,
    pendingPublish,
    publishedTotal,
    reviewed,
    topicCount,
    ...deltas
  ] = await Promise.all([
    prisma.content.count({
      where: { status: { in: [...DASHBOARD_STATUS_BUCKETS.pendingGenerate] } },
    }),
    prisma.content.count({ where: { status: 'GENERATING' } }),
    prisma.content.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.content.count({
      where: { status: { in: [...DASHBOARD_STATUS_BUCKETS.pendingPublish] } },
    }),
    prisma.content.count({
      where: { status: { in: [...DASHBOARD_STATUS_BUCKETS.publishedTotal] } },
    }),
    prisma.content.count({ where: { status: 'REVIEWED' } }),
    prisma.topic.count(),
    countContentDeltaVsYesterday([...DASHBOARD_STATUS_BUCKETS.pendingGenerate]),
    countContentDeltaVsYesterday([...DASHBOARD_STATUS_BUCKETS.generating]),
    countContentDeltaVsYesterday([...DASHBOARD_STATUS_BUCKETS.pendingReview]),
    countContentDeltaVsYesterday([...DASHBOARD_STATUS_BUCKETS.pendingPublish]),
    countContentDeltaVsYesterday([...DASHBOARD_STATUS_BUCKETS.publishedTotal]),
    countContentDeltaVsYesterday([...DASHBOARD_STATUS_BUCKETS.reviewed]),
  ]);

  return {
    pendingGenerate,
    generating,
    pendingReview,
    pendingPublish,
    publishedTotal,
    reviewed,
    topicCount,
    deltas: {
      pendingGenerate: deltas[0],
      generating: deltas[1],
      pendingReview: deltas[2],
      pendingPublish: deltas[3],
      publishedTotal: deltas[4],
      reviewed: deltas[5],
    },
  };
}

export async function getReviewStats() {
  const today = getDayRange(0);
  const yesterday = getDayRange(1);

  const [
    total,
    pending,
    approved,
    rejected,
    todaySubmitted,
    yesterdaySubmitted,
    todayApproved,
    yesterdayApproved,
    todayRejected,
    yesterdayRejected,
    todayReviewed,
  ] = await Promise.all([
    prisma.reviewTask.count(),
    prisma.reviewTask.count({ where: { status: 'PENDING' } }),
    prisma.reviewTask.count({ where: { status: 'APPROVED' } }),
    prisma.reviewTask.count({ where: { status: 'REJECTED' } }),
    prisma.reviewTask.count({
      where: { createdAt: { gte: today.gte, lt: today.lt } },
    }),
    prisma.reviewTask.count({
      where: { createdAt: { gte: yesterday.gte, lt: yesterday.lt } },
    }),
    prisma.reviewTask.count({
      where: {
        status: 'APPROVED',
        reviewedAt: { gte: today.gte, lt: today.lt },
      },
    }),
    prisma.reviewTask.count({
      where: {
        status: 'APPROVED',
        reviewedAt: { gte: yesterday.gte, lt: yesterday.lt },
      },
    }),
    prisma.reviewTask.count({
      where: {
        status: 'REJECTED',
        reviewedAt: { gte: today.gte, lt: today.lt },
      },
    }),
    prisma.reviewTask.count({
      where: {
        status: 'REJECTED',
        reviewedAt: { gte: yesterday.gte, lt: yesterday.lt },
      },
    }),
    prisma.reviewTask.count({
      where: {
        reviewedAt: { gte: today.gte, lt: today.lt },
        status: { in: ['APPROVED', 'REJECTED'] },
      },
    }),
  ]);

  const platformRows = await prisma.reviewTask.findMany({
    select: { version: { select: { platform: true } } },
    where: { versionId: { not: null } },
  });
  const platformCount: Record<string, number> = {};
  for (const row of platformRows) {
    const p = row.version?.platform || 'OTHER';
    platformCount[p] = (platformCount[p] || 0) + 1;
  }
  const platformDistribution = Object.entries(platformCount).map(
    ([platform, count]) => ({
      platform,
      count,
      percent: total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%',
    })
  );

  return {
    total,
    pending,
    approved,
    rejected,
    todaySubmitted,
    todayReviewed,
    platformDistribution,
    deltas: {
      total: todaySubmitted - yesterdaySubmitted,
      pending: todaySubmitted - yesterdaySubmitted,
      approved: todayApproved - yesterdayApproved,
      rejected: todayRejected - yesterdayRejected,
    },
  };
}

export async function getAnalyticsAggregate(
  days = 7,
  filters?: { platform?: string; contentType?: string; accountId?: string }
) {
  const { current, previous } = getPeriodRange(days);

  // 构建基于内容关联的过滤条件
  const contentFilter: Record<string, unknown> = {};
  if (filters?.platform) contentFilter.platform = filters.platform;
  if (filters?.accountId) contentFilter.accountId = filters.accountId;

  const hasFilter = Object.keys(contentFilter).length > 0;
  let filteredContentIds: string[] | undefined;
  if (hasFilter) {
    filteredContentIds = (
      await prisma.contentVersion.findMany({
        where: contentFilter,
        select: { contentId: true },
        distinct: ['contentId'],
      })
    ).map((v) => v.contentId);
  }

  const [metrics, previousMetrics] = await Promise.all([
    sumAnalyticsMetrics(current, filteredContentIds),
    sumAnalyticsMetrics(previous, filteredContentIds),
  ]);

  const metricDeltas = diffMetrics(metrics, previousMetrics);
  const engagement = engagementRate(metrics);
  const previousEngagement = engagementRate(previousMetrics);

  const topWhere: Record<string, unknown> = {
    collectedAt: { gte: current.gte, lt: current.lt },
  };
  if (filteredContentIds) {
    topWhere.contentId = { in: filteredContentIds };
  }
  const topContents = await prisma.analyticsData.groupBy({
    by: ['contentId'],
    where: topWhere,
    _sum: { views: true, likes: true, comments: true, shares: true },
    orderBy: { _sum: { views: 'desc' } },
    take: 10,
  });

  const contentIds = topContents.map((t) => t.contentId);
  const contentsMap = new Map(
    (
      await prisma.content.findMany({
        where: { id: { in: contentIds } },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          versions: { select: { platform: true } },
        },
      })
    ).map((c) => [c.id, c])
  );

  const top10 = topContents.map((t) => {
    const c = contentsMap.get(t.contentId);
    const views = t._sum.views ?? 0;
    const interactions =
      (t._sum.likes ?? 0) + (t._sum.comments ?? 0) + (t._sum.shares ?? 0);
    const completion =
      views > 0 ? ((interactions / views) * 100).toFixed(1) + '%' : '0%';
    return {
      contentId: t.contentId,
      title: c?.title ?? '未知内容',
      platform: c?.versions?.[0]?.platform ?? 'WECHAT',
      views: views.toLocaleString(),
      interactions: interactions.toLocaleString(),
      completion,
      updatedAt: c?.updatedAt?.toISOString(),
    };
  });

  return {
    periodDays: days,
    metrics,
    previousMetrics,
    deltas: {
      ...metricDeltas,
      engagementRate: engagement - previousEngagement,
    },
    engagementRate: engagement,
    top10,
  };
}
