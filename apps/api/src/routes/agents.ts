import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma, prisma, type AgentType, type Platform } from '@acs/db';
import {
  extractTemplateVariables,
  listAgentRuns,
  previewPrompt,
  runAgent,
  runAgentByType,
} from '@acs/ai-runtime';
import { AppError, ErrorCodes, requireRoles } from '@acs/core';
import { getUser } from '../plugins/auth.js';

const agentTypeValues = [
  'TITLE',
  'TAG',
  'REWRITE',
  'BODY',
  'COVER_COPY',
  'REVIEW',
  'SUMMARY',
  'TOPIC',
  'IMAGE',
  'VIDEO_SCRIPT',
  'COMPETITOR',
] as const;
const runStatusValues = ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'] as const;

const AgentTypeSchema = z.string().refine((v) => agentTypeValues.includes(v as AgentType), {
  message: 'Invalid agentType. Must be one of: ' + agentTypeValues.join(', '),
});
const RunStatusSchema = z.string().refine((v) => runStatusValues.includes(v as (typeof runStatusValues)[number]), {
  message: 'Invalid status. Must be one of: ' + runStatusValues.join(', '),
});
const JsonObjectSchema = z.record(z.unknown());
const OptionalBoolQuerySchema = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

export async function agentRoutes(app: FastifyInstance) {
  app.post(
    '/agents/run',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z.object({
        agentId: z.string().optional(),
        agentType: AgentTypeSchema.optional(),
        contentId: z.string().optional(),
        versionId: z.string().optional(),
        accountId: z.string().optional(),
        overrides: z.object({
          count: z.number().optional(),
          platform: z.string().optional(),
        }).optional(),
      }).refine((value) => value.agentId || value.agentType, {
        message: 'agentId or agentType is required',
      }).parse(request.body);

      const normalized = await normalizeAgentRunRequest(body);
      const run = body.agentId
        ? await runAgent({
            agentId: body.agentId,
            agentType: normalized.agentType,
            contentId: normalized.contentId,
            versionId: normalized.versionId,
            accountId: normalized.accountId,
            overrides: normalized.overrides,
          })
        : await runAgentByType(normalized.agentType, {
            contentId: normalized.contentId,
            versionId: normalized.versionId,
            accountId: normalized.accountId,
            overrides: normalized.overrides,
          });
      return reply.success(run);
    }
  );


  app.get(
    '/agent-runs',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const query = z.object({
        contentId: z.string().optional(),
        status: RunStatusSchema.optional(),
        agentType: AgentTypeSchema.optional(),
      }).parse(request.query);
      return reply.success(
        await listAgentRuns({
          contentId: query.contentId,
          status: query.status,
          agentType: query.agentType as AgentType | undefined,
        })
      );
    }
  );

  app.get(
    '/agent-runs/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const run = await prisma.agentRun.findUnique({
        where: { id },
        include: {
          agent: { include: { prompt: true } },
          content: true,
          version: { include: { account: true } },
        },
      });
      if (!run) throw new AppError(ErrorCodes.NOT_FOUND, 'agent run not found', 404);
      return reply.success(run);
    }
  );

  app.post(
    '/agent-runs/:id/retry',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const oldRun = await prisma.agentRun.findUnique({
        where: { id },
        include: { agent: true },
      });
      if (!oldRun) throw new AppError(ErrorCodes.NOT_FOUND, 'agent run not found', 404);

      const input = normalizeRunInput(oldRun.input, oldRun.agent.type, oldRun.contentId, oldRun.versionId);
      const run = await runAgent({
        ...input,
        agentId: oldRun.agentId,
        agentType: oldRun.agent.type,
        contentId: oldRun.contentId,
        versionId: oldRun.versionId ?? undefined,
        overrides: input.overrides,
      });

      await prisma.agentRun.update({
        where: { id: run!.id },
        data: { input: { ...(input as object), retryOf: id } },
      });
      return reply.success(await prisma.agentRun.findUnique({ where: { id: run!.id } }));
    }
  );

  app.post(
    '/agent-runs/:id/cancel',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const run = await prisma.agentRun.findUnique({ where: { id } });
      if (!run) throw new AppError(ErrorCodes.NOT_FOUND, 'agent run not found', 404);
      if (run.status !== 'PENDING' && run.status !== 'RUNNING') {
        throw new AppError(ErrorCodes.BAD_REQUEST, 'agent run already finished', 409);
      }

      return reply.success(
        await prisma.agentRun.update({
          where: { id },
          data: {
            status: 'FAILED',
            error: 'CANCELLED_BY_USER',
            finishedAt: new Date(),
          },
        })
      );
    }
  );

  app.get(
    '/prompts',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const query = z.object({
        agentType: AgentTypeSchema.optional(),
        enabled: OptionalBoolQuerySchema,
      }).parse(request.query);
      return reply.success(
        await prisma.prompt.findMany({
          where: {
            agentType: query.agentType as AgentType | undefined,
            enabled: query.enabled,
          },
          orderBy: { updatedAt: 'desc' },
        })
      );
    }
  );

  app.post(
    '/prompts/preview',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = z.object({
        template: z.string(),
        variables: z.record(z.string()).optional(),
      }).parse(request.body);
      return reply.success(previewPrompt(body.template, body.variables ?? {}));
    }
  );

  app.get(
    '/prompts/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const prompt = await prisma.prompt.findUnique({
        where: { id },
        include: { agents: true },
      });
      if (!prompt) throw new AppError(ErrorCodes.NOT_FOUND, 'prompt not found', 404);
      return reply.success(prompt);
    }
  );

  app.post(
    '/prompts',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN');
      const body = z.object({
        name: z.string(),
        agentType: AgentTypeSchema,
        template: z.string(),
        version: z.string().optional(),
        variables: z.array(z.string()).optional(),
        enabled: z.boolean().optional(),
      }).parse(request.body);
      return reply.success(
        await prisma.prompt.create({
          data: {
            name: body.name,
            agentType: body.agentType as AgentType,
            template: body.template,
            version: body.version ?? 'v1',
            variables: body.variables ?? extractTemplateVariables(body.template),
            enabled: body.enabled ?? true,
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
      const body = z.object({
        name: z.string().optional(),
        agentType: AgentTypeSchema.optional(),
        template: z.string().optional(),
        version: z.string().optional(),
        variables: z.array(z.string()).optional(),
        enabled: z.boolean().optional(),
      }).parse(request.body);

      const data = {
        ...body,
        agentType: body.agentType as AgentType | undefined,
        variables: body.variables ?? (body.template ? extractTemplateVariables(body.template) : undefined),
      };
      return reply.success(await prisma.prompt.update({ where: { id }, data }));
    }
  );

  app.get(
    '/agents',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const query = z.object({
        type: AgentTypeSchema.optional(),
        enabled: OptionalBoolQuerySchema,
      }).parse(request.query);
      return reply.success(
        await prisma.agent.findMany({
          where: {
            type: query.type as AgentType | undefined,
            enabled: query.enabled,
          },
          include: { prompt: true },
          orderBy: { updatedAt: 'desc' },
        })
      );
    }
  );

  app.get(
    '/agents/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const agent = await prisma.agent.findUnique({
        where: { id },
        include: { prompt: true },
      });
      if (!agent) throw new AppError(ErrorCodes.NOT_FOUND, 'agent not found', 404);
      return reply.success(agent);
    }
  );

  app.post(
    '/agents',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN');
      const body = agentInputSchema.parse(request.body);
      await assertPromptMatchesAgent(body.promptId, body.type as AgentType);
      return reply.success(
        await prisma.agent.create({
          data: {
            name: body.name,
            type: body.type as AgentType,
            promptId: body.promptId,
            description: body.description,
            model: body.model ?? 'deepseek-chat',
            enabled: body.enabled ?? true,
            config: toJsonInput(body.config),
          },
          include: { prompt: true },
        })
      );
    }
  );

  app.patch(
    '/agents/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      requireRoles(getUser(request), 'ADMIN');
      const { id } = request.params as { id: string };
      const agent = await prisma.agent.findUnique({ where: { id } });
      if (!agent) throw new AppError(ErrorCodes.NOT_FOUND, 'agent not found', 404);

      const body = agentPatchSchema.parse(request.body);
      if (body.promptId) {
        await assertPromptMatchesAgent(body.promptId, (body.type ?? agent.type) as AgentType);
      }

      return reply.success(
        await prisma.agent.update({
          where: { id },
          data: {
            name: body.name,
            type: body.type as AgentType | undefined,
            promptId: body.promptId,
            description: body.description,
            model: body.model,
            enabled: body.enabled,
            config: toJsonInput(body.config),
          },
          include: { prompt: true },
        })
      );
    }
  );
}

