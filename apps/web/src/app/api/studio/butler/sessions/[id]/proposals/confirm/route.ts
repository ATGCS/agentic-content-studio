import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError, type AuthUser } from '@acs/core';
import type { UserRole } from '@acs/db';
import { confirmProposal } from '@acs/studio-butler';
import '../../../../../../../../env';

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
  console.error('[butler confirm] unexpected error:', err);
  return NextResponse.json(
    {
      code: 50000,
      message: err instanceof Error ? err.message : 'internal error',
      data: null,
    },
    { status: 500 }
  );
}

const bodySchema = z.object({
  messageId: z.string().min(1),
  decision: z.enum(['confirm', 'reject']),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    const { id: sessionId } = await params;
    const body = bodySchema.parse(await req.json());
    const data = await confirmProposal(
      user,
      sessionId,
      body.messageId,
      body.decision
    );
    return successResponse(data);
  } catch (err) {
    return handleError(err);
  }
}
