import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes } from '@acs/core';
import { upsertProfile, getProfileByAccountId } from '@acs/account-profile';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function successResponse(data: any, message = 'success') {
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
    const user = await authenticate(req);
    const url = new URL(req.url);
    const accountId = url.searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { code: 400, message: 'accountId is required', data: null },
        { status: 400 }
      );
    }

    const profile = await getProfileByAccountId(accountId);
    return successResponse(profile || {});
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      { code: 50000, message: 'internal error', data: null },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);
    const accountId = path[path.length - 1];

    const body = await req.json();
    const profile = await upsertProfile(user, accountId, body);
    return successResponse(profile);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      { code: 50000, message: 'internal error', data: null },
      { status: 500 }
    );
  }
}