const agentInputSchema = z.object({
  name: z.string(),
  type: AgentTypeSchema,
  promptId: z.string(),
  description: z.string().optional(),
  model: z.string().optional(),
  enabled: z.boolean().optional(),
  config: JsonObjectSchema.optional(),
});

const agentPatchSchema = agentInputSchema.partial();

async function normalizeAgentRunRequest(body: {
  agentId?: string;
  agentType?: string;
  contentId?: string;
  versionId?: string;
  accountId?: string;
  overrides?: { count?: number; platform?: string };
}) {
  const agentType = (body.agentType ?? 'TITLE') as AgentType;
  let contentId = body.contentId;
  let versionId = body.versionId;
  const overrides = toRuntimeOverrides(body.overrides);

  if (agentType === 'REVIEW') {
    if (!versionId) throw new AppError(ErrorCodes.BAD_REQUEST, 'versionId is required for REVIEW agent', 400);
    const version = await prisma.contentVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new AppError(ErrorCodes.NOT_FOUND, 'version not found', 404);
    contentId = contentId ?? version.contentId;
  }

  if (agentType === 'REWRITE') {
    if (!contentId) throw new AppError(ErrorCodes.BAD_REQUEST, 'contentId is required for REWRITE agent', 400);
    const platform = overrides?.platform;
    if (platform) {
      let version = await prisma.contentVersion.findFirst({
        where: { contentId, platform },
      });
      if (!version) {
        version = await prisma.contentVersion.create({
          data: {
            contentId,
            platform,
            accountId: body.accountId,
          },
        });
      }
      versionId = version.id;
    }
  }

  if (!contentId) throw new AppError(ErrorCodes.BAD_REQUEST, 'contentId is required', 400);

  return {
    agentType,
    contentId,
    versionId,
    accountId: body.accountId,
    overrides,
  };
}

