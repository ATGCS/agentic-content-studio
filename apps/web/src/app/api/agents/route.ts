import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@acs/db';
import { AppError } from '@acs/core';

function successResponse(data: any, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        prompt: { select: { id: true, name: true, template: true } },
      },
    });
    return successResponse(agents);
  } catch (err: any) {
    console.error('List agents error:', err);
    return NextResponse.json(
      {
        code: 50000,
        message: 'internal error',
        data: null,
        detail: err?.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { code: 405, message: 'Method not allowed', data: null },
    { status: 405 }
  );
}
