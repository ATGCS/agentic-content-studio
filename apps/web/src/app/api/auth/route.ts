import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function successResponse(data: any, message = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

function failResponse(code: number | string, message: string, status = 400) {
  return NextResponse.json({ code, message, data: null }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const parsed = loginSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (!user || !(await bcrypt.compare(parsed.password, user.passwordHash))) {
      return failResponse(401, 'invalid credentials', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return successResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return failResponse(err.code, err.message, err.httpStatus);
    }
    console.error('Auth login error:', err);
    return failResponse(50000, 'internal error', 500);
  }
}
