import { prisma } from '@acs/db';

type ContentStatus =
  | 'DRAFT'
  | 'PENDING_GENERATE'
  | 'GENERATING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PENDING_PUBLISH'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'REVIEWED'
  | 'REJECTED'
  | 'FAILED'
  | 'ARCHIVED';

/** Local calendar day window: [gte, lt) */
export function getDayRange(offsetDays = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - offsetDays);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

export function getPeriodRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days);
  return {
    current: { gte: start, lt: end },
    previous: { gte: previousStart, lt: previousEnd },
  };
}

async function countContentUpdatedInDay(
  statuses: ContentStatus[],
  offsetDays: number
) {
  const { gte, lt } = getDayRange(offsetDays);
  return prisma.content.count({
    where: {
      status: { in: statuses },
      updatedAt: { gte, lt },
    },
  });
}

/** Today vs yesterday activity in each status bucket (by updatedAt). */
export async function countContentDeltaVsYesterday(statuses: ContentStatus[]) {
  const [today, yesterday] = await Promise.all([
    countContentUpdatedInDay(statuses, 0),
    countContentUpdatedInDay(statuses, 1),
  ]);
  return today - yesterday;
}

export type AggregateMetrics = {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalCollects: number;
};

export async function sumAnalyticsMetrics(
  range: { gte: Date; lt: Date },
  contentIds?: string[]
): Promise<AggregateMetrics> {
  const where: Record<string, unknown> = {
    collectedAt: { gte: range.gte, lt: range.lt },
  };
  if (contentIds) {
    where.contentId = { in: contentIds };
  }
  const result = await prisma.analyticsData.aggregate({
    where,
    _sum: {
      views: true,
      likes: true,
      comments: true,
      shares: true,
      collects: true,
    },
  });
  return {
    totalViews: result._sum.views ?? 0,
    totalLikes: result._sum.likes ?? 0,
    totalComments: result._sum.comments ?? 0,
    totalShares: result._sum.shares ?? 0,
    totalCollects: result._sum.collects ?? 0,
  };
}

export function diffMetrics(
  current: AggregateMetrics,
  previous: AggregateMetrics
): Record<keyof AggregateMetrics, number> {
  return {
    totalViews: current.totalViews - previous.totalViews,
    totalLikes: current.totalLikes - previous.totalLikes,
    totalComments: current.totalComments - previous.totalComments,
    totalShares: current.totalShares - previous.totalShares,
    totalCollects: current.totalCollects - previous.totalCollects,
  };
}

export function engagementRate(metrics: AggregateMetrics): number {
  if (metrics.totalViews <= 0) return 0;
  const interactions =
    metrics.totalLikes + metrics.totalComments + metrics.totalShares;
  return (interactions / metrics.totalViews) * 100;
}
