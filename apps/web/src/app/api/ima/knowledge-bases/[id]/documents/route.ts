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
    const url = new URL(req.url);
    const search = url.searchParams.get('search') ?? undefined;
    const source = url.searchParams.get('source') ?? undefined;
    const data = await imaProvider.listDocuments(id, { search, source });
    return successResponse(data);
  } catch (err) {
    return handleRouteError(err);
  }
}

const createBody = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  summary: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authenticate(req);
    const { id } = await params;
    const body = createBody.parse(await req.json());
    const data = await imaProvider.createDocument(id, body);
    return successResponse(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
