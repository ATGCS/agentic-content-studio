import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes } from '@acs/core';
import * as imaProvider from '@acs/ima-provider';

// IMA API route handler for /api/ima/*
// Supports: GET /config, GET /knowledge-bases, POST /knowledge-bases/sync, POST /search, PATCH /knowledge-bases/:id

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function successResponse(data: any, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
  }
}

function parsePath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const url = new URL(req.url);
    const path = parsePath(url.pathname.replace(/^\/api\/ima(?:\/)?/, ''));

    // GET /api/ima/config
    if (path.length === 1 && path[0] === 'config') {
      const config = await imaProvider.getImaConfig();
      return successResponse(imaProvider.publicImaConfig(config));
    }

    // GET /api/ima/knowledge-bases
    if (path.length === 1 && path[0] === 'knowledge-bases') {
      const enabledOnly = url.searchParams.get('enabledOnly');
      const kbs = await imaProvider.listKnowledgeBases({
        enabledOnly: enabledOnly === 'true',
      });
      return successResponse(kbs);
    }

    return NextResponse.json(
      { code: 404, message: 'Not found', data: null },
      { status: 404 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      { code: 50000, message: 'internal error', data: null },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const url = new URL(req.url);
    const path = parsePath(url.pathname.replace(/^\/api\/ima(?:\/)?/, ''));

    // PUT /api/ima/config
    if (path.length === 1 && path[0] === 'config') {
      const body = await req.json();
      const saved = await imaProvider.saveImaConfig({
        clientId: body.clientId,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
      });
      return successResponse(imaProvider.publicImaConfig(saved));
    }

    return NextResponse.json(
      { code: 405, message: 'Method not allowed', data: null },
      { status: 405 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      { code: 50000, message: 'internal error', data: null },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const url = new URL(req.url);
    const path = parsePath(url.pathname.replace(/^\/api\/ima(?:\/)?/, ''));

    // POST /api/ima/knowledge-bases/sync
    if (
      path.length === 2 &&
      path[0] === 'knowledge-bases' &&
      path[1] === 'sync'
    ) {
      const synced = await imaProvider.syncKnowledgeBasesFromIma();
      return successResponse({ synced, count: synced.length });
    }

    // POST /api/ima/search
    if (path.length === 1 && path[0] === 'search') {
      const body = await req.json();
      const results = await imaProvider.searchAndLog(
        body.contentId,
        body.query,
        {
          limit: body.limit,
          knowledgeBaseId: body.knowledgeBaseId,
        }
      );
      return successResponse(results);
    }

    return NextResponse.json(
      { code: 405, message: 'Method not allowed', data: null },
      { status: 405 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      { code: 50000, message: 'internal error', data: null },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const url = new URL(req.url);
    const path = parsePath(url.pathname.replace(/^\/api\/ima(?:\/)?/, ''));

    // PATCH /api/ima/knowledge-bases/:id
    if (path.length === 2 && path[0] === 'knowledge-bases') {
      const id = path[1];
      const body = await req.json();
      const updated = await imaProvider.updateKnowledgeBase(id, {
        enabled: body.enabled,
        isDefault: body.isDefault,
        name: body.name,
        agentType: body.agentType,
      });
      return successResponse(updated);
    }

    return NextResponse.json(
      { code: 405, message: 'Method not allowed', data: null },
      { status: 405 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { code: err.code, message: err.message, data: null },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      { code: 50000, message: 'internal error', data: null },
      { status: 500 }
    );
  }
}
