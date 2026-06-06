import type { FastifyInstance } from 'fastify';
import { prisma, type ContentStatus, type Platform } from '@acs/db';
import { z } from 'zod';
import * as accounts from '@acs/account-profile';
import { oauthPublicBase, slugToPlatform } from '@acs/account-profile';
import { syncAccountsToDb } from '@acs/turbopush-adapter';
import * as reviews from '@acs/review-center';
import { executePublish } from '@acs/turbopush-adapter';
import * as analytics from '@acs/analytics-center';
import * as contents from '@acs/content-center';
import { AppError, ErrorCodes, requireRoles } from '@acs/core';
import { getUser } from '../plugins/auth.js';

const platformSchema = z.enum([
  'WECHAT',
  'XIAOHONGSHU',
  'DOUYIN',
  'KUAISHOU',
  'VIDEO_CHANNEL',
  'BILIBILI',
  'ZHIHU',
  'OTHER',
]);

const contentStatusSchema = z.enum([
  'DRAFT',
  'PENDING_GENERATE',
  'GENERATING',
  'PENDING_REVIEW',
  'REJECTED',
  'APPROVED',
  'PENDING_PUBLISH',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'REVIEWED',
  'ARCHIVED',
]);

const updateAccountBody = z
  .object({
    platform: platformSchema.optional(),
    accountName: z.string().min(1).optional(),
    accountType: z.string().nullable().optional(),
    authStatus: z.string().min(1).optional(),
    ownerId: z.string().optional(),
    rawData: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

const updateProfileBody = z
  .object({
    positioning: z.string().optional(),
    targetAudience: z.record(z.unknown()).optional(),
    contentStyle: z.string().optional(),
    titlePreference: z.string().optional(),
    coverPreference: z.string().optional(),
    tone: z.string().optional(),
    forbiddenWords: z.array(z.string()).optional(),
    contentBoundary: z.string().optional(),
    publishStrategy: z.string().optional(),
  })
  .strict();

const updateVersionBody = z
  .object({
    title: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    coverText: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    formatConfig: z.record(z.unknown()).optional(),
    status: contentStatusSchema.optional(),
    accountId: z.string().nullable().optional(),
  })
  .strict();

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
      const account = await prisma.platformAccount.findUnique({
        where: { id },
        include: {
          profile: true,
          owner: { select: { id: true, name: true, email: true } },
          token: { select: { expiresAt: true, scopes: true, updatedAt: true } },
          socialWorks: {
            orderBy: { publishedAt: 'desc' },
            take: 10,
          },
        },
      });
      if (!account)
        throw new AppError(ErrorCodes.NOT_FOUND, 'account not found', 404);

      const recentMetrics = await prisma.socialMetricSnapshot.findMany({
        where: { accountId: id },
        orderBy: { collectedAt: 'desc' },
        take: 10,
      });

      return reply.success({
        ...account,
        recentMetrics,
        workCount: account.socialWorks.length,
      });
    }
  );

  app.patch(
    '/accounts/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const user = getUser(request);
      requireRoles(user, 'ADMIN', 'OPERATOR');
      const { id } = request.params as { id: string };
      const body = updateAccountBody.parse(request.body);
      return reply.success(
        await accounts.updateAccount(user, id, {
          ...body,
          platform: body.platform as Platform | undefined,
        })
      );
    }
  );

  app.post(
    '/accounts/sync',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const user = getUser(request);
      requireRoles(user, 'ADMIN', 'OPERATOR');
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
        await accounts.upsertProfile(
          getUser(request),
          accountId,
          updateProfileBody.parse(request.body)
        )
      );
    }
  );

  app.get(
    '/reviews/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const task = await prisma.reviewTask.findUnique({
        where: { id },
        include: {
          content: { include: { versions: true, creator: { select: { id: true, name: true, email: true } } } },
          version: true,
          reviewer: { select: { id: true, name: true } },
        },
      });
      if (!task) throw new AppError(ErrorCodes.NOT_FOUND, 'review not found', 404);
      return reply.success(task);
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

  app.get(
    '/versions/:versionId',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { versionId } = request.params as { versionId: string };
      const version = await prisma.contentVersion.findUnique({
        where: { id: versionId },
        include: {
          content: true,
          account: true,
          reviewTasks: true,
          publishingTasks: true,
          analyticsData: true,
        },
      });
      if (!version) throw new AppError(ErrorCodes.NOT_FOUND, 'version not found', 404);
      return reply.success(version);
    }
  );

  app.patch(
    '/versions/:versionId',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { versionId } = request.params as { versionId: string };
      const body = updateVersionBody.parse(request.body);
      return reply.success(
        await contents.updateVersion(versionId, {
          ...body,
          status: body.status as ContentStatus | undefined,
        })
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

  // --- Account binding routes ---

  app.post(
    '/accounts/bind/start',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const user = getUser(request);
      const body = z.object({
        platform: platformSchema,
        redirectAfterBind: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        accountId: z.string().optional(),
      }).parse(request.body);

      const result = await accounts.startBind({
        platform: body.platform as Platform,
        ownerId: user.id,
        redirectAfterBind: body.redirectAfterBind,
        scopes: body.scopes,
        accountId: body.accountId,
      });
      return reply.success(result);
    }
  );

  app.post(
    '/accounts/:id/revoke',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const user = getUser(request);
      requireRoles(user, 'ADMIN', 'OPERATOR');
      const { id } = request.params as { id: string };
      const result = await accounts.revokeAccount(id);
      return reply.success(result);
    }
  );

  app.post(
    '/accounts/:id/reauthorize',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const user = getUser(request);
      const { id } = request.params as { id: string };
      const account = await accounts.getAccount(id);
      if (user.role === 'OPERATOR' && account.ownerId !== user.id) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
      }
      const result = await accounts.startBind({
        platform: account.platform,
        ownerId: user.id,
        accountId: id,
      });
      return reply.success(result);
    }
  );

  app.post(
    '/accounts/:id/sync-works',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const user = getUser(request);
      requireRoles(user, 'ADMIN', 'OPERATOR');
      const { id } = request.params as { id: string };
      const works = await accounts.syncWorks(id);
      return reply.success({ works });
    }
  );

  app.post(
    '/accounts/:id/sync-metrics',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const user = getUser(request);
      requireRoles(user, 'ADMIN', 'OPERATOR');
      const { id } = request.params as { id: string };
      const body = z.object({
        workIds: z.array(z.string()).optional(),
      }).optional().parse(request.body);
      const result = await accounts.syncMetricsForAccount(id, body?.workIds);
      return reply.success(result);
    }
  );
}

