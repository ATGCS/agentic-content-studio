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

/** 允许 dev 种子账号如 admin@acs.local（Zod .email() 会拒绝 .local） */
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, '请输入邮箱')
    .refine((v) => /^[^\s@]+@[^\s@]+$/.test(v), '邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});

async function parseLoginBody(req: NextRequest): Promise<unknown> {
  const contentType = req.headers.get('content-type') ?? '';
  const raw = (await req.text()).replace(/^\uFEFF/, '').trim();

  if (!raw) {
    throw new AppError(ErrorCodes.BAD_REQUEST, '请求体为空', 400);
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw);
    return {
      email: params.get('email') ?? params.get('username') ?? '',
      password: params.get('password') ?? '',
    };
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AppError(ErrorCodes.BAD_REQUEST, 'JSON 格式无效', 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseLoginBody(req);

    const parsed = loginSchema.parse(body);
    const email = parsed.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
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
    if (err instanceof z.ZodError) {
      const message = err.errors[0]?.message ?? '请求参数无效';
      return failResponse(40001, message, 400);
    }
    if (err instanceof AppError) {
      return failResponse(err.code, err.message, err.httpStatus);
    }
    console.error('Auth login error:', err);
    return failResponse(50000, 'internal error', 500);
  }
}
