import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as accounts from '@acs/account-profile';
import { syncAccountsToDb } from '@acs/turbopush-adapter';
import { searchAndLog } from '@acs/ima-provider';
import * as reviews from '@acs/review-center';
import { executePublish } from '@acs/turbopush-adapter';
import * as analytics from '@acs/analytics-center';
import * as contents from '@acs/content-center';
import { getUser } from '../plugins/auth.js';

export async function accountRoutes(app: FastifyInstance) {
  app.get(
    '/accounts',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.success(
        await accounts.listAccounts(
          getUser(request),
          request.query as { platform?: string; authStatus?: string }
        )
      );
    }
  );

  app.get(
    '/accounts/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await accounts.getAccount(id));
    }
  );

  app.post(
    '/accounts/sync',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const user = getUser(request);
      const synced = await syncAccountsToDb(user.id);
      return reply.success({ synced });
    }
  );

  app.get(
    '/account-profiles',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { accountId } = request.query as { accountId: string };
      return reply.success(await accounts.getProfileByAccountId(accountId));
    }
  );

  app.put(
    '/account-profiles/:accountId',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { accountId } = request.params as { accountId: string };
      return reply.success(
        await accounts.upsertProfile(accountId, request.body as object)
      );
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
        })
        .parse(request.body);
      return reply.success(
        await searchAndLog(body.contentId, body.query, body.limit)
      );
    }
  );

  app.get(
    '/reviews',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.success(
        await reviews.listReviews(
          getUser(request),
          request.query as Record<string, string>
        )
      );
    }
  );

  app.post(
    '/reviews',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z
        .object({ contentId: z.string(), versionId: z.string().optional() })
        .parse(request.body);
      return reply.success(await reviews.submitReview(getUser(request), body));
    }
  );

  app.post(
    '/reviews/:id/approve',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await reviews.approveReview(getUser(request), id));
    }
  );

  app.post(
    '/reviews/:id/reject',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({ comment: z.string().optional() })
        .parse(request.body ?? {});
      return reply.success(
        await reviews.rejectReview(getUser(request), id, body.comment)
      );
    }
  );

  app.get(
    '/publishing/tasks',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.success(
        await reviews.listPublishingTasks(request.query as { status?: string })
      );
    }
  );

  app.post(
    '/publishing/tasks',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          versionId: z.string(),
          accountId: z.string(),
          scheduledAt: z.string().nullable().optional(),
        })
        .parse(request.body);
      return reply.success(
        await reviews.createPublishingTask({
          versionId: body.versionId,
          accountId: body.accountId,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        })
      );
    }
  );

  app.get(
    '/publishing/tasks/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await reviews.getPublishingTask(id));
    }
  );

  app.post(
    '/publishing/tasks/:id/publish',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await executePublish(id));
    }
  );

  app.post(
    '/publishing/tasks/:id/cancel',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await reviews.cancelPublishingTask(id));
    }
  );

  app.patch(
    '/versions/:versionId',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { versionId } = request.params as { versionId: string };
      return reply.success(
        await contents.updateVersion(
          versionId,
          request.body as Parameters<typeof contents.updateVersion>[1]
        )
      );
    }
  );

  app.post(
    '/analytics/sync',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z
        .object({ publishRecordId: z.string() })
        .parse(request.body);
      return reply.success(await analytics.syncAnalytics(body.publishRecordId));
    }
  );

  app.get(
    '/analytics/contents/:contentId',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { contentId } = request.params as { contentId: string };
      return reply.success(await analytics.getContentAnalytics(contentId));
    }
  );

  app.post(
    '/analytics/reports/generate',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z.object({ contentId: z.string() }).parse(request.body);
      return reply.success(await analytics.generateReport(body.contentId));
    }
  );

  app.get(
    '/analytics/reports/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.success(await analytics.getReport(id));
    }
  );

  app.get(
    '/analytics/reports',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { contentId } = request.query as { contentId?: string };
      return reply.success(await analytics.listReports(contentId));
    }
  );

  app.get(
    '/dashboard/stats',
    { onRequest: [app.authenticate] },
    async (_request, reply) => {
      return reply.success(await analytics.getDashboardStats());
    }
  );
}
