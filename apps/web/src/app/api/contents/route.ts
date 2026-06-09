import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes } from '@acs/core';
import { z } from 'zod';
import * as contents from '@acs/content-center';
import { orchestrateGenerate } from '@acs/ai-runtime';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function successResponse(data: any, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

function failResponse(code: number | string, message: string, status = 400) {
  return NextResponse.json({ code, message, data: null }, { status });
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
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    const data = await contents.listContents(user, query);
    return successResponse(data);
  } catch (err) {
    if (err instanceof AppError) {
      return failResponse(err.code, err.message, err.httpStatus);
    }
    return failResponse(50000, 'internal error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const body = await req.json();
    const schema = z.object({
      title: z.string(),
      topicId: z.string().optional(),
      summary: z.string().optional(),
    });
    const parsed = schema.parse(body);
    const data = await contents.createContent(user, parsed);
    return successResponse(data);
  } catch (err) {
    if (err instanceof AppError) {
      return failResponse(err.code, err.message, err.httpStatus);
    }
    return failResponse(50000, 'internal error', 500);
  }
}