function toRuntimeOverrides(overrides: { count?: number; platform?: string } | undefined) {
  if (!overrides) return undefined;
  return {
    count: overrides.count,
    platform: overrides.platform as Platform | undefined,
  };
}

async function assertPromptMatchesAgent(promptId: string, type: AgentType) {
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw new AppError(ErrorCodes.NOT_FOUND, 'prompt not found', 404);
  if (prompt.agentType !== type) {
    throw new AppError(ErrorCodes.BAD_REQUEST, 'prompt agentType does not match agent type', 400);
  }
}

function toJsonInput(value: Record<string, unknown> | undefined) {
  return value === undefined ? undefined : (value as Prisma.InputJsonObject);
}

function normalizeRunInput(
  input: unknown,
  agentType: AgentType,
  contentId: string,
  versionId: string | null
) {
  const parsed = z.object({
    agentId: z.string().optional(),
    agentType: AgentTypeSchema.optional(),
    contentId: z.string().optional(),
    versionId: z.string().optional(),
    accountId: z.string().optional(),
    overrides: z.object({
      count: z.number().optional(),
      platform: AgentTypeSchema.or(z.string()).optional(),
    }).optional(),
  }).passthrough().safeParse(input ?? {});
  const value = parsed.success ? parsed.data : {};

  return {
    agentId: value.agentId,
    agentType: (value.agentType ?? agentType) as AgentType,
    contentId: value.contentId ?? contentId,
    versionId: value.versionId ?? versionId ?? undefined,
    accountId: value.accountId,
    overrides: value.overrides
      ? {
          count: value.overrides.count,
          platform: value.overrides.platform as Platform | undefined,
        }
      : undefined,
  };
}
