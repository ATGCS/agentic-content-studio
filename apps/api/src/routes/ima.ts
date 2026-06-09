import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRoles } from '@acs/core';
import {
  getImaConfig,
  saveImaConfig,
  publicImaConfig,
  searchAndLog,
  listKnowledgeBases,
  syncAllFromIma,
  updateKnowledgeBase,
  deleteKnowledgeBases,
} from '@acs/ima-provider';
import { getUser } from '../plugins/auth.js';

export async function imaRoutes(app: FastifyInstance) {
  app.get(
    '/ima/config',
    { onRequest: [app.authenticate] },
    async (_request, reply) => {
      const config = await getImaConfig();
      return reply.success(publicImaConfig(config));
    }
  );

  app.put(
    '/ima/config',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN');
      const body = z
        .object({
          clientId: z.string().optional(),
          apiKey: z.string().optional(),
          baseUrl: z.string().optional(),
        })
        .parse(request.body);
      const saved = await saveImaConfig(body);
      return reply.success(publicImaConfig(saved));
    }
  );

  app.get(
    '/ima/knowledge-bases',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { enabledOnly } = request.query as { enabledOnly?: string };
      return reply.success(
        await listKnowledgeBases({
          enabledOnly: enabledOnly === 'true',
        })
      );
    }
  );

  app.post(
    '/ima/knowledge-bases/sync',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN', 'OPERATOR');
      const result = await syncAllFromIma();
      return reply.success({
        synced: result.knowledgeBases,
        documents: result.documents,
        count: result.knowledgeBases.length,
        documentCount: result.documents.reduce(
          (sum, row) => sum + row.count,
          0
        ),
      });
    }
  );

  app.patch(
    '/ima/knowledge-bases/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN');
      const { id } = request.params as { id: string };
      const body = z
        .object({
          enabled: z.boolean().optional(),
          isDefault: z.boolean().optional(),
          name: z.string().optional(),
          agentType: z.string().optional(),
        })
        .parse(request.body);
      return reply.success(await updateKnowledgeBase(id, body));
    }
  );

  app.post(
    '/ima/knowledge-bases/batch-delete',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN');
      const body = z
        .object({
          ids: z.array(z.string()),
        })
        .parse(request.body);
      const deleted = await deleteKnowledgeBases(body.ids);
      return reply.success({ deleted, count: deleted.length });
    }
  );

  app.post(
    '/ima/search',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          query: z.string(),
          contentId: z.string(),
          limit: z.number().optional(),
          knowledgeBaseId: z.string().optional(),
        })
        .parse(request.body);
      return reply.success(
        await searchAndLog(body.contentId, body.query, {
          limit: body.limit,
          knowledgeBaseId: body.knowledgeBaseId,
        })
      );
    }
  );
}
