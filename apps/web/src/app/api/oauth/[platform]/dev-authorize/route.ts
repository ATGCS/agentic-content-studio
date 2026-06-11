import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { devAuthorize, slugToPlatform } from '@acs/account-profile';
import { AppError, ErrorCodes } from '@acs/core';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_DEV_AUTH !== '1'
    ) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'dev auth disabled in production',
        403
      );
    }

    const { platform: platformSlug } = await params;
    const query = z
      .object({
        state: z.string(),
        redirect_uri: z.string().optional(),
      })
      .parse({
        state: req.nextUrl.searchParams.get('state'),
        redirect_uri: req.nextUrl.searchParams.get('redirect_uri') ?? undefined,
      });

    let platform;
    try {
      platform = slugToPlatform(platformSlug);
    } catch {
      throw new AppError(ErrorCodes.NOT_FOUND, 'platform not supported', 404);
    }

    const account = await devAuthorize({
      platform,
      state: query.state,
    });

    const resultUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3001';
    return NextResponse.redirect(
      `${resultUrl}/accounts/bind/result?success=true&accountId=${account.id}&dev=true`
    );
  } catch (err) {
    console.error('[oauth dev-authorize]', err);
    const resultUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3001';
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'dev authorize failed';
    return NextResponse.redirect(
      `${resultUrl}/accounts/bind/result?success=false&error=${encodeURIComponent(message)}`
    );
  }
}
