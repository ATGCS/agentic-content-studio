import { NextResponse } from 'next/server';
import { getDashboardStats } from '@acs/analytics-center';

function successResponse(data: unknown, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return successResponse(stats);
  } catch (err: unknown) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json(
      {
        code: 50000,
        message: 'internal error',
        data: null,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
