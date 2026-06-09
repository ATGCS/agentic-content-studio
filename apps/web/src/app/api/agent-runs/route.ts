import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@acs/db';

function successResponse(data: unknown, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

export async function GET(req: NextRequest) {
  try {
    const contentId =
      new URL(req.url).searchParams.get('contentId') ?? undefined;
    const runs = await prisma.agentRun.findMany({
      where: contentId ? { contentId } : undefined,
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
        },
      },
      orderBy: { startedAt: 'desc' },
      take: contentId ? 20 : 100,
    });
    const data = runs.map((run) => ({
      id: run.id,
      agentType: run.agent.type,
      status: run.status,
      createdAt: run.startedAt.toISOString(),
      agent: run.agent,
      content: run.content,
      version: run.version,
    }));
    return successResponse(data);
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
