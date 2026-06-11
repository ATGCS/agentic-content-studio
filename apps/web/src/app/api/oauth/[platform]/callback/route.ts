import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  completeOAuthCallback,
  oauthPublicBase,
  slugToPlatform,
} from '@acs/account-profile';
import { AppError, ErrorCodes } from '@acs/core';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformSlug } = await params;
    const query = z
      .object({
        code: z.string(),
        state: z.string(),
      })
      .parse({
        code: req.nextUrl.searchParams.get('code'),
        state: req.nextUrl.searchParams.get('state'),
      });

    let platform;
    try {
      platform = slugToPlatform(platformSlug);
    } catch {
      throw new AppError(ErrorCodes.NOT_FOUND, 'platform not supported', 404);
    }

    const callbackBase = oauthPublicBase();
    const redirectUri = `${callbackBase}/api/oauth/${platformSlug}/callback`;

    const account = await completeOAuthCallback({
      platform,
      code: query.code,
      state: query.state,
      redirectUri,
    });

    const resultUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3001';
    return NextResponse.redirect(
      `${resultUrl}/accounts/bind/result?success=true&accountId=${account.id}`
    );
  } catch (err) {
    console.error('[oauth callback]', err);
    const resultUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3001';
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'oauth callback failed';
    return NextResponse.redirect(
      `${resultUrl}/accounts/bind/result?success=false&error=${encodeURIComponent(message)}`
    );
  }
}
