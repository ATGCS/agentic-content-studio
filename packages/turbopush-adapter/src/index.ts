import { prisma, type Platform, type PublishStatus } from '@acs/db';

export interface PlatformAccountDTO {
  id: string;
  platform: Platform;
  accountName: string;
  accountType?: string;
  authStatus: string;
}

export interface PublishInput {
  versionId: string;
  accountId: string;
  platform: Platform;
}

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  externalUrl?: string;
  raw?: unknown;
}

export interface MetricsResult {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  collects?: number;
}

export interface PublishProvider {
  listAccounts(ownerId: string): Promise<PlatformAccountDTO[]>;
  publish(input: PublishInput): Promise<PublishResult>;
  syncMetrics(publishRecordId: string): Promise<MetricsResult>;
}

export class MockPublishProvider implements PublishProvider {
  async listAccounts(ownerId: string): Promise<PlatformAccountDTO[]> {
    return [
      {
        id: 'mock-acc-wechat',
        platform: 'WECHAT',
        accountName: '示例公众号',
        accountType: 'official',
        authStatus: 'authorized',
      },
      {
        id: 'mock-acc-xhs',
        platform: 'XIAOHONGSHU',
        accountName: '示例小红书',
        authStatus: 'authorized',
      },
    ];
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    return {
      success: true,
      externalPostId: `mock-post-${Date.now()}`,
      externalUrl: `https://example.com/p/${input.versionId}`,
      raw: { mock: true },
    };
  }

  async syncMetrics(): Promise<MetricsResult> {
    return {
      views: 1200,
      likes: 86,
      comments: 12,
      shares: 5,
      collects: 30,
    };
  }
}

export function getPublishProvider(): PublishProvider {
  if (process.env.USE_MOCK_TURBOPUSH !== 'false') {
    return new MockPublishProvider();
  }
  return new MockPublishProvider();
}

export async function syncAccountsToDb(
  ownerId: string,
  provider = getPublishProvider()
) {
  const accounts = await provider.listAccounts(ownerId);
  const results = [];
  for (const acc of accounts) {
    const row = await prisma.platformAccount.upsert({
      where: { id: acc.id },
      create: {
        id: acc.id,
        platform: acc.platform,
        accountName: acc.accountName,
        accountType: acc.accountType,
        authStatus: acc.authStatus,
        ownerId,
      },
      update: {
        accountName: acc.accountName,
        authStatus: acc.authStatus,
      },
    });
    results.push(row);
  }
  return results;
}

export async function executePublish(
  taskId: string,
  provider = getPublishProvider()
) {
  const task = await prisma.publishingTask.findUnique({
    where: { id: taskId },
    include: { version: true },
  });
  if (!task) throw new Error('task not found');

  await prisma.publishingTask.update({
    where: { id: taskId },
    data: { status: 'PUBLISHING' },
  });

  const result = await provider.publish({
    versionId: task.versionId,
    accountId: task.accountId,
    platform: task.platform,
  });

  const status: PublishStatus = result.success ? 'SUCCESS' : 'FAILED';

  const record = await prisma.publishRecord.create({
    data: {
      taskId,
      platform: task.platform,
      accountId: task.accountId,
      externalPostId: result.externalPostId,
      externalUrl: result.externalUrl,
      status,
      rawResult: result.raw as object,
    },
  });

  await prisma.publishingTask.update({
    where: { id: taskId },
    data: {
      status,
      publishedAt: result.success ? new Date() : undefined,
      error: result.success ? null : 'publish failed',
    },
  });

  if (result.success) {
    await prisma.contentVersion.update({
      where: { id: task.versionId },
      data: { status: 'PUBLISHED' },
    });
    await prisma.content.update({
      where: { id: task.contentId },
      data: { status: 'PUBLISHED' },
    });
  }

  return { task, record, result };
}
