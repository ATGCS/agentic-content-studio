import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as materials from '@acs/content-center';
import { getUser } from '../plugins/auth.js';

const materialTypeSchema = z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']);
const materialRoleSchema = z.enum(['COVER', 'BODY', 'ATTACHMENT']);

const createMaterialBody = z.object({
  type: materialTypeSchema,
  role: materialRoleSchema.optional(),
  name: z.string().optional(),
  url: z.string().optional(),
  localPath: z.string().optional(),
  source: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export async function materialRoutes(app: FastifyInstance) {
  app.get(
    '/materials/stats',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.success(await materials.getMaterialStats(getUser(request)));
    }
  );

  app.get(
    '/materials',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.success(
        await materials.listMaterials(
          getUser(request),
          request.query as Record<string, string>
        )
      );
    }
  );

  app.post(
    '/materials',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = createMaterialBody
        .extend({ contentId: z.string() })
        .parse(request.body);
      const { contentId, ...data } = body;
      return reply.success(
        await materials.createMaterial(getUser(request), contentId, data)
      );
    }
  );

  app.get(
    '/materials/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await materials.getMaterial(getUser(request), id));
    }
  );

  app.patch(
    '/materials/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = createMaterialBody.partial().parse(request.body);
      return reply.success(
        await materials.updateMaterial(getUser(request), id, body)
      );
    }
  );

  app.delete(
    '/materials/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await materials.deleteMaterial(getUser(request), id);
      return reply.success({ deleted: true });
    }
  );
}

export function registerContentMaterialRoutes(app: FastifyInstance) {
  app.get(
    '/contents/:id/materials',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(
        await materials.listContentMaterials(getUser(request), id)
      );
    }
  );

  app.post(
    '/contents/:id/materials',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = createMaterialBody.parse(request.body);
      return reply.success(
        await materials.createMaterial(getUser(request), id, body)
      );
    }
  );
}
