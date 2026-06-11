import { NextRequest } from 'next/server';
import { cancelPublishingTask } from '@acs/review-center';
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
    const data = await cancelPublishingTask(id);
    return successResponse(data);
  } catch (err) {
    console.error('[publishing cancel]', err);
    return errorResponse(err);
  }
}
