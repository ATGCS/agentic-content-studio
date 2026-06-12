import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@acs/core';
import * as topics from '@acs/content-center';

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
    return jwt.verify(token, JWT_SECRET) as { id: string; role: string };
  } catch {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
}

function handleError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { code: err.code, message: err.message, data: null },
      { status: err.httpStatus }
    );
  }
  console.error('[topics outline] unexpected error:', err);
  return NextResponse.json(
    {
      code: 50000,
      message: err instanceof Error ? err.message : 'internal error',
      data: null,
    },
    { status: 500 }
  );
}

const outlineArticleSchema = z.object({
  order: z.number(),
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()).optional(),
});

const updateOutlineBody = z.object({
  summary: z.string(),
  articles: z.array(outlineArticleSchema),
  targetPlatforms: z.array(z.string()).optional(),
  plannedAt: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    const { id } = await params;
    const body = updateOutlineBody.parse(await req.json());
    const data = await topics.updateTopicOutline(user, id, body);
    return successResponse(data);
  } catch (err) {
    return handleError(err);
  }
}
