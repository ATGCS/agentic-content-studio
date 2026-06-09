import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as imaProvider from '@acs/ima-provider';
import {
  authenticate,
  handleRouteError,
  successResponse,
} from '@/lib/ima-route';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticate(req);
    const { id } = await params;
    const data = await imaProvider.getKnowledgeBase(id);
    return successResponse(data);
  } catch (err) {
    return handleRouteError(err);
  }
}

const patchBody = z.object({
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  name: z.string().optional(),
  agentType: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticate(req);
    const { id } = await params;
    const body = patchBody.parse(await req.json());
    const data = await imaProvider.updateKnowledgeBase(id, body);
    return successResponse(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
