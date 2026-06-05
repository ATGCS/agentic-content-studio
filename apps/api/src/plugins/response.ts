import type { FastifyInstance, FastifyReply } from 'fastify';
import { AppError, fail, success } from '@acs/core';

export function registerResponseHelpers(app: FastifyInstance) {
  app.decorateReply(
    'success',
    function (this: FastifyReply, data: unknown, message = 'success') {
      return this.send(success(data, message));
    }
  );

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.httpStatus).send(fail(err.code, err.message));
    }
    app.log.error(err);
    return reply
      .status(500)
      .send(fail(50000, err instanceof Error ? err.message : 'internal error'));
  });
}

declare module 'fastify' {
  interface FastifyReply {
    success(data: unknown, message?: string): FastifyReply;
  }
}
