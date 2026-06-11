import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes, type AuthUser } from '@acs/core';
import type { UserRole } from '@acs/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as {
    id?: string;
    sub?: string;
    email?: string;
    name?: string;
    role?: UserRole;
  };
}

export async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const id = payload.id ?? payload.sub;
    if (!id) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
    }
    return { sub: id, role: payload.role };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
}

export async function authenticateAuthUser(
  req: NextRequest
): Promise<AuthUser> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const id = payload.id ?? payload.sub;
    if (!id) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
    }
    return {
      id,
      email: payload.email ?? '',
      name: payload.name ?? '',
      role: payload.role ?? 'OPERATOR',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
}

export function successResponse(data: unknown, message = 'success') {
  return Response.json({ code: 0, message, data });
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return Response.json(
      { code: err.code, message: err.message, data: null },
      { status: err.httpStatus }
    );
  }
  return Response.json(
    {
      code: 50000,
      message: err instanceof Error ? err.message : 'internal error',
      data: null,
    },
    { status: 500 }
  );
}
