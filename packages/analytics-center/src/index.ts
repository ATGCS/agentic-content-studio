import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { getPublishProvider } from '@acs/turbopush-adapter';
import { runAgentByType } from '@acs/ai-runtime';

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

export async function getDashboardStats() {
  const [pendingReview, pendingPublish, publishedWeek] = await Promise.all([
    prisma.reviewTask.count({ where: { status: 'PENDING' } }),
    prisma.publishingTask.count({ where: { status: 'PENDING' } }),
    prisma.publishRecord.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: 'SUCCESS',
      },
    }),
  ]);
  const pendingGenerate = await prisma.content.count({
    where: { status: { in: ['DRAFT', 'PENDING_GENERATE'] } },
  });
  return { pendingGenerate, pendingReview, pendingPublish, publishedWeek };
}
