import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@acs/core';
import * as materials from '@acs/content-center';

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
    return jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: string;
    };
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
  console.error('[contents id materials] unexpected error:', err);
  return NextResponse.json(
    {
      code: 50000,
      message: err instanceof Error ? err.message : 'internal error',
      data: null,
    },
    { status: 500 }
  );
}

const createMaterialBody = z.object({
  type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']),
  role: z.enum(['COVER', 'BODY', 'ATTACHMENT']).optional(),
  name: z.string().optional(),
  url: z.string().optional(),
  localPath: z.string().optional(),
  source: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    const { id } = await params;
    const data = await materials.listContentMaterials(user, id);
    return successResponse(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    const { id } = await params;
    const body = createMaterialBody.parse(await req.json());
    const data = await materials.createMaterial(user, id, body);
    return successResponse(data);
  } catch (err) {
    return handleError(err);
  }
}
