import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function successResponse(data: any, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
}

export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.reviewTask.count(),
      prisma.reviewTask.count({ where: { status: 'PENDING' } }),
      prisma.reviewTask.count({ where: { status: 'APPROVED' } }),
      prisma.reviewTask.count({ where: { status: 'REJECTED' } }),
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

    const data = { total, pending, approved, rejected, platformDistribution };
    return successResponse(data);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    console.error('[reviews stats] unexpected error:', err);
    return NextResponse.json(
      {
        code: 50000,
        message: err instanceof Error ? err.message : 'internal error',
        data: null,
      },
      { status: 500 }
    );
  }
}
