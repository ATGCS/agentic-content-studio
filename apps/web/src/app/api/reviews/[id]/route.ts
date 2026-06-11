import { NextRequest } from 'next/server';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticateRequest(req);
    const { id } = await params;
    const review = await prisma.reviewTask.findUnique({
      where: { id },
      include: {
        content: {
          include: {
            topic: { select: { title: true } },
            materials: { orderBy: { createdAt: 'desc' } },
          },
        },
        version: {
          include: {
            account: { select: { accountName: true, platform: true } },
          },
        },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!review) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'review not found', 404);
    }

    return successResponse({
      id: review.id,
      status: review.status,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewedAt: review.reviewedAt,
      contentId: review.contentId,
      reviewer: review.reviewer,
      content: {
        id: review.content.id,
        title: review.content.title,
        summary: review.content.summary,
        body: review.content.body,
        coverText: review.content.coverText,
        topic: review.content.topic,
        materials: review.content.materials,
      },
      version: review.version
        ? {
            id: review.version.id,
            platform: review.version.platform,
            title: review.version.title,
            body: review.version.body,
            coverText: review.version.coverText,
            tags: review.version.tags,
            status: review.version.status,
            formatConfig: review.version.formatConfig,
            account: review.version.account,
          }
        : null,
    });
  } catch (err) {
    console.error('[reviews id GET]', err);
    return errorResponse(err);
  }
}
