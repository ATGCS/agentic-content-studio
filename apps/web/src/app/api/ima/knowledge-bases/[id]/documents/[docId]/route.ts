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
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await authenticate(req);
    const { id, docId } = await params;
    const data = await imaProvider.getDocument(id, docId);
    return successResponse(data);
  } catch (err) {
    return handleRouteError(err);
  }
}

const patchBody = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await authenticate(req);
    const { id, docId } = await params;
    const body = patchBody.parse(await req.json());
    const data = await imaProvider.updateDocument(id, docId, body);
    return successResponse(data);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await authenticate(req);
    const { id, docId } = await params;
    await imaProvider.deleteDocument(id, docId);
    return successResponse({ deleted: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
