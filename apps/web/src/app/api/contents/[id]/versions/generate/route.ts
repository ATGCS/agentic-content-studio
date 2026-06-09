import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@acs/core';
import { generateVersions } from '@acs/content-center';
import type { Platform } from '@acs/db';

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticate(req);
    const { id } = await params;
    const body = await req.json();
    const schema = z.object({
      platforms: z.array(z.string()),
      accountIds: z.array(z.string()).optional(),
    });
    const parsed = schema.parse(body);
    const data = await generateVersions(
      id,
      parsed.platforms as Platform[],
      parsed.accountIds
    );
    return successResponse(data);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    console.error('[contents versions generate] unexpected error:', err);
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
