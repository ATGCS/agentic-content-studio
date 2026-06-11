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

/**
 * 模拟发布提供者 — 用于开发/演示环境
 * 生产环境请替换为真实的 turbopush 或平台发布 API
 */
class StubPublishProvider implements PublishProvider {
  async listAccounts(ownerId: string): Promise<PlatformAccountDTO[]> {
    const rows = await prisma.platformAccount.findMany({
      where: { ownerId, authStatus: 'active' },
      select: {
        id: true,
        platform: true,
        accountName: true,
        accountType: true,
        authStatus: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      platform: r.platform,
      accountName: r.accountName,
      accountType: r.accountType ?? undefined,
      authStatus: r.authStatus,
    }));
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    // 模拟发布：生成一个模拟的外部帖子 ID 和 URL
    const version = await prisma.contentVersion.findUnique({
      where: { id: input.versionId },
      include: { content: true },
    });
    const mockId = `stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      externalPostId: mockId,
      externalUrl: `https://stub.${input.platform.toLowerCase()}.example.com/post/${mockId}`,
      raw: {
        stub: true,
        title: version?.title ?? version?.content?.title ?? '',
        publishedAt: new Date().toISOString(),
        message: '模拟发布成功，请集成真实发布 API 以实际发布到平台',
      },
    };
  }

  async syncMetrics(_publishRecordId: string): Promise<MetricsResult> {
    // 模拟指标数据
    return {
      views: Math.floor(Math.random() * 1000),
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 20),
      shares: Math.floor(Math.random() * 10),
    };
  }
}

let _provider: PublishProvider | null = null;

export function getPublishProvider(): PublishProvider {
  if (!_provider) {
    _provider = new StubPublishProvider();
  }
  return _provider;
}

export function setPublishProvider(provider: PublishProvider): void {
  _provider = provider;
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
