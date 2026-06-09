import { NextRequest } from 'next/server';
import * as imaProvider from '@acs/ima-provider';
import {
  authenticate,
  handleRouteError,
  successResponse,
} from '@/lib/ima-route';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticate(req);
    const { id } = await params;
    const kb = await imaProvider.getKnowledgeBase(id);
    if (kb.source === 'local') {
      return successResponse({ count: 0, skipped: true, reason: 'local' });
    }
    const count = await imaProvider.syncDocumentsForKnowledgeBase(kb);
    return successResponse({ count, knowledgeBaseId: id });
  } catch (err) {
    return handleRouteError(err);
  }
}
