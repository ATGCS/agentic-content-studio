import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as topics from '@acs/content-center';
import { getUser } from '../plugins/auth.js';

export async function topicRoutes(app: FastifyInstance) {
  app.get(
    '/topics',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const q = request.query as Record<string, string>;
      return reply.success(await topics.listTopics(getUser(request), q));
    }
  );

  app.post(
    '/topics',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          title: z.string(),
          description: z.string().optional(),
          targetPlatforms: z.array(z.string()).optional(),
          source: z.string().optional(),
        })
        .parse(request.body);
      return reply.success(await topics.createTopic(getUser(request), body));
    }
  );

  app.get(
    '/topics/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await topics.getTopic(id));
    }
  );

  app.patch(
    '/topics/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      return reply.success(
        await topics.updateTopic(
          getUser(request),
          id,
          body as Parameters<typeof topics.updateTopic>[2]
        )
      );
    }
  );

  app.delete(
    '/topics/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await topics.deleteTopic(getUser(request), id);
      return reply.success(null);
    }
  );
}
