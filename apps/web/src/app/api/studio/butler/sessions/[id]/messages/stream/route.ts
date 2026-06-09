import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError, type AuthUser } from '@acs/core';
import type { UserRole } from '@acs/db';
import { handleMessageStream } from '@acs/studio-butler';
import '../../../../../../../../env';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(40100, 'unauthorized', 401);
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser & { role: UserRole };
  } catch {
    throw new AppError(40100, 'unauthorized', 401);
  }
}

const messageBody = z.object({
  content: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    const { id: sessionId } = await params;
    const body = messageBody.parse(await req.json());

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of handleMessageStream(
            user,
            sessionId,
            body.content
          )) {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'internal error';
          controller.enqueue(
            encoder.encode(`${JSON.stringify({ type: 'error', message })}\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'internal error';
    const status = err instanceof AppError ? err.httpStatus : 500;
    return new Response(JSON.stringify({ type: 'error', message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
