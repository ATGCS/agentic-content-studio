import { NextRequest } from 'next/server';
import { syncWorks } from '@acs/account-profile';
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
    const works = await syncWorks(id);
    return successResponse({ works });
  } catch (err) {
    console.error('[accounts sync-works]', err);
    return errorResponse(err);
  }
}
