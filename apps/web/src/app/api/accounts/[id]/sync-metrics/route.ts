import { NextRequest } from 'next/server';
import { z } from 'zod';
import { syncMetricsForAccount } from '@acs/account-profile';
import { requireRoles } from '@acs/core';
import {
  authenticateAuthUser,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateAuthUser(req);
    requireRoles(user, 'ADMIN', 'OPERATOR');
    const { id } = await params;
    const body = z
      .object({
        workIds: z.array(z.string()).optional(),
      })
      .optional()
      .parse(await req.json().catch(() => undefined));
    const result = await syncMetricsForAccount(id, body?.workIds);
    return successResponse(result);
  } catch (err) {
    console.error('[accounts sync-metrics]', err);
    return errorResponse(err);
  }
}
