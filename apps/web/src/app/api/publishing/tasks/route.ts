import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createPublishingTask, listPublishingTasks } from '@acs/review-center';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    await authenticateRequest(req);
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const data = await listPublishingTasks({ status });
    return successResponse(data);
  } catch (err) {
    console.error('[publishing tasks GET]', err);
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await authenticateRequest(req);
    const body = z
      .object({
        versionId: z.string(),
        accountId: z.string(),
        scheduledAt: z.string().nullable().optional(),
      })
      .parse(await req.json());
    const data = await createPublishingTask({
      versionId: body.versionId,
      accountId: body.accountId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    });
    return successResponse(data);
  } catch (err) {
    console.error('[publishing tasks POST]', err);
    return errorResponse(err);
  }
}
