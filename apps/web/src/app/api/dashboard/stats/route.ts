import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@acs/db';

function successResponse(data: any, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

export async function GET() {
  try {
    const pendingGenerate = await prisma.content.count({
      where: { status: 'PENDING_GENERATE' },
    });

    const generating = await prisma.content.count({
      where: { status: 'GENERATING' },
    });

    const pendingReview = await prisma.content.count({
      where: { status: 'PENDING_REVIEW' },
    });

    const pendingPublish = await prisma.content.count({
      where: { status: 'PENDING_PUBLISH' },
    });

    const publishedTotal = await prisma.content.count({
      where: { status: 'PUBLISHED' },
    });

    const reviewed = await prisma.content.count({
      where: { status: 'REVIEWED' },
    });

    const stats = {
      pendingGenerate,
      generating,
      pendingReview,
      pendingPublish,
      publishedTotal,
      reviewed,
    };

    return successResponse(stats);
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json(
      {
        code: 50000,
        message: 'internal error',
        data: null,
        detail: err?.message,
      },
      { status: 500 }
    );
  }
}
