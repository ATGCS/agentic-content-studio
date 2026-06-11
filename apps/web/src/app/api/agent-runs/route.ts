import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma, type AgentType, type RunStatus } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function successResponse(data: unknown, message = 'success') {
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
    const params = new URL(req.url).searchParams;
    const contentId = params.get('contentId') ?? undefined;
    const status = params.get('status') as RunStatus | null;
    const agentType = params.get('agentType') as AgentType | null;

    const where: {
      contentId?: string;
      status?: RunStatus;
      agent?: { type: AgentType };
    } = {};
    if (contentId) where.contentId = contentId;
    if (status && status !== ('ALL' as RunStatus)) where.status = status;
    if (agentType && agentType !== ('ALL' as AgentType)) {
      where.agent = { type: agentType };
    }

    const runs = await prisma.agentRun.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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
      status: run.status,
      model: run.model,
      error: run.error,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
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

export async function POST() {
  return NextResponse.json(
    { code: 405, message: 'Method not allowed', data: null },
    { status: 405 }
  );
}
