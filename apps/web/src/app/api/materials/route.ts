import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as materials from '@acs/content-center';
import {
  authenticateAuthUser,
  errorResponse,
  successResponse,
} from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateAuthUser(req);
    const url = new URL(req.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    const data = await materials.listMaterials(user, query);
    return successResponse(data);
  } catch (err) {
    console.error('[materials GET]', err);
    return errorResponse(err);
  }
}

const createBodySchema = z.object({
  contentId: z.string(),
  type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']),
  role: z.enum(['COVER', 'BODY', 'ATTACHMENT']).optional(),
  name: z.string().optional(),
  url: z.string().optional(),
  localPath: z.string().optional(),
  source: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateAuthUser(req);
    const body = createBodySchema.parse(await req.json());
    const data = await materials.createMaterial(user, body.contentId, {
      type: body.type,
      role: body.role,
      name: body.name,
      url: body.url,
      localPath: body.localPath,
      source: body.source,
      meta: body.meta,
    });
    return successResponse(data, 'created');
  } catch (err) {
    console.error('[materials POST]', err);
    return errorResponse(err);
  }
}
