import { NextRequest } from 'next/server';
import { executePublish } from '@acs/turbopush-adapter';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticateRequest(req);
    const { id } = await params;
    const data = await executePublish(id);
    return successResponse(data);
  } catch (err) {
    console.error('[publishing publish]', err);
    return errorResponse(err);
  }
}
