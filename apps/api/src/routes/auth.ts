import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'invalid credentials', 401);
    }
    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    return reply.success({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  app.get(
    '/auth/me',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.success(request.user);
    }
  );
}
