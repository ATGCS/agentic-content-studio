import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@acs/db';

function successResponse(data: any, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

export async function GET() {
  try {
    const runs = await prisma.agentRun.findMany({
      include: {
        agent: { select: { id: true, name: true, type: true } },
        content: { select: { id: true, title: true, summary: true } },
        version: {
          select: {
            id: true,
            platform: true,
            account: {
              select: { id: true, accountName: true, platform: true },
            },
          },
          where: { accountId: { not: null } },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    return successResponse(runs);
  } catch (err) {
    console.error('List agent runs error:', err);
    return NextResponse.json(
      { code: 50000, message: 'internal error', data: null },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { code: 405, message: 'Method not allowed', data: null },
    { status: 405 }
  );
}
