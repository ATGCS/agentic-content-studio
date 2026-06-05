import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError, ErrorCodes, type AuthUser } from '@acs/core';

export function registerAuth(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'unauthorized', 401);
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

export function getUser(request: FastifyRequest): AuthUser {
  return request.user as AuthUser;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}
