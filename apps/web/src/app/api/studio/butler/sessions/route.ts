import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError, type AuthUser } from '@acs/core';
import type { UserRole } from '@acs/db';
import { listSessions, createSession } from '@acs/studio-butler';
import '../../../../../env';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function successResponse(data: unknown, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(40100, 'unauthorized', 401);
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser & { role: UserRole };
  } catch {
    throw new AppError(40100, 'unauthorized', 401);
  }
}

function handleError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { code: err.code, message: err.message, data: null },
      { status: err.httpStatus }
    );
  }
  console.error('[butler sessions] unexpected error:', err);
  return NextResponse.json(
    {
      code: 50000,
      message: err instanceof Error ? err.message : 'internal error',
      data: null,
    },
    { status: 500 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const url = new URL(req.url);
    const topicId = url.searchParams.get('topicId') ?? undefined;
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
    const data = await listSessions(user, { topicId, page, pageSize });
    return successResponse(data);
  } catch (err) {
    return handleError(err);
  }
}

const createBody = z.object({
  topicId: z.string().optional(),
  title: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const body = createBody.parse(await req.json().catch(() => ({})));
    const data = await createSession(user, body);
    return successResponse(data);
  } catch (err) {
    return handleError(err);
  }
}
