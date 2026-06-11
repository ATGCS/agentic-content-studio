import { NextRequest } from 'next/server';
import { prisma } from '@acs/db';
import type { ContentStatus, Platform } from '@prisma/client';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    await authenticateRequest(req);
    const platform = req.nextUrl.searchParams.get('platform') ?? undefined;

    const where = platform
      ? {
          platform: platform as Platform,
          status: {
            in: ['DRAFT', 'APPROVED', 'PENDING_PUBLISH'] as ContentStatus[],
          },
        }
      : {
          status: { in: ['APPROVED', 'PENDING_PUBLISH'] as ContentStatus[] },
        };

    const packages = await prisma.contentVersion.findMany({
      where,
      include: {
        content: { select: { id: true, title: true } },
        account: { select: { id: true, accountName: true } },
        publishingTasks: {
          select: { id: true, status: true, scheduledAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return successResponse(
      packages.map((p) => ({
        id: p.id,
        title: p.title ?? p.content.title,
        project: p.content.title,
        platform: p.platform,
        account: p.account?.accountName ?? '未选择账号',
        status:
          p.status === 'PUBLISHED'
            ? 'published'
            : p.status === 'PENDING_PUBLISH'
              ? 'generated'
              : p.status === 'APPROVED'
                ? 'approved'
                : 'draft',
        time: p.updatedAt.toISOString(),
        hasPublishingTask: p.publishingTasks.length > 0,
      }))
    );
  } catch (err) {
    console.error('[publishing packages GET]', err);
    return errorResponse(err);
  }
}
