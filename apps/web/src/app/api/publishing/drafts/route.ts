import { NextRequest } from 'next/server';
import { prisma } from '@acs/db';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    await authenticateRequest(req);
    const drafts = await prisma.contentVersion.findMany({
      where: { platform: 'WECHAT', status: 'DRAFT' },
      include: {
        content: { select: { id: true, title: true, topicId: true } },
        account: { select: { id: true, accountName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return successResponse(
      drafts.map((d) => ({
        id: d.id,
        title: d.title ?? d.content.title,
        project: d.content.title,
        account: d.account?.accountName ?? '未绑定账号',
        syncedAt: d.updatedAt.toISOString(),
        status: d.status === 'DRAFT' ? 'synced' : 'syncing',
        contentId: d.content.id,
      }))
    );
  } catch (err) {
    console.error('[publishing drafts GET]', err);
    return errorResponse(err);
  }
}
