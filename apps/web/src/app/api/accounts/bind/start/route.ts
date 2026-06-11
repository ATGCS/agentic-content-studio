import { NextRequest } from 'next/server';
import { z } from 'zod';
import { startBind } from '@acs/account-profile';
import type { Platform } from '@acs/db';
import { platformSchema } from '@/lib/account-route';
import {
  authenticateAuthUser,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateAuthUser(req);
    const body = z
      .object({
        platform: platformSchema,
        redirectAfterBind: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        accountId: z.string().optional(),
      })
      .parse(await req.json());

    const result = await startBind({
      platform: body.platform as Platform,
      ownerId: user.id,
      redirectAfterBind: body.redirectAfterBind,
      scopes: body.scopes,
      accountId: body.accountId,
    });
    return successResponse(result);
  } catch (err) {
    console.error('[accounts bind/start]', err);
    return errorResponse(err);
  }
}
