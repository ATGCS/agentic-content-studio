import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes } from '@acs/core';
import { upsertProfile } from '@acs/account-profile';

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
  return NextResponse.json(
    { code: 50000, message: 'internal error', data: null },
    { status: 500 }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    const { id } = await params;
    const body = await req.json();

    // 前端字段名到后端字段名的映射
    const mappedData: Record<string, unknown> = {};
    if (body.positioning !== undefined)
      mappedData.positioning = body.positioning;
    if (body.contentStyle !== undefined)
      mappedData.contentStyle = body.contentStyle;
    if (body.titlePreference !== undefined)
      mappedData.titlePreference = body.titlePreference;
    if (body.coverPreference !== undefined)
      mappedData.coverPreference = body.coverPreference;
    if (body.tone !== undefined) mappedData.tone = body.tone;
    if (body.contentBoundary !== undefined)
      mappedData.contentBoundary = body.contentBoundary;
    if (body.publishStrategy !== undefined)
      mappedData.publishStrategy = body.publishStrategy;

    // targetAudience: 前端发送字符串，后端期望对象
    if (body.targetAudience !== undefined) {
      mappedData.targetAudience =
        typeof body.targetAudience === 'string'
          ? { description: body.targetAudience }
          : body.targetAudience;
    }

    // forbiddenExpressions(字符串) → forbiddenWords(字符串数组)
    if (body.forbiddenExpressions !== undefined) {
      mappedData.forbiddenWords =
        typeof body.forbiddenExpressions === 'string'
          ? body.forbiddenExpressions
              .split(/[,，、\n]/)
              .map((s: string) => s.trim())
              .filter(Boolean)
          : body.forbiddenExpressions;
    }

    const profile = await upsertProfile(user, id, mappedData);
    return successResponse(profile);
  } catch (err) {
    return handleError(err);
  }
}
