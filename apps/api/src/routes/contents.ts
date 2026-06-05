import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as contents from '@acs/content-center';
import { orchestrateGenerate } from '@acs/ai-runtime';
import type { Platform } from '@acs/db';
import { getUser } from '../plugins/auth.js';

export async function contentRoutes(app: FastifyInstance) {
  app.get(
    '/contents',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.success(
        await contents.listContents(
          getUser(request),
          request.query as Record<string, string>
        )
      );
    }
  );

  app.post(
    '/contents',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          title: z.string(),
          topicId: z.string().optional(),
          summary: z.string().optional(),
        })
        .parse(request.body);
      return reply.success(
        await contents.createContent(getUser(request), body)
      );
    }
  );

  app.get(
    '/contents/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await contents.getContent(id));
    }
  );

  app.patch(
    '/contents/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(
        await contents.updateContent(
          id,
          request.body as Parameters<typeof contents.updateContent>[1]
        )
      );
    }
  );

  app.post(
    '/contents/:id/generate',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({
          accountId: z.string().optional(),
          platforms: z.array(z.string()).optional(),
        })
        .parse(request.body ?? {});
      const platforms = (body.platforms ?? ['XIAOHONGSHU']) as Platform[];
      const versions = await orchestrateGenerate(id, body.accountId, platforms);
      return reply.success({ versions });
    }
  );

  app.get(
    '/contents/:id/versions',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await contents.listVersions(id));
    }
  );

  app.post(
    '/contents/:id/versions/generate',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({
          platforms: z.array(z.string()),
          accountIds: z.array(z.string()).optional(),
        })
        .parse(request.body);
      return reply.success(
        await contents.generateVersions(
          id,
          body.platforms as Platform[],
          body.accountIds
        )
      );
    }
  );
}