export async function oauthRoutes(app: FastifyInstance) {
  app.get(
    '/oauth/:platform/callback',
    async (request, reply) => {
      const { platform: platformSlug } = request.params as { platform: string };
      const query = z.object({
        code: z.string(),
        state: z.string(),
      }).parse(request.query);

      let platform: Platform;
      try {
        platform = slugToPlatform(platformSlug);
      } catch {
        throw new AppError(ErrorCodes.NOT_FOUND, 'platform not supported', 404);
      }

      const callbackBase = oauthPublicBase();
      const redirectUri = `${callbackBase}/api/oauth/${platformSlug}/callback`;

      const account = await accounts.completeOAuthCallback({
        platform,
        code: query.code,
        state: query.state,
        redirectUri,
      });

      const resultUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3001';
      return reply.redirect(`${resultUrl}/accounts/bind/result?success=true&accountId=${account.id}`);
    }
  );

  app.get(
    '/oauth/:platform/dev-authorize',
    async (request, reply) => {
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_AUTH !== '1') {
        throw new AppError(ErrorCodes.FORBIDDEN, 'dev auth disabled in production', 403);
      }

      const { platform: platformSlug } = request.params as { platform: string };
      const query = z.object({
        state: z.string(),
        redirect_uri: z.string().optional(),
      }).parse(request.query);

      let platform: Platform;
      try {
        platform = slugToPlatform(platformSlug);
      } catch {
        throw new AppError(ErrorCodes.NOT_FOUND, 'platform not supported', 404);
      }

      const account = await accounts.devAuthorize({
        platform,
        state: query.state,
      });

      const resultUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3001';
      return reply.redirect(`${resultUrl}/accounts/bind/result?success=true&accountId=${account.id}&dev=true`);
    }
  );
}
