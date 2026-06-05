import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, type AgentType, type Platform } from '@acs/db';
import { runAgentByType, listAgentRuns } from '@acs/ai-runtime';
import { requireRoles } from '@acs/core';
import { getUser } from '../plugins/auth.js';

export async function agentRoutes(app: FastifyInstance) {
  app.post(
    '/agents/title/run',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          contentId: z.string(),
          accountId: z.string().optional(),
          count: z.number().optional(),
        })
        .parse(request.body);
      const run = await runAgentByType('TITLE', {
        contentId: body.contentId,
        accountId: body.accountId,
        overrides: { count: body.count },
      });
      return reply.success(run);
    }
  );

  app.post(
    '/agents/rewrite/run',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          contentId: z.string(),
          platform: z.string(),
          accountId: z.string().optional(),
        })
        .parse(request.body);
      let version = await prisma.contentVersion.findFirst({
        where: {
          contentId: body.contentId,
          platform: body.platform as Platform,
        },
      });
      if (!version) {
        version = await prisma.contentVersion.create({
          data: {
            contentId: body.contentId,
            platform: body.platform as Platform,
            accountId: body.accountId,
          },
        });
      }
      const run = await runAgentByType('REWRITE', {
        contentId: body.contentId,
        versionId: version.id,
        accountId: body.accountId,
        overrides: { platform: body.platform as Platform },
      });
      return reply.success(run);
    }
  );

  app.post(
    '/agents/review/run',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z.object({ versionId: z.string() }).parse(request.body);
      const version = await prisma.contentVersion.findUnique({
        where: { id: body.versionId },
      });
      if (!version) throw new Error('version not found');
      const run = await runAgentByType('REVIEW', {
        contentId: version.contentId,
        versionId: body.versionId,
      });
      return reply.success(run);
    }
  );

  app.get(
    '/agent-runs',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.success(
        await listAgentRuns(
          request.query as { contentId?: string; status?: string }
        )
      );
    }
  );

  app.get(
    '/prompts',
    { onRequest: [app.authenticate] },
    async (_request, reply) => {
      return reply.success(
        await prisma.prompt.findMany({ orderBy: { updatedAt: 'desc' } })
      );
    }
  );

  app.post(
    '/prompts',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN');
      const body = z
        .object({
          name: z.string(),
          agentType: z.string(),
          template: z.string(),
          version: z.string().optional(),
        })
        .parse(request.body);
      return reply.success(
        await prisma.prompt.create({
          data: {
            name: body.name,
            agentType: body.agentType as AgentType,
            template: body.template,
            version: body.version ?? 'v1',
          },
        })
      );
    }
  );

  app.patch(
    '/prompts/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN');
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      return reply.success(
        await prisma.prompt.update({ where: { id }, data: body as object })
      );
    }
  );

  app.get(
    '/agents',
    { onRequest: [app.authenticate] },
    async (_request, reply) => {
      return reply.success(
        await prisma.agent.findMany({ include: { prompt: true } })
      );
    }
  );
}
