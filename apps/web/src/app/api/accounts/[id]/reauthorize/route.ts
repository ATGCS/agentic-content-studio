import { NextRequest } from 'next/server';
import { getAccount, startBind } from '@acs/account-profile';
import { AppError, ErrorCodes } from '@acs/core';
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
    const { id } = await params;
    const account = await getAccount(id);
    if (user.role === 'OPERATOR' && account.ownerId !== user.id) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
    }
    const result = await startBind({
      platform: account.platform,
      ownerId: user.id,
      accountId: id,
    });
    return successResponse(result);
  } catch (err) {
    console.error('[accounts reauthorize]', err);
    return errorResponse(err);
  }
}
