import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as imaProvider from '@acs/ima-provider';
import {
  authenticate,
  handleRouteError,
  successResponse,
} from '@/lib/ima-route';

const bodySchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    await authenticate(req);
    const body = bodySchema.parse(await req.json());
    const deleted = await imaProvider.deleteKnowledgeBases(body.ids);
    return successResponse({ deleted, count: deleted.count });
  } catch (err) {
    return handleRouteError(err);
  }
}
