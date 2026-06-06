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
  const [
    pendingGenerate,
    generating,
    pendingReview,
    pendingPublish,
    publishedTotal,
    reviewed,
  ] = await Promise.all([
    prisma.content.count({
      where: { status: { in: ['DRAFT', 'PENDING_GENERATE'] } },
    }),
    prisma.content.count({ where: { status: 'GENERATING' } }),
    prisma.content.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.content.count({
      where: { status: { in: ['APPROVED', 'PENDING_PUBLISH'] } },
    }),
    prisma.content.count({
      where: { status: { in: ['PUBLISHED', 'PUBLISHING'] } },
    }),
    prisma.content.count({ where: { status: 'REVIEWED' } }),
  ]);
  return {
    pendingGenerate,
    generating,
    pendingReview,
    pendingPublish,
    publishedTotal,
    reviewed,
  };
}
