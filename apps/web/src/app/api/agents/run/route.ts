import '../../../../env';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes } from '@acs/core';
import { runAgent } from '@acs/ai-runtime';

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

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const body = await req.json();

    if (!body.contentId) {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'contentId is required', 400);
    }
    if (!body.agentId && !body.agentType) {
      throw new AppError(
        ErrorCodes.BAD_REQUEST,
        'agentId or agentType is required',
        400
      );
    }

    console.log(
      `[agents/run] 收到请求 agentId=${body.agentId ?? '-'} agentType=${body.agentType ?? '-'} contentId=${body.contentId}`
    );

    const data = await runAgent({
      agentId: body.agentId,
      agentType: body.agentType,
      contentId: body.contentId,
      versionId: body.versionId,
      accountId: body.accountId,
      overrides: body.overrides,
    });

    console.log(
      `[agents/run] 完成 runId=${data?.id ?? '-'} status=${data?.status ?? '-'}`
    );

    return successResponse(data);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    console.error('[agents run] unexpected error:', err);
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
