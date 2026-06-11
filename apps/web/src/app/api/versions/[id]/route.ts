import { NextRequest } from 'next/server';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticateRequest(req);
    const { id } = await params;
    const version = await prisma.contentVersion.findUnique({
      where: { id },
      include: {
        content: true,
        account: true,
      },
    });
    if (!version) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'version not found', 404);
    }
    return successResponse(version);
  } catch (err) {
    console.error('[versions GET]', err);
    return errorResponse(err);
  }
}
