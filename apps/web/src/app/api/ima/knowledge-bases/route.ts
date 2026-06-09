import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as imaProvider from '@acs/ima-provider';
import {
  authenticate,
  handleRouteError,
  successResponse,
} from '@/lib/ima-route';

export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    const url = new URL(req.url);
    const enabledOnly = url.searchParams.get('enabledOnly');
    const kbs = await imaProvider.listKnowledgeBases({
      enabledOnly: enabledOnly === 'true',
    });
    return successResponse(kbs);
  } catch (err) {
    return handleRouteError(err);
  }
}

const createBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  agentType: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await authenticate(req);
    const body = createBody.parse(await req.json());
    const data = await imaProvider.createLocalKnowledgeBase(body);
    return successResponse(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
