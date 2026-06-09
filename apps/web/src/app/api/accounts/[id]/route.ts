import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes } from '@acs/core';
import {
  getAccount,
  upsertProfile,
  getProfileByAccountId,
} from '@acs/account-profile';

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    const { id } = await params;
    const account = await getAccount(id);
    return successResponse(account);
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    const { id } = await params;

    // TODO: Implement reauthorize, sync-works, sync-metrics
    // For now, return a placeholder response
    return NextResponse.json(
      { code: 501, message: 'Not implemented yet', data: null },
      { status: 501 }
    );
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
