import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes } from '@acs/core';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function successResponse(data: unknown, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

export async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as { sub?: string; role?: string };
  } catch {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
}

export function handleRouteError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { code: err.code, message: err.message, data: null },
      { status: err.httpStatus }
    );
  }
  console.error('[ima route] unexpected error:', err);
  return NextResponse.json(
    {
      code: 50000,
      message: err instanceof Error ? err.message : 'internal error',
      data: null,
    },
    { status: 500 }
  );
}
