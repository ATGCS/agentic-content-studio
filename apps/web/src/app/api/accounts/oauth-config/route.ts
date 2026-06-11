import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getOAuthConfig,
  publicOAuthConfig,
  saveOAuthConfig,
} from '@acs/account-profile';
import { requireRoles } from '@acs/core';
import {
  authenticateAuthUser,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    await authenticateAuthUser(req);
    const config = await getOAuthConfig();
    return successResponse(publicOAuthConfig(config));
  } catch (err) {
    console.error('[accounts oauth-config GET]', err);
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateAuthUser(req);
    requireRoles(user, 'ADMIN');
    const body = z
      .object({
        wechat: z
          .object({ appId: z.string(), appSecret: z.string() })
          .optional(),
        douyin: z
          .object({ clientKey: z.string(), clientSecret: z.string() })
          .optional(),
        kuaishou: z
          .object({ appId: z.string(), appSecret: z.string() })
          .optional(),
        bilibili: z
          .object({ appId: z.string(), appSecret: z.string() })
          .optional(),
      })
      .parse(await req.json());
    const saved = await saveOAuthConfig(body);
    return successResponse(publicOAuthConfig(saved));
  } catch (err) {
    console.error('[accounts oauth-config PUT]', err);
    return errorResponse(err);
  }
}
