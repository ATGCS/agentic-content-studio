import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@acs/core';
import { orchestrateImageGeneration } from '@acs/ai-runtime';
import type { Platform } from '@acs/db';
import '../../../../../env';

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
      role: string;
    };
  } catch {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
}

const bodySchema = z.object({
  role: z.enum(['COVER', 'BODY']).optional(),
  platform: z.string().optional(),
  versionId: z.string().optional(),
  accountId: z.string().optional(),
  prompt: z.string().optional(),
  sourceMaterialId: z.string().optional(),
  editInstruction: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticate(req);
    const { id } = await params;
    const parsed = bodySchema.parse(await req.json());

    if (parsed.sourceMaterialId && !parsed.editInstruction?.trim()) {
      throw new AppError(
        ErrorCodes.BAD_REQUEST,
        'editInstruction is required when editing',
        400
      );
    }

    const data = await orchestrateImageGeneration(id, {
      role: parsed.role,
      platform: parsed.platform as Platform | undefined,
      versionId: parsed.versionId,
      accountId: parsed.accountId,
      prompt: parsed.prompt,
      sourceMaterialId: parsed.sourceMaterialId,
      editInstruction: parsed.editInstruction,
    });

    return successResponse(data);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    console.error('[contents images generate] unexpected error:', err);
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
